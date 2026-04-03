import type { Request, Response } from "express";
import { getTransferRecommendation } from "../../../../../lib/intelligence/registrar-analysis.js";

/**
 * GET /api/intelligence/registrar/transfer/:registrar
 *
 * Get transfer recommendation for a registrar
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { registrar } = req.params;

    if (!registrar) {
      return res.status(400).json({
        error: "Registrar parameter is required",
      });
    }

    const recommendation = await getTransferRecommendation(
      decodeURIComponent(registrar),
    );

    if (!recommendation) {
      return res.status(404).json({
        error: "No transfer recommendation available",
        message: "Registrar profile not found",
      });
    }

    return res.json(recommendation);
  } catch (error) {
    console.error("[Transfer Recommendation API] Error:", error);
    return res.status(500).json({
      error: "Failed to get transfer recommendation",
      message: "An internal error occurred",
    });
  }
}
