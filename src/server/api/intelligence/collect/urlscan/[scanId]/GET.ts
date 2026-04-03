import type { Request, Response } from "express";
import { db } from "../../../../../db/client.js";
import { urlscanResults } from "../../../../../db/schema.js";
import { eq } from "drizzle-orm";
import { getSecret } from "#secrets";

interface URLScanResult {
  task: {
    uuid: string;
    time: string;
    url: string;
    visibility: string;
    method: string;
  };
  page: {
    url: string;
    domain: string;
    country: string;
    city: string;
    server: string;
    ip: string;
    asn: string;
    asnname: string;
  };
  stats: {
    malicious: number;
    totalLinks: number;
    secureRequests: number;
    securePercentage: number;
    IPv6Percentage: number;
    uniqCountries: number;
    dataLength: number;
    encodedDataLength: number;
    requests: number;
  };
  verdicts: {
    overall: {
      score: number;
      categories: string[];
      brands: string[];
      tags: string[];
      malicious: boolean;
      hasVerdicts: number;
    };
    urlscan: {
      score: number;
      categories: string[];
      brands: string[];
      tags: string[];
      malicious: boolean;
    };
    engines: {
      score: number;
      malicious: boolean;
      maliciousTotal: number;
      benignTotal: number;
      verdicts: unknown[];
    };
    community: {
      score: number;
      votes: unknown[];
      votesMalicious: number;
      votesBenign: number;
      votesTotal: number;
    };
  };
  meta: {
    processors: Record<string, unknown>;
  };
  lists: {
    ips: string[];
    countries: string[];
    asns: string[];
    domains: string[];
    servers: string[];
    urls: string[];
    linkDomains: string[];
    certificates: unknown[];
    hashes: string[];
  };
}

/**
 * GET /api/intelligence/collect/urlscan/:scanId
 *
 * Retrieves results for a pending URLScan.io scan.
 *
 * Use this endpoint to check the status of a scan that was submitted
 * but returned a "pending" status.
 *
 * Response:
 * {
 *   "success": true,
 *   "status": "complete" | "pending",
 *   "verdict": "clean" | "malicious",
 *   "score": 0-100
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { scanId } = req.params;

    if (!scanId) {
      return res.status(400).json({ error: "Scan ID is required" });
    }

    console.log(`[URLScan Retrieval] Fetching results for scan: ${scanId}`);

    // Check if results already exist in database
    const existingResult = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.scanId, scanId))
      .limit(1);

    if (existingResult.length > 0) {
      const result = existingResult[0];
      console.log(`[URLScan Retrieval] Found cached results for ${scanId}`);

      return res.json({
        success: true,
        status: "complete",
        domain: result.domain,
        scanId: result.scanId,
        verdict: result.verdict,
        score: result.score,
        malwareDetected: result.malwareDetected,
        phishingDetected: result.phishingDetected,
        categories: Array.isArray(result.categories) ? result.categories : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
        resultUrl: result.scanUrl,
        screenshotUrl: result.screenshotUrl,
        timestamp: result.scannedAt?.toISOString(),
        cached: true,
      });
    }

    // Fetch from URLScan API
    const apiKeySecret = getSecret("URLSCAN_API_KEY");
    const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : "";

    if (!apiKey) {
      return res.status(400).json({
        error: "URLSCAN_API_KEY not configured",
        message: "Add API key to retrieve scan results",
      });
    }

    try {
      const resultResponse = await fetch(
        `https://urlscan.io/api/v1/result/${scanId}/`,
        {
          headers: {
            "API-Key": apiKey,
          },
        },
      );

      if (!resultResponse.ok) {
        // If scan is still processing
        if (resultResponse.status === 404) {
          return res.json({
            success: true,
            status: "pending",
            scanId,
            message: "Scan is still processing. Try again in a few seconds.",
            resultUrl: `https://urlscan.io/result/${scanId}/`,
          });
        }

        return res.status(resultResponse.status).json({
          error: "Failed to fetch scan results",
          scanId,
          statusCode: resultResponse.status,
        });
      }

      const scanResult = (await resultResponse.json()) as URLScanResult;
      console.log(`[URLScan Retrieval] Results retrieved for ${scanId}`);

      // Store results in database
      const scannedAt = new Date();
      const verdict = scanResult.verdicts?.overall?.malicious
        ? "malicious"
        : "clean";
      const score = scanResult.verdicts?.overall?.score || 0;
      const domain =
        scanResult.page?.domain ||
        scanResult.task?.url?.replace(/^https?:\/\//, "").split("/")[0] ||
        "unknown";

      await db.insert(urlscanResults).values({
        domain,
        scanId,
        scanUrl: `https://urlscan.io/result/${scanId}/`,
        verdict,
        score,
        malwareDetected: scanResult.verdicts?.overall?.malicious || false,
        phishingDetected:
          scanResult.verdicts?.overall?.categories?.includes("phishing") ||
          false,
        suspiciousActivity: (scanResult.verdicts?.overall?.score || 0) > 50,
        categories: scanResult.verdicts?.overall?.categories || null,
        tags: scanResult.verdicts?.overall?.tags || null,
        ipAddress: scanResult.page?.ip || null,
        asn: scanResult.page?.asn || null,
        country: scanResult.page?.country || null,
        server: scanResult.page?.server || null,
        tlsVersion: null,
        tlsIssuer: null,
        tlsValidFrom: null,
        tlsValidTo: null,
        totalRequests: scanResult.stats?.requests || 0,
        totalDomains: scanResult.lists?.domains?.length || 0,
        totalIps: scanResult.lists?.ips?.length || 0,
        screenshotUrl: `https://urlscan.io/screenshots/${scanId}.png`,
        rawData: scanResult,
        scannedAt,
      });

      console.log(`[URLScan Retrieval] Stored results for ${domain}`);

      return res.json({
        success: true,
        status: "complete",
        domain,
        scanId,
        verdict,
        score,
        malwareDetected: scanResult.verdicts?.overall?.malicious || false,
        phishingDetected:
          scanResult.verdicts?.overall?.categories?.includes("phishing") ||
          false,
        categories: scanResult.verdicts?.overall?.categories || [],
        tags: scanResult.verdicts?.overall?.tags || [],
        resultUrl: `https://urlscan.io/result/${scanId}/`,
        screenshotUrl: `https://urlscan.io/screenshots/${scanId}.png`,
        timestamp: scannedAt.toISOString(),
        cached: false,
      });
    } catch (error) {
      console.error("[URLScan Retrieval] Fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch scan results",
        message: "An internal error occurred",
        scanId,
      });
    }
  } catch (error) {
    console.error("[URLScan Retrieval] Error:", error);
    return res.status(500).json({
      error: "URLScan retrieval failed",
      message: "An internal error occurred",
    });
  }
}
