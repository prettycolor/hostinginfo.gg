/**
 * POST /api/intelligence/report/batch
 *
 * Generate comprehensive reports for multiple domains
 *
 * Request Body:
 * {
 *   "domains": ["example.com", "example.net", "example.org"]
 * }
 *
 * Returns:
 * - Array of comprehensive reports
 * - One report per domain
 */

import type { Request, Response } from "express";
import { generateBatchReports } from "../../../../lib/comprehensive-report.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: "domains array is required" });
    }

    if (domains.length === 0) {
      return res.status(400).json({ error: "At least 1 domain is required" });
    }

    if (domains.length > 20) {
      return res.status(400).json({ error: "Maximum 20 domains allowed" });
    }

    // Generate batch reports
    const reports = await generateBatchReports(domains);

    res.json({ reports });
  } catch (error) {
    console.error("Error generating batch reports:", error);
    res.status(500).json({
      error: "Failed to generate batch reports",
      message: "An internal error occurred",
    });
  }
}
