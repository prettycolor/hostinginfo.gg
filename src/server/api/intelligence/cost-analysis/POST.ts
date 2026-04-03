/**
 * Cost Analysis API
 * POST /api/intelligence/cost-analysis
 *
 * Analyzes hosting costs and identifies optimization opportunities
 */

import type { Request, Response } from "express";
import { CostAnalysisEngine } from "../../../../lib/engines/cost-analysis-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { hosting, dns, ip, tech } = req.body;

    if (!hosting && !dns && !ip && !tech) {
      return res.status(400).json({
        success: false,
        error:
          "At least one scan data type is required (hosting, dns, ip, or tech)",
      });
    }

    // Analyze costs
    const costAnalysis = CostAnalysisEngine.analyzeCosts({
      hosting,
      dns,
      ip,
      tech,
    });

    res.json({
      success: true,
      costAnalysis,
    });
  } catch (error) {
    console.error("Error analyzing costs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze costs",
      message: "An internal error occurred",
    });
  }
}
