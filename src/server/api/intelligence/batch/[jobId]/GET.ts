/**
 * GET /api/intelligence/batch/:jobId
 *
 * Get batch analysis job status and results
 *
 * Response:
 * - jobId: string - Job identifier
 * - status: string - Job status (pending, processing, completed, failed, cancelled)
 * - progress: number - Completion percentage (0-100)
 * - totalDomains: number - Total domains in job
 * - completedDomains: number - Successfully analyzed domains
 * - failedDomains: number - Failed domains
 * - startedAt: Date - When job started processing
 * - completedAt: Date - When job completed
 * - domains: Array - Domain results (if completed)
 * - statistics: Object - Aggregated statistics (if completed)
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import {
  batchAnalysisJobs,
  batchAnalysisDomains,
  batchAnalysisStats,
} from "../../../../db/schema.js";
import { eq } from "drizzle-orm";

interface BatchDomainSummary {
  domain: string;
  status: string;
  securityScore: number | null;
  grade: string | null;
  expiryDays: number | null;
  hostingProvider: string | null;
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface BatchStatisticsSummary {
  averageScore: number | null;
  totalIssues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  expiry: {
    within30Days: number;
    within60Days: number;
    within90Days: number;
    expired: number;
  };
  gradeDistribution: Record<string, number>;
  topHostingProviders: unknown;
  topIssues: unknown;
}

interface BatchJobResponse {
  success: true;
  jobId: string;
  status: string;
  progress: number;
  totalDomains: number;
  completedDomains: number;
  failedDomains: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  domains?: BatchDomainSummary[];
  statistics?: BatchStatisticsSummary;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to fetch batch analysis job";
}

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "jobId is required",
      });
    }

    // Fetch job
    const [job] = await db
      .select()
      .from(batchAnalysisJobs)
      .where(eq(batchAnalysisJobs.id, jobId))
      .limit(1);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
        message: `No job found with ID: ${jobId}`,
      });
    }

    // Base response
    const response: BatchJobResponse = {
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      totalDomains: job.totalDomains,
      completedDomains: job.completedDomains,
      failedDomains: job.failedDomains,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    };

    // If job is completed, include domain results and statistics
    if (job.status === "completed") {
      // Fetch domain results
      const domains = await db
        .select()
        .from(batchAnalysisDomains)
        .where(eq(batchAnalysisDomains.jobId, jobId));

      // Fetch statistics
      const [stats] = await db
        .select()
        .from(batchAnalysisStats)
        .where(eq(batchAnalysisStats.jobId, jobId))
        .limit(1);

      response.domains = domains.map((d) => ({
        domain: d.domain,
        status: d.status,
        securityScore: d.securityScore,
        grade: d.grade,
        expiryDays: d.expiryDays,
        hostingProvider: d.hostingProvider,
        issues: {
          critical: d.criticalIssues,
          high: d.highIssues,
          medium: d.mediumIssues,
          low: d.lowIssues,
        },
        error: d.error,
        startedAt: d.startedAt,
        completedAt: d.completedAt,
      }));

      if (stats) {
        response.statistics = {
          averageScore: stats.averageScore,
          totalIssues: {
            critical: stats.totalCriticalIssues,
            high: stats.totalHighIssues,
            medium: stats.totalMediumIssues,
            low: stats.totalLowIssues,
          },
          expiry: {
            within30Days: stats.expiringWithin30Days,
            within60Days: stats.expiringWithin60Days,
            within90Days: stats.expiringWithin90Days,
            expired: stats.expired,
          },
          gradeDistribution: {
            "A+": stats.gradeAPlus,
            A: stats.gradeA,
            "A-": stats.gradeAMinus,
            "B+": stats.gradeBPlus,
            B: stats.gradeB,
            "B-": stats.gradeBMinus,
            "C+": stats.gradeCPlus,
            C: stats.gradeC,
            "C-": stats.gradeCMinus,
            D: stats.gradeD,
            F: stats.gradeF,
          },
          topHostingProviders: stats.topHostingProviders,
          topIssues: stats.topIssues,
        };
      }
    }

    res.json(response);
  } catch (error: unknown) {
    console.error("[Batch API] Error fetching job:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: getErrorMessage(error),
    });
  }
}
