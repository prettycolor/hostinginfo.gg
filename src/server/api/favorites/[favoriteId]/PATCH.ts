import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { favoriteDomains } from "../../../db/schema.js";
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

    const { alias, notes } = req.body;

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

    // Build update object
    const updateData: Partial<typeof favoriteDomains.$inferInsert> = {};
    if (alias !== undefined) updateData.alias = alias;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Update favorite
    await db
      .update(favoriteDomains)
      .set(updateData)
      .where(eq(favoriteDomains.id, favoriteId));

    // Fetch updated favorite
    const [updated] = await db
      .select()
      .from(favoriteDomains)
      .where(eq(favoriteDomains.id, favoriteId))
      .limit(1);

    res.json(updated);
  } catch (error) {
    console.error("Update favorite error:", error);
    res
      .status(500)
      .json({
        error: "Failed to update favorite",
        message: "An internal error occurred",
      });
  }
}
