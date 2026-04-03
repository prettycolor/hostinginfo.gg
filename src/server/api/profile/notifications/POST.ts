import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * POST /api/profile/notifications
 * Update user notification preferences
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { emailNotifications, scanAlerts, weeklyReports, marketingEmails } =
      req.body;

    // Update user notification preferences
    await db
      .update(users)
      .set({
        emailNotifications: emailNotifications ?? false,
        scanAlerts: scanAlerts ?? false,
        weeklyReports: weeklyReports ?? false,
        marketingEmails: marketingEmails ?? false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Get updated user
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      success: true,
      message: "Notification preferences updated",
      user: {
        emailNotifications: updatedUser.emailNotifications,
        scanAlerts: updatedUser.scanAlerts,
        weeklyReports: updatedUser.weeklyReports,
        marketingEmails: updatedUser.marketingEmails,
      },
    });
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    res
      .status(500)
      .json({ error: "Failed to update notification preferences" });
  }
}
