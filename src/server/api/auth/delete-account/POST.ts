import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import {
  users,
  sessions,
  emailVerifications,
  claimedDomains,
  scanHistory,
  analyticsEvents,
} from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";

/**
 * DELETE /api/auth/delete-account
 * Permanently delete user account and all associated data
 */
export default async function handler(req: Request, res: Response) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = decoded.userId;

    // Delete all user data in order (respecting foreign key constraints)
    // 1. Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // 2. Delete email verifications
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.userId, userId));

    // 3. Delete claimed domains
    await db.delete(claimedDomains).where(eq(claimedDomains.userId, userId));

    // 4. Delete scan history
    await db.delete(scanHistory).where(eq(scanHistory.userId, userId));

    // 5. Delete analytics events
    await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, userId));

    // 6. Finally, delete the user account
    await db.delete(users).where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Account and all associated data permanently deleted",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      error: "Failed to delete account",
      message: "An internal error occurred",
    });
  }
}
