/**
 * GET /api/reports/:reportId
 *
 * Get a specific report by ID
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { reports } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const reportId = parseInt(req.params.reportId);

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid report ID",
      });
    }
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const report = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
      .limit(1);

    if (!report.length) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    res.json({
      success: true,
      report: report[0],
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch report",
      message: "An internal error occurred",
    });
  }
}
