/**
 * Start Batch Analysis Job
 *
 * POST /api/intelligence/batch/start
 *
 * Creates a new batch analysis job and queues domains for processing.
 * Processing happens asynchronously in the background.
 *
 * Request Body:
 * {
 *   "domains": ["example.com", "google.com", ...],
 *   "name": "Q1 2026 Portfolio Analysis" (optional),
 *   "settings": {
 *     "collectDns": true,
 *     "collectWhois": true,
 *     "collectIp": true,
 *     "collectTech": true,
 *     "collectUrlscan": false
 *   }
 * }
 *
 * Response:
 * {
 *   "jobId": "uuid",
 *   "status": "pending",
 *   "totalDomains": 10,
 *   "estimatedCompletionTime": 120 (seconds)
 * }
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import {
  batchAnalysisJobs,
  batchAnalysisDomains,
} from "../../../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  validateBody,
  batchAnalysisSchema,
} from "../../../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

interface BatchAnalysisSettings {
  collectDns?: boolean;
  collectWhois?: boolean;
  collectIp?: boolean;
  collectTech?: boolean;
  collectUrlscan?: boolean;
}

interface BatchAnalysisRequestBody {
  domains: string[];
  name?: string;
  settings?: BatchAnalysisSettings;
}

interface SecurityIssue {
  severity?: string;
}

interface BatchDomainReport {
  security?: {
    overall?: number;
    grade?: string;
    issues?: SecurityIssue[];
  };
  whois?: {
    daysUntilExpiry?: number;
  };
  infrastructure?: {
    hostingProvider?: string;
  };
}

/**
 * Normalize domain (remove protocol, www, trailing slash)
 */
function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase()
    .trim();
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Estimate completion time based on number of domains and enabled collectors
 * Average time per domain: ~10 seconds (DNS + WHOIS + IP + Tech)
 * URLScan adds ~15 seconds per domain
 */
function estimateCompletionTime(
  domainCount: number,
  settings: BatchAnalysisSettings,
): number {
  let baseTimePerDomain = 10; // seconds

  if (settings.collectUrlscan) {
    baseTimePerDomain += 15;
  }

  // Add overhead for parallel processing (assume 5 concurrent)
  const concurrency = 5;
  const batches = Math.ceil(domainCount / concurrency);

  return batches * baseTimePerDomain;
}

async function handler(req: Request, res: Response) {
  try {
    // Validation handled by middleware
    const body = req.body as BatchAnalysisRequestBody;
    const rawDomains = Array.isArray(body.domains) ? body.domains : [];
    const { name, settings } = body;

    // Normalize domains
    const normalizedDomains: string[] = rawDomains.map(normalizeDomain);
    const invalidDomains = normalizedDomains.filter(
      (d: string) => !isValidDomain(d),
    );

    if (invalidDomains.length > 0) {
      return res.status(400).json({
        error: "Invalid domains",
        message: `The following domains are invalid: ${invalidDomains.join(", ")}`,
      });
    }

    // Remove duplicates
    const uniqueDomains: string[] = Array.from(new Set(normalizedDomains));

    // Get user ID from session (or use 1 for demo)
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Parse settings with defaults
    const jobSettings = {
      collectDns: settings?.collectDns !== false,
      collectWhois: settings?.collectWhois !== false,
      collectIp: settings?.collectIp !== false,
      collectTech: settings?.collectTech !== false,
      collectUrlscan: settings?.collectUrlscan === true, // Off by default (expensive)
    };

    // Generate job ID
    const jobId = randomUUID();

    // Estimate completion time
    const estimatedSeconds = estimateCompletionTime(
      uniqueDomains.length,
      jobSettings,
    );
    const estimatedCompletionAt = new Date(
      Date.now() + estimatedSeconds * 1000,
    );

    // Create batch job
    await db.insert(batchAnalysisJobs).values({
      id: jobId,
      userId,
      name: name || `Batch Analysis - ${new Date().toLocaleDateString()}`,
      status: "pending",
      totalDomains: uniqueDomains.length,
      completedDomains: 0,
      failedDomains: 0,
      progress: 0,
      estimatedCompletionAt,
      collectDns: jobSettings.collectDns,
      collectWhois: jobSettings.collectWhois,
      collectIp: jobSettings.collectIp,
      collectTech: jobSettings.collectTech,
      collectUrlscan: jobSettings.collectUrlscan,
    });

    // Create domain entries
    const domainEntries = uniqueDomains.map((domain) => ({
      jobId,
      domain,
      status: "pending" as const,
    }));

    await db.insert(batchAnalysisDomains).values(domainEntries);

    // Start processing asynchronously (don't await)
    processBatchJob(jobId, uniqueDomains, jobSettings).catch((error) => {
      console.error(`Batch job ${jobId} processing error:`, error);
    });

    // Return job info
    res.status(201).json({
      jobId,
      status: "pending",
      totalDomains: uniqueDomains.length,
      estimatedCompletionTime: estimatedSeconds,
      message:
        "Batch analysis job created successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Error creating batch analysis job:", error);
    res.status(500).json({
      error: "Failed to create batch job",
      message: "An internal error occurred",
    });
  }
}

/**
 * Process batch job asynchronously
 * This runs in the background and updates the database as it progresses
 */
async function processBatchJob(
  jobId: string,
  domains: string[],
  settings: BatchAnalysisSettings,
): Promise<void> {
  try {
    // Update job status to processing
    await db
      .update(batchAnalysisJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
      })
      .where(eq(batchAnalysisJobs.id, jobId));

    // Process domains in parallel (5 at a time)
    const concurrency = 5;
    let completed = 0;

    for (let i = 0; i < domains.length; i += concurrency) {
      const batch = domains.slice(i, i + concurrency);

      await Promise.all(
        batch.map((domain) => processSingleDomain(jobId, domain, settings)),
      );

      // Update progress
      completed = Math.min(i + concurrency, domains.length);
      const progress = Math.round((completed / domains.length) * 100);

      await db
        .update(batchAnalysisJobs)
        .set({
          completedDomains: completed,
          progress,
        })
        .where(eq(batchAnalysisJobs.id, jobId));
    }

    // Mark job as completed
    await db
      .update(batchAnalysisJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        progress: 100,
      })
      .where(eq(batchAnalysisJobs.id, jobId));

    // Generate statistics
    await generateBatchStatistics(jobId);
  } catch (error) {
    console.error(`Batch job ${jobId} failed:`, error);

    await db
      .update(batchAnalysisJobs)
      .set({
        status: "failed",
        error: "An internal error occurred",
        completedAt: new Date(),
      })
      .where(eq(batchAnalysisJobs.id, jobId));
  }
}

/**
 * Process a single domain within a batch job
 */
async function processSingleDomain(
  jobId: string,
  domain: string,
  settings: BatchAnalysisSettings,
): Promise<void> {
  try {
    // Update domain status to processing
    await db
      .update(batchAnalysisDomains)
      .set({
        status: "processing",
        startedAt: new Date(),
      })
      .where(
        and(
          eq(batchAnalysisDomains.jobId, jobId),
          eq(batchAnalysisDomains.domain, domain),
        ),
      );

    // Collect data based on settings
    const results: Record<string, unknown> = {};

    if (settings.collectDns) {
      // Call DNS collection API
      results.dns = await fetch(
        `http://localhost:${process.env.PORT || 3000}/api/intelligence/collect/dns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      )
        .then((r) => r.json())
        .catch(() => null);
    }

    if (settings.collectWhois) {
      // Call WHOIS collection API
      results.whois = await fetch(
        `http://localhost:${process.env.PORT || 3000}/api/intelligence/collect/whois`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      )
        .then((r) => r.json())
        .catch(() => null);
    }

    if (settings.collectIp) {
      // Call IP collection API
      results.ip = await fetch(
        `http://localhost:${process.env.PORT || 3000}/api/intelligence/collect/ip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      )
        .then((r) => r.json())
        .catch(() => null);
    }

    if (settings.collectTech) {
      // Call technology collection API
      results.tech = await fetch(
        `http://localhost:${process.env.PORT || 3000}/api/intelligence/collect/technology`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      )
        .then((r) => r.json())
        .catch(() => null);
    }

    // Get comprehensive report
    const report = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/intelligence/report/${domain}`,
    )
      .then((r) => r.json() as Promise<BatchDomainReport>)
      .catch(() => null);

    // Extract key metrics
    const securityScore = report?.security?.overall || 0;
    const grade = report?.security?.grade || "F";
    const expiryDays = report?.whois?.daysUntilExpiry || 0;
    const hostingProvider =
      report?.infrastructure?.hostingProvider || "Unknown";
    const securityIssues = report?.security?.issues || [];
    const criticalIssues =
      securityIssues.filter((i: SecurityIssue) => i.severity === "critical")
        .length || 0;
    const highIssues =
      securityIssues.filter((i: SecurityIssue) => i.severity === "high")
        .length || 0;
    const mediumIssues =
      securityIssues.filter((i: SecurityIssue) => i.severity === "medium")
        .length || 0;
    const lowIssues =
      securityIssues.filter((i: SecurityIssue) => i.severity === "low")
        .length || 0;

    // Update domain with results
    await db
      .update(batchAnalysisDomains)
      .set({
        status: "completed",
        completedAt: new Date(),
        securityScore,
        grade,
        expiryDays,
        hostingProvider,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        results: report,
      })
      .where(
        and(
          eq(batchAnalysisDomains.jobId, jobId),
          eq(batchAnalysisDomains.domain, domain),
        ),
      );
  } catch (error) {
    console.error(`Failed to process domain ${domain}:`, error);

    await db
      .update(batchAnalysisDomains)
      .set({
        status: "failed",
        error: "An internal error occurred",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(batchAnalysisDomains.jobId, jobId),
          eq(batchAnalysisDomains.domain, domain),
        ),
      );
  }
}

/**
 * Generate statistics for completed batch job
 */
async function generateBatchStatistics(_jobId: string): Promise<void> {
  // Statistics generation not yet implemented
  // This will be implemented in the next phase
}

// Export with validation middleware
export default [validateBody(batchAnalysisSchema), handler];
