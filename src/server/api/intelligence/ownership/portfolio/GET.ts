import type { Request, Response } from "express";
import { analyzePortfolio } from "../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/portfolio
 *
 * Analyze domain portfolio for an owner
 *
 * Query params:
 * - email: Owner email address
 * - org: Organization name
 */
export default async function handler(req: Request, res: Response) {
  try {
    const email = req.query.email ? String(req.query.email) : undefined;
    const org = req.query.org ? String(req.query.org) : undefined;

    if (!email && !org) {
      return res.status(400).json({
        error: "Either email or org parameter is required",
      });
    }

    // For now, just analyze all domains in the database
    // In the future, we can filter by email/org
    const portfolio = await analyzePortfolio();

    if (!portfolio) {
      return res.status(404).json({
        error: "No portfolio found",
        message: "No domains found for this owner",
      });
    }

    return res.json(portfolio);
  } catch (error) {
    console.error("[Portfolio Analysis API] Error:", error);
    return res.status(500).json({
      error: "Failed to analyze portfolio",
      message: "An internal error occurred",
    });
  }
}
