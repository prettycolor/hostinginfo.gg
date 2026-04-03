import type { Request, Response } from "express";
import { buildTimeline } from "../../../../../lib/intelligence/whois-history.js";

/**
 * GET /api/intelligence/whois/timeline/:domain
 *
 * Get visual timeline of WHOIS events for a domain
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const timeline = await buildTimeline(domain);

    if (!timeline) {
      return res.status(404).json({
        error: "No WHOIS history found",
        message: "Domain has not been scanned yet",
      });
    }

    return res.json(timeline);
  } catch (error) {
    console.error("[WHOIS Timeline API] Error:", error);
    return res.status(500).json({
      error: "Failed to build timeline",
      message: "An internal error occurred",
    });
  }
}
