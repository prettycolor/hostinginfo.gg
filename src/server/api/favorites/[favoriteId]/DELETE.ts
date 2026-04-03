import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { favoriteDomains, favoriteDomainScans } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const favoriteId = parseInt(req.params.favoriteId);
    if (isNaN(favoriteId)) {
      return res.status(400).json({ error: "Invalid favorite ID" });
    }

    // Verify ownership
    const [favorite] = await db
      .select()
      .from(favoriteDomains)
      .where(
        and(
          eq(favoriteDomains.id, favoriteId),
          eq(favoriteDomains.userId, userId),
        ),
      )
      .limit(1);

    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    // Delete associated scan history
    await db
      .delete(favoriteDomainScans)
      .where(eq(favoriteDomainScans.favoriteDomainId, favoriteId));

    // Delete favorite
    await db.delete(favoriteDomains).where(eq(favoriteDomains.id, favoriteId));

    res.json({ success: true, message: "Favorite deleted" });
  } catch (error) {
    console.error("Delete favorite error:", error);
    res
      .status(500)
      .json({
        error: "Failed to delete favorite",
        message: "An internal error occurred",
      });
  }
}
