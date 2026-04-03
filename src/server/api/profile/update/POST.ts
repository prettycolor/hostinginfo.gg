import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";
import { validateUsername } from "../../../lib/username.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { profileName, firstName, lastName, fullName, bio } = req.body;

    // Validate at least one field is provided
    if (
      profileName === undefined &&
      firstName === undefined &&
      lastName === undefined &&
      fullName === undefined &&
      bio === undefined
    ) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided" });
    }

    // Build update object
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (profileName !== undefined) {
      const [currentUser] = await db
        .select({
          profileName: users.profileName,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const incomingProfileName =
        typeof profileName === "string" ? profileName.trim() : profileName;
      const isUnchangedLegacyUsername =
        typeof incomingProfileName === "string" &&
        currentUser?.profileName !== null &&
        incomingProfileName === currentUser?.profileName;

      if (isUnchangedLegacyUsername) {
        // Keep legacy usernames unchanged to avoid blocking unrelated profile edits.
      } else {
        const usernameValidation = validateUsername(profileName);
        if (!usernameValidation.valid) {
          return res.status(400).json({ error: usernameValidation.error });
        }

        const normalizedProfileName = usernameValidation.normalized;
        const existingUsername = await db
          .select({ id: users.id })
          .from(users)
          .where(
            sql`lower(${users.profileName}) = lower(${normalizedProfileName})`,
          )
          .limit(1);

        if (existingUsername.length > 0 && existingUsername[0].id !== userId) {
          return res.status(409).json({ error: "Username is already taken" });
        }

        updateData.profileName = normalizedProfileName;
      }
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;

    // Update user profile
    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Fetch updated user
    const [updatedUser] = await db
      .select({
        id: users.id,
        email: users.email,
        profileName: users.profileName,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        bio: users.bio,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res
      .status(500)
      .json({
        error: "Failed to update profile",
        message: "An internal error occurred",
      });
  }
}
