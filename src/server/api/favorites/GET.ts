import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { favoriteDomains } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const favorites = await db
      .select()
      .from(favoriteDomains)
      .where(eq(favoriteDomains.userId, userId))
      .orderBy(desc(favoriteDomains.addedAt));

    res.json(favorites);
  } catch (error) {
    console.error("Fetch favorites error:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch favorites",
        message: "An internal error occurred",
      });
  }
}
