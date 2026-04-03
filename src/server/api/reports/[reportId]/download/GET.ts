/**
 * GET /api/reports/:reportId/download
 *
 * Download a report file
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { reports } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

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

    const filePath = report[0].fileUrl;

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: "Report file not found",
      });
    }

    // Validate file path is within allowed reports directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(ALLOWED_REPORTS_DIR + "/")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: "Report file not found on disk",
      });
    }

    // Set content type based on format
    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      html: "text/html",
      csv: "text/csv",
      json: "application/json",
    };

    const format = report[0].format || "pdf";
    const contentType = contentTypes[format] || "application/octet-stream";

    // Set headers
    const filename = path.basename(filePath);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream file
    const fileContent = await fs.readFile(filePath);
    res.send(fileContent);
  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download report",
      message: "An internal error occurred",
    });
  }
}
