import type { Request, Response } from "express";
import { compareRegistrars } from "../../../../lib/intelligence/registrar-analysis.js";

/**
 * POST /api/intelligence/registrar/compare
 *
 * Compare multiple registrars
 *
 * Body:
 * {
 *   "registrars": ["HostingInfo", "Namecheap", "Cloudflare"]
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { registrars } = req.body;

    if (!registrars || !Array.isArray(registrars) || registrars.length < 2) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Provide at least 2 registrars to compare",
      });
    }

    if (registrars.length > 10) {
      return res.status(400).json({
        error: "Too many registrars",
        message: "Maximum 10 registrars can be compared at once",
      });
    }

    const comparison = compareRegistrars(registrars);

    return res.json(comparison);
  } catch (error) {
    console.error("[Registrar Comparison API] Error:", error);
    return res.status(500).json({
      error: "Failed to compare registrars",
      message: "An internal error occurred",
    });
  }
}
