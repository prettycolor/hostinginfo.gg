/**
 * POST /api/avatars/setup
 *
 * Setup or rebuild avatar system data.
 *
 * Optional body:
 * {
 *   "forceRebuild": true
 * }
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";
import { avatars } from "../../../db/schema.js";

type SeedAvatar = {
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockLevel: number;
  imagePath: string;
};

const defaultTierAvatars = [
  "shutterstock_2518667991_avatar_01.png",
  "shutterstock_2518667991_avatar_03.png",
  "shutterstock_2518667991_avatar_04.png",
  "shutterstock_2518667991_avatar_05.png",
  "shutterstock_2518667991_avatar_07.png",
  "shutterstock_2518667991_avatar_08.png",
  "shutterstock_2518667991_avatar_09.png",
  "shutterstock_2518667991_avatar_10.png",
  "shutterstock_2518667991_avatar_12.png",
  "shutterstock_2518667991_avatar_13.png",
  "shutterstock_2518667991_avatar_14.png",
  "shutterstock_2518667991_avatar_16.png",
  "shutterstock_2519522981_avatar_01.png",
  "shutterstock_2519522981_avatar_02.png",
  "shutterstock_2519522981_avatar_03.png",
];

const uncommonTierAvatars = [
  "shutterstock_2519522981_avatar_04.png",
  "shutterstock_2519522981_avatar_05.png",
  "shutterstock_2519522981_avatar_06.png",
  "shutterstock_2519522981_avatar_07.png",
  "shutterstock_2519522981_avatar_08.png",
  "shutterstock_2519522981_avatar_09.png",
  "shutterstock_2519522981_avatar_10.png",
  "shutterstock_2519522981_avatar_11.png",
  "shutterstock_2519522981_avatar_12.png",
  "shutterstock_2519522981_avatar_13.png",
  "shutterstock_2519522981_avatar_14.png",
  "shutterstock_2519522981_avatar_15.png",
  "shutterstock_2519522981_avatar_16.png",
  "shutterstock_2525711475_avatar_01.png",
  "shutterstock_2525711475_avatar_02.png",
];

const rareTierAvatars = [
  "shutterstock_2525711475_avatar_03.png",
  "shutterstock_2525711475_avatar_04.png",
  "shutterstock_2525711475_avatar_05.png",
  "shutterstock_2525711475_avatar_06.png",
  "shutterstock_2525711475_avatar_07.png",
  "shutterstock_2525711475_avatar_08.png",
  "shutterstock_2525711475_avatar_09.png",
  "shutterstock_2525711475_avatar_10.png",
  "shutterstock_2525711475_avatar_11.png",
  "shutterstock_2525711475_avatar_12.png",
  "shutterstock_2525711475_avatar_13.png",
  "shutterstock_2525711475_avatar_14.png",
  "shutterstock_2525711475_avatar_15.png",
  "shutterstock_2525711475_avatar_16.png",
  "shutterstock_2537889383_avatar_01.png",
];

const epicTierAvatars = [
  "shutterstock_2537889383_avatar_02.png",
  "shutterstock_2537889383_avatar_03.png",
  "shutterstock_2537889383_avatar_04.png",
  "shutterstock_2537889383_avatar_05.png",
  "shutterstock_2537889383_avatar_06.png",
  "shutterstock_2537889383_avatar_07.png",
  "shutterstock_2537889383_avatar_08.png",
  "shutterstock_2537889383_avatar_09.png",
  "shutterstock_2537889383_avatar_10.png",
  "shutterstock_2537889383_avatar_11.png",
  "shutterstock_2537889383_avatar_12.png",
  "shutterstock_2537889383_avatar_13.png",
  "shutterstock_2537889383_avatar_14.png",
  "shutterstock_2537889383_avatar_15.png",
  "shutterstock_2537889383_avatar_16.png",
];

const legendaryTierAvatars = [
  "shutterstock_2546236877_avatar_01.png",
  "shutterstock_2546236877_avatar_02.png",
  "shutterstock_2546236877_avatar_03.png",
  "shutterstock_2546236877_avatar_04.png",
  "shutterstock_2546236877_avatar_06.png",
  "shutterstock_2546236877_avatar_07.png",
  "shutterstock_2546236877_avatar_08.png",
  "shutterstock_2546236877_avatar_09.png",
  "shutterstock_2546236877_avatar_10.png",
  "shutterstock_2546236877_avatar_11.png",
  "shutterstock_2546236877_avatar_12.png",
  "shutterstock_2546236877_avatar_13.png",
  "shutterstock_2546236877_avatar_14.png",
  "shutterstock_2546236877_avatar_15.png",
  "shutterstock_2546236877_avatar_16.png",
];

function buildSeedData(): SeedAvatar[] {
  const seed: SeedAvatar[] = [];

  defaultTierAvatars.forEach((file, index) => {
    seed.push({
      name: `Common Avatar ${index + 1}`,
      rarity: "common",
      unlockLevel: 1,
      imagePath: `/avatars/default/${file}`,
    });
  });

  uncommonTierAvatars.forEach((file, index) => {
    seed.push({
      name: `Uncommon Avatar ${index + 1}`,
      rarity: "uncommon",
      unlockLevel: 10,
      imagePath: `/avatars/common/${file}`,
    });
  });

  rareTierAvatars.forEach((file, index) => {
    seed.push({
      name: `Rare Avatar ${index + 1}`,
      rarity: "rare",
      unlockLevel: 25,
      imagePath: `/avatars/rare/${file}`,
    });
  });

  epicTierAvatars.forEach((file, index) => {
    seed.push({
      name: `Epic Avatar ${index + 1}`,
      rarity: "epic",
      unlockLevel: 50,
      imagePath: `/avatars/epic/${file}`,
    });
  });

  legendaryTierAvatars.forEach((file, index) => {
    seed.push({
      name: `Legendary Avatar ${index + 1}`,
      rarity: "legendary",
      unlockLevel: 100,
      imagePath: `/avatars/legendary/${file}`,
    });
  });

  return seed;
}

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  const forceRebuild = Boolean(req.body?.forceRebuild);

  try {
    console.log("[Avatar Setup] Starting avatar system setup...", {
      forceRebuild,
    });

    // Ensure schema aligns with current app tier model.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS avatars (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        unlock_level INT NOT NULL DEFAULT 1,
        image_path VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX rarity_idx (rarity),
        INDEX unlock_level_idx (unlock_level),
        INDEX is_active_idx (is_active)
      )
    `);

    // Migrate legacy enum/value layout if table already existed.
    try {
      await db.execute(
        sql`UPDATE avatars SET rarity = 'common', unlock_level = 1 WHERE rarity = 'default'`,
      );
    } catch (e) {
      console.warn(
        "[Avatar Setup] Legacy default rarity normalization skipped:",
        e,
      );
    }

    try {
      await db.execute(sql`
        ALTER TABLE avatars
        MODIFY COLUMN rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common'
      `);
    } catch (e) {
      console.warn("[Avatar Setup] Rarity enum alter skipped:", e);
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_avatars (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        avatar_id INT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX user_id_idx (user_id),
        INDEX avatar_id_idx (avatar_id),
        INDEX user_avatar_unique_idx (user_id, avatar_id)
      )
    `);

    const existingCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(avatars);
    const existingCount = Number(existingCountResult[0]?.count || 0);

    if (forceRebuild && existingCount > 0) {
      console.log(
        "[Avatar Setup] Force rebuild enabled, clearing existing avatars...",
      );
      await db.execute(sql`DELETE FROM user_avatars`);
      await db.execute(sql`DELETE FROM avatars`);
    } else {
      // Best-effort normalization for existing non-rebuilt datasets.
      await db.execute(
        sql`UPDATE avatars SET image_path = REPLACE(image_path, '\\\\', '/') WHERE image_path LIKE '%\\\\%'`,
      );
      await db.execute(
        sql`UPDATE avatars SET image_path = REPLACE(image_path, '/public/avatars/', '/avatars/') WHERE image_path LIKE '%/public/avatars/%'`,
      );
      await db.execute(
        sql`UPDATE avatars SET image_path = REPLACE(image_path, 'public/avatars/', '/avatars/') WHERE image_path LIKE 'public/avatars/%'`,
      );
      await db.execute(
        sql`UPDATE avatars SET image_path = CONCAT('/', image_path) WHERE image_path NOT LIKE '/%' AND image_path NOT LIKE 'http%'`,
      );
      await db.execute(
        sql`UPDATE avatars SET image_path = REPLACE(image_path, '/avatars/uncommon/', '/avatars/common/') WHERE image_path LIKE '%/avatars/uncommon/%'`,
      );

      await db.execute(sql`
        UPDATE avatars
        SET rarity = 'uncommon', unlock_level = 10
        WHERE rarity = 'common'
          AND (
            unlock_level = 5
            OR image_path LIKE '/avatars/common/%'
            OR image_path LIKE '%/avatars/common/%'
          )
      `);

      await db.execute(sql`
        UPDATE avatars
        SET rarity = 'common', unlock_level = 1
        WHERE unlock_level = 0
          OR image_path LIKE '/avatars/default/%'
          OR image_path LIKE '%/avatars/default/%'
      `);

      await db.execute(
        sql`UPDATE avatars SET unlock_level = 25 WHERE rarity = 'rare'`,
      );
      await db.execute(
        sql`UPDATE avatars SET unlock_level = 50 WHERE rarity = 'epic'`,
      );
      await db.execute(
        sql`UPDATE avatars SET unlock_level = 100 WHERE rarity = 'legendary'`,
      );
    }

    const currentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(avatars);
    const currentCount = Number(currentCountResult[0]?.count || 0);
    let inserted = 0;

    if (currentCount === 0) {
      const seed = buildSeedData();
      for (const avatar of seed) {
        await db.execute(sql`
          INSERT INTO avatars (name, rarity, unlock_level, image_path, is_active)
          VALUES (${avatar.name}, ${avatar.rarity}, ${avatar.unlockLevel}, ${avatar.imagePath}, TRUE)
        `);
        inserted++;
      }
      console.log(`[Avatar Setup] Inserted ${inserted} avatars`);
    }

    // Ensure reserved private avatar exists, but keep it hidden from unlock lists.
    await db.execute(sql`
      INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active)
      SELECT
        'Reserved Staff Avatar',
        'Reserved private avatar for manual assignment.',
        'legendary',
        9999,
        '/avatars/reserved/reserved-staff-avatar.png',
        FALSE
      WHERE NOT EXISTS (
        SELECT 1
        FROM avatars
        WHERE name = 'Reserved Staff Avatar'
        LIMIT 1
      )
    `);

    const finalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(avatars);
    const finalCount = Number(finalCountResult[0]?.count || 0);

    return res.json({
      success: true,
      message: forceRebuild
        ? "Avatar system rebuilt successfully"
        : "Avatar system setup complete",
      totalAvatars: finalCount,
      insertedAvatars: inserted,
      forceRebuild,
    });
  } catch (error) {
    console.error("[Avatar Setup] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Setup failed",
      message: "An internal error occurred",
    });
  }
}
