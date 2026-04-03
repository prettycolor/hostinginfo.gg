/**
 * POST /api/reports
 *
 * Generate a new report
 */

import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { reports } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import path from "path";
import { buildReportFromTemplate } from "../../lib/reports/templates.js";
import {
  generatePDFReport,
  generateHTMLReport,
} from "../../lib/reports/pdf-generator.js";
import { exportToCSV, exportToJSON } from "../../lib/reports/exporters.js";
import { validateBody, reportSchema } from "../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

async function handler(req: Request, res: Response) {
  try {
    const { templateId, domain, format = "pdf", scanData } = req.body;
    // Validation handled by middleware
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Build report data from template
    const reportData = await buildReportFromTemplate(
      templateId,
      domain,
      scanData || {},
    );

    // Generate filename
    const timestamp = Date.now();
    const sanitizedDomain = domain.replace(/[^a-z0-9]/gi, "-");
    const filename = `report-${sanitizedDomain}-${timestamp}`;
    const outputDir = "/private/reports";
    const outputPath = path.join(outputDir, `${filename}.${format}`);

    // Generate report in requested format
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

    // Save report metadata to database
    const insertResult = await db.insert(reports).values({
      userId,
      templateId,
      domain,
      title: reportData.title,
      type: reportData.type || "comprehensive",
      format,
      fileUrl: result.filePath!,
      fileSize: result.fileSize!,
      status: "completed",
      data: JSON.stringify({
        sections: reportData.sections.length,
        type: reportData.type,
      }),
    });

    const reportId = Number(insertResult[0].insertId);

    // Fetch the created report
    const newReport = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    res.status(201).json({
      success: true,
      report: newReport[0],
      filePath: result.filePath,
      fileSize: result.fileSize,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate report",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware
export default [validateBody(reportSchema), handler];
