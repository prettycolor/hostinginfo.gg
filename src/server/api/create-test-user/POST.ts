import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * POST /api/create-test-user
 *
 * Only available in development mode.
 */
export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const testUser = {
      email: "test@hostinginfo.gg",
      fullName: "Test User",
      firstName: "Test",
      lastName: "User",
      profileName: "Test User",
      emailVerified: true,
      authProvider: "email",
    };

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.json({
        success: true,
        message: "Test user already exists",
        email: testUser.email,
        loginUrl: "/login",
      });
    }

    // Hash password
    const testPassword = process.env.TEST_USER_PASSWORD || "change-me-in-env";
    const passwordHash = await bcrypt.hash(testPassword, 12);

    // Insert test user
    await db.insert(users).values({
      email: testUser.email,
      passwordHash: passwordHash,
      fullName: testUser.fullName,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      profileName: testUser.profileName,
      emailVerified: testUser.emailVerified,
      emailVerifiedAt: new Date(),
      authProvider: testUser.authProvider,
      lastLoginAt: new Date(),
      emailNotifications: false,
      scanAlerts: false,
      weeklyReports: false,
      marketingEmails: false,
    });

    res.json({
      success: true,
      message: "Test user created successfully",
      email: testUser.email,
      loginUrl: "/login",
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create test user",
    });
  }
}
