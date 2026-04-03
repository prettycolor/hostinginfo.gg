import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scanHistory, userStats } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getXpProgress,
  getLevelTitle,
} from "../../../../lib/leveling-system.js";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";
import { computeStreakSummary } from "../../../lib/streaks.js";

/**
 * GET /api/leveling/stats
 * Get current user's leveling stats
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get or create user stats
    let stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (stats.length === 0) {
      // Create initial stats for new user
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

    const userStat = stats[0];

    const scanRows = await db
      .select({ createdAt: scanHistory.createdAt })
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId));
    const scanDates = scanRows
      .map((row) => row.createdAt)
      .filter((value): value is Date => value instanceof Date);
    const streakSummary = computeStreakSummary(scanDates);

    if (
      userStat.currentStreak !== streakSummary.currentStreak ||
      userStat.longestStreak !== streakSummary.longestStreak
    ) {
      await db
        .update(userStats)
        .set({
          currentStreak: streakSummary.currentStreak,
          longestStreak: streakSummary.longestStreak,
        })
        .where(eq(userStats.userId, userId));
    }

    const progress = getXpProgress(userStat.totalXp);
    const levelTitle = getLevelTitle(progress.level);

    return res.json({
      ...userStat,
      currentStreak: streakSummary.currentStreak,
      longestStreak: streakSummary.longestStreak,
      progress,
      levelTitle,
    });
  } catch (error) {
    console.error("Error fetching leveling stats:", error);
    return res.status(500).json({
      error: "Failed to fetch stats",
      message: "An internal error occurred",
    });
  }
}
