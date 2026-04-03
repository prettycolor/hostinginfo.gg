import type { Request, Response } from "express";
import { getWhoisHistory } from "../../../../../lib/intelligence/whois-history.js";

/**
 * GET /api/intelligence/whois/history/:domain
 *
 * Get WHOIS change history for a domain
 *
 * Query params:
 * - limit: Number of records to return (default: 50)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const history = await getWhoisHistory(domain, limit);

    return res.json({
      domain,
      recordCount: history.length,
      history,
    });
  } catch (error) {
    console.error("[WHOIS History API] Error:", error);
    return res.status(500).json({
      error: "Failed to get WHOIS history",
      message: "An internal error occurred",
    });
  }
}
