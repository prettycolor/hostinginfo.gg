import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

/**
 * POST /api/profile/privacy
 * Update user privacy settings
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { profileVisibility, showEmail, showStats } = req.body;

    // Validate profileVisibility
    if (
      profileVisibility &&
      !["public", "private"].includes(profileVisibility)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid profile visibility value" });
    }

    // Update user privacy settings
    await db
      .update(users)
      .set({
        profileVisibility: profileVisibility || "public",
        showEmail: showEmail ?? false,
        showStats: showStats ?? true,
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
      message: "Privacy settings updated",
      user: {
        profileVisibility: updatedUser.profileVisibility,
        showEmail: updatedUser.showEmail,
        showStats: updatedUser.showStats,
      },
    });
  } catch (error) {
    console.error("Failed to update privacy settings:", error);
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
}
