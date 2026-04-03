/**
 * Predictive Analytics API Endpoint
 *
 * GET /api/intelligence/predictions/:domain
 *
 * Predicts future issues and risks based on historical intelligence data.
 *
 * @example
 * GET /api/intelligence/predictions/google.com
 *
 * Response:
 * {
 *   "domain": "google.com",
 *   "analyzedAt": "2026-02-07T02:00:00.000Z",
 *   "predictions": [...],
 *   "summary": {
 *     "totalPredictions": 5,
 *     "criticalCount": 1,
 *     "highCount": 2,
 *     "mediumCount": 2,
 *     "lowCount": 0,
 *     "overallRisk": "high",
 *     "nearTermPredictions": [...],
 *     "recommendedActions": [...]
 *   },
 *   "expiryPredictions": [...],
 *   "dnsPredictions": [...],
 *   "technologyPredictions": [...],
 *   "securityPredictions": [...],
 *   "performancePredictions": [...]
 * }
 */

import type { Request, Response } from "express";
import { analyzePredictions } from "../../../../lib/intelligence/predictive-analytics.js";

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

    // Perform predictive analysis
    const analysis = await analyzePredictions(domain);

    // Return analysis even if no predictions found (empty arrays are valid)
    res.json(analysis);
  } catch (error) {
    console.error("Predictive analysis error:", error);
    res.status(500).json({
      error: "Predictive analysis failed",
      message: "An internal error occurred",
    });
  }
}
