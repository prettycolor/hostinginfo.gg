import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, sessions } from "../../../db/schema.js";
import { comparePassword, generateToken } from "../../../lib/auth.js";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/login
 * Authenticate user with email/password
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult[0];

    if (user.isDisabled) {
      return res.status(403).json({ error: "Account disabled" });
    }

    // Check if user signed up with OAuth (check both password fields for backward compatibility)
    const userPassword = user.password || user.passwordHash;
    if (!userPassword) {
      return res.status(400).json({
        error:
          "This account uses a different sign-in method. Please try signing in with a social provider.",
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, userPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Return user data (without password hash) - include avatar data
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profileName: user.profileName,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        level: user.level,
        selectedAvatarId: user.selectedAvatarId,
        isAdmin: user.isAdmin,
        isDisabled: user.isDisabled,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res
      .status(500)
      .json({ error: "Login failed", message: "An internal error occurred" });
  }
}
