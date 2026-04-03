import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { userStats } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { alias } = req.body;

    // Validate alias (optional, can be null to remove)
    if (alias !== null && alias !== undefined) {
      if (typeof alias !== "string") {
        return res.status(400).json({ error: "Alias must be a string" });
      }
      if (alias.length > 50) {
        return res
          .status(400)
          .json({ error: "Alias must be 50 characters or less" });
      }
      if (alias.length > 0 && alias.length < 3) {
        return res
          .status(400)
          .json({ error: "Alias must be at least 3 characters" });
      }
      // Check for inappropriate content (basic filter)
      const inappropriate = /\b(fuck|shit|ass|bitch|damn|cunt|dick)\b/i;
      if (inappropriate.test(alias)) {
        return res
          .status(400)
          .json({ error: "Alias contains inappropriate content" });
      }
    }

    // Get or create user stats
    let [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (!stats) {
      // Create stats record if it doesn't exist
      const result = await db.insert(userStats).values({
        userId,
        level: 1,
        xp: 0,
        totalXp: 0,
        leaderboardAlias: alias || null,
      });
      const insertId = Number(result[0].insertId);
      [stats] = await db
        .select()
        .from(userStats)
        .where(eq(userStats.id, insertId))
        .limit(1);
    } else {
      // Update existing stats
      await db
        .update(userStats)
        .set({ leaderboardAlias: alias || null })
        .where(eq(userStats.userId, userId));

      // Fetch updated stats
      [stats] = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);
    }

    res.json({
      success: true,
      alias: stats.leaderboardAlias,
      message: alias
        ? "Leaderboard alias set successfully"
        : "Leaderboard alias removed",
    });
  } catch (error) {
    console.error("Set alias error:", error);
    res
      .status(500)
      .json({
        error: "Failed to set alias",
        message: "An internal error occurred",
      });
  }
}
