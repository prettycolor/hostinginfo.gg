import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, emailVerifications } from "../../../db/schema.js";
import { sendWelcomeEmail } from "../../../lib/email.js";
import { eq, and, isNull, gt } from "drizzle-orm";

/**
 * POST /api/auth/verify-email
 * Verify user email with token
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // Find verification token
    const verificationResult = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.token, token),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (verificationResult.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    const verification = verificationResult[0];

    // Get user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, verification.userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Mark email as verified
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Mark token as used
    await db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    // Send welcome email
    await sendWelcomeEmail(user.email, user.fullName || undefined);

    res.json({
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    res
      .status(500)
      .json({
        error: "Email verification failed",
        message: "An internal error occurred",
      });
  }
}
