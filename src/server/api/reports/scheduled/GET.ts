/**
 * GET /api/reports/scheduled
 *
 * List all scheduled reports for the authenticated user
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scheduledReports } from "../../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const schedules = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.userId, userId))
      .orderBy(desc(scheduledReports.createdAt));

    res.json({
      success: true,
      schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error("Error fetching scheduled reports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scheduled reports",
      message: "An internal error occurred",
    });
  }
}
