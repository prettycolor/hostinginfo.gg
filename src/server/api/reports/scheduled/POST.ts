/**
 * POST /api/reports/scheduled
 *
 * Create a new scheduled report
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scheduledReports } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody } from "../../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

const scheduledReportCreateSchema = z.object({
  name: z.string().min(1).max(100),
  templateId: z.number().int().positive().optional(),
  domain: z
    .string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    )
    .optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  format: z.enum(["pdf", "json", "csv"]).optional().default("pdf"),
  recipients: z.array(z.string().email()).optional(),
  enabled: z.boolean().optional().default(true),
});

async function handler(req: Request, res: Response) {
  try {
    const {
      name,
      templateId,
      domain,
      frequency,
      format = "pdf",
      recipients,
      enabled = true,
    } = req.body;

    // Validation handled by middleware
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: "templateId is required",
      });
    }

    // Calculate next run time based on frequency
    const now = new Date();
    const nextRun = new Date(now);
    let dayOfWeek: number | null = null;
    let dayOfMonth: number | null = null;
    const time = "00:00";

    switch (frequency) {
      case "daily":
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        nextRun.setDate(nextRun.getDate() + 7);
        nextRun.setHours(0, 0, 0, 0);
        dayOfWeek = nextRun.getDay();
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(0, 0, 0, 0);
        dayOfMonth = 1;
        break;
    }

    // Create scheduled report
    const insertResult = await db.insert(scheduledReports).values({
      userId,
      name,
      templateId,
      domain,
      frequency,
      format,
      dayOfWeek,
      dayOfMonth,
      time,
      recipients: Array.isArray(recipients) ? recipients : null,
      enabled,
      nextRun,
    });

    const scheduleId = Number(insertResult[0].insertId);

    // Fetch created schedule
    const newSchedule = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, scheduleId))
      .limit(1);

    res.status(201).json({
      success: true,
      schedule: newSchedule[0],
    });
  } catch (error) {
    console.error("Error creating scheduled report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create scheduled report",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware
export default [validateBody(scheduledReportCreateSchema), handler];
