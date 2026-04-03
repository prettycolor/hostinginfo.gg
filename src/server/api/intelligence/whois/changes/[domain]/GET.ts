import type { Request, Response } from "express";
import { getRecentChanges } from "../../../../../lib/intelligence/whois-history.js";

/**
 * GET /api/intelligence/whois/changes/:domain
 *
 * Get recent WHOIS changes for a domain
 *
 * Query params:
 * - days: Number of days to look back (default: 30)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const days = req.query.days ? parseInt(String(req.query.days)) : 30;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const changes = await getRecentChanges(domain, days);

    return res.json({
      domain,
      daysBack: days,
      changeCount: changes.length,
      changes,
    });
  } catch (error) {
    console.error("[WHOIS Changes API] Error:", error);
    return res.status(500).json({
      error: "Failed to get recent changes",
      message: "An internal error occurred",
    });
  }
}
