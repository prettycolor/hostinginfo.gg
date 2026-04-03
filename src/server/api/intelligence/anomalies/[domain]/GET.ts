/**
 * Anomaly Detection API Endpoint
 *
 * GET /api/intelligence/anomalies/:domain
 *
 * Detects unusual patterns in domain intelligence data.
 *
 * @example
 * GET /api/intelligence/anomalies/google.com
 *
 * Response:
 * {
 *   "domain": "google.com",
 *   "analyzedAt": "2026-02-07T02:00:00.000Z",
 *   "anomalies": [...],
 *   "summary": {
 *     "totalAnomalies": 3,
 *     "criticalCount": 0,
 *     "highCount": 1,
 *     "mediumCount": 2,
 *     "lowCount": 0,
 *     "overallRisk": "medium",
 *     "requiresImmediateAction": false
 *   },
 *   "dnsAnomalies": [...],
 *   "ipAnomalies": [...],
 *   "whoisAnomalies": [...],
 *   "technologyAnomalies": [...],
 *   "securityAnomalies": [...]
 * }
 */

import type { Request, Response } from "express";
import { analyzeAnomalies } from "../../../../lib/intelligence/anomaly-detector.js";

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    // Validate domain
    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({
        error: "Invalid domain",
        message: "Please provide a valid domain name (e.g., example.com)",
      });
    }

    // Perform anomaly detection
    const analysis = await analyzeAnomalies(domain);

    // Return analysis even if no anomalies found (empty arrays are valid)
    res.json(analysis);
  } catch (error) {
    console.error("Anomaly detection error:", error);
    res.status(500).json({
      error: "Anomaly detection failed",
      message: "An internal error occurred",
    });
  }
}
