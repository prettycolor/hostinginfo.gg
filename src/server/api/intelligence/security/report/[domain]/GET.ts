import type { Request, Response } from "express";
import { generateDetailedSecurityReport } from "../../../../../lib/intelligence/security-scoring.js";

/**
 * GET /api/intelligence/security/report/:domain
 *
 * Generate detailed security report with all analysis categories
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const report = await generateDetailedSecurityReport(domain);

    if (!report) {
      return res.status(404).json({
        error: "Security report unavailable",
        message: "Domain has not been scanned yet or insufficient data",
      });
    }

    return res.json(report);
  } catch (error) {
    console.error("[Security Report API] Error:", error);
    return res.status(500).json({
      error: "Failed to generate security report",
      message: "An internal error occurred",
    });
  }
}
