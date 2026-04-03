import type { Request, Response } from "express";
import { analyzeProvider } from "../../../../../lib/intelligence/infrastructure-attribution.js";

/**
 * GET /api/intelligence/infrastructure/provider/:provider
 *
 * Analyze all domains using a specific hosting provider
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { provider } = req.params;

    if (!provider) {
      return res.status(400).json({
        error: "Provider parameter is required",
      });
    }

    const analysis = await analyzeProvider(decodeURIComponent(provider));

    if (!analysis) {
      return res.status(404).json({
        error: "Provider not found",
        message: "Unknown provider or no data available",
      });
    }

    return res.json(analysis);
  } catch (error) {
    console.error("[Provider Analysis API] Error:", error);
    return res.status(500).json({
      error: "Failed to analyze provider",
      message: "An internal error occurred",
    });
  }
}
