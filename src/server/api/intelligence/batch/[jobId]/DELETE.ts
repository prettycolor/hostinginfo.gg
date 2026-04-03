/**
 * DELETE /api/intelligence/batch/:jobId
 *
 * Cancel a batch analysis job
 *
 * Response:
 * - success: boolean
 * - message: string
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { batchAnalysisJobs } from "../../../../db/schema.js";
import { eq } from "drizzle-orm";
import { batchQueue } from "../../../../lib/batch-queue.js";

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

    // Check if job can be cancelled
    if (job.status === "completed" || job.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel job",
        message: `Job is already ${job.status}`,
      });
    }

    // Cancel job in queue
    await batchQueue.cancelJob(jobId);

    console.log(`[Batch API] Cancelled job ${jobId}`);

    res.json({
      success: true,
      message: "Batch analysis job cancelled successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel batch analysis job";
    console.error("[Batch API] Error cancelling job:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message,
    });
  }
}
