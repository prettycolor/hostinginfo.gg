import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        profileName: users.profileName,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        bio: users.bio,
        emailVerified: users.emailVerified,
        authProvider: users.authProvider,
        selectedAvatarId: users.selectedAvatarId,
        level: users.level,
        totalXp: users.totalXp,
        currentXp: users.currentXp,
        // Notification preferences
        emailNotifications: users.emailNotifications,
        scanAlerts: users.scanAlerts,
        weeklyReports: users.weeklyReports,
        marketingEmails: users.marketingEmails,
        // Privacy settings
        profileVisibility: users.profileVisibility,
        showEmail: users.showEmail,
        showStats: users.showStats,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch profile",
        message: "An internal error occurred",
      });
  }
}
