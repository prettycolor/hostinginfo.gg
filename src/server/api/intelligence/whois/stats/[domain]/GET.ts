import type { Request, Response } from "express";
import { getChangeStatistics } from "../../../../../lib/intelligence/whois-history.js";

/**
 * GET /api/intelligence/whois/stats/:domain
 *
 * Get change statistics for a domain
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const stats = await getChangeStatistics(domain);

    if (!stats) {
      return res.status(404).json({
        error: "No statistics available",
        message: "Domain has not been scanned yet",
      });
    }

    return res.json(stats);
  } catch (error) {
    console.error("[WHOIS Stats API] Error:", error);
    return res.status(500).json({
      error: "Failed to get statistics",
      message: "An internal error occurred",
    });
  }
}
