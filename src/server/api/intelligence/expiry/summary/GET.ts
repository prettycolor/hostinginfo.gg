import type { Request, Response } from "express";
import { getExpirySummary } from "../../../../lib/intelligence/expiry-monitor.js";

/**
 * GET /api/intelligence/expiry/summary
 *
 * Get summary statistics for domain expiry monitoring
 *
 * Response:
 * {
 *   "total": 10,
 *   "critical": 2,
 *   "high": 3,
 *   "medium": 3,
 *   "low": 2,
 *   "expiring30Days": 2,
 *   "expiring60Days": 3,
 *   "expiring90Days": 5,
 *   "expired": 0,
 *   "inGracePeriod": 0,
 *   "inRedemption": 0,
 *   "autoRenewalEnabled": 5
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const summary = await getExpirySummary();

    if (!summary) {
      return res.status(500).json({
        error: "Failed to generate expiry summary",
      });
    }

    return res.json(summary);
  } catch (error) {
    console.error("[Expiry Summary API] Error:", error);
    return res.status(500).json({
      error: "Failed to get expiry summary",
      message: "An internal error occurred",
    });
  }
}
