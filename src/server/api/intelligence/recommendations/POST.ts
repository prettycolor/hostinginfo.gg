/**
 * Hosting Recommendations API
 * POST /api/intelligence/recommendations
 *
 * Generates AI-powered hosting recommendations based on scan data
 */

import type { Request, Response } from "express";
import { HostingRecommendationsEngine } from "../../../../lib/engines/hosting-recommendations-engine.js";

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

    // Generate recommendations
    const recommendations =
      HostingRecommendationsEngine.generateRecommendations({
        hosting,
        dns,
        ip,
        tech,
      });

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error generating hosting recommendations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate hosting recommendations",
      message: "An internal error occurred",
    });
  }
}
