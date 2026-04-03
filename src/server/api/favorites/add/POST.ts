/**
 * POST /api/favorites/add
 * Add a domain to user's favorites
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { favorites } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    const { userId, domain, scanId, notes, tags } = req.body;

    // Validate required fields
    if (!userId || !domain) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "userId and domain are required",
      });
    }

    // Check if already favorited
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.domain, domain)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Already favorited",
        message: "This domain is already in your favorites",
        favorite: existing[0],
      });
    }

    // Add to favorites
    const result = await db.insert(favorites).values({
      userId,
      domain,
      scanId: scanId || null,
      notes: notes || null,
      tags: tags ? JSON.stringify(tags) : null,
    });

    const insertId = Number(result[0].insertId);

    // Fetch the created favorite
    const newFavorite = await db
      .select()
      .from(favorites)
      .where(eq(favorites.id, insertId))
      .limit(1);

    res.status(201).json({
      success: true,
      message: "Domain added to favorites",
      favorite: newFavorite[0],
    });
  } catch (error) {
    console.error("[Favorites Add] Error:", error);
    res.status(500).json({
      error: "Failed to add favorite",
      message: "An internal error occurred",
    });
  }
}
