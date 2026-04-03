import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { userStats } from "../../../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";
import { getLevelTitle } from "../../../../lib/leveling-system.js";

const LEADERBOARD_LIMIT = 100;
const FALLBACK_AVATAR_PATH =
  "/avatars/default/shutterstock_2518667991_avatar_01.png";

type RawLeaderboardRow = {
  userId: number | string | null;
  level: number | string | null;
  totalXp: number | string | null;
  totalScans: number | string | null;
  leaderboardAlias: string | null;
  profileName: string | null;
  fullName: string | null;
  avatarImagePath: string | null;
};

function extractRows<T = unknown>(result: unknown): T[] {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) return result[0] as T[];
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }

  return [];
}

function normalizeAvatarPath(rawPath: unknown): string {
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

  if (imagePath.includes("/avatars/uncommon/")) {
    imagePath = imagePath.replace("/avatars/uncommon/", "/avatars/common/");
  }

  if (!imagePath.startsWith("/avatars/")) return FALLBACK_AVATAR_PATH;
  return imagePath;
}

function normalizeDisplayName(row: RawLeaderboardRow): string {
  const alias = String(row.leaderboardAlias || "").trim();
  if (alias) return alias;

  const profileName = String(row.profileName || "").trim();
  if (profileName) return profileName;

  const fullName = String(row.fullName || "").trim();
  if (fullName) return fullName;

  return `User ${Number(row.userId) || 0}`;
}

function mapLeaderboardEntry(
  row: RawLeaderboardRow,
  currentUserId: number,
  rank: number,
) {
  const userId = Number(row.userId || 0);
  const level = Number(row.level || 1);
  const totalXp = Number(row.totalXp || 0);

  return {
    userId,
    username: normalizeDisplayName(row),
    avatar: normalizeAvatarPath(row.avatarImagePath),
    rank,
    score: totalXp,
    level,
    title: getLevelTitle(level).title,
    isCurrentUser: userId === currentUserId,
  };
}

/**
 * GET /api/leveling/leaderboard
 * Get leaderboard position for current user and top leaderboard entries.
 *
 * Returns:
 * - User's global rank / percentile / level / XP (existing fields preserved)
 * - Top ranked leaderboard entries (for leaderboard page)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Count total users with stats
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userStats);
    const totalUsers = Number(totalUsersResult[0].count);

    const leaderboardRowsResult = await db.execute(sql`
      SELECT
        us.user_id AS userId,
        us.level AS level,
        us.total_xp AS totalXp,
        us.total_scans AS totalScans,
        us.leaderboard_alias AS leaderboardAlias,
        u.profile_name AS profileName,
        u.full_name AS fullName,
        a.image_path AS avatarImagePath
      FROM user_stats us
      LEFT JOIN users u ON u.id = us.user_id
      LEFT JOIN avatars a ON a.id = u.selected_avatar_id
      ORDER BY
        us.total_xp DESC,
        us.level DESC,
        us.total_scans DESC,
        us.user_id ASC
      LIMIT ${LEADERBOARD_LIMIT}
    `);

    const leaderboardRows = extractRows<RawLeaderboardRow>(
      leaderboardRowsResult,
    );
    const entries = leaderboardRows.map((row, index) =>
      mapLeaderboardEntry(row, userId, index + 1),
    );

    const currentUserResult = await db.execute(sql`
      SELECT
        us.user_id AS userId,
        us.level AS level,
        us.total_xp AS totalXp,
        us.total_scans AS totalScans,
        us.leaderboard_alias AS leaderboardAlias,
        u.profile_name AS profileName,
        u.full_name AS fullName,
        a.image_path AS avatarImagePath
      FROM user_stats us
      LEFT JOIN users u ON u.id = us.user_id
      LEFT JOIN avatars a ON a.id = u.selected_avatar_id
      WHERE us.user_id = ${userId}
      LIMIT 1
    `);

    const currentUserRows = extractRows<RawLeaderboardRow>(currentUserResult);
    const currentUserRow =
      currentUserRows.length > 0 ? currentUserRows[0] : null;

    if (!currentUserRow) {
      return res.json({
        rank: null,
        totalUsers,
        percentile: null,
        level: 1,
        totalXp: 0,
        message: "Complete your first scan to join the leaderboard!",
        entries,
        currentUser: null,
      });
    }

    const currentUserTotalXp = Number(currentUserRow.totalXp || 0);
    const currentUserLevel = Number(currentUserRow.level || 1);
    const currentUserTotalScans = Number(currentUserRow.totalScans || 0);
    const currentUserId = Number(currentUserRow.userId || userId);

    const higherRankedResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM user_stats us
      WHERE
        us.total_xp > ${currentUserTotalXp}
        OR (
          us.total_xp = ${currentUserTotalXp}
          AND us.level > ${currentUserLevel}
        )
        OR (
          us.total_xp = ${currentUserTotalXp}
          AND us.level = ${currentUserLevel}
          AND us.total_scans > ${currentUserTotalScans}
        )
        OR (
          us.total_xp = ${currentUserTotalXp}
          AND us.level = ${currentUserLevel}
          AND us.total_scans = ${currentUserTotalScans}
          AND us.user_id < ${currentUserId}
        )
    `);

    const higherRankedRows = extractRows<{ count: number | string | null }>(
      higherRankedResult,
    );
    const higherRanked = Number(higherRankedRows[0]?.count || 0);
    const currentUserEntry = mapLeaderboardEntry(
      currentUserRow,
      userId,
      higherRanked + 1,
    );
    const rank = currentUserEntry.rank;
    const percentile =
      totalUsers > 0 ? ((totalUsers - rank + 1) / totalUsers) * 100 : 0;

    // Update user's cached rank values for quick profile reads.
    await db
      .update(userStats)
      .set({
        globalRank: rank,
        rankPercentile: percentile.toFixed(2),
      })
      .where(eq(userStats.userId, userId));

    return res.json({
      rank,
      totalUsers,
      percentile: percentile.toFixed(1),
      level: currentUserEntry.level,
      totalXp: currentUserEntry.score,
      message: `You are ranked #${rank} out of ${totalUsers} users (Top ${percentile.toFixed(1)}%)`,
      entries,
      currentUser: currentUserEntry,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res
      .status(500)
      .json({
        error: "Failed to fetch leaderboard",
        message: "An internal error occurred",
      });
  }
}
