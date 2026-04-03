import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { favoriteDomains } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";
import { z } from "zod";

const addFavoriteSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(255, "Domain must be less than 255 characters")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format",
    ),
  alias: z.string().max(100, "Alias too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const parsed = addFavoriteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const { domain, alias, notes } = parsed.data;

    // Normalize domain (remove protocol, www, trailing slash)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase();

    // Check if already favorited
    const [existing] = await db
      .select()
      .from(favoriteDomains)
      .where(
        and(
          eq(favoriteDomains.userId, userId),
          eq(favoriteDomains.domain, normalizedDomain),
        ),
      )
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "Domain already in favorites" });
    }

    // Add to favorites
    const result = await db.insert(favoriteDomains).values({
      userId,
      domain: normalizedDomain,
      alias: alias || null,
      notes: notes || null,
      scanCount: 0,
    });

    const insertId = Number(result[0].insertId);
    const [newFavorite] = await db
      .select()
      .from(favoriteDomains)
      .where(eq(favoriteDomains.id, insertId))
      .limit(1);

    res.status(201).json(newFavorite);
  } catch (error) {
    console.error("Add favorite error:", error);
    res
      .status(500)
      .json({
        error: "Failed to add favorite",
        message: "An internal error occurred",
      });
  }
}

export default handler;
