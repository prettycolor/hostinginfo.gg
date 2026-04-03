import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { users } from "../../../../db/schema.js";
import { requireAdminUser } from "../../../../lib/request-auth.js";

function parseUserId(req: Request): number | null {
  const value = Number.parseInt(req.params.id || "", 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export default async function handler(req: Request, res: Response) {
  try {
    const adminUser = requireAdminUser(req, res);
    if (!adminUser) {
      return;
    }

    const userId = parseUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        firstName: users.firstName,
        lastName: users.lastName,
        profileName: users.profileName,
        bio: users.bio,
        emailVerified: users.emailVerified,
        authProvider: users.authProvider,
        emailNotifications: users.emailNotifications,
        scanAlerts: users.scanAlerts,
        weeklyReports: users.weeklyReports,
        marketingEmails: users.marketingEmails,
        profileVisibility: users.profileVisibility,
        showEmail: users.showEmail,
        showStats: users.showStats,
        level: users.level,
        totalXp: users.totalXp,
        currentXp: users.currentXp,
        xpToNextLevel: users.xpToNextLevel,
        selectedAvatarId: users.selectedAvatarId,
        isAdmin: users.isAdmin,
        isDisabled: users.isDisabled,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Failed to fetch admin user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
}
