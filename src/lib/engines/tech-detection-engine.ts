/**
 * ENGINE C: TECHNOLOGY DETECTION & SIGNATURE MATCHING
 *
 * Advanced technology detection engine that:
 * - HTTP header analysis (Server, X-Powered-By, X-Generator)
 * - HTML meta tag parsing (generator, framework)
 * - JavaScript library detection (React, Vue, Angular, jQuery)
 * - CSS framework detection (Bootstrap, Tailwind, Foundation)
 * - CMS detection (WordPress, Drupal, Joomla, Shopify)
 * - CDN detection (Cloudflare, Akamai, Fastly, AWS CloudFront)
 * - Analytics detection (Google Analytics, Mixpanel, Segment)
 * - Hosting provider detection (AWS, GCP, Azure, DigitalOcean)
 * - Signature-based matching with confidence scoring
 * - Stores results in tech_signatures and signature_library tables
 */

import { db } from "../../server/db/client.js";
import { techSignatures } from "../../server/db/schema.js";
import { eq, and, desc } from "drizzle-orm";

interface TechnologySignature {
  name: string;
  category: string;
  version: string | null;
  confidence: number;
  detectionMethod: string;
  evidence: string[];
}

interface TechDetectionResult {
  domain: string;
  technologies: TechnologySignature[];
  categories: {
    [category: string]: TechnologySignature[];
  };
  detectionTime: number;
}

type StoredTechSignature = typeof techSignatures.$inferSelect & {
  evidence: unknown;
};

/**
 * Built-in signature library for common technologies
 */
const BUILTIN_SIGNATURES = [
  // Web Servers
  {
    name: "Apache",
    category: "Web Server",
    patterns: ["Apache", "Apache/"],
    headerKey: "server",
  },
  {
    name: "Nginx",
    category: "Web Server",
    patterns: ["nginx", "nginx/"],
    headerKey: "server",
  },
  {
    name: "Microsoft IIS",
    category: "Web Server",
    patterns: ["Microsoft-IIS"],
    headerKey: "server",
  },
  {
    name: "LiteSpeed",
    category: "Web Server",
    patterns: ["LiteSpeed"],
    headerKey: "server",
  },

  // Programming Languages
  {
    name: "PHP",
    category: "Language",
    patterns: ["PHP", "X-Powered-By: PHP"],
    headerKey: "x-powered-by",
  },
  {
    name: "ASP.NET",
    category: "Language",
    patterns: ["ASP.NET"],
    headerKey: "x-powered-by",
  },
  {
    name: "Node.js",
    category: "Language",
    patterns: ["Express", "Node.js"],
    headerKey: "x-powered-by",
  },

  // CMS
  {
    name: "WordPress",
    category: "CMS",
    patterns: ["wp-content", "wp-includes", "WordPress"],
    htmlPattern: true,
  },
  {
    name: "Drupal",
    category: "CMS",
    patterns: ["Drupal", "/sites/default/files"],
    htmlPattern: true,
  },
  {
    name: "Joomla",
    category: "CMS",
    patterns: ["Joomla", "/components/com_"],
    htmlPattern: true,
  },
  {
    name: "Shopify",
    category: "E-commerce",
    patterns: ["cdn.shopify.com", "Shopify"],
    htmlPattern: true,
  },
  {
    name: "Magento",
    category: "E-commerce",
    patterns: ["Magento", "/skin/frontend/"],
    htmlPattern: true,
  },
  {
    name: "WooCommerce",
    category: "E-commerce",
    patterns: ["woocommerce", "wc-"],
    htmlPattern: true,
  },

  // Website Builders
  {
    name: "GoDaddy Website Builder",
    category: "Website Builder",
    patterns: [
      "GoDaddy Website Builder",
      "GoDaddy Website Builder",
      "Starfield Technologies",
      "wsimg.com",
    ],
    htmlPattern: true,
  },
  {
    name: "Wix",
    category: "Website Builder",
    patterns: ["wix.com", "wixsite", "wixstatic"],
    htmlPattern: true,
  },
  {
    name: "Squarespace",
    category: "Website Builder",
    patterns: ["squarespace", "sqsp.net"],
    htmlPattern: true,
  },
  {
    name: "Weebly",
    category: "Website Builder",
    patterns: ["weebly", "editmysite.com"],
    htmlPattern: true,
  },
  {
    name: "Webflow",
    category: "Website Builder",
    patterns: ["webflow", "website-files.com", "data-wf-"],
    htmlPattern: true,
  },
  {
    name: "Duda",
    category: "Website Builder",
    patterns: ["duda", "cdn-website.com"],
    htmlPattern: true,
  },
  {
    name: "Jimdo",
    category: "Website Builder",
    patterns: ["jimdo", "jimstatic.com"],
    htmlPattern: true,
  },
  {
    name: "Strikingly",
    category: "Website Builder",
    patterns: ["strikingly", "strikinglycdn.com"],
    htmlPattern: true,
  },
  {
    name: "Site123",
    category: "Website Builder",
    patterns: ["SITE123", "f-static.com"],
    htmlPattern: true,
  },
  {
    name: "Carrd",
    category: "Website Builder",
    patterns: ["carrd.co"],
    htmlPattern: true,
  },

  // CDN
  {
    name: "Cloudflare",
    category: "CDN",
    patterns: ["cloudflare"],
    headerKey: "server",
  },
  {
    name: "Akamai",
    category: "CDN",
    patterns: ["akamai"],
    headerKey: "server",
  },
  {
    name: "Fastly",
    category: "CDN",
    patterns: ["fastly"],
    headerKey: "x-served-by",
  },
  {
    name: "AWS CloudFront",
    category: "CDN",
    patterns: ["cloudfront"],
    headerKey: "via",
  },

  // JavaScript Frameworks
  {
    name: "React",
    category: "JS Framework",
    patterns: ["react", "_react", "data-reactroot"],
    htmlPattern: true,
  },
  {
    name: "Vue.js",
    category: "JS Framework",
    patterns: ["vue", "data-v-"],
    htmlPattern: true,
  },
  {
    name: "Angular",
    category: "JS Framework",
    patterns: ["ng-", "angular"],
    htmlPattern: true,
  },
  {
    name: "jQuery",
    category: "JS Library",
    patterns: ["jquery", "jQuery"],
    htmlPattern: true,
  },
  {
    name: "Next.js",
    category: "JS Framework",
    patterns: ["_next", "__next"],
    htmlPattern: true,
  },

  // CSS Frameworks
  {
    name: "Bootstrap",
    category: "CSS Framework",
    patterns: ["bootstrap", "btn-"],
    htmlPattern: true,
  },
  {
    name: "Tailwind CSS",
    category: "CSS Framework",
    patterns: ["tailwind"],
    htmlPattern: true,
  },
  {
    name: "Foundation",
    category: "CSS Framework",
    patterns: ["foundation"],
    htmlPattern: true,
  },

  // Analytics
  {
    name: "Google Analytics",
    category: "Analytics",
    patterns: ["google-analytics", "ga.js", "gtag"],
    htmlPattern: true,
  },
  {
    name: "Mixpanel",
    category: "Analytics",
    patterns: ["mixpanel"],
    htmlPattern: true,
  },
  {
    name: "Segment",
    category: "Analytics",
    patterns: ["segment.com", "analytics.js"],
    htmlPattern: true,
  },

  // Hosting Providers (via headers/IPs)
  {
    name: "AWS",
    category: "Hosting",
    patterns: ["amazonaws.com"],
    htmlPattern: true,
  },
  {
    name: "Google Cloud",
    category: "Hosting",
    patterns: ["googleusercontent.com", "gcp"],
    htmlPattern: true,
  },
  {
    name: "Microsoft Azure",
    category: "Hosting",
    patterns: ["azure", "azurewebsites"],
    htmlPattern: true,
  },
  {
    name: "DigitalOcean",
    category: "Hosting",
    patterns: ["digitalocean"],
    htmlPattern: true,
  },
  {
    name: "Vercel",
    category: "Hosting",
    patterns: ["vercel"],
    headerKey: "x-vercel-id",
  },
  {
    name: "Netlify",
    category: "Hosting",
    patterns: ["netlify"],
    headerKey: "x-nf-request-id",
  },
];

/**
 * Fetch HTML content from a domain
 */
async function fetchHTML(domain: string): Promise<string | null> {
  try {
    const response = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent": "HostingInfo/1.0 (Technology Detection Bot)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try HTTP if HTTPS fails
      const httpResponse = await fetch(`http://${domain}`, {
        headers: {
          "User-Agent": "HostingInfo/1.0 (Technology Detection Bot)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!httpResponse.ok) return null;
      return await httpResponse.text();
    }

    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch HTML for ${domain}:`, error);
    return null;
  }
}

/**
 * Fetch HTTP headers from a domain
 */
async function fetchHeaders(domain: string): Promise<Headers | null> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      headers: {
        "User-Agent": "HostingInfo/1.0 (Technology Detection Bot)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try HTTP if HTTPS fails
      const httpResponse = await fetch(`http://${domain}`, {
        method: "HEAD",
        headers: {
          "User-Agent": "HostingInfo/1.0 (Technology Detection Bot)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!httpResponse.ok) return null;
      return httpResponse.headers;
    }

    return response.headers;
  } catch (error) {
    console.error(`Failed to fetch headers for ${domain}:`, error);
    return null;
  }
}

/**
 * Detect technologies from HTTP headers
 */
function detectFromHeaders(headers: Headers): TechnologySignature[] {
  const detected: TechnologySignature[] = [];

  for (const sig of BUILTIN_SIGNATURES) {
    if (!sig.headerKey) continue;

    const headerValue = headers.get(sig.headerKey);
    if (!headerValue) continue;

    for (const pattern of sig.patterns) {
      if (headerValue.toLowerCase().includes(pattern.toLowerCase())) {
        // Extract version if possible
        const versionMatch = headerValue.match(/([0-9]+\.[0-9]+\.?[0-9]*)/);
        const version = versionMatch ? versionMatch[1] : null;

        detected.push({
          name: sig.name,
          category: sig.category,
          version,
          confidence: 95, // High confidence from headers
          detectionMethod: "HTTP Header",
          evidence: [`${sig.headerKey}: ${headerValue}`],
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Detect technologies from HTML content
 */
function detectFromHTML(html: string): TechnologySignature[] {
  const detected: TechnologySignature[] = [];

  for (const sig of BUILTIN_SIGNATURES) {
    if (!sig.htmlPattern) continue;

    for (const pattern of sig.patterns) {
      if (html.toLowerCase().includes(pattern.toLowerCase())) {
        // Count occurrences for confidence
        const occurrences = (
          html.toLowerCase().match(new RegExp(pattern.toLowerCase(), "g")) || []
        ).length;
        const confidence = Math.min(50 + occurrences * 10, 90); // 50-90% confidence

        detected.push({
          name: sig.name,
          category: sig.category,
          version: null,
          confidence,
          detectionMethod: "HTML Content",
          evidence: [`Pattern "${pattern}" found ${occurrences} times`],
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Detect technologies from meta tags
 */
function detectFromMetaTags(html: string): TechnologySignature[] {
  const detected: TechnologySignature[] = [];

  // Generator meta tag
  const generatorMatch = html.match(
    /<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i,
  );
  if (generatorMatch) {
    const generator = generatorMatch[1];
    detected.push({
      name: generator.split(" ")[0],
      category: "CMS",
      version: generator.match(/([0-9]+\.[0-9]+\.?[0-9]*)/)?.[1] || null,
      confidence: 100,
      detectionMethod: "Meta Tag",
      evidence: [`<meta name="generator" content="${generator}">`],
    });
  }

  return detected;
}

/**
 * Merge duplicate detections and keep highest confidence
 */
function mergeDuplicates(
  technologies: TechnologySignature[],
): TechnologySignature[] {
  const merged = new Map<string, TechnologySignature>();

  for (const tech of technologies) {
    const key = `${tech.name}-${tech.category}`;
    const existing = merged.get(key);

    if (!existing || tech.confidence > existing.confidence) {
      // Merge evidence if same tech detected multiple times
      if (existing) {
        tech.evidence = [...existing.evidence, ...tech.evidence];
      }
      merged.set(key, tech);
    }
  }

  return Array.from(merged.values());
}

/**
 * Main technology detection function
 */
export async function detectTechnologies(
  domain: string,
): Promise<TechDetectionResult> {
  const startTime = Date.now();
  const allDetected: TechnologySignature[] = [];

  // Fetch headers
  const headers = await fetchHeaders(domain);
  if (headers) {
    const headerTech = detectFromHeaders(headers);
    allDetected.push(...headerTech);
  }

  // Fetch HTML
  const html = await fetchHTML(domain);
  if (html) {
    const htmlTech = detectFromHTML(html);
    const metaTech = detectFromMetaTags(html);
    allDetected.push(...htmlTech, ...metaTech);
  }

  // Merge duplicates
  const technologies = mergeDuplicates(allDetected);

  // Group by category
  const categories: { [category: string]: TechnologySignature[] } = {};
  for (const tech of technologies) {
    if (!categories[tech.category]) {
      categories[tech.category] = [];
    }
    categories[tech.category].push(tech);
  }

  const detectionTime = Date.now() - startTime;

  return {
    domain,
    technologies,
    categories,
    detectionTime,
  };
}

/**
 * Store technology detection results in database
 */
export async function storeTechSignatures(
  result: TechDetectionResult,
): Promise<void> {
  for (const tech of result.technologies) {
    try {
      // Check if signature already exists
      const existing = await db
        .select()
        .from(techSignatures)
        .where(
          and(
            eq(techSignatures.domain, result.domain),
            eq(techSignatures.techName, tech.name),
            eq(techSignatures.techCategory, tech.category),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing signature
        await db
          .update(techSignatures)
          .set({
            techVersion: tech.version,
            confidence: tech.confidence,
            detectionMethod: tech.detectionMethod,
            evidenceJson: JSON.stringify(tech.evidence),
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(techSignatures.id, existing[0].id));
      } else {
        // Insert new signature
        await db.insert(techSignatures).values({
          domain: result.domain,
          techName: tech.name,
          techCategory: tech.category,
          techVersion: tech.version,
          confidence: tech.confidence,
          detectionMethod: tech.detectionMethod,
          evidenceJson: JSON.stringify(tech.evidence),
          detectedAt: new Date(),
          lastSeenAt: new Date(),
        });
      }
    } catch (error) {
      console.error(
        `Error storing tech signature for ${result.domain}:`,
        error,
      );
    }
  }
}

/**
 * Get stored technology signatures for a domain
 */
export async function getTechSignatures(
  domain: string,
): Promise<StoredTechSignature[]> {
  try {
    const results = await db
      .select()
      .from(techSignatures)
      .where(eq(techSignatures.domain, domain))
      .orderBy(desc(techSignatures.confidence));

    return results.map((r) => ({
      ...r,
      evidence: r.evidenceJson ? JSON.parse(r.evidenceJson as string) : [],
    }));
  } catch (error) {
    console.error(`Error fetching tech signatures for ${domain}:`, error);
    return [];
  }
}
