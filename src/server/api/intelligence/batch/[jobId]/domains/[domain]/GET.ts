/**
 * GET /api/intelligence/batch/:jobId/domains/:domain
 *
 * Get detailed results for a specific domain in a batch job
 *
 * Response:
 * - domain: string
 * - status: string
 * - securityScore: number
 * - grade: string
 * - results: Object - Full analysis results
 */

import type { Request, Response } from "express";
import { db } from "../../../../../../db/client.js";
import { batchAnalysisDomains } from "../../../../../../db/schema.js";
import { eq, and } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, domain } = req.params;

    if (!jobId || !domain) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "jobId and domain are required",
      });
    }

    // Fetch domain result
    const [result] = await db
      .select()
      .from(batchAnalysisDomains)
      .where(
        and(
          eq(batchAnalysisDomains.jobId, jobId),
          eq(batchAnalysisDomains.domain, domain),
        ),
      )
      .limit(1);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Domain not found",
        message: `No results found for domain: ${domain} in job: ${jobId}`,
      });
    }

    res.json({
      success: true,
      domain: result.domain,
      status: result.status,
      securityScore: result.securityScore,
      grade: result.grade,
      expiryDays: result.expiryDays,
      hostingProvider: result.hostingProvider,
      issues: {
        critical: result.criticalIssues,
        high: result.highIssues,
        medium: result.mediumIssues,
        low: result.lowIssues,
      },
      results: result.results,
      error: result.error,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (error: unknown) {
    const message = "An internal error occurred";
    console.error("[Batch API] Error fetching domain result:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message,
    });
  }
}
