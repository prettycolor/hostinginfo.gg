import type { Request, Response } from "express";
import { PerformanceScoringEngine } from "../../../../lib/engines/performance-scoring-engine.js";

/**
 * POST /api/intelligence/performance
 *
 * Calculate performance score for scan data
 *
 * Body:
 * {
 *   hosting: { ... },
 *   dns: { ... },
 *   ip: { ... },
 *   tech: { ... }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   score: {
 *     overall: 85,
 *     security: 90,
 *     technology: 80,
 *     infrastructure: 85,
 *     reliability: 88,
 *     grade: 'A',
 *     breakdown: [...],
 *     recommendations: [...]
 *   }
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { hosting, dns, ip, tech } = req.body;

    if (!hosting || !dns || !ip || !tech) {
      return res.status(400).json({
        success: false,
        error: "Missing required scan data (hosting, dns, ip, tech)",
      });
    }

    const score = PerformanceScoringEngine.calculateScore({
      hosting,
      dns,
      ip,
      tech,
    });

    res.json({
      success: true,
      score,
    });
  } catch (error) {
    console.error("Performance scoring failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate performance score",
      message: "An internal error occurred",
    });
  }
}
