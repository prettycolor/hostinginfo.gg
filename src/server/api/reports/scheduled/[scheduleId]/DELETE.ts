/**
 * DELETE /api/reports/scheduled/:scheduleId
 *
 * Delete a scheduled report
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

    // Check if schedule exists
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

    // Delete schedule
    await db
      .delete(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, scheduleId),
          eq(scheduledReports.userId, userId),
        ),
      );

    res.json({
      success: true,
      message: "Scheduled report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scheduled report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete scheduled report",
      message: "An internal error occurred",
    });
  }
}
