import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import {
  userStats,
  userAchievements,
  achievements,
} from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { ACHIEVEMENT_DEFINITIONS } from "../../../../lib/leveling-system.js";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * GET /api/leveling/achievements
 * Get all achievements with unlock status for current user
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user stats
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (stats.length === 0) {
      // Return all achievements as locked
      return res.json({
        achievements: ACHIEVEMENT_DEFINITIONS.map((a) => ({
          ...a,
          unlocked: false,
          unlockedAt: null,
          progress: 0,
        })),
      });
    }

    const userStat = stats[0];

    // Get unlocked achievements
    const unlocked = await db
      .select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
        achievementKey: achievements.achievementKey,
      })
      .from(userAchievements)
      .leftJoin(
        achievements,
        eq(userAchievements.achievementId, achievements.id),
      )
      .where(eq(userAchievements.userId, userId));

    const unlockedMap = new Map(
      unlocked.map((u) => [u.achievementKey, { unlockedAt: u.unlockedAt }]),
    );

    // Convert stats to plain object for progress calculation
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

    // Map achievements with unlock status and progress
    const achievementsWithStatus = ACHIEVEMENT_DEFINITIONS.map(
      (achievement) => {
        const isUnlocked = unlockedMap.has(achievement.key);
        const unlockedData = unlockedMap.get(achievement.key);

        // Calculate progress
        const { type, value } = achievement.requirement;
        const currentValue = statsObj[type] || 0;
        const progress = Math.min(100, (currentValue / value) * 100);

        return {
          ...achievement,
          unlocked: isUnlocked,
          unlockedAt: unlockedData?.unlockedAt || null,
          progress: Math.round(progress),
          currentValue,
          requiredValue: value,
        };
      },
    );

    // Sort: unlocked first (by unlock date desc), then by rarity/category
    const rarityOrder = {
      legendary: 0,
      epic: 1,
      rare: 2,
      uncommon: 3,
      common: 4,
    };
    achievementsWithStatus.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (a.unlocked && b.unlocked) {
        return (
          new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
        );
      }
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });

    return res.json({
      achievements: achievementsWithStatus,
      totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
      unlockedCount: unlocked.length,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return res
      .status(500)
      .json({
        error: "Failed to fetch achievements",
        message: "An internal error occurred",
      });
  }
}
