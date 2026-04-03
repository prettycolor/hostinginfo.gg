/**
 * GET /api/avatars/unlocked
 *
 * Get only the avatars that the user has unlocked
 * Requires authentication
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Get only unlocked avatars for this user
    const avatars = await db.execute(sql`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.rarity,
        a.unlock_level as unlockLevel,
        a.image_path as imagePath,
        TRUE as isUnlocked,
        CASE WHEN u.current_avatar = a.id THEN TRUE ELSE FALSE END as isCurrent,
        ua.unlocked_at as unlockedAt
      FROM avatars a
      INNER JOIN user_avatars ua ON a.id = ua.avatar_id AND ua.user_id = ${userId}
      LEFT JOIN users u ON u.id = ${userId}
      WHERE a.is_active = TRUE
      ORDER BY a.unlock_level ASC, a.id ASC
    `);

    const avatarRows = Array.isArray(avatars) ? avatars[0] : [];
    return res.json({ avatars: avatarRows });
  } catch (error) {
    console.error("[Avatars API] Error fetching unlocked avatars:", error);
    return res.status(500).json({
      error: "Failed to fetch unlocked avatars",
      message: "An internal error occurred",
    });
  }
}
