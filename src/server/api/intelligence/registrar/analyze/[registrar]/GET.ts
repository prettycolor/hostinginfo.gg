import type { Request, Response } from "express";
import { analyzeRegistrar } from "../../../../../lib/intelligence/registrar-analysis.js";

/**
 * GET /api/intelligence/registrar/analyze/:registrar
 *
 * Analyze a specific registrar and get recommendations
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { registrar } = req.params;

    if (!registrar) {
      return res.status(400).json({
        error: "Registrar parameter is required",
      });
    }

    const analysis = await analyzeRegistrar(decodeURIComponent(registrar));

    return res.json(analysis);
  } catch (error) {
    console.error("[Registrar Analysis API] Error:", error);
    return res.status(500).json({
      error: "Failed to analyze registrar",
      message: "An internal error occurred",
    });
  }
}
