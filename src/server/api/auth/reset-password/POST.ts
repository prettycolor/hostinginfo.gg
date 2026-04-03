import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { passwordResetTokens, sessions, users } from "../../../db/schema.js";
import { getPasswordPolicyError } from "../../../../lib/password-policy.js";
import { hashPassword } from "../../../lib/auth.js";
import { hashPasswordResetToken } from "../../../lib/password-reset-token.js";

export default async function handler(req: Request, res: Response) {
  try {
    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    const passwordPolicyError = getPasswordPolicyError(
      newPassword,
      "New password",
    );
    if (passwordPolicyError) {
      return res.status(400).json({ error: passwordPolicyError });
    }

    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();

    const [resetRecord] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        isDisabled: users.isDisabled,
      })
      .from(users)
      .where(eq(users.id, resetRecord.userId))
      .limit(1);

    if (!targetUser || targetUser.isDisabled) {
      return res.status(400).json({ error: "Password reset not allowed" });
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        password: passwordHash,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetRecord.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    await db.delete(sessions).where(eq(sessions.userId, resetRecord.userId));

    return res.json({
      success: true,
      message: "Password reset successful. Please sign in again.",
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}
