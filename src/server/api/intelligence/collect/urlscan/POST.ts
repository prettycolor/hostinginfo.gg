import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { urlscanResults } from "../../../../db/schema.js";
import { getSecret } from "#secrets";

interface URLScanCollectionRequest {
  domain: string;
  visibility?: "public" | "unlisted" | "private";
}

interface URLScanSubmitResponse {
  message: string;
  uuid: string;
  result: string;
  api: string;
  visibility: string;
  options: Record<string, unknown>;
  url: string;
}

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
 * POST /api/intelligence/collect/urlscan
 *
 * Submits domain to URLScan.io for security scanning and stores results.
 *
 * Uses URLScan.io API (requires URLSCAN_API_KEY secret).
 * Free tier: 1,000 scans/month
 *
 * Request body:
 * {
 *   "domain": "example.com",
 *   "visibility": "public" // optional: public, unlisted, private
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "example.com",
 *   "scanId": "abc123...",
 *   "verdict": "clean",
 *   "score": 0
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain, visibility = "unlisted" } =
      req.body as URLScanCollectionRequest;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Normalize domain
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .split("/")[0];

    console.log(`[URLScan Collection] Starting scan for: ${normalizedDomain}`);

    // Check for API key
    const apiKeySecret = getSecret("URLSCAN_API_KEY");
    const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : null;

    if (!apiKey) {
      console.warn("[URLScan Collection] URLSCAN_API_KEY not configured");
      return res.json({
        success: false,
        domain: normalizedDomain,
        warning:
          "URLSCAN_API_KEY not configured. Add API key to enable security scanning.",
        message:
          "URLScan.io provides malware, phishing, and security threat detection.",
      });
    }

    // Step 1: Submit scan
    let scanUuid: string;
    try {
      const submitResponse = await fetch("https://urlscan.io/api/v1/scan/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API-Key": apiKey,
        },
        body: JSON.stringify({
          url: `https://${normalizedDomain}`,
          visibility,
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error(
          `[URLScan Collection] Submit failed: ${submitResponse.status} - ${errorText}`,
        );
        return res.status(submitResponse.status).json({
          error: "URLScan submission failed",
          message: errorText,
          statusCode: submitResponse.status,
        });
      }

      const submitData = (await submitResponse.json()) as URLScanSubmitResponse;
      scanUuid = submitData.uuid;
      console.log(`[URLScan Collection] Scan submitted: ${scanUuid}`);
    } catch (error) {
      console.error("[URLScan Collection] Submit error:", error);
      return res.status(500).json({
        error: "Failed to submit scan",
        message: "An internal error occurred",
      });
    }

    // Step 2: Wait for scan to complete (URLScan takes ~10-30 seconds)
    console.log("[URLScan Collection] Waiting for scan to complete...");
    await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds

    // Step 3: Fetch results
    let scanResult: URLScanResult;
    try {
      const resultResponse = await fetch(
        `https://urlscan.io/api/v1/result/${scanUuid}/`,
        {
          headers: {
            "API-Key": apiKey,
          },
        },
      );

      if (!resultResponse.ok) {
        console.error(
          `[URLScan Collection] Result fetch failed: ${resultResponse.status}`,
        );

        // If scan is still processing, return pending status
        if (resultResponse.status === 404) {
          return res.json({
            success: true,
            domain: normalizedDomain,
            scanId: scanUuid,
            status: "pending",
            message:
              "Scan is still processing. Results will be available in ~30 seconds.",
            resultUrl: `https://urlscan.io/result/${scanUuid}/`,
          });
        }

        return res.status(resultResponse.status).json({
          error: "Failed to fetch scan results",
          scanId: scanUuid,
        });
      }

      scanResult = (await resultResponse.json()) as URLScanResult;
      console.log(`[URLScan Collection] Results retrieved for ${scanUuid}`);
    } catch (error) {
      console.error("[URLScan Collection] Result fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch scan results",
        message: "An internal error occurred",
        scanId: scanUuid,
      });
    }

    // Step 4: Store results in database
    const scannedAt = new Date();

    try {
      const verdict = scanResult.verdicts?.overall?.malicious
        ? "malicious"
        : "clean";
      const score = scanResult.verdicts?.overall?.score || 0;

      await db.insert(urlscanResults).values({
        domain: normalizedDomain,
        scanId: scanUuid,
        scanUrl: `https://urlscan.io/result/${scanUuid}/`,
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
        tlsVersion: null, // Would need to parse from certificates
        tlsIssuer: null,
        tlsValidFrom: null,
        tlsValidTo: null,
        totalRequests: scanResult.stats?.requests || 0,
        totalDomains: scanResult.lists?.domains?.length || 0,
        totalIps: scanResult.lists?.ips?.length || 0,
        screenshotUrl: `https://urlscan.io/screenshots/${scanUuid}.png`,
        rawData: scanResult,
        scannedAt,
      });

      console.log(
        `[URLScan Collection] Stored results for ${normalizedDomain}`,
      );

      return res.json({
        success: true,
        domain: normalizedDomain,
        scanId: scanUuid,
        verdict,
        score,
        malwareDetected: scanResult.verdicts?.overall?.malicious || false,
        phishingDetected:
          scanResult.verdicts?.overall?.categories?.includes("phishing") ||
          false,
        categories: scanResult.verdicts?.overall?.categories || [],
        tags: scanResult.verdicts?.overall?.tags || [],
        resultUrl: `https://urlscan.io/result/${scanUuid}/`,
        screenshotUrl: `https://urlscan.io/screenshots/${scanUuid}.png`,
        timestamp: scannedAt.toISOString(),
      });
    } catch (error) {
      console.error("[URLScan Collection] Database error:", error);
      return res.status(500).json({
        error: "Failed to store scan results",
        message: "An internal error occurred",
        scanId: scanUuid,
      });
    }
  } catch (error) {
    console.error("[URLScan Collection] Error:", error);
    return res.status(500).json({
      error: "URLScan collection failed",
      message: "An internal error occurred",
    });
  }
}
