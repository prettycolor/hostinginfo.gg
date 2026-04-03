import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users, emailVerifications } from "../../../db/schema.js";
import { generateVerificationToken } from "../../../lib/auth.js";
import { sendVerificationEmail } from "../../../lib/email.js";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({
        message: "If the email exists, a verification link has been sent.",
      });
    }

    const user = userResult[0];

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await db.insert(emailVerifications).values({
      userId: user.id,
      token: verificationToken,
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(
      user.email,
      verificationToken,
      user.fullName || undefined,
    );

    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    res
      .status(500)
      .json({
        error: "Failed to resend verification email",
        message: "An internal error occurred",
      });
  }
}
