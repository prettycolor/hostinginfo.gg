import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import {
  userInventory,
  items,
  itemUnlockProgress,
  userStats,
  xpTransactions,
  userAchievements,
  achievements,
} from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import {
  getItemByKey,
  canUnlockItem,
} from "../../../../lib/items/item-catalog.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * POST /api/inventory/unlock
 *
 * Unlock/grant an item to a user
 *
 * Body:
 * - itemKey: string (item identifier)
 * - source: string (how item was acquired: achievement, level_up, purchase, gift, quest)
 * - force: boolean (admin override to grant item regardless of requirements)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { itemKey, source = "manual", force = false } = req.body;

    if (!itemKey) {
      return res.status(400).json({
        success: false,
        error: "Missing itemKey",
      });
    }

    // Get user ID from session
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Find item in catalog
    const item = getItemByKey(itemKey);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    // Check if user already owns this item
    const existingItem = await db
      .select({ id: userInventory.id })
      .from(userInventory)
      .innerJoin(items, eq(userInventory.itemId, items.id))
      .where(and(eq(userInventory.userId, userId), eq(items.itemKey, itemKey)))
      .limit(1);

    if (existingItem.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User already owns this item",
      });
    }

    // If not forcing, check if user meets requirements
    if (!force) {
      // Fetch user stats
      const userStatsRows = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

      const stats = userStatsRows[0] || {
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
      const achievementKeys = unlockedAchievements.map(
        (entry) => entry.achievementKey,
      );

      // Check unlock requirements
      const unlockCheck = canUnlockItem(item, {
        level: stats.level,
        xp: stats.xp,
        scans: stats.totalScans,
        domainsVerified: stats.domainsVerified,
        achievementsCompleted: achievementKeys.length,
        consecutiveDays: stats.currentStreak,
        achievements: achievementKeys,
      });

      if (!unlockCheck.canUnlock) {
        return res.status(403).json({
          success: false,
          error: "Requirements not met",
          missingRequirements: unlockCheck.missingRequirements,
        });
      }
    }

    // First, ensure item exists in items table
    const itemRecord = await db
      .select()
      .from(items)
      .where(eq(items.itemKey, itemKey))
      .limit(1);

    let itemId: number;

    if (itemRecord.length === 0) {
      // Insert item into items table
      const insertResult = await db.insert(items).values({
        itemKey: item.itemKey,
        name: item.name,
        description: item.description || "",
        imageUrl: item.imageUrl,
        rarity: item.rarity,
        category: item.category,
        levelRequired: item.levelRequired,
        xpRequired: item.xpRequired || 0,
        achievementRequired: item.achievementRequired || null,
        unlockConditions: item.unlockConditions
          ? JSON.stringify(item.unlockConditions)
          : null,
        effects: item.effects ? JSON.stringify(item.effects) : null,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      });

      itemId = Number(insertResult[0].insertId);
    } else {
      itemId = itemRecord[0].id;
    }

    // Grant item to user
    await db.insert(userInventory).values({
      userId,
      itemId,
      acquiredFrom: source,
      quantity: 1,
      isEquipped: false,
      isNew: true,
    });

    // Award XP bonus if item has unlockBonus effect
    if (item.effects?.unlockBonus) {
      const xpBonus = item.effects.unlockBonus;

      // Update user XP
      const currentStats = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);

      if (currentStats.length > 0) {
        const newXp = currentStats[0].xp + xpBonus;
        const newTotalXp = currentStats[0].totalXp + xpBonus;
        await db
          .update(userStats)
          .set({
            xp: newXp,
            totalXp: newTotalXp,
          })
          .where(eq(userStats.userId, userId));
      } else {
        await db.insert(userStats).values({
          userId,
          xp: xpBonus,
          totalXp: xpBonus,
        });
      }

      // Log XP gain
      await db.insert(xpTransactions).values({
        userId,
        xpAmount: xpBonus,
        source: `item_unlock_${itemKey}`,
        description: `Unlocked ${item.name}`,
        metadata: JSON.stringify({ itemKey }),
      });
    }

    // Mark unlock progress as complete
    await db
      .update(itemUnlockProgress)
      .set({
        isUnlocked: true,
        unlockedAt: new Date(),
      })
      .where(
        and(
          eq(itemUnlockProgress.userId, userId),
          eq(itemUnlockProgress.itemId, itemId),
        ),
      );

    res.json({
      success: true,
      message: `Successfully unlocked ${item.name}!`,
      item: {
        itemKey: item.itemKey,
        name: item.name,
        rarity: item.rarity,
        category: item.category,
      },
      xpBonus: item.effects?.unlockBonus || 0,
    });
  } catch (error) {
    console.error("Error unlocking item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unlock item",
      message: "An internal error occurred",
    });
  }
}
