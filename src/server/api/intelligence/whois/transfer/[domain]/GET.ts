import type { Request, Response } from "express";
import { detectRecentTransfer } from "../../../../../lib/intelligence/whois-history.js";

/**
 * GET /api/intelligence/whois/transfer/:domain
 *
 * Detect if domain has been transferred recently
 *
 * Query params:
 * - days: Number of days to look back (default: 90)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const days = req.query.days ? parseInt(String(req.query.days)) : 90;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const transfer = await detectRecentTransfer(domain, days);

    return res.json(transfer);
  } catch (error) {
    console.error("[Transfer Detection API] Error:", error);
    return res.status(500).json({
      error: "Failed to detect transfer",
      message: "An internal error occurred",
    });
  }
}
