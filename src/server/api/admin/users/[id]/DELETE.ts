import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { sessions, users } from "../../../../db/schema.js";
import { requireAdminUser } from "../../../../lib/request-auth.js";

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

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await db
      .update(users)
      .set({
        isDisabled: true,
        disabledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await db.delete(sessions).where(eq(sessions.userId, userId));

    return res.json({
      success: true,
      message: "User disabled and active sessions revoked",
    });
  } catch (error) {
    console.error("Failed to disable user:", error);
    return res.status(500).json({ error: "Failed to disable user" });
  }
}
