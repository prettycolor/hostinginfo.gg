/**
 * Unified Intelligence Orchestrator (Phase 2)
 *
 * Coordinates all Phase 2 intelligence modules (correlation, anomaly detection,
 * predictive analytics) and generates comprehensive unified intelligence reports.
 *
 * @module unified-intelligence-orchestrator
 */

import { db } from "../../db/client.js";
import { intelligenceReportsCache } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { analyzeCorrelations } from "./correlation-engine.js";
import { analyzeAnomalies } from "./anomaly-detector.js";
import { analyzePredictions } from "./predictive-analytics.js";
import type {
  UnifiedIntelligenceReport,
  ExecutiveSummary,
  RiskAssessment,
  ActionableInsight,
  IntelligenceTrends,
  TechnologyHealth,
  InfrastructureHealth,
  SecurityPosture,
  ComplianceStatus,
  ReportOptions,
} from "../../../types/unified-intelligence.js";
import type { CorrelationAnalysis } from "../../../types/correlation.js";
import type { AnomalyAnalysis } from "../../../types/anomaly.js";
import type { PredictiveAnalysis } from "../../../types/prediction.js";

/**
 * Generate executive summary from analysis results
 */
function generateExecutiveSummary(
  domain: string,
  correlations: CorrelationAnalysis,
  anomalies: AnomalyAnalysis,
  predictions: PredictiveAnalysis,
): ExecutiveSummary {
  const now = new Date();

  // Calculate health score (0-100)
  const anomalyPenalty = Math.min(50, anomalies.summary.totalAnomalies * 5);
  const predictionPenalty = Math.min(
    30,
    predictions.summary.criticalCount * 10,
  );
  const healthScore = Math.max(0, 100 - anomalyPenalty - predictionPenalty);

  // Determine overall health
  let overallHealth: ExecutiveSummary["overallHealth"];
  if (healthScore >= 90) overallHealth = "excellent";
  else if (healthScore >= 75) overallHealth = "good";
  else if (healthScore >= 60) overallHealth = "fair";
  else if (healthScore >= 40) overallHealth = "poor";
  else overallHealth = "critical";

  // Calculate risk assessment
  const riskFactors: RiskAssessment["riskFactors"] = [];

  if (anomalies.summary.criticalCount > 0) {
    riskFactors.push({
      category: "Anomalies",
      severity: "critical",
      description: `${anomalies.summary.criticalCount} critical anomalies detected`,
      impact: "Immediate attention required",
    });
  }

  if (predictions.summary.criticalCount > 0) {
    riskFactors.push({
      category: "Predictions",
      severity: "critical",
      description: `${predictions.summary.criticalCount} critical issues predicted`,
      impact: "Proactive mitigation needed",
    });
  }

  // Calculate risk score
  const riskScore = Math.min(
    100,
    anomalies.summary.criticalCount * 20 +
      anomalies.summary.highCount * 10 +
      predictions.summary.criticalCount * 15 +
      predictions.summary.highCount * 8,
  );

  // Determine mitigation priority
  let mitigationPriority: RiskAssessment["mitigationPriority"];
  if (riskScore >= 70) mitigationPriority = "immediate";
  else if (riskScore >= 40) mitigationPriority = "soon";
  else if (riskScore >= 20) mitigationPriority = "planned";
  else mitigationPriority = "monitor";

  const riskAssessment: RiskAssessment = {
    overallRisk: anomalies.summary.overallRisk,
    riskScore,
    riskFactors,
    mitigationPriority,
  };

  // Generate key findings
  const keyFindings: string[] = [];

  if (correlations.summary.totalCorrelations > 0) {
    keyFindings.push(
      `${correlations.summary.totalCorrelations} infrastructure correlations identified`,
    );
  }

  if (anomalies.summary.totalAnomalies > 0) {
    keyFindings.push(
      `${anomalies.summary.totalAnomalies} anomalies detected across ${Object.keys(anomalies.summary.anomaliesByCategory).length} categories`,
    );
  }

  if (predictions.summary.nearTermPredictions.length > 0) {
    keyFindings.push(
      `${predictions.summary.nearTermPredictions.length} issues predicted within 30 days`,
    );
  }

  // Top recommendations
  const topRecommendations: string[] = [
    ...anomalies.summary.actionItems.slice(0, 3),
    ...predictions.summary.recommendedActions.slice(0, 2).map((a) => a.action),
  ].slice(0, 5);

  // Next review date (30 days from now)
  const nextReviewDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    domain,
    analyzedAt: now.toISOString(),
    overallHealth,
    healthScore,
    riskAssessment,
    keyFindings,
    criticalIssues:
      anomalies.summary.criticalCount + predictions.summary.criticalCount,
    highPriorityIssues:
      anomalies.summary.highCount + predictions.summary.highCount,
    totalIssues:
      anomalies.summary.totalAnomalies + predictions.summary.totalPredictions,
    topRecommendations,
    nextReviewDate,
  };
}

/**
 * Generate actionable insights from analysis results
 */
function generateActionableInsights(
  anomalies: AnomalyAnalysis,
  predictions: PredictiveAnalysis,
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];

  // Convert critical anomalies to insights
  anomalies.anomalies
    .filter((a) => a.severity === "critical")
    .slice(0, 5)
    .forEach((anomaly, idx) => {
      const recommendation =
        anomaly.recommendation || "Review and remediate this anomaly.";
      const impact = anomaly.impact || anomaly.description;
      insights.push({
        id: `anomaly-${idx}`,
        priority: "critical",
        category: "security",
        title: anomaly.title,
        description: anomaly.description,
        impact,
        recommendation,
        actionSteps: [recommendation],
        estimatedEffort: "medium",
        estimatedImpact: "high",
      });
    });

  // Convert critical predictions to insights
  predictions.predictions
    .filter((p) => p.severity === "critical")
    .slice(0, 5)
    .forEach((prediction, idx) => {
      insights.push({
        id: `prediction-${idx}`,
        priority: "critical",
        category: "optimization",
        title: prediction.title,
        description: prediction.description,
        impact: prediction.impact,
        recommendation: prediction.recommendation,
        actionSteps: prediction.preventionSteps,
        estimatedEffort: "medium",
        estimatedImpact: "high",
        dueDate: prediction.predictedDate,
      });
    });

  return insights;
}

/**
 * Generate placeholder health assessments
 * Placeholder: requires Phase 1 table integration for real data
 */
function generateHealthAssessments() {
  const technologyHealth: TechnologyHealth = {
    modernFrameworks: false,
    outdatedSoftware: 0,
    knownVulnerabilities: 0,
    securityPatchesAvailable: 0,
    eolSoftware: 0,
    technologyScore: 0,
    upgradeRecommendations: [],
  };

  const infrastructureHealth: InfrastructureHealth = {
    hostingProvider: "Unknown",
    hostingType: "unknown",
    cdnEnabled: false,
    loadBalancingDetected: false,
    redundancyLevel: "none",
    geographicDistribution: [],
    infrastructureScore: 0,
    scalabilityAssessment: "fair",
  };

  const securityPosture: SecurityPosture = {
    tlsVersion: "Unknown",
    securityHeaders: 0,
    vulnerabilities: 0,
    exposedServices: 0,
    securityScore: 0,
    threatLevel: "low",
  };

  const complianceStatus: ComplianceStatus = {
    dnssecEnabled: false,
    httpsEnabled: false,
    securityHeadersPresent: false,
    privacyPolicyDetected: false,
    cookieConsentDetected: false,
    gdprCompliant: null,
    hipaaCompliant: null,
    pciCompliant: null,
    complianceScore: 0,
    gaps: [],
  };

  const trends: IntelligenceTrends = {
    securityTrend: "stable",
    performanceTrend: "stable",
    reliabilityTrend: "stable",
    technologyTrend: "current",
    changeFrequency: "low",
    stabilityScore: 75,
  };

  return {
    technologyHealth,
    infrastructureHealth,
    securityPosture,
    complianceStatus,
    trends,
  };
}

/**
 * Check if cached report exists and is still valid
 */
async function getCachedReport(
  domain: string,
): Promise<UnifiedIntelligenceReport | null> {
  try {
    const cached = await db
      .select()
      .from(intelligenceReportsCache)
      .where(eq(intelligenceReportsCache.domain, domain))
      .limit(1);

    if (cached.length === 0) {
      return null;
    }

    const entry = cached[0];
    const now = new Date();

    // Check if cache is expired
    if (entry.expiresAt && new Date(entry.expiresAt) < now) {
      // Delete expired cache
      await db
        .delete(intelligenceReportsCache)
        .where(eq(intelligenceReportsCache.domain, domain));
      return null;
    }

    // Mark as cache hit
    const report = entry.reportData as UnifiedIntelligenceReport;
    report.reportMetadata.cacheHit = true;
    return report;
  } catch (error) {
    console.error("Cache retrieval error:", error);
    return null;
  }
}

/**
 * Save report to cache
 */
async function cacheReport(
  domain: string,
  report: UnifiedIntelligenceReport,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour TTL

    // Upsert (insert or update)
    await db
      .insert(intelligenceReportsCache)
      .values({
        domain,
        reportData: report as unknown as Record<string, unknown>,
        expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          reportData: report as unknown as Record<string, unknown>,
          expiresAt,
        },
      });
  } catch (error) {
    console.error("Cache save error:", error);
    // Don't throw - caching failure shouldn't break report generation
  }
}

/**
 * Generate unified intelligence report for a domain
 */
export async function generateUnifiedReport(
  domain: string,
  options: ReportOptions = {},
): Promise<UnifiedIntelligenceReport> {
  const startTime = Date.now();
  const now = new Date().toISOString();

  // Check cache if enabled (default: true)
  if (options.useCache !== false) {
    const cachedReport = await getCachedReport(domain);
    if (cachedReport) {
      return cachedReport;
    }
  }

  // Run all Phase 2 analyses in parallel
  const [correlations, anomalies, predictions] = await Promise.all([
    analyzeCorrelations(domain),
    analyzeAnomalies(domain),
    analyzePredictions(domain),
  ]);

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    domain,
    correlations,
    anomalies,
    predictions,
  );

  // Generate actionable insights
  const actionableInsights = generateActionableInsights(anomalies, predictions);

  // Generate health assessments (placeholder for now)
  const {
    technologyHealth,
    infrastructureHealth,
    securityPosture,
    complianceStatus,
    trends,
  } = generateHealthAssessments();

  const generationTime = Date.now() - startTime;

  const report: UnifiedIntelligenceReport = {
    domain,
    generatedAt: now,
    reportVersion: "2.0.0",
    executiveSummary,
    correlations,
    anomalies,
    predictions,
    technologyHealth,
    infrastructureHealth,
    securityPosture,
    complianceStatus,
    trends,
    actionableInsights,
    dataFreshness: {
      dnsData: now,
      ipData: now,
      whoisData: now,
      technologyData: now,
      securityData: now,
    },
    reportMetadata: {
      generationTime,
      dataSourcesUsed: ["correlations", "anomalies", "predictions"],
      confidenceLevel: "medium",
      cacheHit: false,
    },
  };

  // Cache the report (fire and forget)
  cacheReport(domain, report).catch((err) =>
    console.error("Failed to cache report:", err),
  );

  return report;
}
