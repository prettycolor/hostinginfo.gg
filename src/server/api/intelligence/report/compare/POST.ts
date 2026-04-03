/**
 * POST /api/intelligence/report/compare
 *
 * Compare comprehensive reports across multiple domains
 *
 * Request Body:
 * {
 *   "domains": ["example.com", "example.net", "example.org"]
 * }
 *
 * Returns:
 * - Individual reports for all domains
 * - Comparison metrics:
 *   - Average health score
 *   - Total critical/high priority issues
 *   - Common risks across domains
 *   - Best/worst performers
 */

import type { Request, Response } from "express";
import { compareReports } from "../../../../lib/comprehensive-report.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: "domains array is required" });
    }

    if (domains.length < 2) {
      return res
        .status(400)
        .json({ error: "At least 2 domains are required for comparison" });
    }

    if (domains.length > 10) {
      return res
        .status(400)
        .json({ error: "Maximum 10 domains allowed for comparison" });
    }

    // Compare reports
    const comparison = await compareReports(domains);

    res.json(comparison);
  } catch (error) {
    console.error("Error comparing reports:", error);
    res.status(500).json({
      error: "Failed to compare reports",
      message: "An internal error occurred",
    });
  }
}
