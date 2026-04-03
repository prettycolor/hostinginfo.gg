import crypto from "node:crypto";
import { db } from "../db/client.js";
import { passwordResetTokens } from "../db/schema.js";
import { hashPasswordResetToken } from "./password-reset-token.js";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function issuePasswordResetToken(
  userId: number,
  createdByAdminId: number | null = null,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
    createdByAdminId,
  });

  return rawToken;
}
