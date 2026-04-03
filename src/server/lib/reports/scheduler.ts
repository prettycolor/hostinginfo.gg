/**
 * Report Scheduler
 *
 * Automatically runs scheduled reports using node-cron.
 * Checks every hour for reports that need to be generated.
 */

import { db } from "../../db/client.js";
import {
  scheduledReports,
  reports,
  scanHistory,
  reportTemplates,
} from "../../db/schema.js";
import { lte, eq, and, desc } from "drizzle-orm";
import path from "path";
import { buildReportFromTemplate } from "./templates.js";
import { generatePDFReport, generateHTMLReport } from "./pdf-generator.js";
import { exportToCSV, exportToJSON } from "./exporters.js";

type ScheduledReportRow = typeof scheduledReports.$inferSelect;

let schedulerTask: { stop: () => void } | null = null;

/**
 * Start the report scheduler
 * Runs every hour to check for due reports
 */
export function startScheduler() {
  // TEMPORARILY DISABLED - Database schema migration needed
  // The scheduled_reports table needs the 0011_fix_scheduled_reports.sql migration
  console.log(
    "[Scheduler] DISABLED - Database migration required for scheduled_reports table",
  );
  return;

  /* ORIGINAL CODE - RE-ENABLE AFTER MIGRATION
  if (schedulerTask) {
    console.log('[Scheduler] Already running');
    return;
  }
  
  // Run every hour at minute 0
  schedulerTask = cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Checking for due reports...');
    await processScheduledReports();
  });
  
  console.log('[Scheduler] Started - will check for due reports every hour');
  */
}

/**
 * Stop the report scheduler
 */
export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log("[Scheduler] Stopped");
  }
}

/**
 * Process all scheduled reports that are due
 */
export async function processScheduledReports() {
  try {
    const now = new Date();

    // Find all enabled schedules where nextRun <= now
    const dueSchedules = await db
      .select()
      .from(scheduledReports)
      .where(lte(scheduledReports.nextRun, now));

    if (dueSchedules.length === 0) {
      console.log("[Scheduler] No due reports found");
      return;
    }

    console.log(`[Scheduler] Found ${dueSchedules.length} due reports`);

    // Process each schedule
    for (const schedule of dueSchedules) {
      if (!schedule.enabled) {
        console.log(`[Scheduler] Skipping disabled schedule: ${schedule.name}`);
        continue;
      }

      try {
        await generateScheduledReport(schedule);
        console.log(`[Scheduler] ✓ Generated report: ${schedule.name}`);
      } catch (error) {
        console.error(
          `[Scheduler] ✗ Failed to generate report: ${schedule.name}`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error processing scheduled reports:", error);
  }
}

/**
 * Generate a single scheduled report
 */
async function generateScheduledReport(schedule: ScheduledReportRow) {
  if (!schedule.domain) {
    throw new Error("Scheduled report domain is missing");
  }

  const template = await db
    .select({ type: reportTemplates.type })
    .from(reportTemplates)
    .where(eq(reportTemplates.id, schedule.templateId))
    .limit(1);
  const templateId = template[0]?.type || "comprehensive";
  const latestScanData = await getLatestScanData(
    schedule.userId,
    schedule.domain,
  );

  // Build report data from template
  const reportData = await buildReportFromTemplate(
    templateId,
    schedule.domain,
    latestScanData,
  );

  // Generate filename
  const timestamp = Date.now();
  const sanitizedDomain = schedule.domain.replace(/[^a-z0-9]/gi, "-");
  const filename = `report-${sanitizedDomain}-${timestamp}`;
  const outputDir = "/private/reports";
  const format = schedule.format || "pdf";
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
      throw new Error(`Unsupported format: ${format}`);
  }

  if (!result.success) {
    throw new Error(result.error || "Failed to generate report");
  }

  // Save report to database
  await db.insert(reports).values({
    userId: schedule.userId,
    templateId: schedule.templateId,
    domain: schedule.domain,
    title: reportData.title,
    type: reportData.type || "comprehensive",
    format,
    fileUrl: result.filePath!,
    fileSize: result.fileSize!,
    status: "completed",
    data: JSON.stringify({
      sections: reportData.sections.length,
      type: reportData.type,
      scheduledReportId: schedule.id,
      generatedBy: "scheduler",
    }),
  });

  // Update schedule - set last run and calculate next run
  const nextRun = calculateNextRun(schedule.frequency);

  await db
    .update(scheduledReports)
    .set({
      lastRun: new Date(),
      nextRun,
    })
    .where(eq(scheduledReports.id, schedule.id));

  // Email delivery pending SMTP configuration
  if (schedule.recipients) {
    try {
      const recipients =
        typeof schedule.recipients === "string"
          ? JSON.parse(schedule.recipients)
          : schedule.recipients;
      console.log(
        `[Scheduler] Send report to ${recipients.length} recipients`,
      );
      // await sendReportEmail(recipients, result.filePath, reportData);
    } catch (error) {
      console.error("[Scheduler] Error sending email:", error);
    }
  }
}

async function getLatestScanData(
  userId: number,
  domain: string,
): Promise<Record<string, unknown>> {
  const latestScan = await db
    .select({ scanData: scanHistory.scanData })
    .from(scanHistory)
    .where(and(eq(scanHistory.userId, userId), eq(scanHistory.domain, domain)))
    .orderBy(desc(scanHistory.createdAt))
    .limit(1);

  if (!latestScan[0]?.scanData) {
    return {};
  }

  try {
    return JSON.parse(latestScan[0].scanData);
  } catch {
    return {};
  }
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency: string): Date {
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
    default:
      // Default to daily if unknown
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
  }

  return nextRun;
}

/**
 * Manually trigger scheduler (for testing)
 */
export async function triggerSchedulerNow() {
  console.log("[Scheduler] Manual trigger");
  await processScheduledReports();
}
