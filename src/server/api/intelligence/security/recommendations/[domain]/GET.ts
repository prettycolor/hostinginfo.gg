import type { Request, Response } from "express";
import { calculateSecurityScore } from "../../../../../lib/intelligence/security-scoring.js";

/**
 * GET /api/intelligence/security/recommendations/:domain
 *
 * Get prioritized security recommendations for a domain
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const score = await calculateSecurityScore(domain);

    if (!score) {
      return res.status(404).json({
        error: "Recommendations unavailable",
        message: "Domain has not been scanned yet or insufficient data",
      });
    }

    // Return recommendations with summary
    return res.json({
      domain,
      currentScore: score.overallScore,
      grade: score.grade,
      maxPotentialScore: Math.min(
        100,
        score.overallScore +
          score.recommendations.reduce(
            (sum, r) => sum + r.potentialScoreGain,
            0,
          ),
      ),
      recommendations: score.recommendations.slice(0, limit),
      totalRecommendations: score.recommendations.length,
    });
  } catch (error) {
    console.error("[Security Recommendations API] Error:", error);
    return res.status(500).json({
      error: "Failed to get security recommendations",
      message: "An internal error occurred",
    });
  }
}
