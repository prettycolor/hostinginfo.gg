import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client.js";
import { users } from "../../../../../db/schema.js";
import { sendPasswordResetEmail } from "../../../../../lib/email.js";
import { issuePasswordResetToken } from "../../../../../lib/password-reset.js";
import { requireAdminUser } from "../../../../../lib/request-auth.js";

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

    const [targetUser] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = await issuePasswordResetToken(userId, adminUser.id);
    const emailSent = await sendPasswordResetEmail(
      targetUser.email,
      resetToken,
      targetUser.fullName || undefined,
      { adminIssued: true },
    );

    return res.json({
      success: true,
      emailSent,
      message: emailSent
        ? "Password reset email sent"
        : "Password reset token created, but email delivery failed",
    });
  } catch (error) {
    console.error("Failed to send admin password reset:", error);
    return res.status(500).json({ error: "Failed to send reset email" });
  }
}
