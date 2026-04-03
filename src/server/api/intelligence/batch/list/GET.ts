/**
 * GET /api/intelligence/batch/list
 *
 * List all batch analysis jobs
 *
 * Query parameters:
 * - status: string - Filter by status (optional)
 * - limit: number - Number of jobs to return (default: 50, max: 100)
 * - offset: number - Pagination offset (default: 0)
 *
 * Response:
 * - jobs: Array - List of jobs
 * - total: number - Total number of jobs
 * - limit: number - Results per page
 * - offset: number - Current offset
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { batchAnalysisJobs } from "../../../../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

type BatchJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

function isBatchJobStatus(value: string): value is BatchJobStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  );
}

export default async function handler(req: Request, res: Response) {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    // Parse and validate pagination
    const limitNum = Math.min(
      Math.max(parseInt(limit as string, 10) || 50, 1),
      100,
    );
    const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

    const statusFilter =
      typeof status === "string" && isBatchJobStatus(status)
        ? status
        : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(batchAnalysisJobs)
      .where(
        statusFilter ? eq(batchAnalysisJobs.status, statusFilter) : sql`1=1`,
      );

    // Fetch jobs with pagination
    const jobs = await db
      .select()
      .from(batchAnalysisJobs)
      .where(
        statusFilter ? eq(batchAnalysisJobs.status, statusFilter) : sql`1=1`,
      )
      .orderBy(desc(batchAnalysisJobs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    res.json({
      success: true,
      jobs: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalDomains: job.totalDomains,
        completedDomains: job.completedDomains,
        failedDomains: job.failedDomains,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      })),
      total: Number(count),
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error: unknown) {
    console.error("[Batch API] Error listing jobs:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to list batch analysis jobs",
    });
  }
}
