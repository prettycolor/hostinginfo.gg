import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import {
  userStats,
  xpTransactions,
  userAchievements,
  achievements,
  users,
} from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getLevelFromXp,
  getNewlyUnlockedAchievements,
  getXpProgress,
} from "../../../../lib/leveling-system.js";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";

interface AwardXpRequest {
  xpAmount: number;
  source: string;
  sourceId?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  statUpdates?: Record<string, number>; // e.g., { totalScans: 1, securityScans: 1 }
}

/**
 * POST /api/leveling/award-xp
 * Award XP to the current user and check for level ups / achievements
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      xpAmount,
      source,
      sourceId,
      description,
      metadata,
      statUpdates,
    }: AwardXpRequest = req.body;

    if (!xpAmount || !source) {
      return res
        .status(400)
        .json({ error: "Missing required fields: xpAmount, source" });
    }

    // Get current stats
    let stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (stats.length === 0) {
      // Create initial stats
      const result = await db.insert(userStats).values({
        userId,
        level: 1,
        xp: 0,
        totalXp: 0,
        totalScans: 0,
        securityScans: 0,
        performanceScans: 0,
        dnsScans: 0,
        whoisScans: 0,
        sslScans: 0,
        emailScans: 0,
        malwareScans: 0,
        domainsVerified: 0,
        domainsMonitored: 0,
        pdfExports: 0,
        aiInsightsUsed: 0,
        currentStreak: 0,
        longestStreak: 0,
      });

      const insertId = Number(result[0].insertId);
      stats = await db
        .select()
        .from(userStats)
        .where(eq(userStats.id, insertId))
        .limit(1);
    }

    const currentStats = stats[0];
    const oldLevel = currentStats.level;
    let runningTotalXp = currentStats.totalXp + xpAmount;
    let runningLevel = getLevelFromXp(runningTotalXp);
    let runningXp = currentStats.xp + xpAmount;

    // Build update object
    const updates: Record<string, number> = {
      totalXp: runningTotalXp,
      level: runningLevel,
      xp: runningXp,
    };

    // Apply stat updates (e.g., increment scan counts)
    if (statUpdates) {
      for (const [key, increment] of Object.entries(statUpdates)) {
        const currentValue = Number(
          (currentStats as Record<string, unknown>)[key] ?? 0,
        );
        updates[key] = currentValue + increment;
      }
    }

    // Update user stats
    await db.update(userStats).set(updates).where(eq(userStats.userId, userId));
    const baseProgress = getXpProgress(runningTotalXp);
    await db
      .update(users)
      .set({
        totalXp: runningTotalXp,
        level: runningLevel,
        currentXp: baseProgress.currentLevelXp,
        xpToNextLevel: baseProgress.nextLevelXp,
      })
      .where(eq(users.id, userId));

    // Log XP transaction
    await db.insert(xpTransactions).values({
      userId,
      xpAmount,
      source,
      sourceId,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    // Check for newly unlocked achievements
    const updatedStats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
    const userStat = updatedStats[0];

    // Get already unlocked achievements
    const unlockedAchievements = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const achievementRecords = await db.select().from(achievements);
    const unlockedKeys = achievementRecords
      .filter((a) =>
        unlockedAchievements.some((ua) => ua.achievementId === a.id),
      )
      .map((a) => a.achievementKey);

    // Convert stats to plain object for checking
    const statsObj: Record<string, number> = {
      level: userStat.level,
      total_scans: userStat.totalScans,
      security_scans: userStat.securityScans,
      performance_scans: userStat.performanceScans,
      dns_scans: userStat.dnsScans,
      whois_scans: userStat.whoisScans,
      ssl_scans: userStat.sslScans,
      email_scans: userStat.emailScans,
      malware_scans: userStat.malwareScans,
      domains_verified: userStat.domainsVerified,
      domains_monitored: userStat.domainsMonitored,
      current_streak: userStat.currentStreak,
      ai_insights_used: userStat.aiInsightsUsed,
    };

    const newAchievements = getNewlyUnlockedAchievements(
      statsObj,
      unlockedKeys,
    );

    // Unlock new achievements
    const unlockedAchievementData = [];
    for (const achievement of newAchievements) {
      // Find achievement ID from DB
      const achievementRecord = achievementRecords.find(
        (a) => a.achievementKey === achievement.key,
      );
      if (achievementRecord) {
        await db.insert(userAchievements).values({
          userId,
          achievementId: achievementRecord.id,
        });

        // Award achievement XP
        runningTotalXp += achievement.xpReward;
        runningLevel = getLevelFromXp(runningTotalXp);
        runningXp += achievement.xpReward;

        await db
          .update(userStats)
          .set({
            totalXp: runningTotalXp,
            level: runningLevel,
            xp: runningXp,
          })
          .where(eq(userStats.userId, userId));

        const achievementProgress = getXpProgress(runningTotalXp);
        await db
          .update(users)
          .set({
            totalXp: runningTotalXp,
            level: runningLevel,
            currentXp: achievementProgress.currentLevelXp,
            xpToNextLevel: achievementProgress.nextLevelXp,
          })
          .where(eq(users.id, userId));

        await db.insert(xpTransactions).values({
          userId,
          xpAmount: achievement.xpReward,
          source: "achievement",
          sourceId: achievementRecord.id,
          description: `Unlocked: ${achievement.title}`,
        });

        unlockedAchievementData.push(achievement);
      }
    }

    return res.json({
      success: true,
      xpAwarded: xpAmount,
      newTotalXp: runningTotalXp,
      leveledUp: runningLevel > oldLevel,
      oldLevel,
      newLevel: runningLevel,
      newAchievements: unlockedAchievementData,
    });
  } catch (error) {
    console.error("Error awarding XP:", error);
    return res
      .status(500)
      .json({
        error: "Failed to award XP",
        message: "An internal error occurred",
      });
  }
}
