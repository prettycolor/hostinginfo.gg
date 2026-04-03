/**
 * DELETE /api/reports/:reportId
 *
 * Delete a report
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { reports } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

const ALLOWED_REPORTS_DIR = "/private/reports";

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

    // Get report to delete file
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

    // Delete file if it exists and is within allowed directory
    if (report[0].fileUrl) {
      const resolvedPath = path.resolve(report[0].fileUrl);
      if (resolvedPath.startsWith(ALLOWED_REPORTS_DIR + "/")) {
        try {
          await fs.unlink(report[0].fileUrl);
        } catch (error) {
          console.error("Error deleting report file:", error);
        }
      }
    }

    // Delete from database
    await db
      .delete(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete report",
      message: "An internal error occurred",
    });
  }
}
