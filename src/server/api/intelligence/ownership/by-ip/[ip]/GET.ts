import type { Request, Response } from "express";
import {
  findDomainsByIP,
  getOwnershipIndicators,
} from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/by-ip/:ip
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

    const domains = await findDomainsByIP(ip);

    // Get detailed indicators for each domain
    const domainsWithIndicators = await Promise.all(
      domains.slice(0, 50).map(async (domain) => {
        const indicators = await getOwnershipIndicators(domain);
        return {
          domain,
          indicators: indicators.filter((ind) => ind.type === "ip"),
        };
      }),
    );

    return res.json({
      ip: ip,
      totalDomains: domains.length,
      domains: domainsWithIndicators,
      hasMore: domains.length > 50,
    });
  } catch (error) {
    console.error("[Ownership by IP API] Error:", error);
    return res.status(500).json({
      error: "Failed to find domains by IP",
      message: "An internal error occurred",
    });
  }
}
