/**
 * GET /api/avatars/current
 *
 * Get the current user's selected avatar
 * Requires authentication via JWT token
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { extractToken, verifyToken } from "../../../lib/auth.js";
import { sql } from "drizzle-orm";
import {
  getUserTier,
  getTierByName,
  type TierName,
} from "../../../../lib/tier-system.js";

const FALLBACK_AVATAR_PATH =
  "/avatars/default/shutterstock_2518667991_avatar_01.png";

const TIER_UNLOCK_LEVELS: Record<TierName, number> = {
  common: 1,
  uncommon: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

interface UserAvatarSelectionRow {
  selected_avatar_id: number | null;
  level: number | null;
}

interface AvatarRow {
  id: number;
  name: string;
  description: string | null;
  rarity: string | null;
  unlock_level: number | null;
  image_path: string | null;
  is_active: number | boolean;
  created_at: Date | string | null;
}

function normalizeTierName(rarity: unknown): TierName {
  const value = String(rarity || "").toLowerCase();
  if (value === "default") return "common";
  if (
    value === "common" ||
    value === "uncommon" ||
    value === "rare" ||
    value === "epic" ||
    value === "legendary"
  ) {
    return value;
  }
  return "common";
}

function normalizeRarityFromRecord(
  rawRarity: unknown,
  rawPath: unknown,
  rawUnlockLevel: unknown,
): TierName {
  const path = String(rawPath || "")
    .replace(/\\/g, "/")
    .toLowerCase();
  const unlockLevel = Number(rawUnlockLevel || 0);
  let rarity = normalizeTierName(rawRarity);

  if (path.includes("/avatars/default/")) return "common";
  if (path.includes("/avatars/common/") || path.includes("/avatars/uncommon/"))
    return "uncommon";
  if (path.includes("/avatars/rare/")) return "rare";
  if (path.includes("/avatars/epic/")) return "epic";
  if (path.includes("/avatars/legendary/")) return "legendary";

  if (rarity === "common" && unlockLevel === 5) rarity = "uncommon";

  return rarity;
}

function normalizeUnlockLevelForTier(
  rarity: TierName,
  rawUnlockLevel: unknown,
): number {
  const unlockLevel = Number(rawUnlockLevel || 0);
  const expectedLevel = TIER_UNLOCK_LEVELS[rarity];

  if (!Number.isFinite(unlockLevel) || unlockLevel <= 0) return expectedLevel;

  if (rarity === "common" && unlockLevel === 0) return expectedLevel;
  if (rarity === "uncommon" && unlockLevel === 5) return expectedLevel;
  if (rarity === "rare" && unlockLevel === 10) return expectedLevel;
  if (rarity === "epic" && unlockLevel === 20) return expectedLevel;
  if (rarity === "legendary" && unlockLevel === 50) return expectedLevel;

  return unlockLevel;
}

function normalizeImagePath(rawPath: unknown, rarity: TierName): string {
  if (!rawPath) return FALLBACK_AVATAR_PATH;

  let imagePath = String(rawPath).trim().replace(/\\/g, "/");
  if (!imagePath) return FALLBACK_AVATAR_PATH;

  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  if (imagePath.includes("/public/avatars/")) {
    imagePath = imagePath
      .slice(imagePath.indexOf("/public/avatars/"))
      .replace("/public/avatars/", "/avatars/");
  } else if (imagePath.startsWith("public/avatars/")) {
    imagePath = `/${imagePath.replace(/^public\/avatars\//, "avatars/")}`;
  }

  if (imagePath.includes("/avatars/")) {
    imagePath = imagePath.slice(imagePath.indexOf("/avatars/"));
  } else if (imagePath.includes("avatars/")) {
    imagePath = `/${imagePath.slice(imagePath.indexOf("avatars/"))}`;
  }

  if (!imagePath.startsWith("/")) {
    imagePath = `/${imagePath}`;
  }

  imagePath = imagePath.replace("/avatars/uncommon/", "/avatars/common/");

  if (!imagePath.startsWith("/avatars/")) {
    const fileName = imagePath.split("/").pop();
    if (!fileName) return FALLBACK_AVATAR_PATH;
    const tierFolder = rarity === "uncommon" ? "common" : rarity;
    imagePath = `/avatars/${tierFolder}/${fileName}`;
  }

  return imagePath;
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

    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const userId = decoded.userId;

    // Get user's selected avatar ID and level using raw SQL
    const userResult = await db.execute(
      sql`SELECT selected_avatar_id, level FROM users WHERE id = ${userId} LIMIT 1`,
    );

    const userData = extractRows<UserAvatarSelectionRow>(userResult)[0];
    const selectedAvatarId = userData?.selected_avatar_id;
    const userLevel = userData?.level || 1;

    // Calculate user's current tier
    const currentTier = getUserTier(userLevel);

    if (!selectedAvatarId) {
      // No avatar selected, return null
      return res.json({ avatar: null });
    }

    // Get the avatar details using raw SQL
    const avatarResult = await db.execute(
      sql`SELECT id, name, description, rarity, unlock_level, image_path, is_active, created_at 
          FROM avatars 
          WHERE id = ${selectedAvatarId} 
          LIMIT 1`,
    );

    const avatarRows = extractRows<AvatarRow>(avatarResult);
    if (avatarRows.length === 0) {
      return res.json({ avatar: null });
    }

    // Transform to camelCase with tier information
    const avatar = avatarRows[0];
    const normalizedRarity = normalizeRarityFromRecord(
      avatar.rarity,
      avatar.image_path,
      avatar.unlock_level,
    );
    const normalizedUnlockLevel = normalizeUnlockLevelForTier(
      normalizedRarity,
      avatar.unlock_level,
    );
    const normalizedImagePath = normalizeImagePath(
      avatar.image_path,
      normalizedRarity,
    );
    const avatarTier = getTierByName(normalizedRarity);

    return res.json({
      avatar: {
        id: avatar.id,
        name: avatar.name,
        description: avatar.description,
        rarity: normalizedRarity,
        unlockLevel: normalizedUnlockLevel,
        imagePath: normalizedImagePath,
        isActive: avatar.is_active,
        createdAt: avatar.created_at,
        tier: {
          name: avatarTier.name,
          label: avatarTier.label,
          borderColor: avatarTier.borderColor,
          glowColor: avatarTier.glowColor,
        },
      },
      userTier: {
        name: currentTier.name,
        label: currentTier.label,
        level: userLevel,
        borderColor: currentTier.borderColor,
        glowColor: currentTier.glowColor,
      },
    });
  } catch (error) {
    console.error("[Avatar Current] Error fetching current avatar:", error);
    return res.status(500).json({
      error: "Failed to fetch current avatar",
      message: "An internal error occurred",
    });
  }
}
