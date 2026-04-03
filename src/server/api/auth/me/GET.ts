import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, avatars } from "../../../db/schema.js";
import { extractToken, verifyToken } from "../../../lib/auth.js";
import { eq } from "drizzle-orm";

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
export default async function handler(req: Request, res: Response) {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user from database with avatar info
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        profileName: users.profileName,
        emailVerified: users.emailVerified,
        authProvider: users.authProvider,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        level: users.level,
        selectedAvatarId: users.selectedAvatarId,
        isAdmin: users.isAdmin,
        isDisabled: users.isDisabled,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    if (user.isDisabled) {
      return res.status(403).json({ error: "Account disabled" });
    }

    // Fetch avatar image path if user has selected one
    let avatarImagePath = null;
    let avatarRarity = null;
    if (user.selectedAvatarId) {
      const avatarResult = await db
        .select({
          imagePath: avatars.imagePath,
          rarity: avatars.rarity,
        })
        .from(avatars)
        .where(eq(avatars.id, user.selectedAvatarId))
        .limit(1);

      if (avatarResult.length > 0) {
        avatarImagePath = avatarResult[0].imagePath;
        avatarRarity = avatarResult[0].rarity;
      }
    }

    res.json({
      user: {
        ...user,
        avatarImagePath,
        avatarRarity,
      },
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      error: "Failed to get user",
      message: "An internal error occurred",
    });
  }
}
