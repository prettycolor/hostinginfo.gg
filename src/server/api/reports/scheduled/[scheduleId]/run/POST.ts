/**
 * POST /api/reports/scheduled/:scheduleId/run
 *
 * Manually trigger a scheduled report to run now
 */

import type { Request, Response } from "express";
import { db } from "../../../../../db/client.js";
import {
  scheduledReports,
  reports,
  scanHistory,
  reportTemplates,
} from "../../../../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import path from "path";
import { buildReportFromTemplate } from "../../../../../lib/reports/templates.js";
import {
  generatePDFReport,
  generateHTMLReport,
} from "../../../../../lib/reports/pdf-generator.js";
import {
  exportToCSV,
  exportToJSON,
} from "../../../../../lib/reports/exporters.js";
import { requireAuthenticatedUserId } from "../../../../../lib/request-auth.js";

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

    // Get schedule
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

    const sched = schedule[0];
    const reportDomain = sched.domain;
    if (!reportDomain) {
      return res.status(400).json({
        success: false,
        error: "Scheduled report domain is missing",
      });
    }

    const template = await db
      .select({ type: reportTemplates.type })
      .from(reportTemplates)
      .where(eq(reportTemplates.id, sched.templateId))
      .limit(1);
    const templateId = template[0]?.type || "comprehensive";

    const latestScan = await db
      .select({ scanData: scanHistory.scanData })
      .from(scanHistory)
      .where(
        and(
          eq(scanHistory.userId, userId),
          eq(scanHistory.domain, reportDomain),
        ),
      )
      .orderBy(desc(scanHistory.createdAt))
      .limit(1);

    let latestScanData: Record<string, unknown> = {};
    if (latestScan[0]?.scanData) {
      try {
        latestScanData = JSON.parse(latestScan[0].scanData);
      } catch {
        latestScanData = {};
      }
    }

    // Build report data from template
    const reportData = await buildReportFromTemplate(
      templateId,
      reportDomain,
      latestScanData,
    );

    // Generate filename
    const timestamp = Date.now();
    const sanitizedDomain = reportDomain.replace(/[^a-z0-9]/gi, "-");
    const filename = `report-${sanitizedDomain}-${timestamp}`;
    const outputDir = "/private/reports";
    const format = sched.format || "pdf";
    const outputPath = path.join(outputDir, `${filename}.${format}`);

    // Generate report
    let result;
    switch (format) {
      case "pdf":
        result = await generatePDFReport(reportData, outputPath);
        break;
      case "html":
        result = await generateHTMLReport(reportData, outputPath);
        break;
      case "csv":
        result = await exportToCSV(reportData, outputPath);
        break;
      case "json":
        result = await exportToJSON(reportData, outputPath);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported format: ${format}`,
        });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate report",
        message: result.error,
      });
    }

    // Save report to database
    const insertResult = await db.insert(reports).values({
      userId,
      templateId: sched.templateId,
      domain: reportDomain,
      title: reportData.title,
      type: reportData.type || "comprehensive",
      format,
      fileUrl: result.filePath!,
      fileSize: result.fileSize!,
      status: "completed",
      data: JSON.stringify({
        sections: reportData.sections.length,
        type: reportData.type,
        scheduledReportId: scheduleId,
      }),
    });

    const reportId = Number(insertResult[0].insertId);

    // Update schedule last run and next run
    const now = new Date();
    const nextRun = new Date(now);

    switch (sched.frequency) {
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

    await db
      .update(scheduledReports)
      .set({
        lastRun: now,
        nextRun,
      })
      .where(eq(scheduledReports.id, scheduleId));

    // Fetch the created report
    const newReport = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    res.json({
      success: true,
      message: "Report generated successfully",
      report: newReport[0],
    });
  } catch (error) {
    console.error("Error running scheduled report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to run scheduled report",
      message: "An internal error occurred",
    });
  }
}
