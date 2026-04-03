/**
 * PATCH /api/reports/scheduled/:scheduleId
 *
 * Update a scheduled report (enable/disable, change frequency, etc.)
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { scheduledReports } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { validateBody } from "../../../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

const scheduledReportPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  format: z.enum(["pdf", "json", "csv"]).optional(),
  recipients: z.array(z.string().email()).optional(),
  enabled: z.boolean().optional(),
});

async function handler(req: Request, res: Response) {
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
    const existing = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, scheduleId),
          eq(scheduledReports.userId, userId),
        ),
      )
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        error: "Scheduled report not found",
      });
    }

    // Build update object
    const updates: Partial<typeof scheduledReports.$inferInsert> = {};
    const { name, frequency, format, recipients, enabled } = req.body;

    if (name !== undefined) updates.name = name;
    if (format !== undefined) updates.format = format;
    if (enabled !== undefined) updates.enabled = enabled;
    if (recipients !== undefined) updates.recipients = recipients;

    // If frequency changes, recalculate next run
    if (frequency !== undefined) {
      const validFrequencies = ["daily", "weekly", "monthly"];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`,
        });
      }

      updates.frequency = frequency;

      const now = new Date();
      const nextRun = new Date(now);

      switch (frequency) {
        case "daily":
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(0, 0, 0, 0);
          break;
        case "weekly":
          nextRun.setDate(nextRun.getDate() + 7);
          nextRun.setHours(0, 0, 0, 0);
          break;
        case "monthly":
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(1);
          nextRun.setHours(0, 0, 0, 0);
          break;
      }

      updates.nextRun = nextRun;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update",
      });
    }

    // Update schedule
    await db
      .update(scheduledReports)
      .set(updates)
      .where(
        and(
          eq(scheduledReports.id, scheduleId),
          eq(scheduledReports.userId, userId),
        ),
      );

    // Fetch updated schedule
    const updated = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, scheduleId))
      .limit(1);

    res.json({
      success: true,
      schedule: updated[0],
    });
  } catch (error) {
    console.error("Error updating scheduled report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update scheduled report",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware (partial validation for PATCH)
export default [validateBody(scheduledReportPatchSchema), handler];
