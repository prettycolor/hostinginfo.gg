/**
 * POST /api/intelligence/batch
 *
 * Create a new batch analysis job
 *
 * Request body:
 * - domains: string[] - Array of domains to analyze (max 100)
 * - options: AnalysisOptions - Optional analysis configuration
 *
 * Response:
 * - jobId: string - Unique job identifier
 * - status: string - Job status (pending)
 * - totalDomains: number - Number of domains to analyze
 * - estimatedTime: number - Estimated completion time in seconds
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { batchAnalysisJobs } from "../../../db/schema.js";
import { batchQueue } from "../../../lib/batch-queue.js";
import type { AnalysisOptions } from "../../../lib/domain-analyzer.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";
import { nanoid } from "nanoid";
import {
  validateBody,
  batchAnalysisSchema,
} from "../../../middleware/index.js";

interface BatchRequest {
  domains: string[];
  options?: {
    includeWhois?: boolean;
    includeDns?: boolean;
    includeIp?: boolean;
    includeTech?: boolean;
    includeUrlscan?: boolean;
  };
}

async function handler(req: Request, res: Response) {
  try {
    // Validation handled by middleware
    const { domains, options = {} }: BatchRequest = req.body;
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(domains.map((d) => d.toLowerCase()))];

    const queueOptions: AnalysisOptions = {
      collectWhois: options.includeWhois ?? true,
      collectDns: options.includeDns ?? true,
      collectIp: options.includeIp ?? true,
      collectTech: options.includeTech ?? true,
      collectUrlscan: options.includeUrlscan ?? false,
    };

    // Generate job ID
    const jobId = nanoid();

    // Estimate completion time (30 seconds per domain)
    const estimatedTime = uniqueDomains.length * 30;

    // Create job in database
    await db.insert(batchAnalysisJobs).values({
      id: jobId,
      userId,
      status: "pending",
      totalDomains: uniqueDomains.length,
      completedDomains: 0,
      failedDomains: 0,
      progress: 0,
      collectWhois: queueOptions.collectWhois ?? true,
      collectDns: queueOptions.collectDns ?? true,
      collectIp: queueOptions.collectIp ?? true,
      collectTech: queueOptions.collectTech ?? true,
      collectUrlscan: queueOptions.collectUrlscan ?? false,
      createdAt: new Date(),
    });

    // Add job to queue
    await batchQueue.addJob(jobId, uniqueDomains, queueOptions);

    console.log(
      `[Batch API] Created job ${jobId} with ${uniqueDomains.length} domains`,
    );

    // Return job info
    res.status(201).json({
      success: true,
      jobId,
      status: "pending",
      totalDomains: uniqueDomains.length,
      estimatedTime,
      message: "Batch analysis job created successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create batch analysis job";
    console.error("[Batch API] Error creating job:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message,
    });
  }
}

// Export with validation middleware
export default [validateBody(batchAnalysisSchema), handler];
