import type { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { hashPassword } from "../../../lib/auth.js";
import { requireAdminUser } from "../../../lib/request-auth.js";
import { validateUsername } from "../../../lib/username.js";
import { getPasswordPolicyError } from "../../../../lib/password-policy.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: Request, res: Response) {
  try {
    const adminUser = requireAdminUser(req, res);
    if (!adminUser) {
      return;
    }

    const {
      email,
      password,
      fullName,
      firstName,
      lastName,
      profileName,
      bio,
      authProvider,
      level,
      totalXp,
      currentXp,
      xpToNextLevel,
      selectedAvatarId,
    } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordPolicyError = getPasswordPolicyError(password);
    if (passwordPolicyError) {
      return res.status(400).json({ error: passwordPolicyError });
    }

    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const normalizedProfileName =
      typeof profileName === "string" ? profileName.trim() : "";
    if (normalizedProfileName) {
      const usernameValidation = validateUsername(normalizedProfileName);
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
      if (existingUsername.length > 0) {
        return res.status(409).json({ error: "Username is already taken" });
      }
    }

    const passwordHash = await hashPassword(password);
    const parsedLevel =
      typeof level === "number" && Number.isFinite(level)
        ? Math.max(1, Math.floor(level))
        : 1;
    const parsedTotalXp =
      typeof totalXp === "number" && Number.isFinite(totalXp)
        ? Math.max(0, Math.floor(totalXp))
        : 0;
    const parsedCurrentXp =
      typeof currentXp === "number" && Number.isFinite(currentXp)
        ? Math.max(0, Math.floor(currentXp))
        : 0;
    const parsedXpToNextLevel =
      typeof xpToNextLevel === "number" && Number.isFinite(xpToNextLevel)
        ? Math.max(1, Math.floor(xpToNextLevel))
        : 100;

    const insertResult = await db.insert(users).values({
      email: normalizedEmail,
      password: passwordHash,
      passwordHash,
      fullName: typeof fullName === "string" ? fullName : null,
      firstName: typeof firstName === "string" ? firstName : null,
      lastName: typeof lastName === "string" ? lastName : null,
      profileName: normalizedProfileName || null,
      bio: typeof bio === "string" ? bio : null,
      authProvider:
        typeof authProvider === "string" && authProvider.trim()
          ? authProvider.trim()
          : "email",
      emailVerified: true,
      emailNotifications: false,
      scanAlerts: false,
      weeklyReports: false,
      marketingEmails: false,
      level: parsedLevel,
      totalXp: parsedTotalXp,
      currentXp: parsedCurrentXp,
      xpToNextLevel: parsedXpToNextLevel,
      selectedAvatarId:
        typeof selectedAvatarId === "number" &&
        Number.isFinite(selectedAvatarId)
          ? Math.floor(selectedAvatarId)
          : null,
      isAdmin: false,
      isDisabled: false,
      disabledAt: null,
    });

    const insertedMeta = Array.isArray(insertResult)
      ? insertResult[0]
      : insertResult;
    let insertedId = Number(insertedMeta?.insertId);
    if (!Number.isFinite(insertedId) || insertedId <= 0) {
      const [createdByEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      insertedId = createdByEmail?.id || 0;
    }
    const [createdUser] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        firstName: users.firstName,
        lastName: users.lastName,
        profileName: users.profileName,
        bio: users.bio,
        authProvider: users.authProvider,
        emailVerified: users.emailVerified,
        level: users.level,
        totalXp: users.totalXp,
        currentXp: users.currentXp,
        xpToNextLevel: users.xpToNextLevel,
        selectedAvatarId: users.selectedAvatarId,
        isAdmin: users.isAdmin,
        isDisabled: users.isDisabled,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, insertedId))
      .limit(1);

    return res.status(201).json({
      success: true,
      user: createdUser,
    });
  } catch (error) {
    console.error("Failed to create admin user:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
}
