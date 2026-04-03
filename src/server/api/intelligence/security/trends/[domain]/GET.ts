/**
 * GET /api/intelligence/security/trends/:domain
 *
 * Get security score trends over time
 *
 * Query Parameters:
 * - days: Number of days to look back (default: 90)
 *
 * Returns:
 * - Historical security assessments
 * - Trend direction (improving/stable/declining)
 * - Change rate (points per month)
 * - Projected future score
 */

import type { Request, Response } from "express";
import { trackSecurityTrend } from "../../../../../lib/security-posture-scoring.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const days = parseInt(req.query.days as string) || 90;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    if (days < 1 || days > 365) {
      return res.status(400).json({ error: "Days must be between 1 and 365" });
    }

    // Get security trends
    const trends = await trackSecurityTrend(domain, days);

    res.json(trends);
  } catch (error) {
    console.error("Error fetching security trends:", error);
    res.status(500).json({
      error: "Failed to fetch security trends",
      message: "An internal error occurred",
    });
  }
}
