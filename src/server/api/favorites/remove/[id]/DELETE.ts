/**
 * DELETE /api/favorites/remove/:id
 * Remove a domain from user's favorites
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { favorites } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Favorite id is required" });
    }

    // Check if favorite exists and belongs to authenticated user
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.id, Number(id)), eq(favorites.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    // Delete favorite
    await db
      .delete(favorites)
      .where(and(eq(favorites.id, Number(id)), eq(favorites.userId, userId)));

    res.json({
      success: true,
      message: "Domain removed from favorites",
    });
  } catch (error) {
    console.error("[Favorites Remove] Error:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
}
