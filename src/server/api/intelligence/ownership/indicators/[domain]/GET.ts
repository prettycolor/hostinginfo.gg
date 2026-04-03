import type { Request, Response } from "express";
import { getOwnershipIndicators } from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/indicators/:domain
 *
 * Get all ownership indicators for a domain
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const indicators = await getOwnershipIndicators(domain);

    if (indicators.length === 0) {
      return res.status(404).json({
        error: "No ownership data found",
        message: "Domain has not been scanned yet",
      });
    }

    // Group indicators by type
    const grouped = {
      email: indicators.filter((i) => i.type === "email"),
      name: indicators.filter((i) => i.type === "name"),
      organization: indicators.filter((i) => i.type === "organization"),
      nameserver: indicators.filter((i) => i.type === "nameserver"),
      ip: indicators.filter((i) => i.type === "ip"),
      registrar: indicators.filter((i) => i.type === "registrar"),
    };

    // Calculate average confidence
    const avgConfidence =
      indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;

    return res.json({
      domain,
      totalIndicators: indicators.length,
      averageConfidence: Math.round(avgConfidence),
      indicators: grouped,
      allIndicators: indicators,
    });
  } catch (error) {
    console.error("[Ownership Indicators API] Error:", error);
    return res.status(500).json({
      error: "Failed to get ownership indicators",
      message: "An internal error occurred",
    });
  }
}
