/**
 * GET /api/reports/scheduled/:scheduleId
 *
 * Get a specific scheduled report by ID
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { scheduledReports } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const scheduleId = parseInt(req.params.scheduleId);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid schedule ID",
      });
    }
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const schedule = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, scheduleId),
          eq(scheduledReports.userId, userId),
        ),
      )
      .limit(1);

    if (!schedule.length) {
      return res.status(404).json({
        success: false,
        error: "Scheduled report not found",
      });
    }

    res.json({
      success: true,
      schedule: schedule[0],
    });
  } catch (error) {
    console.error("Error fetching scheduled report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scheduled report",
      message: "An internal error occurred",
    });
  }
}
