/**
 * POST /api/avatars/unlock
 *
 * Unlock avatar(s) for user based on their level
 * Requires authentication
 *
 * Body: { avatarId?: string } (optional - if not provided, unlocks all eligible avatars)
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";

function extractRows<T = unknown>(result: unknown): T[] {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

interface UserLevelRow {
  level: number | string | null;
}

interface AvatarRow {
  id: number | string;
  unlock_level: number | string | null;
  name: string | null;
  rarity: string | null;
}

export default async function handler(req: Request, res: Response) {
  try {
    const user = (req as Request & { user?: { id?: number | string } }).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { avatarId } = req.body;

    // Get user's current level
    const userResult = await db.execute(sql`
      SELECT level FROM users WHERE id = ${userId}
    `);
    const userRows = extractRows<UserLevelRow>(userResult);

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userLevel = Number(userRows[0].level ?? 1);

    if (avatarId) {
      // Unlock specific avatar
      // Check if avatar exists and user meets level requirement
      const avatarResult = await db.execute(sql`
        SELECT id, unlock_level, name, rarity
        FROM avatars
        WHERE id = ${avatarId} AND is_active = TRUE
      `);
      const avatarRows = extractRows<AvatarRow>(avatarResult);

      if (avatarRows.length === 0) {
        return res.status(404).json({ error: "Avatar not found" });
      }

      const avatar = avatarRows[0];
      const unlockLevel = Number(avatar.unlock_level ?? 1);

      if (userLevel < unlockLevel) {
        return res.status(403).json({
          error: "Level requirement not met",
          message: `You need to be level ${unlockLevel} to unlock this avatar`,
          requiredLevel: unlockLevel,
          currentLevel: userLevel,
        });
      }

      // Unlock the avatar (ignore if already unlocked)
      await db.execute(sql`
        INSERT INTO user_avatars (user_id, avatar_id)
        VALUES (${userId}, ${avatarId})
        ON DUPLICATE KEY UPDATE unlocked_at = unlocked_at
      `);

      return res.json({
        success: true,
        message: `Avatar "${avatar.name}" unlocked!`,
        avatar: {
          id: avatar.id,
          name: avatar.name || "Unknown",
          rarity: avatar.rarity || "common",
        },
      });
    } else {
      // Unlock all eligible avatars based on user level
      const eligibleAvatars = await db.execute(sql`
        SELECT id, name, rarity, unlock_level
        FROM avatars
        WHERE unlock_level <= ${userLevel} 
          AND is_active = TRUE
          AND id NOT IN (
            SELECT avatar_id 
            FROM user_avatars 
            WHERE user_id = ${userId}
          )
      `);
      const eligibleAvatarRows = extractRows<AvatarRow>(eligibleAvatars);

      if (eligibleAvatarRows.length === 0) {
        return res.json({
          success: true,
          message: "No new avatars to unlock",
          unlockedCount: 0,
        });
      }

      // Unlock all eligible avatars
      for (const avatar of eligibleAvatarRows) {
        await db.execute(sql`
          INSERT INTO user_avatars (user_id, avatar_id)
          VALUES (${userId}, ${avatar.id})
          ON DUPLICATE KEY UPDATE unlocked_at = unlocked_at
        `);
      }

      return res.json({
        success: true,
        message: `Unlocked ${eligibleAvatarRows.length} new avatar(s)!`,
        unlockedCount: eligibleAvatarRows.length,
        avatars: eligibleAvatarRows.map((a: AvatarRow) => ({
          id: a.id,
          name: a.name || "Unknown",
          rarity: a.rarity || "common",
        })),
      });
    }
  } catch (error) {
    console.error("[Avatars API] Error unlocking avatar:", error);
    return res.status(500).json({
      error: "Failed to unlock avatar",
      message: "An internal error occurred",
    });
  }
}
