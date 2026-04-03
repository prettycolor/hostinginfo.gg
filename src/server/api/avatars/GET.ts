/**
 * GET /api/avatars
 *
 * Get all avatars with user's unlock status
 * Requires authentication via JWT token
 */

import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { extractToken, verifyToken } from "../../lib/auth.js";
import { sql } from "drizzle-orm";
import {
  getUserTier,
  getUnlockedTiers,
  getNextTierInfo,
  getTierByName,
  getTotalAvatarCount,
  type TierName,
} from "../../../lib/tier-system.js";
import { dedupeAvatarsByImagePath } from "../../lib/avatar-dedupe.js";
import { auditAvatarImagePath } from "../../../lib/avatar-image-health.js";

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

  // Handle legacy unlock thresholds if path is not useful.
  if (rarity === "common" && unlockLevel === 5) rarity = "uncommon";
  if (rarity === "common" && unlockLevel === 0) rarity = "common";

  return rarity;
}

function normalizeUnlockLevelForTier(
  rarity: TierName,
  rawUnlockLevel: unknown,
): number {
  const unlockLevel = Number(rawUnlockLevel || 0);
  const expectedLevel = TIER_UNLOCK_LEVELS[rarity];

  if (!Number.isFinite(unlockLevel) || unlockLevel <= 0) return expectedLevel;

  // Normalize known legacy thresholds.
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

export default async function handler(req: Request, res: Response) {
  try {
    // Extract and verify JWT token
    const token = extractToken(req.headers.authorization);

    console.log("[Avatars API] Request received");
    console.log(
      "[Avatars API] Auth header present:",
      Boolean(req.headers.authorization),
    );

    if (!token) {
      console.log("[Avatars API] No token provided");
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log("[Avatars API] Invalid or expired token");
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const userId = decoded.userId;
    console.log("[Avatars API] Authenticated user ID:", userId);

    // Get user's selected avatar and level using raw SQL
    console.log("[Avatars API] Fetching user data...");
    const userResult = await db.execute(
      sql`SELECT selected_avatar_id, level FROM users WHERE id = ${userId} LIMIT 1`,
    );

    const userData = extractRows<UserAvatarSelectionRow>(userResult)[0];
    const selectedAvatarId = userData?.selected_avatar_id || null;
    const userLevel = userData?.level || 1;
    console.log("[Avatars API] User's selected avatar ID:", selectedAvatarId);
    console.log("[Avatars API] User's level:", userLevel);

    // Calculate tier information
    const currentTier = getUserTier(userLevel);
    const unlockedTiers = getUnlockedTiers(userLevel);
    const nextTierInfo = getNextTierInfo(userLevel);

    console.log("[Avatars API] Current tier:", currentTier.name);
    console.log("[Avatars API] Unlocked tiers:", unlockedTiers.join(", "));

    // Get all active avatars using raw SQL
    console.log("[Avatars API] Querying database for avatars...");
    const result = await db.execute(
      sql`SELECT id, name, description, rarity, unlock_level, image_path, is_active, created_at 
          FROM avatars 
          WHERE is_active = 1 
          ORDER BY unlock_level ASC, id ASC`,
    );

    const allAvatars = extractRows<AvatarRow>(result);

    console.log(
      "[Avatars API] Query complete. Found",
      allAvatars.length,
      "avatars",
    );
    if (allAvatars.length > 0) {
      console.log(
        "[Avatars API] Sample avatar:",
        JSON.stringify(allAvatars[0], null, 2),
      );
    } else {
      console.log("[Avatars API] WARNING: No avatars found in database!");
    }

    // Transform to match expected format with tier information
    const avatarList = allAvatars.map((avatar: AvatarRow) => {
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
      const isUnlocked = userLevel >= normalizedUnlockLevel;
      const imageHealth = auditAvatarImagePath({
        rawPath: avatar.image_path,
        normalizedPath: normalizedImagePath,
        tier: normalizedRarity,
      });

      return {
        id: avatar.id,
        name: avatar.name,
        description: avatar.description,
        rarity: normalizedRarity,
        unlockLevel: normalizedUnlockLevel,
        imagePath: normalizedImagePath,
        isUnlocked,
        isCurrent: avatar.id === selectedAvatarId,
        unlockedAt: null,
        imageHealth,
        tier: {
          name: avatarTier.name,
          label: avatarTier.label,
          borderColor: avatarTier.borderColor,
          glowColor: avatarTier.glowColor,
        },
      };
    });

    const dedupedAvatarList = dedupeAvatarsByImagePath(
      avatarList,
      selectedAvatarId,
    );
    const duplicateCount = avatarList.length - dedupedAvatarList.length;
    if (duplicateCount > 0) {
      console.warn(
        `[Avatars API] Removed ${duplicateCount} duplicate avatar record(s) from response`,
      );
    }

    const imageAudit = dedupedAvatarList.reduce(
      (summary, avatar) => {
        const status = avatar.imageHealth?.status || "ok";
        if (status === "legacy") summary.legacyCount += 1;
        else if (status === "invalid") summary.invalidCount += 1;
        else summary.okCount += 1;
        return summary;
      },
      {
        total: dedupedAvatarList.length,
        okCount: 0,
        legacyCount: 0,
        invalidCount: 0,
      },
    );

    console.log("[Avatars API] Returning", dedupedAvatarList.length, "avatars");
    console.log(
      "[Avatars API] Unlocked:",
      dedupedAvatarList.filter((a) => a.isUnlocked).length,
    );
    console.log(
      "[Avatars API] Locked:",
      dedupedAvatarList.filter((a) => !a.isUnlocked).length,
    );

    return res.json({
      avatars: dedupedAvatarList,
      userTier: {
        name: currentTier.name,
        label: currentTier.label,
        level: userLevel,
        borderColor: currentTier.borderColor,
        glowColor: currentTier.glowColor,
        description: currentTier.description,
      },
      nextTier: nextTierInfo
        ? {
            name: nextTierInfo.tier.name,
            label: nextTierInfo.tier.label,
            levelsNeeded: nextTierInfo.levelsNeeded,
            unlockLevel: nextTierInfo.tier.unlockLevel,
          }
        : null,
      stats: {
        unlockedCount: dedupedAvatarList.filter((a) => a.isUnlocked).length,
        totalCount: dedupedAvatarList.length || getTotalAvatarCount(),
        unlockedTiers: unlockedTiers.length,
        totalTiers: 5,
      },
      imageAudit,
    });
  } catch (error) {
    console.error("[Avatars API] Error fetching avatars:", error);
    return res.status(500).json({
      error: "Failed to fetch avatars",
      message: "An internal error occurred",
    });
  }
}
