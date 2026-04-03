import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { achievements } from "../../../db/schema.js";
import { ACHIEVEMENT_DEFINITIONS } from "../../../../lib/leveling-system.js";
import { eq } from "drizzle-orm";

/**
 * POST /api/leveling/seed-achievements
 * Seed achievement definitions into database.
 * Only available in development mode.
 */
export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const seeded = [];
    const skipped = [];

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      // Check if achievement already exists
      const existing = await db
        .select()
        .from(achievements)
        .where(eq(achievements.achievementKey, achievement.key))
        .limit(1);

      if (existing.length > 0) {
        skipped.push(achievement.key);
        continue;
      }

      // Insert achievement
      await db.insert(achievements).values({
        achievementKey: achievement.key,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        category: achievement.category,
        requirement: JSON.stringify(achievement.requirement),
        xpReward: achievement.xpReward,
        lore: achievement.lore,
        isActive: true,
        sortOrder: ACHIEVEMENT_DEFINITIONS.indexOf(achievement),
      });

      seeded.push(achievement.key);
    }

    return res.json({
      success: true,
      seeded: seeded.length,
      skipped: skipped.length,
      seededKeys: seeded,
      skippedKeys: skipped,
    });
  } catch (error) {
    console.error("Error seeding achievements:", error);
    return res
      .status(500)
      .json({
        error: "Failed to seed achievements",
        message: "An internal error occurred",
      });
  }
}
