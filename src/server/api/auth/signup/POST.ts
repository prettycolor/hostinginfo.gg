import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, emailVerifications } from "../../../db/schema.js";
import { hashPassword, generateVerificationToken } from "../../../lib/auth.js";
import { sendVerificationEmail } from "../../../lib/email.js";
import { eq, sql } from "drizzle-orm";
import { isSignupEnabled } from "../../../lib/feature-flags.js";
import { validateUsername } from "../../../lib/username.js";
import { getPasswordPolicyError } from "../../../../lib/password-policy.js";

interface SignupInsertMeta {
  insertId?: number | string;
}

interface SignupResponseUser {
  id: number;
  email: string;
  fullName: string | null;
  profileName: string | null;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string | Date | null;
}

/**
 * POST /api/auth/signup
 * Create a new user account with email/password
 */
export default async function handler(req: Request, res: Response) {
  if (!isSignupEnabled()) {
    return res.status(503).json({
      error: "Signup is temporarily unavailable",
      code: "SIGNUP_DISABLED",
      message: "Account creation is currently paused. Please check back soon.",
    });
  }

  let createdUserId: number | null = null;
  let normalizedEmail = "";
  let fullNameValue: string | null = null;
  let profileNameValue: string | null = null;

  try {
    const { email, password, fullName, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const passwordPolicyError = getPasswordPolicyError(password);
    if (passwordPolicyError) {
      return res.status(400).json({ error: passwordPolicyError });
    }

    normalizedEmail = String(email).toLowerCase();
    fullNameValue = fullName || null;
    const usernameValidation = validateUsername(username);

    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    profileNameValue = usernameValidation.normalized;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.profileName}) = lower(${profileNameValue})`)
      .limit(1);

    if (existingUsername.length > 0) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const passwordHash = await hashPassword(password);

    const insertResult = await db.insert(users).values({
      email: normalizedEmail,
      password: passwordHash,
      passwordHash,
      fullName: fullNameValue,
      profileName: profileNameValue,
      authProvider: "email",
      emailVerified: false,
      emailNotifications: false,
      scanAlerts: false,
      weeklyReports: false,
      marketingEmails: false,
    });

    const insertMeta = (
      Array.isArray(insertResult) ? insertResult[0] : insertResult
    ) as SignupInsertMeta;
    const insertId = Number(insertMeta?.insertId);
    createdUserId = Number.isFinite(insertId) && insertId > 0 ? insertId : null;

    if (!createdUserId) {
      const createdUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (createdUser.length === 0) {
        throw new Error("Failed to resolve newly created user ID");
      }

      createdUserId = createdUser[0].id;
    }

    let emailSent = false;
    try {
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await db.insert(emailVerifications).values({
        userId: createdUserId,
        token: verificationToken,
        expiresAt,
      });

      emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationToken,
        fullNameValue || undefined,
      );
    } catch (verificationError) {
      console.warn(
        "Verification setup failed after user creation:",
        verificationError,
      );
    }

    let responseUser: SignupResponseUser = {
      id: createdUserId,
      email: normalizedEmail,
      fullName: fullNameValue,
      profileName: profileNameValue,
      emailVerified: false,
      authProvider: "email",
      createdAt: new Date().toISOString(),
    };

    try {
      const createdUser = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          profileName: users.profileName,
          emailVerified: users.emailVerified,
          authProvider: users.authProvider,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, createdUserId))
        .limit(1);

      if (createdUser.length > 0) {
        responseUser = { ...responseUser, ...createdUser[0] };
      }
    } catch (lookupError) {
      console.warn("Failed to fetch created user payload:", lookupError);
    }

    return res.status(201).json({
      message: emailSent
        ? "Account created successfully. Please check your email to verify your account before signing in."
        : "Account created successfully, but verification email could not be sent right now. Please request a new verification email before signing in.",
      user: responseUser,
      emailSent,
      requiresEmailVerification: true,
    });
  } catch (error) {
    if (createdUserId) {
      console.error("Signup partially failed after account creation:", error);
      return res.status(201).json({
        message:
          "Account created successfully. Please verify your email before signing in.",
        user: {
          id: createdUserId,
          email: normalizedEmail,
          fullName: fullNameValue,
          profileName: profileNameValue,
          emailVerified: false,
          authProvider: "email",
          createdAt: new Date().toISOString(),
        },
        emailSent: false,
        requiresEmailVerification: true,
      });
    }

    console.error("Signup error:", error);
    return res
      .status(500)
      .json({
        error: "Failed to create account",
        message: "An internal error occurred",
      });
  }
}
