/**
 * Batch Queue System
 *
 * In-memory job queue for processing batch domain analysis.
 *
 * Features:
 * - FIFO job processing
 * - Concurrent job execution (configurable limit)
 * - Job status tracking
 * - Progress updates
 * - Error handling and retry logic
 * - Job cancellation support
 */

import { db } from "../db/client.js";
import {
  batchAnalysisJobs,
  batchAnalysisDomains,
  batchAnalysisStats,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { analyzeDomain, type AnalysisOptions } from "./domain-analyzer.js";

export interface JobConfig {
  jobId: string;
  domains: string[];
  options: AnalysisOptions;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  totalDomains: number;
  completedDomains: number;
  failedDomains: number;
  startedAt?: Date;
  completedAt?: Date;
}

type TopIssue = { issue: string; count: number; severity: string };

function toErrorMessage(_error: unknown): string {
  return "An internal error occurred";
}

class BatchQueue {
  private queue: JobConfig[] = [];
  private activeJobs: Map<string, boolean> = new Map();
  private cancelledJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 1; // Process one job at a time
  private processingCount: number = 0;

  /**
   * Add a job to the queue
   */
  async addJob(
    jobId: string,
    domains: string[],
    options: AnalysisOptions = {},
  ): Promise<void> {
    console.log(
      `[BatchQueue] Adding job ${jobId} with ${domains.length} domains`,
    );

    const config: JobConfig = {
      jobId,
      domains,
      options,
    };

    this.queue.push(config);
    this.activeJobs.set(jobId, true);

    // Start processing if not at capacity
    this.processNext();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    console.log(`[BatchQueue] Cancelling job ${jobId}`);

    this.cancelledJobs.add(jobId);
    this.activeJobs.delete(jobId);

    // Remove from queue if not started
    this.queue = this.queue.filter((job) => job.jobId !== jobId);

    // Update database
    await db
      .update(batchAnalysisJobs)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(eq(batchAnalysisJobs.id, jobId));
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const [job] = await db
      .select()
      .from(batchAnalysisJobs)
      .where(eq(batchAnalysisJobs.id, jobId))
      .limit(1);

    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      totalDomains: job.totalDomains,
      completedDomains: job.completedDomains,
      failedDomains: job.failedDomains,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    };
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    // Check if we can process more jobs
    if (this.processingCount >= this.maxConcurrentJobs) {
      return;
    }

    // Get next job from queue
    const config = this.queue.shift();
    if (!config) {
      return;
    }

    // Check if job was cancelled
    if (this.cancelledJobs.has(config.jobId)) {
      console.log(`[BatchQueue] Job ${config.jobId} was cancelled, skipping`);
      this.cancelledJobs.delete(config.jobId);
      this.processNext(); // Try next job
      return;
    }

    // Process job
    this.processingCount++;
    this.processJob(config)
      .catch((error) => {
        console.error(
          `[BatchQueue] Error processing job ${config.jobId}:`,
          error,
        );
      })
      .finally(() => {
        this.processingCount--;
        this.activeJobs.delete(config.jobId);
        this.processNext(); // Process next job
      });
  }

  /**
   * Process a single job
   */
  private async processJob(config: JobConfig): Promise<void> {
    const { jobId, domains, options } = config;

    console.log(`[BatchQueue] Starting job ${jobId}`);

    try {
      // Update job status to processing
      await db
        .update(batchAnalysisJobs)
        .set({
          status: "processing",
          startedAt: new Date(),
        })
        .where(eq(batchAnalysisJobs.id, jobId));

      // Process each domain
      let completedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < domains.length; i++) {
        // Check if job was cancelled
        if (this.cancelledJobs.has(jobId)) {
          console.log(`[BatchQueue] Job ${jobId} cancelled during processing`);
          this.cancelledJobs.delete(jobId);
          return;
        }

        const domain = domains[i];
        console.log(
          `[BatchQueue] Processing domain ${i + 1}/${domains.length}: ${domain}`,
        );

        try {
          // Update domain status to processing
          await db.insert(batchAnalysisDomains).values({
            jobId,
            domain,
            status: "processing",
            startedAt: new Date(),
          });

          // Analyze domain
          const result = await analyzeDomain(domain, options);

          // Update domain with results
          if (result.status === "success") {
            await db
              .update(batchAnalysisDomains)
              .set({
                status: "completed",
                securityScore: result.securityScore,
                grade: result.grade,
                expiryDays: result.expiryDays,
                hostingProvider: result.hostingProvider,
                criticalIssues: result.issueCounts?.critical || 0,
                highIssues: result.issueCounts?.high || 0,
                mediumIssues: result.issueCounts?.medium || 0,
                lowIssues: result.issueCounts?.low || 0,
                results: result.rawData as unknown,
                completedAt: new Date(),
              })
              .where(
                and(
                  eq(batchAnalysisDomains.jobId, jobId),
                  eq(batchAnalysisDomains.domain, domain),
                ),
              );

            completedCount++;
          } else {
            await db
              .update(batchAnalysisDomains)
              .set({
                status: "failed",
                error: result.error,
                completedAt: new Date(),
              })
              .where(
                and(
                  eq(batchAnalysisDomains.jobId, jobId),
                  eq(batchAnalysisDomains.domain, domain),
                ),
              );

            failedCount++;
          }
        } catch (error: unknown) {
          console.error(`[BatchQueue] Error analyzing ${domain}:`, error);

          // Update domain with error
          await db
            .update(batchAnalysisDomains)
            .set({
              status: "failed",
              error: toErrorMessage(error),
              completedAt: new Date(),
            })
            .where(
              and(
                eq(batchAnalysisDomains.jobId, jobId),
                eq(batchAnalysisDomains.domain, domain),
              ),
            );

          failedCount++;
        }

        // Update job progress
        const progress = Math.round(((i + 1) / domains.length) * 100);
        await db
          .update(batchAnalysisJobs)
          .set({
            progress,
            completedDomains: completedCount,
            failedDomains: failedCount,
          })
          .where(eq(batchAnalysisJobs.id, jobId));
      }

      // Calculate statistics
      await this.calculateStatistics(jobId);

      // Update job status to completed
      await db
        .update(batchAnalysisJobs)
        .set({
          status: "completed",
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(batchAnalysisJobs.id, jobId));

      console.log(
        `[BatchQueue] Job ${jobId} completed: ${completedCount} successful, ${failedCount} failed`,
      );
    } catch (error: unknown) {
      console.error(`[BatchQueue] Job ${jobId} failed:`, error);

      // Update job status to failed
      await db
        .update(batchAnalysisJobs)
        .set({
          status: "failed",
          error: toErrorMessage(error),
          completedAt: new Date(),
        })
        .where(eq(batchAnalysisJobs.id, jobId));
    }
  }

  /**
   * Calculate statistics for a completed job
   */
  private async calculateStatistics(jobId: string): Promise<void> {
    console.log(`[BatchQueue] Calculating statistics for job ${jobId}`);

    try {
      // Fetch all completed domains
      const domains = await db
        .select()
        .from(batchAnalysisDomains)
        .where(
          and(
            eq(batchAnalysisDomains.jobId, jobId),
            eq(batchAnalysisDomains.status, "completed"),
          ),
        );

      if (domains.length === 0) {
        console.log(`[BatchQueue] No completed domains for job ${jobId}`);
        return;
      }

      // Calculate average score
      const scores = domains
        .map((d) => d.securityScore)
        .filter((s): s is number => s !== null);
      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      // Calculate total issues
      const totalCriticalIssues = domains.reduce(
        (sum, d) => sum + (d.criticalIssues || 0),
        0,
      );
      const totalHighIssues = domains.reduce(
        (sum, d) => sum + (d.highIssues || 0),
        0,
      );
      const totalMediumIssues = domains.reduce(
        (sum, d) => sum + (d.mediumIssues || 0),
        0,
      );
      const totalLowIssues = domains.reduce(
        (sum, d) => sum + (d.lowIssues || 0),
        0,
      );

      // Calculate expiry statistics
      const expiringWithin30Days = domains.filter(
        (d) => d.expiryDays !== null && d.expiryDays >= 0 && d.expiryDays <= 30,
      ).length;
      const expiringWithin60Days = domains.filter(
        (d) => d.expiryDays !== null && d.expiryDays > 30 && d.expiryDays <= 60,
      ).length;
      const expiringWithin90Days = domains.filter(
        (d) => d.expiryDays !== null && d.expiryDays > 60 && d.expiryDays <= 90,
      ).length;
      const expired = domains.filter(
        (d) => d.expiryDays !== null && d.expiryDays < 0,
      ).length;

      // Calculate grade distribution
      const gradeAPlus = domains.filter((d) => d.grade === "A+").length;
      const gradeA = domains.filter((d) => d.grade === "A").length;
      const gradeAMinus = domains.filter((d) => d.grade === "A-").length;
      const gradeBPlus = domains.filter((d) => d.grade === "B+").length;
      const gradeB = domains.filter((d) => d.grade === "B").length;
      const gradeBMinus = domains.filter((d) => d.grade === "B-").length;
      const gradeCPlus = domains.filter((d) => d.grade === "C+").length;
      const gradeC = domains.filter((d) => d.grade === "C").length;
      const gradeCMinus = domains.filter((d) => d.grade === "C-").length;
      const gradeD = domains.filter((d) => d.grade === "D").length;
      const gradeF = domains.filter((d) => d.grade === "F").length;

      // Calculate top hosting providers
      const providerCounts = new Map<string, number>();
      domains.forEach((d) => {
        if (d.hostingProvider) {
          providerCounts.set(
            d.hostingProvider,
            (providerCounts.get(d.hostingProvider) || 0) + 1,
          );
        }
      });
      const topHostingProviders = Array.from(providerCounts.entries())
        .map(([provider, count]) => ({ provider, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Insert or update statistics
      await db.insert(batchAnalysisStats).values({
        jobId,
        averageScore,
        totalCriticalIssues,
        totalHighIssues,
        totalMediumIssues,
        totalLowIssues,
        expiringWithin30Days,
        expiringWithin60Days,
        expiringWithin90Days,
        expired,
        gradeAPlus,
        gradeA,
        gradeAMinus,
        gradeBPlus,
        gradeB,
        gradeBMinus,
        gradeCPlus,
        gradeC,
        gradeCMinus,
        gradeD,
        gradeF,
        topHostingProviders,
        topIssues: [] as TopIssue[], // Top issues calculation pending
      });

      console.log(`[BatchQueue] Statistics calculated for job ${jobId}`);
    } catch (error: unknown) {
      console.error(
        `[BatchQueue] Error calculating statistics for job ${jobId}:`,
        error,
      );
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeJobs: number;
    processingCount: number;
  } {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      processingCount: this.processingCount,
    };
  }
}

// Singleton instance
export const batchQueue = new BatchQueue();
