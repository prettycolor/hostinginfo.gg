import type { Request, Response } from "express";

interface CollectAllRequest {
  domain: string;
}

interface CollectionResult {
  service: string;
  success: boolean;
  recordsCollected?: number;
  error?: string;
  warning?: string;
  duration: number;
}

/**
 * POST /api/intelligence/collect/all
 *
 * Orchestrator endpoint that triggers all intelligence data collection in parallel.
 *
 * This endpoint calls:
 * - DNS collection (built-in, no API key)
 * - IP intelligence (requires IPINFO_API_KEY)
 * - WHOIS collection (built-in, no API key)
 * - Technology detection (requires WAPPALYZER_API_KEY, has fallback)
 * - URLScan security scan (requires URLSCAN_API_KEY)
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
 *   "results": [
 *     { "service": "dns", "success": true, "recordsCollected": 15, "duration": 234 },
 *     { "service": "ip", "success": true, "recordsCollected": 2, "duration": 456 },
 *     ...
 *   ],
 *   "totalDuration": 1234,
 *   "successCount": 5,
 *   "failureCount": 0
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body as CollectAllRequest;

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
      `[Intelligence Orchestrator] Starting full collection for: ${normalizedDomain}`,
    );

    const startTime = Date.now();
    const results: CollectionResult[] = [];

    // Define collection tasks
    const collections = [
      {
        name: "dns",
        endpoint: "/api/intelligence/collect/dns",
        description: "DNS Records",
      },
      {
        name: "ip",
        endpoint: "/api/intelligence/collect/ip",
        description: "IP Intelligence",
      },
      {
        name: "whois",
        endpoint: "/api/intelligence/collect/whois",
        description: "WHOIS Data",
      },
      {
        name: "technology",
        endpoint: "/api/intelligence/collect/technology",
        description: "Technology Stack",
      },
      {
        name: "urlscan",
        endpoint: "/api/intelligence/collect/urlscan",
        description: "Security Scan",
      },
    ];

    // Execute all collections in parallel
    const collectionPromises = collections.map(async (collection) => {
      const collectionStart = Date.now();

      try {
        console.log(
          `[Intelligence Orchestrator] Starting ${collection.description}...`,
        );

        // Make internal API call
        const baseUrl = process.env.API_BASE_URL || "http://localhost:20000";
        const response = await fetch(`${baseUrl}${collection.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: normalizedDomain }),
        });

        const duration = Date.now() - collectionStart;
        const data = await response.json();

        if (response.ok && data.success !== false) {
          console.log(
            `[Intelligence Orchestrator] ${collection.description} completed (${duration}ms)`,
          );

          return {
            service: collection.name,
            success: true,
            recordsCollected:
              data.recordsCollected || data.technologiesDetected || 1,
            duration,
            warning: data.warning,
          } as CollectionResult;
        } else {
          console.error(
            `[Intelligence Orchestrator] ${collection.description} failed:`,
            data.error || data.message,
          );

          return {
            service: collection.name,
            success: false,
            error: data.error || data.message || "Unknown error",
            warning: data.warning,
            duration,
          } as CollectionResult;
        }
      } catch (error) {
        const duration = Date.now() - collectionStart;
        console.error(
          `[Intelligence Orchestrator] ${collection.description} exception:`,
          error,
        );

        return {
          service: collection.name,
          success: false,
          error: String(error),
          duration,
        } as CollectionResult;
      }
    });

    // Wait for all collections to complete
    const collectionResults = await Promise.all(collectionPromises);
    results.push(...collectionResults);

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[Intelligence Orchestrator] Collection complete: ${successCount} succeeded, ${failureCount} failed (${totalDuration}ms)`,
    );

    // Return results
    return res.json({
      success: true,
      domain: normalizedDomain,
      results,
      totalDuration,
      successCount,
      failureCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Intelligence Orchestrator] Error:", error);
    return res.status(500).json({
      error: "Intelligence collection orchestration failed",
      message: "An internal error occurred",
    });
  }
}
