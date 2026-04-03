import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import {
  userInventory,
  items,
  itemUnlockProgress,
  userStats,
  userAchievements,
  achievements,
} from "../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  ITEM_CATALOG,
  canUnlockItem,
  type ItemRarity,
} from "../../../lib/items/item-catalog.js";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

/**
 * GET /api/inventory
 *
 * Fetch user's inventory with all items (owned and locked)
 * Includes unlock progress and missing requirements
 */
export default async function handler(req: Request, res: Response) {
  try {
    // Get user ID from session (you'll need to implement auth middleware)
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Fetch user's owned items with item keys
    const ownedItems = await db
      .select({
        itemKey: items.itemKey,
        itemId: userInventory.itemId,
        quantity: userInventory.quantity,
        isEquipped: userInventory.isEquipped,
        isNew: userInventory.isNew,
        acquiredAt: userInventory.acquiredAt,
        acquiredFrom: userInventory.acquiredFrom,
      })
      .from(userInventory)
      .innerJoin(items, eq(userInventory.itemId, items.id))
      .where(eq(userInventory.userId, userId));

    // Fetch user stats for unlock calculations
    const userStatsData = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    const stats = userStatsData[0] || {
      level: 1,
      xp: 0,
      totalScans: 0,
      domainsVerified: 0,
      currentStreak: 0,
    };

    const unlockedAchievements = await db
      .select({ achievementKey: achievements.achievementKey })
      .from(userAchievements)
      .innerJoin(
        achievements,
        eq(userAchievements.achievementId, achievements.id),
      )
      .where(eq(userAchievements.userId, userId));
    const userAchievementKeys = unlockedAchievements.map(
      (entry) => entry.achievementKey,
    );

    // Fetch unlock progress and item map for locked items
    const unlockProgress = await db
      .select()
      .from(itemUnlockProgress)
      .where(eq(itemUnlockProgress.userId, userId));
    const catalogItemRows = await db
      .select({ id: items.id, itemKey: items.itemKey })
      .from(items);

    const itemIdByKey = new Map(
      catalogItemRows.map((row) => [row.itemKey, row.id]),
    );
    const ownedByItemKey = new Map(
      ownedItems.map((entry) => [entry.itemKey, entry]),
    );

    // Build inventory response
    const inventory = ITEM_CATALOG.map((item) => {
      // Check if user owns this item
      const owned = ownedByItemKey.get(item.itemKey);

      // Calculate if user can unlock this item
      const unlockCheck = canUnlockItem(item, {
        level: stats.level,
        xp: stats.xp,
        scans: stats.totalScans,
        domainsVerified: stats.domainsVerified,
        achievementsCompleted: userAchievementKeys.length,
        consecutiveDays: stats.currentStreak,
        achievements: userAchievementKeys,
      });

      // Find unlock progress
      const itemId = itemIdByKey.get(item.itemKey);
      const progress = itemId
        ? unlockProgress.find((entry) => entry.itemId === itemId)
        : undefined;

      return {
        item,
        isOwned: !!owned,
        isNew: owned?.isNew || false,
        quantity: owned?.quantity || 0,
        acquiredAt: owned?.acquiredAt?.toISOString(),
        acquiredFrom: owned?.acquiredFrom,
        canUnlock: unlockCheck.canUnlock,
        missingRequirements: unlockCheck.missingRequirements,
        unlockProgress: progress
          ? {
              current: progress.currentProgress,
              required: progress.requiredProgress,
              type: progress.progressType,
            }
          : null,
      };
    });

    const ownedItemKeys = new Set(ownedItems.map((entry) => entry.itemKey));
    const countOwnedByRarity = (rarity: ItemRarity) =>
      ITEM_CATALOG.filter(
        (entry) => entry.rarity === rarity && ownedItemKeys.has(entry.itemKey),
      ).length;

    // Calculate summary stats
    const summary = {
      totalItems: ITEM_CATALOG.length,
      ownedItems: ownedItems.length,
      completionPercentage: Math.round(
        (ownedItems.length / ITEM_CATALOG.length) * 100,
      ),
      byRarity: {
        legendary: {
          total: ITEM_CATALOG.filter((i) => i.rarity === "legendary").length,
          owned: countOwnedByRarity("legendary"),
        },
        epic: {
          total: ITEM_CATALOG.filter((i) => i.rarity === "epic").length,
          owned: countOwnedByRarity("epic"),
        },
        rare: {
          total: ITEM_CATALOG.filter((i) => i.rarity === "rare").length,
          owned: countOwnedByRarity("rare"),
        },
        uncommon: {
          total: ITEM_CATALOG.filter((i) => i.rarity === "uncommon").length,
          owned: countOwnedByRarity("uncommon"),
        },
        common: {
          total: ITEM_CATALOG.filter((i) => i.rarity === "common").length,
          owned: countOwnedByRarity("common"),
        },
      },
    };

    res.json({
      success: true,
      inventory,
      summary,
      userStats: {
        level: stats.level,
        xp: stats.xp,
        scans: stats.totalScans,
        achievements: userAchievementKeys.length,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch inventory",
      message: "An internal error occurred",
    });
  }
}
