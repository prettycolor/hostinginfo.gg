/**
 * POST /api/avatars/select
 *
 * Select/change user's current avatar
 * Requires authentication via JWT token
 *
 * Body: { avatarId: number }
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { extractToken, verifyToken } from "../../../lib/auth.js";
import { sql } from "drizzle-orm";

interface AvatarUnlockRow {
  id: number;
  unlock_level: number | null;
}

interface UserLevelRow {
  id: number;
  level: number | null;
}

interface UserSelectedAvatarRow {
  selected_avatar_id: number | null;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    const maybeRows = (result as { rows?: unknown }).rows;
    if (Array.isArray(maybeRows)) return maybeRows as T[];
  }
  return [];
}

export default async function handler(req: Request, res: Response) {
  try {
    // Extract and verify JWT token
    const token = extractToken(req.headers.authorization);

    console.log("[Avatar Select] Request received");
    console.log(
      "[Avatar Select] Auth header present:",
      Boolean(req.headers.authorization),
    );
    console.log("[Avatar Select] Body:", req.body);

    if (!token) {
      console.log("[Avatar Select] No token provided");
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log("[Avatar Select] Invalid or expired token");
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const userId = decoded.userId;
    console.log("[Avatar Select] Authenticated user ID:", userId);

    const avatarIdRaw = req.body?.avatarId;
    const avatarId = Number(avatarIdRaw);

    if (!Number.isInteger(avatarId) || avatarId <= 0) {
      return res
        .status(400)
        .json({ error: "Avatar ID must be a positive integer" });
    }

    console.log("[Avatar Select] User", userId, "selecting avatar", avatarId);

    const avatarResult = await db.execute(sql`
      SELECT id, unlock_level
      FROM avatars
      WHERE id = ${avatarId} AND is_active = 1
      LIMIT 1
    `);
    const avatarRow = extractRows<AvatarUnlockRow>(avatarResult)[0];
    if (!avatarRow) {
      return res.status(404).json({ error: "Avatar not found or inactive" });
    }

    const userResult = await db.execute(sql`
      SELECT id, level
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `);
    const userRow = extractRows<UserLevelRow>(userResult)[0];
    if (!userRow) {
      return res.status(404).json({ error: "User not found" });
    }

    const userLevel = Number(userRow.level || 1);
    const unlockLevel = Number(avatarRow.unlock_level || 1);
    if (userLevel < unlockLevel) {
      return res.status(403).json({
        error: "Avatar is locked",
        message: `Reach level ${unlockLevel} to use this avatar`,
      });
    }

    // Use raw SQL update for maximum compatibility with production schema state.
    await db.execute(sql`
      UPDATE users
      SET selected_avatar_id = ${avatarId}
      WHERE id = ${userId}
      LIMIT 1
    `);

    const verifyResult = await db.execute(sql`
      SELECT selected_avatar_id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `);
    const verifyRow = extractRows<UserSelectedAvatarRow>(verifyResult)[0];
    if (Number(verifyRow?.selected_avatar_id) !== avatarId) {
      return res.status(500).json({
        error: "Avatar save verification failed",
        message: "Database did not persist selected avatar",
      });
    }

    console.log("[Avatar Select] Avatar saved successfully");

    return res.json({
      success: true,
      message: "Avatar updated successfully",
      avatarId,
    });
  } catch (error) {
    console.error("[Avatar Select] Error saving avatar:", error);
    return res.status(500).json({
      error: "Failed to save avatar",
      message: "An internal error occurred",
    });
  }
}
