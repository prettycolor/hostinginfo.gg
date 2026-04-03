/**
 * POST /api/intelligence/security/compare
 *
 * Compare security scores across multiple domains
 *
 * Request Body:
 * {
 *   "domains": ["example.com", "example.net", "example.org"]
 * }
 *
 * Returns:
 * - Security scores for all domains
 * - Comparative analysis
 * - Best/worst performers
 * - Common issues across domains
 */

import type { Request, Response } from "express";
import { calculateSecurityScore } from "../../../../lib/security-posture-scoring.js";
import type { SecurityScore } from "../../../../lib/security-posture-scoring.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: "domains array is required" });
    }

    if (domains.length < 2) {
      return res
        .status(400)
        .json({ error: "At least 2 domains are required for comparison" });
    }

    if (domains.length > 10) {
      return res
        .status(400)
        .json({ error: "Maximum 10 domains allowed for comparison" });
    }

    // Calculate scores for all domains in parallel
    const scores = await Promise.all(
      domains.map((domain) => calculateSecurityScore(domain)),
    );

    // Find best and worst performers
    const sortedByScore = [...scores].sort(
      (a, b) => b.overallScore - a.overallScore,
    );
    const bestPerformer = sortedByScore[0];
    const worstPerformer = sortedByScore[sortedByScore.length - 1];

    // Calculate average score
    const averageScore = Math.round(
      scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length,
    );

    // Find common issues
    const allIssues = scores.flatMap((s) => s.findings.map((f) => f.title));
    const issueCounts = allIssues.reduce(
      (acc, issue) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const commonIssues = Object.entries(issueCounts)
      .filter(([_, count]) => count >= Math.ceil(domains.length / 2))
      .map(([issue, count]) => ({ issue, affectedDomains: count }))
      .sort((a, b) => b.affectedDomains - a.affectedDomains);

    // Category comparison
    const categoryComparison = {
      sslTls: calculateCategoryAverage(scores, "sslTls"),
      securityHeaders: calculateCategoryAverage(scores, "securityHeaders"),
      dnsSecurity: calculateCategoryAverage(scores, "dnsSecurity"),
      emailSecurity: calculateCategoryAverage(scores, "emailSecurity"),
      vulnerabilities: calculateCategoryAverage(scores, "vulnerabilities"),
      threatIntelligence: calculateCategoryAverage(
        scores,
        "threatIntelligence",
      ),
    };

    res.json({
      totalDomains: domains.length,
      averageScore,
      bestPerformer: {
        domain: bestPerformer.domain,
        score: bestPerformer.overallScore,
        grade: bestPerformer.grade,
      },
      worstPerformer: {
        domain: worstPerformer.domain,
        score: worstPerformer.overallScore,
        grade: worstPerformer.grade,
      },
      commonIssues,
      categoryComparison,
      domainScores: scores,
    });
  } catch (error) {
    console.error("Error comparing security scores:", error);
    res.status(500).json({
      error: "Failed to compare security scores",
      message: "An internal error occurred",
    });
  }
}

function calculateCategoryAverage(
  scores: SecurityScore[],
  categoryKey: keyof SecurityScore["categoryScores"],
): number {
  const total = scores.reduce((sum, s) => {
    return sum + s.categoryScores[categoryKey].percentage;
  }, 0);
  return Math.round(total / scores.length);
}
