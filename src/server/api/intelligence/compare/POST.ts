/**
 * Domain Comparison API Endpoint
 *
 * POST /api/intelligence/compare
 *
 * Compares 2-10 domains side-by-side. Supports two modes:
 * 1. Legacy mode: Uses intelligenceScans table (existing functionality)
 * 2. Advanced mode: Uses Phase 2 comparison engine (new functionality)
 *
 * @example Legacy Mode
 * POST /api/intelligence/compare
 * Body: { "domains": ["google.com", "microsoft.com"] }
 *
 * @example Advanced Mode
 * POST /api/intelligence/compare
 * Body: {
 *   "domains": ["google.com", "microsoft.com"],
 *   "mode": "advanced",
 *   "categories": ["dns", "hosting", "technology", "security"]
 * }
 */

import type { Request, Response } from "express";
import { validateBody, domainListSchema } from "../../../middleware/index.js";
import { db } from "../../../db/client.js";
import { intelligenceScans } from "../../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { PerformanceScoringEngine } from "../../../../lib/engines/performance-scoring-engine.js";
import { compareDomains } from "../../../lib/intelligence/comparison-engine.js";
import type { ComparisonRequest } from "../../../../types/comparison.js";

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Legacy comparison mode (existing functionality)
 */
async function legacyComparison(domains: string[]) {
  const comparisonData = await Promise.all(
    domains.map(async (domain) => {
      const scans = await db
        .select()
        .from(intelligenceScans)
        .where(eq(intelligenceScans.domain, domain))
        .orderBy(desc(intelligenceScans.createdAt));

      if (scans.length === 0) {
        return {
          domain,
          error: "No scans found",
          latestScan: null,
          performanceScore: null,
          stats: null,
        };
      }

      const latestScan = scans[0];

      // Parse JSON data
      const hostingData =
        typeof latestScan.hostingData === "string"
          ? JSON.parse(latestScan.hostingData)
          : latestScan.hostingData;
      const dnsData =
        typeof latestScan.dnsData === "string"
          ? JSON.parse(latestScan.dnsData)
          : latestScan.dnsData;
      const ipData =
        typeof latestScan.ipData === "string"
          ? JSON.parse(latestScan.ipData)
          : latestScan.ipData;
      const techData =
        typeof latestScan.techData === "string"
          ? JSON.parse(latestScan.techData)
          : latestScan.techData;

      // Calculate performance score
      const performanceScore = PerformanceScoringEngine.calculateScore({
        hosting: hostingData,
        dns: dnsData,
        ip: ipData,
        tech: techData,
      });

      // Calculate stats
      const confidenceScores = scans
        .map((s) => s.confidenceScore)
        .filter((s): s is number => s !== null);
      const avgConfidence =
        confidenceScores.length > 0
          ? Math.round(
              confidenceScores.reduce((a, b) => a + b, 0) /
                confidenceScores.length,
            )
          : 0;

      const techCounts = scans
        .map((s) => s.techCount)
        .filter((count): count is number => count !== null);
      const avgTechCount =
        techCounts.length > 0
          ? Math.round(
              techCounts.reduce((a, b) => a + b, 0) / techCounts.length,
            )
          : 0;

      return {
        domain,
        latestScan: {
          id: latestScan.id,
          edgeProvider: latestScan.edgeProvider,
          originHost: latestScan.originHost,
          confidenceScore: latestScan.confidenceScore,
          techCount: latestScan.techCount,
          createdAt: latestScan.createdAt,
          hostingData,
          dnsData,
          ipData,
          techData,
        },
        performanceScore,
        stats: {
          totalScans: scans.length,
          avgConfidence,
          avgTechCount,
          firstScan: scans[scans.length - 1].createdAt,
          lastScan: scans[0].createdAt,
        },
      };
    }),
  );

  // Calculate summary
  const validDomains = comparisonData.filter(
    (d) => d.performanceScore !== null,
  );

  if (validDomains.length === 0) {
    return {
      success: true,
      comparison: {
        domains: comparisonData,
        summary: null,
      },
    };
  }

  const bestSecurity = validDomains.reduce((best, current) =>
    current.performanceScore!.security > best.performanceScore!.security
      ? current
      : best,
  );

  const bestTechnology = validDomains.reduce((best, current) =>
    current.performanceScore!.technology > best.performanceScore!.technology
      ? current
      : best,
  );

  const bestInfrastructure = validDomains.reduce((best, current) =>
    current.performanceScore!.infrastructure >
    best.performanceScore!.infrastructure
      ? current
      : best,
  );

  const bestReliability = validDomains.reduce((best, current) =>
    current.performanceScore!.reliability > best.performanceScore!.reliability
      ? current
      : best,
  );

  const avgOverallScore = Math.round(
    validDomains.reduce((sum, d) => sum + d.performanceScore!.overall, 0) /
      validDomains.length,
  );

  return {
    success: true,
    comparison: {
      domains: comparisonData,
      summary: {
        bestSecurity: bestSecurity.domain,
        bestTechnology: bestTechnology.domain,
        bestInfrastructure: bestInfrastructure.domain,
        bestReliability: bestReliability.domain,
        avgOverallScore,
        totalDomainsCompared: validDomains.length,
      },
    },
  };
}

async function handler(req: Request, res: Response) {
  try {
    const {
      domains,
      mode,
      categories,
    }: ComparisonRequest & { mode?: "legacy" | "advanced" } = req.body;

    // Validate request
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Please provide an array of domains",
      });
    }

    // Validate domain count
    if (domains.length < 2 || domains.length > 10) {
      return res.status(400).json({
        error: "Invalid domain count",
        message: "Please provide 2-10 domains to compare",
      });
    }

    // Validate each domain
    const invalidDomains = domains.filter((d) => !isValidDomain(d));
    if (invalidDomains.length > 0) {
      return res.status(400).json({
        error: "Invalid domains",
        message: `The following domains are invalid: ${invalidDomains.join(", ")}`,
      });
    }

    // Determine mode (default to legacy for backward compatibility)
    const comparisonMode = mode || "legacy";

    if (comparisonMode === "advanced") {
      // Advanced mode: Use Phase 2 comparison engine
      if (domains.length > 5) {
        return res.status(400).json({
          error: "Invalid domain count for advanced mode",
          message:
            "Advanced mode supports 2-5 domains. Use legacy mode for up to 10 domains.",
        });
      }

      // Validate categories if provided
      if (categories && !Array.isArray(categories)) {
        return res.status(400).json({
          error: "Invalid categories",
          message: "Categories must be an array",
        });
      }

      const validCategories = [
        "dns",
        "hosting",
        "technology",
        "security",
        "performance",
      ];
      if (categories) {
        const invalidCategories = categories.filter(
          (c) => !validCategories.includes(c),
        );
        if (invalidCategories.length > 0) {
          return res.status(400).json({
            error: "Invalid categories",
            message: `Invalid categories: ${invalidCategories.join(", ")}. Valid: ${validCategories.join(", ")}`,
          });
        }
      }

      const result = await compareDomains({ domains, categories });
      return res.json(result);
    } else {
      // Legacy mode: Use existing intelligenceScans comparison
      const result = await legacyComparison(domains);
      return res.json(result);
    }
  } catch (error) {
    console.error("Domain comparison error:", error);
    res.status(500).json({
      error: "Comparison failed",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware
export default [validateBody(domainListSchema), handler];
