/**
 * Server-side XP Award Helper
 *
 * Awards XP for scan completions on the backend.
 * Keeps `user_stats` (progress UI) and `users` (profile/avatar level) in sync.
 */

import {
  XP_REWARDS,
  getLevelFromXp,
  getNewlyUnlockedAchievements,
  getXpProgress,
} from "../../lib/leveling-system.js";
import { db } from "../db/client.js";
import {
  users,
  userStats,
  achievements,
  userAchievements,
  xpTransactions,
} from "../db/schema.js";
import { eq } from "drizzle-orm";

type DbExecutor = typeof db;

interface AwardXpOptions {
  userId: number;
  xpAmount: number;
  source: string;
  description: string;
  domain?: string;
  statUpdates?: Record<string, number>;
  dbClient?: DbExecutor;
  throwOnError?: boolean;
}

interface AwardXpResult {
  success: boolean;
  xpAwarded: number;
  newTotalXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newAchievements: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    xpReward: number;
  }>;
}

type UserStatsRow = Awaited<ReturnType<typeof getOrCreateUserStats>>;

async function getOrCreateUserStats(userId: number, database: DbExecutor) {
  let stats = await database
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (stats.length === 0) {
    const result = await database.insert(userStats).values({
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
    stats = await database
      .select()
      .from(userStats)
      .where(eq(userStats.id, insertId))
      .limit(1);
  }

  return stats[0];
}

function buildStatsRecord(stat: UserStatsRow): Record<string, number> {
  return {
    level: stat.level,
    total_scans: stat.totalScans,
    security_scans: stat.securityScans,
    performance_scans: stat.performanceScans,
    dns_scans: stat.dnsScans,
    whois_scans: stat.whoisScans,
    ssl_scans: stat.sslScans,
    email_scans: stat.emailScans,
    malware_scans: stat.malwareScans,
    domains_verified: stat.domainsVerified,
    domains_monitored: stat.domainsMonitored,
    current_streak: stat.currentStreak,
    ai_insights_used: stat.aiInsightsUsed,
  };
}

async function syncUserLevelFields(
  userId: number,
  totalXp: number,
  level: number,
  database: DbExecutor,
) {
  const progress = getXpProgress(totalXp);
  await database
    .update(users)
    .set({
      totalXp,
      level,
      currentXp: progress.currentLevelXp,
      xpToNextLevel: progress.nextLevelXp,
    })
    .where(eq(users.id, userId));
}

/**
 * Award XP to a user for completing a scan
 */
export async function awardScanXp(
  options: AwardXpOptions,
): Promise<AwardXpResult> {
  const {
    userId,
    xpAmount,
    source,
    description,
    domain,
    statUpdates = {},
    dbClient,
    throwOnError = false,
  } = options;
  const database = dbClient ?? db;

  try {
    const userRow = await database
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (userRow.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const currentStat = await getOrCreateUserStats(userId, database);
    const oldLevel = currentStat.level;

    let runningTotalXp = currentStat.totalXp + xpAmount;
    let runningLevel = getLevelFromXp(runningTotalXp);
    let runningXp = currentStat.xp + xpAmount;

    const statsUpdate: Record<string, number> = {
      totalXp: runningTotalXp,
      level: runningLevel,
      xp: runningXp,
    };

    for (const [key, increment] of Object.entries(statUpdates)) {
      const currentValue = Number(
        (currentStat as Record<string, unknown>)[key] ?? 0,
      );
      statsUpdate[key] = currentValue + increment;
    }

    await database
      .update(userStats)
      .set(statsUpdate as Partial<typeof userStats.$inferInsert>)
      .where(eq(userStats.userId, userId));
    await syncUserLevelFields(userId, runningTotalXp, runningLevel, database);

    await database.insert(xpTransactions).values({
      userId,
      xpAmount,
      source,
      description,
      metadata: domain ? JSON.stringify({ domain }) : null,
    });

    const updatedStatRows = await database
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);
    const updatedStat = updatedStatRows[0];

    const unlockedAchievementRows = await database
      .select({
        achievementId: userAchievements.achievementId,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const allAchievementRows = await database.select().from(achievements);
    const unlockedKeys = allAchievementRows
      .filter((row) =>
        unlockedAchievementRows.some((ua) => ua.achievementId === row.id),
      )
      .map((row) => row.achievementKey);

    const newAchievementDefs = getNewlyUnlockedAchievements(
      buildStatsRecord(updatedStat),
      unlockedKeys,
    );
    const newAchievements: AwardXpResult["newAchievements"] = [];

    for (const achievement of newAchievementDefs) {
      const achievementRow = allAchievementRows.find(
        (row) => row.achievementKey === achievement.key,
      );
      if (!achievementRow) {
        continue;
      }

      await database.insert(userAchievements).values({
        userId,
        achievementId: achievementRow.id,
      });

      runningTotalXp += achievement.xpReward;
      runningLevel = getLevelFromXp(runningTotalXp);
      runningXp += achievement.xpReward;

      await database
        .update(userStats)
        .set({
          totalXp: runningTotalXp,
          level: runningLevel,
          xp: runningXp,
        })
        .where(eq(userStats.userId, userId));

      await syncUserLevelFields(userId, runningTotalXp, runningLevel, database);

      await database.insert(xpTransactions).values({
        userId,
        xpAmount: achievement.xpReward,
        source: "achievement",
        sourceId: achievementRow.id,
        description: `Unlocked: ${achievement.title}`,
      });

      newAchievements.push({
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        xpReward: achievement.xpReward,
      });
    }

    return {
      success: true,
      xpAwarded: xpAmount,
      newTotalXp: runningTotalXp,
      leveledUp: runningLevel > oldLevel,
      oldLevel,
      newLevel: runningLevel,
      newAchievements,
    };
  } catch (error) {
    console.error("[Award XP] Error:", error);
    if (throwOnError) {
      throw error;
    }
    return {
      success: false,
      xpAwarded: 0,
      newTotalXp: 0,
      leveledUp: false,
      oldLevel: 0,
      newLevel: 0,
      newAchievements: [],
    };
  }
}

/**
 * Convenience functions for specific scan types
 */
export async function awardSecurityScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.SECURITY_SCAN,
    source: "security_scan",
    description: `Security scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      securityScans: 1,
    },
  });
}

export async function awardPerformanceScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.PERFORMANCE_SCAN,
    source: "performance_scan",
    description: `Performance scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      performanceScans: 1,
    },
  });
}

export async function awardDnsScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.DNS_SCAN,
    source: "dns_scan",
    description: `DNS scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      dnsScans: 1,
    },
  });
}

export async function awardSslScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.SSL_SCAN,
    source: "ssl_scan",
    description: `SSL scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      sslScans: 1,
    },
  });
}

export async function awardEmailScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.EMAIL_SCAN,
    source: "email_scan",
    description: `Email scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      emailScans: 1,
    },
  });
}

export async function awardMalwareScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.MALWARE_SCAN,
    source: "malware_scan",
    description: `Malware scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      malwareScans: 1,
    },
  });
}

export async function awardWhoisScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.WHOIS_SCAN,
    source: "whois_scan",
    description: `WHOIS scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
      whoisScans: 1,
    },
  });
}

export async function awardTechnologyScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.TECHNOLOGY_SCAN,
    source: "technology_scan",
    description: `Technology scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
    },
  });
}

export async function awardGeolocationScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.GEOLOCATION_SCAN,
    source: "geolocation_scan",
    description: `Geolocation scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
    },
  });
}

export async function awardProviderScanXp(userId: number, domain: string) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.PROVIDER_SCAN,
    source: "provider_scan",
    description: `Provider scan: ${domain}`,
    domain,
    statUpdates: {
      totalScans: 1,
    },
  });
}

export async function awardDdcCalculatorXp(userId: number) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.DDC_CALCULATOR_USE,
    source: "ddc_calculator",
    description: "Used DDC Calculator",
    statUpdates: {},
  });
}

export async function awardIntelligenceDashboardXp(
  userId: number,
  domain: string,
) {
  return awardScanXp({
    userId,
    xpAmount: XP_REWARDS.INTELLIGENCE_DASHBOARD_USE,
    source: "intelligence_dashboard",
    description: `Viewed intelligence dashboard: ${domain}`,
    domain,
    statUpdates: {},
  });
}
