import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPasswordPolicyError } from "../../../../lib/password-policy.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * POST /api/auth/change-password
 * Change user password
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    const passwordPolicyError = getPasswordPolicyError(
      newPassword,
      "New password",
    );
    if (passwordPolicyError) {
      return res.status(400).json({ error: passwordPolicyError });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has a password (OAuth users might not) - check both fields for backward compatibility
    const userPassword = user.password || user.passwordHash;
    if (!userPassword) {
      return res
        .status(400)
        .json({ error: "Cannot change password for OAuth accounts" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userPassword);

    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password (update both fields for backward compatibility)
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Failed to change password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
}
