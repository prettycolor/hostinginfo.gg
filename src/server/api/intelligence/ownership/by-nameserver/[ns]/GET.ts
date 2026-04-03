import type { Request, Response } from "express";
import {
  findDomainsByNameserver,
  getOwnershipIndicators,
} from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/by-nameserver/:ns
 *
 * Find all domains using a specific nameserver
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { ns } = req.params;

    if (!ns) {
      return res.status(400).json({
        error: "Nameserver parameter is required",
      });
    }

    const domains = await findDomainsByNameserver(decodeURIComponent(ns));

    // Get detailed indicators for each domain
    const domainsWithIndicators = await Promise.all(
      domains.slice(0, 50).map(async (domain) => {
        const indicators = await getOwnershipIndicators(domain);
        return {
          domain,
          indicators: indicators.filter((ind) => ind.type === "nameserver"),
        };
      }),
    );

    return res.json({
      nameserver: decodeURIComponent(ns),
      totalDomains: domains.length,
      domains: domainsWithIndicators,
      hasMore: domains.length > 50,
    });
  } catch (error) {
    console.error("[Ownership by Nameserver API] Error:", error);
    return res.status(500).json({
      error: "Failed to find domains by nameserver",
      message: "An internal error occurred",
    });
  }
}
