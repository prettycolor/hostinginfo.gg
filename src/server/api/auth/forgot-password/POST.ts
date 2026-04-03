import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { sendPasswordResetEmail } from "../../../lib/email.js";
import { issuePasswordResetToken } from "../../../lib/password-reset.js";

function genericSuccess(res: Response) {
  return res.json({
    success: true,
    message:
      "If the account exists, a password reset link has been sent to the email.",
  });
}

export default async function handler(req: Request, res: Response) {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isDisabled: users.isDisabled,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.isDisabled) {
      return genericSuccess(res);
    }

    const resetToken = await issuePasswordResetToken(user.id, null);
    await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.fullName || undefined,
      { adminIssued: false },
    );

    return genericSuccess(res);
  } catch (error) {
    console.error("Failed to process forgot password request:", error);
    return genericSuccess(res);
  }
}
