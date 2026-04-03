import type { Request, Response } from "express";
import { getRegistrarMarketAnalysis } from "../../../../lib/intelligence/registrar-analysis.js";

/**
 * GET /api/intelligence/registrar/market
 *
 * Get registrar market analysis from your domain portfolio
 */
export default async function handler(req: Request, res: Response) {
  try {
    const analysis = await getRegistrarMarketAnalysis();

    if (!analysis) {
      return res.status(500).json({
        error: "Failed to generate market analysis",
      });
    }

    return res.json(analysis);
  } catch (error) {
    console.error("[Registrar Market API] Error:", error);
    return res.status(500).json({
      error: "Failed to get market analysis",
      message: "An internal error occurred",
    });
  }
}
