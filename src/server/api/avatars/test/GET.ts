/**
 * GET /api/avatars/test
 *
 * Test endpoint to check avatar database
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    // Check if avatars table exists and count records
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM avatars
    `);

    const countRows = Array.isArray(result)
      ? (result[0] as unknown as Array<{ count?: number | string }>)
      : [];
    const count = Number(countRows[0]?.count ?? 0);

    // Get sample avatars
    const samples = await db.execute(sql`
      SELECT id, name, rarity, unlock_level, image_path 
      FROM avatars 
      LIMIT 5
    `);

    return res.json({
      success: true,
      totalAvatars: count,
      samples: Array.isArray(samples) ? samples[0] : [],
      message: `Found ${count} avatars in database`,
    });
  } catch (error) {
    console.error("[Avatars Test] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Database error",
      message: "An internal error occurred",
    });
  }
}
