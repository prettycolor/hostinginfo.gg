import type { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { users } from "../../../../db/schema.js";
import { requireAdminUser } from "../../../../lib/request-auth.js";
import { validateUsername } from "../../../../lib/username.js";

function parseUserId(req: Request): number | null {
  const value = Number.parseInt(req.params.id || "", 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
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

    const body = req.body ?? {};
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof body.email === "string") {
      const normalizedEmail = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      const existingEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existingEmail.length > 0 && existingEmail[0].id !== userId) {
        return res.status(409).json({ error: "Email already registered" });
      }
      updateData.email = normalizedEmail;
    }

    if (typeof body.profileName === "string") {
      const usernameValidation = validateUsername(body.profileName);
      if (!usernameValidation.valid) {
        return res.status(400).json({ error: usernameValidation.error });
      }

      const existingUsername = await db
        .select({ id: users.id })
        .from(users)
        .where(
          sql`lower(${users.profileName}) = lower(${usernameValidation.normalized})`,
        )
        .limit(1);
      if (existingUsername.length > 0 && existingUsername[0].id !== userId) {
        return res.status(409).json({ error: "Username is already taken" });
      }
      updateData.profileName = usernameValidation.normalized;
    }

    if (typeof body.fullName === "string" || body.fullName === null) {
      updateData.fullName = body.fullName;
    }
    if (typeof body.firstName === "string" || body.firstName === null) {
      updateData.firstName = body.firstName;
    }
    if (typeof body.lastName === "string" || body.lastName === null) {
      updateData.lastName = body.lastName;
    }
    if (typeof body.bio === "string" || body.bio === null) {
      updateData.bio = body.bio;
    }
    if (typeof body.authProvider === "string") {
      updateData.authProvider = body.authProvider.trim() || "email";
    }
    if (typeof body.profileVisibility === "string") {
      updateData.profileVisibility = body.profileVisibility;
    }

    const emailVerified = normalizeBoolean(body.emailVerified);
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified;
    }
    const emailNotifications = normalizeBoolean(body.emailNotifications);
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }
    const scanAlerts = normalizeBoolean(body.scanAlerts);
    if (scanAlerts !== undefined) {
      updateData.scanAlerts = scanAlerts;
    }
    const weeklyReports = normalizeBoolean(body.weeklyReports);
    if (weeklyReports !== undefined) {
      updateData.weeklyReports = weeklyReports;
    }
    const marketingEmails = normalizeBoolean(body.marketingEmails);
    if (marketingEmails !== undefined) {
      updateData.marketingEmails = marketingEmails;
    }
    const showEmail = normalizeBoolean(body.showEmail);
    if (showEmail !== undefined) {
      updateData.showEmail = showEmail;
    }
    const showStats = normalizeBoolean(body.showStats);
    if (showStats !== undefined) {
      updateData.showStats = showStats;
    }

    if (typeof body.level === "number" && Number.isFinite(body.level)) {
      updateData.level = Math.max(1, Math.floor(body.level));
    }
    if (typeof body.totalXp === "number" && Number.isFinite(body.totalXp)) {
      updateData.totalXp = Math.max(0, Math.floor(body.totalXp));
    }
    if (typeof body.currentXp === "number" && Number.isFinite(body.currentXp)) {
      updateData.currentXp = Math.max(0, Math.floor(body.currentXp));
    }
    if (
      typeof body.xpToNextLevel === "number" &&
      Number.isFinite(body.xpToNextLevel)
    ) {
      updateData.xpToNextLevel = Math.max(1, Math.floor(body.xpToNextLevel));
    }
    if (
      typeof body.selectedAvatarId === "number" &&
      Number.isFinite(body.selectedAvatarId)
    ) {
      updateData.selectedAvatarId = Math.floor(body.selectedAvatarId);
    } else if (body.selectedAvatarId === null) {
      updateData.selectedAvatarId = null;
    }

    // Admin status remains DB-only by policy; ignore isAdmin/isDisabled in body.

    const keys = Object.keys(updateData);
    if (keys.length <= 1) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const [updatedUser] = await db
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

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update admin user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
}
