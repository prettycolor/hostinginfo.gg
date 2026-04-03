import type { Request, Response } from "express";
import { findDomainsOnIP } from "../../../../../lib/intelligence/infrastructure-attribution.js";

/**
 * GET /api/intelligence/infrastructure/shared/:ip
 *
 * Find all domains hosted on a specific IP address
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({
        error: "IP address parameter is required",
      });
    }

    const domains = await findDomainsOnIP(ip);

    return res.json({
      ipAddress: ip,
      domainCount: domains.length,
      domains,
      isShared: domains.length > 1,
    });
  } catch (error) {
    console.error("[Shared Infrastructure API] Error:", error);
    return res.status(500).json({
      error: "Failed to find domains on IP",
      message: "An internal error occurred",
    });
  }
}
