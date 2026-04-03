import type { Request, Response } from "express";
import { findRelatedDomains } from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/related/:domain
 *
 * Find all domains related to a specific domain based on ownership indicators
 *
 * Query params:
 * - minConfidence: Minimum confidence score (0-100, default: 60)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const minConfidence = req.query.minConfidence
      ? parseInt(String(req.query.minConfidence), 10)
      : 60;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    if (minConfidence < 0 || minConfidence > 100) {
      return res.status(400).json({
        error: "minConfidence must be between 0 and 100",
      });
    }

    const relationships = await findRelatedDomains(domain, minConfidence);

    // Group by relationship strength
    const strong = relationships.filter((r) => r.strength === "strong");
    const moderate = relationships.filter((r) => r.strength === "moderate");
    const weak = relationships.filter((r) => r.strength === "weak");

    return res.json({
      domain,
      minConfidence,
      totalRelated: relationships.length,
      summary: {
        strong: strong.length,
        moderate: moderate.length,
        weak: weak.length,
      },
      relationships: {
        strong,
        moderate,
        weak,
      },
    });
  } catch (error) {
    console.error("[Related Domains API] Error:", error);
    return res.status(500).json({
      error: "Failed to find related domains",
      message: "An internal error occurred",
    });
  }
}
