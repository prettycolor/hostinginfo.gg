import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { technologyStack } from "../../../../db/schema.js";
import { getSecret } from "#secrets";

interface TechnologyCollectionRequest {
  domain: string;
}

interface WappalyzerTechnology {
  name: string;
  version?: string;
  categories: { id: number; name: string }[];
  confidence: number;
  icon?: string;
  website?: string;
  description?: string;
}

interface WappalyzerResponse {
  technologies: WappalyzerTechnology[];
}

/**
 * POST /api/intelligence/collect/technology
 *
 * Detects technologies used by a domain and stores in technology_stack table.
 *
 * Uses Wappalyzer API (requires WAPPALYZER_API_KEY secret).
 * Alternative: Can use open-source Wappalyzer library or basic HTTP header detection.
 *
 * Request body:
 * {
 *   "domain": "example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "example.com",
 *   "technologiesDetected": 12,
 *   "technologies": [...]
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body as TechnologyCollectionRequest;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Normalize domain
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .split("/")[0];

    console.log(
      `[Technology Detection] Starting detection for: ${normalizedDomain}`,
    );

    // Check for API key
    const apiKeySecret = getSecret("WAPPALYZER_API_KEY");
    const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : "";

    let technologies: WappalyzerTechnology[] = [];

    if (!apiKey) {
      console.warn(
        "[Technology Detection] WAPPALYZER_API_KEY not configured - using basic detection",
      );

      // Fallback: Basic technology detection via HTTP headers
      technologies = await detectBasicTechnologies(normalizedDomain);
    } else {
      // Use Wappalyzer API
      try {
        const response = await fetch(
          `https://api.wappalyzer.com/v2/lookup/?urls=https://${normalizedDomain}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          },
        );

        if (!response.ok) {
          console.error(
            `[Technology Detection] Wappalyzer API error: ${response.status}`,
          );
          technologies = await detectBasicTechnologies(normalizedDomain);
        } else {
          const data = (await response.json()) as WappalyzerResponse[];
          if (data && data.length > 0 && data[0].technologies) {
            technologies = data[0].technologies;
          }
        }
      } catch (error) {
        console.error("[Technology Detection] Wappalyzer API failed:", error);
        technologies = await detectBasicTechnologies(normalizedDomain);
      }
    }

    if (technologies.length === 0) {
      return res.json({
        success: true,
        domain: normalizedDomain,
        technologiesDetected: 0,
        warning:
          "No technologies detected. Add WAPPALYZER_API_KEY for better detection.",
        technologies: [],
      });
    }

    // Store technologies in database
    const scannedAt = new Date();
    const insertedRecords = [];

    for (const tech of technologies) {
      try {
        const category =
          tech.categories && tech.categories.length > 0
            ? tech.categories[0].name
            : "Unknown";

        await db.insert(technologyStack).values({
          domain: normalizedDomain,
          name: tech.name,
          version: tech.version || null,
          category,
          confidence: tech.confidence || 100,
          detectionMethod: apiKey ? "wappalyzer" : "basic",
          icon: tech.icon || null,
          website: tech.website || null,
          description: tech.description || null,
          hasKnownVulnerabilities: false, // Would need CVE database integration
          isOutdated: false, // Would need version comparison
          isEol: false, // Would need EOL database
          latestVersion: null,
          scannedAt,
        });

        insertedRecords.push({
          name: tech.name,
          version: tech.version,
          category,
          confidence: tech.confidence,
        });

        console.log(`[Technology Detection] Stored ${tech.name} (${category})`);
      } catch (error) {
        console.error(
          `[Technology Detection] Failed to insert ${tech.name}:`,
          error,
        );
      }
    }

    return res.json({
      success: true,
      domain: normalizedDomain,
      technologiesDetected: insertedRecords.length,
      technologies: insertedRecords,
      timestamp: scannedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Technology Detection] Error:", error);
    return res.status(500).json({
      error: "Technology detection failed",
      message: "An internal error occurred",
    });
  }
}

/**
 * Basic technology detection using HTTP headers and HTML
 * Fallback when Wappalyzer API is not available
 */
async function detectBasicTechnologies(
  domain: string,
): Promise<WappalyzerTechnology[]> {
  const technologies: WappalyzerTechnology[] = [];

  try {
    console.log(`[Technology Detection] Using basic detection for ${domain}`);

    // Fetch homepage
    const response = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HostingInfo/1.0; +https://hostinginfo.gg)",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(
        `[Technology Detection] Failed to fetch ${domain}: ${response.status}`,
      );
      return technologies;
    }

    const headers = response.headers;
    const html = await response.text();

    // Detect server
    const server = headers.get("server");
    if (server) {
      technologies.push({
        name: server.split("/")[0],
        version: server.split("/")[1],
        categories: [{ id: 22, name: "Web servers" }],
        confidence: 100,
      });
    }

    // Detect X-Powered-By
    const poweredBy = headers.get("x-powered-by");
    if (poweredBy) {
      technologies.push({
        name: poweredBy.split("/")[0],
        version: poweredBy.split("/")[1],
        categories: [{ id: 18, name: "Web frameworks" }],
        confidence: 100,
      });
    }

    // Detect common frameworks from HTML
    const detections = [
      { pattern: /wp-content|wordpress/i, name: "WordPress", category: "CMS" },
      { pattern: /drupal/i, name: "Drupal", category: "CMS" },
      { pattern: /joomla/i, name: "Joomla", category: "CMS" },
      { pattern: /react/i, name: "React", category: "JavaScript frameworks" },
      {
        pattern: /vue\.js|vuejs/i,
        name: "Vue.js",
        category: "JavaScript frameworks",
      },
      {
        pattern: /angular/i,
        name: "Angular",
        category: "JavaScript frameworks",
      },
      { pattern: /jquery/i, name: "jQuery", category: "JavaScript libraries" },
      { pattern: /bootstrap/i, name: "Bootstrap", category: "UI frameworks" },
      { pattern: /tailwind/i, name: "Tailwind CSS", category: "UI frameworks" },
      {
        pattern: /next\.js|nextjs/i,
        name: "Next.js",
        category: "Web frameworks",
      },
      { pattern: /nuxt/i, name: "Nuxt.js", category: "Web frameworks" },
      {
        pattern: /gatsby/i,
        name: "Gatsby",
        category: "Static site generators",
      },
      { pattern: /shopify/i, name: "Shopify", category: "Ecommerce" },
      { pattern: /woocommerce/i, name: "WooCommerce", category: "Ecommerce" },
      {
        pattern: /google-analytics\.com|gtag/i,
        name: "Google Analytics",
        category: "Analytics",
      },
      { pattern: /cloudflare/i, name: "Cloudflare", category: "CDN" },
    ];

    for (const detection of detections) {
      if (detection.pattern.test(html)) {
        technologies.push({
          name: detection.name,
          categories: [{ id: 1, name: detection.category }],
          confidence: 75,
        });
      }
    }

    console.log(
      `[Technology Detection] Basic detection found ${technologies.length} technologies`,
    );
  } catch (error) {
    console.error("[Technology Detection] Basic detection failed:", error);
  }

  return technologies;
}
