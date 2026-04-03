import type { Request, Response } from "express";
import {
  findDomainsByOrganization,
  getOwnershipIndicators,
} from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/by-org/:org
 *
 * Find all domains owned by an organization
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { org } = req.params;

    if (!org) {
      return res.status(400).json({
        error: "Organization parameter is required",
      });
    }

    const domains = await findDomainsByOrganization(decodeURIComponent(org));

    // Get detailed indicators for each domain
    const domainsWithIndicators = await Promise.all(
      domains.slice(0, 50).map(async (domain) => {
        const indicators = await getOwnershipIndicators(domain);
        return {
          domain,
          indicators: indicators.filter((ind) => ind.type === "organization"),
        };
      }),
    );

    return res.json({
      organization: decodeURIComponent(org),
      totalDomains: domains.length,
      domains: domainsWithIndicators,
      hasMore: domains.length > 50,
    });
  } catch (error) {
    console.error("[Ownership by Org API] Error:", error);
    return res.status(500).json({
      error: "Failed to find domains by organization",
      message: "An internal error occurred",
    });
  }
}
