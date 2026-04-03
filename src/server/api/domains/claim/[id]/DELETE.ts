import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { claimedDomains } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

/**
 * DELETE /api/domains/claim/:id
 * Remove a domain claim (only if user owns it)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const claimId = parseInt(req.params.id);

    if (isNaN(claimId)) {
      return res.status(400).json({ error: "Invalid claim ID" });
    }

    // Check if claim exists and belongs to user
    const claims = await db
      .select()
      .from(claimedDomains)
      .where(
        and(eq(claimedDomains.id, claimId), eq(claimedDomains.userId, userId)),
      )
      .limit(1);

    if (claims.length === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Delete claim
    await db.delete(claimedDomains).where(eq(claimedDomains.id, claimId));

    console.log(`[Domain Claim] Deleted claim ${claimId} for user ${userId}`);

    return res.json({
      success: true,
      message: "Domain claim removed",
    });
  } catch (error) {
    console.error("[Domain Claim Delete] Error:", error);
    return res.status(500).json({
      error: "Failed to remove claim",
      message: "An internal error occurred",
    });
  }
}
