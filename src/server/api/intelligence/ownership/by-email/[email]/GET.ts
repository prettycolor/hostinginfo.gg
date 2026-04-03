import type { Request, Response } from "express";
import {
  findDomainsByEmail,
  getOwnershipIndicators,
} from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/by-email/:email
 *
 * Find all domains owned by a specific email address
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        error: "Email parameter is required",
      });
    }

    const domains = await findDomainsByEmail(decodeURIComponent(email));

    // Get detailed indicators for each domain
    const domainsWithIndicators = await Promise.all(
      domains.slice(0, 50).map(async (domain) => {
        const indicators = await getOwnershipIndicators(domain);
        return {
          domain,
          indicators: indicators.filter((ind) => ind.type === "email"),
        };
      }),
    );

    return res.json({
      email: decodeURIComponent(email),
      totalDomains: domains.length,
      domains: domainsWithIndicators,
      hasMore: domains.length > 50,
    });
  } catch (error) {
    console.error("[Ownership by Email API] Error:", error);
    return res.status(500).json({
      error: "Failed to find domains by email",
      message: "An internal error occurred",
    });
  }
}
