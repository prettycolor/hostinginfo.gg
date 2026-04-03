/**
 * GET /api/avatars/count
 *
 * Simple endpoint to count avatars (no auth required for debugging)
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { avatars } from "../../../db/schema.js";
import { sql } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    // Try to count avatars using schema
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(avatars);

    const count = result[0]?.count || 0;

    // Get a few sample avatars
    const samples = await db.select().from(avatars).limit(5);

    return res.json({
      success: true,
      totalAvatars: count,
      samples: samples,
      message: `Found ${count} avatars in database`,
    });
  } catch (error) {
    console.error("[Avatars Count] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Database error",
      message: "An internal error occurred",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
