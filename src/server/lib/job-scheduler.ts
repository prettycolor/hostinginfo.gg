/**
 * Background Job Scheduler - Manage async tasks and scheduled jobs
 *
 * Features:
 * - Queue-based job processing
 * - Retry logic with exponential backoff
 * - Job prioritization
 * - Status tracking
 * - Cron-based scheduling
 */

import { db } from "../db/client.js";
import { backgroundJobs } from "../db/schema.js";
import { eq, and, lte } from "drizzle-orm";

export type JobType =
  | "domain_scan"
  | "performance_check"
  | "report_generation"
  | "email_notification"
  | "data_cleanup"
  | "cache_refresh";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type JobPriority = "low" | "normal" | "high" | "urgent";

export type JobPayload = Record<string, unknown>;

export interface Job {
  id: number;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  payload: JobPayload;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: unknown;
}

// In-memory job queue for fast processing
const jobQueue: Job[] = [];
let isProcessing = false;

/**
 * Schedule a new job
 */
export async function scheduleJob(
  type: JobType,
  payload: JobPayload,
  options: {
    priority?: JobPriority;
    scheduledFor?: Date;
    maxAttempts?: number;
  } = {},
): Promise<number> {
  const {
    priority = "normal",
    scheduledFor = new Date(),
    maxAttempts = 3,
  } = options;

  try {
    const result = await db.insert(backgroundJobs).values({
      type,
      status: "pending",
      priority,
      payload: JSON.stringify(payload),
      attempts: 0,
      maxAttempts,
      scheduledFor,
    });

    const jobId = Number(result[0].insertId);

    // Add to in-memory queue if scheduled for now
    if (scheduledFor <= new Date()) {
      const job = await getJob(jobId);
      if (job) {
        jobQueue.push(job);
        sortJobQueue();
        processQueue(); // Start processing if not already running
      }
    }

    return jobId;
  } catch (error) {
    console.error("[JobScheduler] Error scheduling job:", error);
    throw error;
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: number): Promise<Job | null> {
  try {
    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, jobId))
      .limit(1);

    if (jobs.length === 0) return null;

    const job = jobs[0];
    return {
      id: job.id,
      type: job.type as JobType,
      status: job.status as JobStatus,
      priority: job.priority as JobPriority,
      payload: JSON.parse(job.payload),
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      error: job.error || undefined,
      result: job.result ? JSON.parse(job.result) : undefined,
    };
  } catch (error) {
    console.error("[JobScheduler] Error getting job:", error);
    return null;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: number,
  status: JobStatus,
  data?: {
    error?: string;
    result?: unknown;
    startedAt?: Date;
    completedAt?: Date;
  },
): Promise<void> {
  try {
    await db
      .update(backgroundJobs)
      .set({
        status,
        error: data?.error,
        result: data?.result ? JSON.stringify(data.result) : undefined,
        startedAt: data?.startedAt,
        completedAt: data?.completedAt,
      })
      .where(eq(backgroundJobs.id, jobId));
  } catch (error) {
    console.error("[JobScheduler] Error updating job status:", error);
  }
}

/**
 * Process job queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || jobQueue.length === 0) return;

  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift()!;

    try {
      await processJob(job);
    } catch (error) {
      console.error(`[JobScheduler] Error processing job ${job.id}:`, error);
    }
  }

  isProcessing = false;
}

/**
 * Process a single job
 */
async function processJob(job: Job): Promise<void> {
  console.log(`[JobScheduler] Processing job ${job.id} (${job.type})`);

  // Update status to processing
  await updateJobStatus(job.id, "processing", { startedAt: new Date() });

  try {
    // Execute job based on type
    const result = await executeJob(job);

    // Mark as completed
    await updateJobStatus(job.id, "completed", {
      result,
      completedAt: new Date(),
    });

    console.log(`[JobScheduler] Job ${job.id} completed successfully`);
  } catch {
    const errorMessage = "An internal error occurred";
    console.error(`[JobScheduler] Job ${job.id} failed:`, errorMessage);

    // Increment attempts
    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.maxAttempts) {
      // Max attempts reached - mark as failed
      await updateJobStatus(job.id, "failed", {
        error: errorMessage,
        completedAt: new Date(),
      });
      await db
        .update(backgroundJobs)
        .set({ attempts: newAttempts })
        .where(eq(backgroundJobs.id, job.id));
    } else {
      // Retry with exponential backoff
      const backoffMs = Math.pow(2, newAttempts) * 1000; // 2s, 4s, 8s, etc.
      const retryAt = new Date(Date.now() + backoffMs);

      await db
        .update(backgroundJobs)
        .set({
          status: "pending",
          attempts: newAttempts,
          scheduledFor: retryAt,
          error: errorMessage,
        })
        .where(eq(backgroundJobs.id, job.id));

      console.log(`[JobScheduler] Job ${job.id} will retry in ${backoffMs}ms`);
    }
  }
}

/**
 * Execute job based on type
 */
async function executeJob(job: Job): Promise<unknown> {
  switch (job.type) {
    case "domain_scan":
      // Import and execute domain scan
      // This will be implemented in Phase 1
      return { message: "Domain scan not yet implemented" };

    case "performance_check":
      // Import and execute performance check
      return { message: "Performance check not yet implemented" };

    case "report_generation":
      // Import and execute report generation
      return { message: "Report generation not yet implemented" };

    case "email_notification":
      // Import and execute email notification
      return { message: "Email notification not yet implemented" };

    case "data_cleanup":
      // Execute data cleanup
      return { message: "Data cleanup not yet implemented" };

    case "cache_refresh":
      // Execute cache refresh
      return { message: "Cache refresh not yet implemented" };

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * Sort job queue by priority and scheduled time
 */
function sortJobQueue(): void {
  const priorityWeight: Record<JobPriority, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  jobQueue.sort((a, b) => {
    // First by priority
    const priorityDiff =
      priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by scheduled time (earlier first)
    return a.scheduledFor.getTime() - b.scheduledFor.getTime();
  });
}

/**
 * Load pending jobs from database into queue
 */
export async function loadPendingJobs(): Promise<void> {
  try {
    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "pending"),
          lte(backgroundJobs.scheduledFor, new Date()),
        ),
      )
      .limit(100);

    jobs.forEach((dbJob) => {
      const job: Job = {
        id: dbJob.id,
        type: dbJob.type as JobType,
        status: dbJob.status as JobStatus,
        priority: dbJob.priority as JobPriority,
        payload: JSON.parse(dbJob.payload),
        attempts: dbJob.attempts,
        maxAttempts: dbJob.maxAttempts,
        scheduledFor: dbJob.scheduledFor,
        startedAt: dbJob.startedAt || undefined,
        completedAt: dbJob.completedAt || undefined,
        error: dbJob.error || undefined,
        result: dbJob.result ? JSON.parse(dbJob.result) : undefined,
      };

      jobQueue.push(job);
    });

    sortJobQueue();
    console.log(`[JobScheduler] Loaded ${jobs.length} pending jobs`);

    if (jobs.length > 0) {
      processQueue();
    }
  } catch (error) {
    console.error("[JobScheduler] Error loading pending jobs:", error);
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: number): Promise<boolean> {
  try {
    const job = await getJob(jobId);
    if (!job) return false;

    if (job.status === "processing") {
      // Cannot cancel processing job
      return false;
    }

    await updateJobStatus(jobId, "cancelled", { completedAt: new Date() });

    // Remove from queue if present
    const queueIndex = jobQueue.findIndex((j) => j.id === jobId);
    if (queueIndex !== -1) {
      jobQueue.splice(queueIndex, 1);
    }

    return true;
  } catch (error) {
    console.error("[JobScheduler] Error cancelling job:", error);
    return false;
  }
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  queueSize: number;
}> {
  try {
    const allJobs = await db.select().from(backgroundJobs);

    const stats = {
      pending: allJobs.filter((j) => j.status === "pending").length,
      processing: allJobs.filter((j) => j.status === "processing").length,
      completed: allJobs.filter((j) => j.status === "completed").length,
      failed: allJobs.filter((j) => j.status === "failed").length,
      queueSize: jobQueue.length,
    };

    return stats;
  } catch (error) {
    console.error("[JobScheduler] Error getting job stats:", error);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      queueSize: jobQueue.length,
    };
  }
}

// Initialize job scheduler on module load
loadPendingJobs();

// Check for new jobs every minute
setInterval(loadPendingJobs, 60000);
