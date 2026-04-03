import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, scanHistory, claimedDomains } from "../../../db/schema.js";
import { eq, count } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * GET /api/profile/stats
 * Get user statistics (scans, domains, account age, level)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get total scans
    const [scanCount] = await db
      .select({ count: count() })
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId));

    // Get total claimed domains
    const [domainCount] = await db
      .select({ count: count() })
      .from(claimedDomains)
      .where(eq(claimedDomains.userId, userId));

    // Calculate account age in days
    const createdAtTime = user.createdAt
      ? new Date(user.createdAt).getTime()
      : Date.now();
    const accountAge = Math.floor(
      (Date.now() - createdAtTime) / (1000 * 60 * 60 * 24),
    );

    // Get last login (use current time if not tracked)
    const lastLogin = user.lastLoginAt
      ? new Date(user.lastLoginAt).toISOString()
      : new Date().toISOString();

    res.json({
      totalScans: scanCount?.count || 0,
      totalDomains: domainCount?.count || 0,
      accountAge,
      lastLogin,
      level: user.level || 1,
      xp: user.totalXp || 0,
    });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
}
