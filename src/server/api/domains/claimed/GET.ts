import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { claimedDomains } from "../../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * GET /api/domains/claimed
 * Get all domains claimed by the authenticated user
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Fetch all claimed domains for this user
    const domains = await db
      .select()
      .from(claimedDomains)
      .where(eq(claimedDomains.userId, userId))
      .orderBy(desc(claimedDomains.claimedAt));

    return res.json({
      domains: domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        isVerified: domain.isVerified,
        verifiedAt: domain.verifiedAt,
        verificationMethod: domain.verificationMethod,
        claimedAt: domain.claimedAt,
      })),
    });
  } catch (error) {
    console.error("[Claimed Domains] Error:", error);
    return res.status(500).json({
      error: "Failed to fetch claimed domains",
      message: "An internal error occurred",
    });
  }
}
