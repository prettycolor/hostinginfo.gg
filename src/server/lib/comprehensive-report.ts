/**
 * Comprehensive Intelligence Report Generator
 *
 * Master orchestrator that combines all intelligence modules into a unified,
 * actionable report with executive summary, risk assessment, and recommendations.
 *
 * Integrates:
 * - Domain Expiry Monitoring
 * - Registrar Analysis
 * - WHOIS Historical Tracking
 * - Domain Ownership Correlation
 * - Security Posture Scoring
 * - Infrastructure Attribution
 * - DNS Intelligence
 * - IP Intelligence
 * - Technology Detection
 * - URLScan Security Analysis
 */

import { db } from "../db/client.js";
import {
  dnsRecords,
  ipIntelligence,
  whoisRecords,
  technologyStack,
  urlscanResults,
} from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { monitorDomainExpiry } from "./intelligence/expiry-monitor.js";
import { analyzeRegistrar } from "./intelligence/registrar-analysis.js";
import {
  getWhoisHistory,
  type WhoisHistoryRecord,
} from "./intelligence/whois-history.js";
import {
  calculateSecurityScore,
  type SecurityScore as SecurityPostureScore,
} from "./intelligence/security-scoring.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ComprehensiveReport {
  domain: string;
  generatedAt: Date;
  executiveSummary: ExecutiveSummary;
  riskAssessment: RiskAssessment;
  intelligenceModules: IntelligenceModules;
  recommendations: Recommendation[];
  actionItems: ActionItem[];
  metadata: ReportMetadata;
  // Frontend compatibility fields
  security: {
    overall: number;
    grade: "A+" | "A" | "B" | "C" | "D" | "F";
    categories: {
      dnsScore: number;
      sslScore: number;
      malwareScore: number;
      emailScore: number;
      technologyScore: number;
    };
    breakdown: {
      dnsScore: number;
      sslScore: number;
      malwareScore: number;
      emailScore: number;
      technologyScore: number;
    };
    findings: SecurityPostureScore["findings"];
    recommendations: SecurityPostureScore["recommendations"];
    issues: SecurityPostureScore["findings"];
  };
  whois: {
    daysUntilExpiry: number;
    expiryDate: Date | null;
    alertLevel: string;
  } | null;
  infrastructure: {
    hostingProvider: string;
    location: string;
    ipAddress: string;
    asn: string;
  };
}

type DnsIntelligenceRow = typeof dnsRecords.$inferSelect;
type IpIntelligenceRow = typeof ipIntelligence.$inferSelect;
type TechnologyStackRow = typeof technologyStack.$inferSelect;
type UrlscanResultRow = typeof urlscanResults.$inferSelect;
type DomainExpiryModule = Awaited<ReturnType<typeof monitorDomainExpiry>>;
type RegistrarAnalysisModule = Awaited<ReturnType<typeof analyzeRegistrar>>;
type SecurityPostureModule = Awaited<ReturnType<typeof calculateSecurityScore>>;

interface InfrastructureAttributionSummary {
  hostingProvider?: { name?: string | null } | null;
  confidence?: { overall?: number | null } | null;
}

export interface ExecutiveSummary {
  overallHealthScore: number; // 0-100
  criticalIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  keyFindings: string[];
  topRecommendations: string[];
}

export interface RiskAssessment {
  overallRisk: "critical" | "high" | "medium" | "low" | "minimal";
  riskScore: number; // 0-100 (higher = more risk)
  riskFactors: RiskFactor[];
  mitigationPriority: string[];
}

export interface RiskFactor {
  category:
    | "security"
    | "availability"
    | "compliance"
    | "performance"
    | "operational";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  impact: string;
  likelihood: "very_high" | "high" | "medium" | "low" | "very_low";
  mitigation: string;
}

export interface IntelligenceModules {
  domainExpiry: DomainExpiryModule;
  registrarAnalysis: RegistrarAnalysisModule;
  whoisHistory: WhoisHistoryRecord[] | null;
  ownershipCorrelation: {
    relatedDomains: unknown;
    ownershipPatterns: unknown;
  };
  securityPosture: SecurityPostureModule;
  infrastructureAttribution: InfrastructureAttributionSummary | null;
  dnsIntelligence: DnsIntelligenceRow | null;
  ipIntelligence: IpIntelligenceRow | null;
  technologyStack: TechnologyStackRow | null;
  urlscanAnalysis: UrlscanResultRow | null;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  timeframe: "immediate" | "short_term" | "medium_term" | "long_term";
}

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  dueDate?: Date;
  assignee?: string;
  status: "pending" | "in_progress" | "completed";
  dependencies: string[];
}

export interface ReportMetadata {
  version: string;
  dataSourcesUsed: string[];
  dataFreshness: Record<string, Date>;
  confidenceScore: number; // 0-100
  completeness: number; // 0-100 (% of modules with data)
  generationTime: number; // milliseconds
}

// ============================================================================
// MAIN REPORT GENERATOR
// ============================================================================

/**
 * Generate comprehensive intelligence report for a domain
 */
export async function generateComprehensiveReport(
  domain: string,
): Promise<ComprehensiveReport> {
  const startTime = Date.now();

  try {
    // Fetch all intelligence data in parallel
    const [dnsData, ipData, , techData, urlscanData] = await Promise.all([
      fetchDnsIntelligence(domain),
      fetchIpIntelligence(domain),
      fetchWhoisIntelligence(domain),
      fetchTechnologyIntelligence(domain),
      fetchUrlscanIntelligence(domain),
    ]);

    // Run advanced intelligence modules in parallel
    const [expiryStatus, registrarAnalysis, whoisHistory, securityPosture] =
      await Promise.all([
        monitorDomainExpiry(domain).catch(() => null),
        analyzeRegistrar(domain).catch(() => null),
        getWhoisHistory(domain, 90).catch(() => null),
        calculateSecurityScore(domain).catch(() => null),
      ]);

    // Stub out missing functions for now
    const relatedDomains = null;
    const ownershipPatterns = null;
    const infrastructure: InfrastructureAttributionSummary | null = null;

    // Build intelligence modules object
    const intelligenceModules: IntelligenceModules = {
      domainExpiry: expiryStatus,
      registrarAnalysis,
      whoisHistory,
      ownershipCorrelation: {
        relatedDomains,
        ownershipPatterns,
      },
      securityPosture,
      infrastructureAttribution: infrastructure,
      dnsIntelligence: dnsData,
      ipIntelligence: ipData,
      technologyStack: techData,
      urlscanAnalysis: urlscanData,
    };

    // Calculate executive summary
    const executiveSummary = generateExecutiveSummary(intelligenceModules);

    // Assess risks
    const riskAssessment = assessRisks(intelligenceModules);

    // Generate recommendations
    const recommendations = generateRecommendations(
      intelligenceModules,
      riskAssessment,
    );

    // Generate action items
    const actionItems = generateActionItems(recommendations);

    // Build metadata
    const metadata = buildMetadata(intelligenceModules, startTime);

    return {
      domain,
      generatedAt: new Date(),
      executiveSummary,
      riskAssessment,
      intelligenceModules,
      recommendations,
      actionItems,
      metadata,
      // Add security field for frontend compatibility
      security: securityPosture
        ? {
            overall: securityPosture.overallScore,
            grade: securityPosture.grade,
            categories: securityPosture.breakdown || {
              dnsScore: 0,
              sslScore: 0,
              malwareScore: 0,
              emailScore: 0,
              technologyScore: 0,
            },
            breakdown: securityPosture.breakdown,
            findings: securityPosture.findings,
            recommendations: securityPosture.recommendations,
            issues: securityPosture.findings, // Alias for frontend
          }
        : {
            overall: 0,
            grade: "F" as const,
            categories: {
              dnsScore: 0,
              sslScore: 0,
              malwareScore: 0,
              emailScore: 0,
              technologyScore: 0,
            },
            breakdown: {
              dnsScore: 0,
              sslScore: 0,
              malwareScore: 0,
              emailScore: 0,
              technologyScore: 0,
            },
            findings: [],
            recommendations: [],
            issues: [],
          },
      // Add whois field for frontend compatibility
      whois: expiryStatus
        ? {
            daysUntilExpiry: expiryStatus.daysUntilExpiry || 0,
            expiryDate: expiryStatus.expiryDate,
            alertLevel: expiryStatus.alertLevel,
          }
        : null,
      // Add infrastructure field for frontend compatibility
      infrastructure: {
        hostingProvider: infrastructure?.hostingProvider?.name || "Unknown",
        location: ipData
          ? `${ipData.city || "Unknown"}, ${ipData.country || "Unknown"}`
          : "Unknown",
        ipAddress: ipData?.ipAddress || "Unknown",
        asn: ipData?.asn ? `AS${ipData.asn}` : "Unknown",
      },
    };
  } catch (error) {
    console.error("Error generating comprehensive report:", error);
    throw error;
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchDnsIntelligence(domain: string) {
  try {
    const records = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain))
      .orderBy(desc(dnsRecords.scannedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    console.error("[fetchDnsIntelligence] Error:", error);
    return null;
  }
}

async function fetchIpIntelligence(domain: string) {
  try {
    const records = await db
      .select()
      .from(ipIntelligence)
      .where(eq(ipIntelligence.domain, domain))
      .orderBy(desc(ipIntelligence.scannedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    console.error("[fetchIpIntelligence] Error:", error);
    return null;
  }
}

async function fetchWhoisIntelligence(domain: string) {
  try {
    const records = await db
      .select()
      .from(whoisRecords)
      .where(eq(whoisRecords.domain, domain))
      .orderBy(desc(whoisRecords.scannedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    console.error("[fetchWhoisIntelligence] Error:", error);
    return null;
  }
}

async function fetchTechnologyIntelligence(domain: string) {
  try {
    const records = await db
      .select()
      .from(technologyStack)
      .where(eq(technologyStack.domain, domain))
      .orderBy(desc(technologyStack.scannedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    console.error("[fetchTechnologyIntelligence] Error:", error);
    return null;
  }
}

async function fetchUrlscanIntelligence(domain: string) {
  try {
    const records = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.domain, domain))
      .orderBy(desc(urlscanResults.scannedAt))
      .limit(1);

    return records[0] || null;
  } catch (error) {
    console.error("[fetchUrlscanIntelligence] Error:", error);
    return null;
  }
}

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

function generateExecutiveSummary(
  modules: IntelligenceModules,
): ExecutiveSummary {
  const issues = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const keyFindings: string[] = [];
  const topRecommendations: string[] = [];

  // Analyze domain expiry
  if (modules.domainExpiry) {
    if (modules.domainExpiry.daysUntilExpiry <= 30) {
      issues.critical++;
      keyFindings.push(
        `Domain expires in ${modules.domainExpiry.daysUntilExpiry} days`,
      );
      topRecommendations.push("Renew domain immediately to prevent loss");
    } else if (modules.domainExpiry.daysUntilExpiry <= 60) {
      issues.high++;
      keyFindings.push(
        `Domain expires in ${modules.domainExpiry.daysUntilExpiry} days`,
      );
    }
  }

  // Analyze security posture
  if (modules.securityPosture) {
    const score = modules.securityPosture.overallScore;
    if (score < 50) {
      issues.critical++;
      keyFindings.push(
        `Critical security issues detected (score: ${score}/100)`,
      );
      topRecommendations.push(
        "Address critical security vulnerabilities immediately",
      );
    } else if (score < 70) {
      issues.high++;
      keyFindings.push(
        `Security posture needs improvement (score: ${score}/100)`,
      );
    }

    // Check for specific security issues
    if (!modules.securityPosture.dnssecEnabled) {
      issues.medium++;
      keyFindings.push("DNSSEC not enabled");
      topRecommendations.push("Enable DNSSEC for enhanced security");
    }
  }

  // Analyze WHOIS changes
  if (modules.whoisHistory && modules.whoisHistory.length > 0) {
    const criticalChanges = modules.whoisHistory
      .flatMap((record) => record.changes)
      .filter((change) =>
        ["registrar", "registrantName", "registrantEmail"].includes(
          change.field,
        ),
      );
    if (criticalChanges.length > 0) {
      issues.critical += criticalChanges.length;
      keyFindings.push(
        `${criticalChanges.length} critical WHOIS changes detected`,
      );
    }
  }

  // Analyze infrastructure
  if (modules.infrastructureAttribution) {
    const confidence =
      modules.infrastructureAttribution.confidence?.overall || 0;
    if (confidence < 50) {
      issues.medium++;
      keyFindings.push("Infrastructure attribution confidence is low");
    }

    if (modules.infrastructureAttribution.hostingProvider) {
      keyFindings.push(
        `Hosted on ${modules.infrastructureAttribution.hostingProvider.name}`,
      );
    }
  }

  // Analyze URLScan results
  if (modules.urlscanAnalysis) {
    const malicious = modules.urlscanAnalysis.malicious;
    if (malicious) {
      issues.critical++;
      keyFindings.push("Domain flagged as malicious by URLScan");
      topRecommendations.push(
        "Investigate and remediate security threats immediately",
      );
    }
  }

  // Calculate overall health score (0-100, higher is better)
  const maxIssues = 20; // Assume max 20 issues for scoring
  const totalIssues =
    issues.critical * 4 + issues.high * 3 + issues.medium * 2 + issues.low * 1;
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - (totalIssues / maxIssues) * 100),
  );

  return {
    overallHealthScore: Math.round(healthScore),
    criticalIssues: issues.critical,
    highPriorityIssues: issues.high,
    mediumPriorityIssues: issues.medium,
    lowPriorityIssues: issues.low,
    keyFindings: keyFindings.slice(0, 5), // Top 5 findings
    topRecommendations: topRecommendations.slice(0, 3), // Top 3 recommendations
  };
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

function assessRisks(modules: IntelligenceModules): RiskAssessment {
  const riskFactors: RiskFactor[] = [];

  // Domain expiry risk
  if (modules.domainExpiry) {
    const days = modules.domainExpiry.daysUntilExpiry;
    if (days <= 30) {
      riskFactors.push({
        category: "availability",
        severity: "critical",
        description: `Domain expires in ${days} days`,
        impact: "Complete loss of domain and website if not renewed",
        likelihood: "very_high",
        mitigation: "Renew domain immediately and enable auto-renewal",
      });
    } else if (days <= 60) {
      riskFactors.push({
        category: "availability",
        severity: "high",
        description: `Domain expires in ${days} days`,
        impact: "Risk of domain loss if renewal is forgotten",
        likelihood: "high",
        mitigation: "Schedule domain renewal and enable auto-renewal",
      });
    }
  }

  // Security posture risks
  if (modules.securityPosture) {
    const score = modules.securityPosture.overallScore;
    if (score < 50) {
      riskFactors.push({
        category: "security",
        severity: "critical",
        description: "Critical security vulnerabilities detected",
        impact: "High risk of security breach, data loss, or malware infection",
        likelihood: "very_high",
        mitigation: "Implement security recommendations immediately",
      });
    }

    if (!modules.securityPosture.dnssecEnabled) {
      riskFactors.push({
        category: "security",
        severity: "medium",
        description: "DNSSEC not enabled",
        impact: "Vulnerable to DNS spoofing and cache poisoning attacks",
        likelihood: "medium",
        mitigation: "Enable DNSSEC on domain",
      });
    }

    if (!modules.securityPosture.sslEnabled) {
      riskFactors.push({
        category: "security",
        severity: "high",
        description: "SSL/TLS not enabled",
        impact: "Data transmitted in plain text, vulnerable to interception",
        likelihood: "high",
        mitigation: "Install SSL certificate immediately",
      });
    }
  }

  // WHOIS change risks
  if (modules.whoisHistory) {
    const suspiciousChanges = modules.whoisHistory
      .flatMap((record) => record.changes)
      .filter((change) =>
        ["registrar", "registrantName", "registrantEmail"].includes(
          change.field,
        ),
      );
    if (suspiciousChanges.length > 0) {
      riskFactors.push({
        category: "security",
        severity: "high",
        description: "Suspicious WHOIS changes detected",
        impact: "Possible unauthorized access or domain hijacking attempt",
        likelihood: "high",
        mitigation:
          "Verify all recent changes and secure domain registrar account",
      });
    }
  }

  // Infrastructure risks
  if (modules.infrastructureAttribution) {
    const confidence =
      modules.infrastructureAttribution.confidence?.overall || 0;
    if (confidence < 30) {
      riskFactors.push({
        category: "operational",
        severity: "low",
        description: "Infrastructure attribution confidence is very low",
        impact: "Difficulty in troubleshooting and support",
        likelihood: "medium",
        mitigation: "Update DNS records and ensure proper configuration",
      });
    }
  }

  // URLScan malicious detection
  if (modules.urlscanAnalysis?.malicious) {
    riskFactors.push({
      category: "security",
      severity: "critical",
      description: "Domain flagged as malicious",
      impact: "Blacklisting, loss of reputation, legal liability",
      likelihood: "very_high",
      mitigation:
        "Investigate immediately, remove malicious content, request delisting",
    });
  }

  // Calculate overall risk score
  const severityWeights = { critical: 10, high: 7, medium: 4, low: 2 };
  const totalRiskScore = riskFactors.reduce(
    (sum, factor) => sum + severityWeights[factor.severity],
    0,
  );
  const maxRiskScore = 50; // Assume max 50 points for scoring
  const riskScore = Math.min(100, (totalRiskScore / maxRiskScore) * 100);

  // Determine overall risk level
  let overallRisk: "critical" | "high" | "medium" | "low" | "minimal";
  if (riskScore >= 80) overallRisk = "critical";
  else if (riskScore >= 60) overallRisk = "high";
  else if (riskScore >= 40) overallRisk = "medium";
  else if (riskScore >= 20) overallRisk = "low";
  else overallRisk = "minimal";

  // Prioritize mitigation
  const mitigationPriority = riskFactors
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .map((f) => f.mitigation);

  return {
    overallRisk,
    riskScore: Math.round(riskScore),
    riskFactors,
    mitigationPriority: mitigationPriority.slice(0, 5), // Top 5 priorities
  };
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

function generateRecommendations(
  modules: IntelligenceModules,
  _risks: RiskAssessment,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Domain expiry recommendations
  if (modules.domainExpiry) {
    const days = modules.domainExpiry.daysUntilExpiry;
    if (days <= 60) {
      recommendations.push({
        priority: days <= 30 ? "critical" : "high",
        category: "Domain Management",
        title: "Renew Domain Registration",
        description: `Domain expires in ${days} days. Renew immediately to prevent loss.`,
        impact: "Prevents domain loss and service disruption",
        effort: "low",
        timeframe: "immediate",
      });
    }

    if (!modules.domainExpiry.autoRenewEnabled) {
      recommendations.push({
        priority: "high",
        category: "Domain Management",
        title: "Enable Auto-Renewal",
        description:
          "Enable automatic renewal to prevent accidental domain expiration.",
        impact: "Ensures continuous domain ownership",
        effort: "low",
        timeframe: "short_term",
      });
    }
  }

  // Security recommendations
  if (modules.securityPosture) {
    if (!modules.securityPosture.dnssecEnabled) {
      recommendations.push({
        priority: "medium",
        category: "Security",
        title: "Enable DNSSEC",
        description: "Enable DNSSEC to protect against DNS spoofing attacks.",
        impact: "Enhances DNS security and prevents cache poisoning",
        effort: "medium",
        timeframe: "short_term",
      });
    }

    if (!modules.securityPosture.sslEnabled) {
      recommendations.push({
        priority: "critical",
        category: "Security",
        title: "Install SSL Certificate",
        description: "Install SSL/TLS certificate to encrypt data in transit.",
        impact: "Protects user data and improves SEO rankings",
        effort: "low",
        timeframe: "immediate",
      });
    }

    if (modules.securityPosture.overallScore < 70) {
      recommendations.push({
        priority: "high",
        category: "Security",
        title: "Improve Security Posture",
        description:
          "Address identified security vulnerabilities to improve overall security score.",
        impact: "Reduces risk of security breaches and data loss",
        effort: "high",
        timeframe: "medium_term",
      });
    }
  }

  // Registrar recommendations
  if (modules.registrarAnalysis?.transferRecommendation) {
    const rec = modules.registrarAnalysis.transferRecommendation;
    if (rec.recommended) {
      recommendations.push({
        priority: "medium",
        category: "Cost Optimization",
        title: "Consider Registrar Transfer",
        description: rec.reason,
        impact: `Potential savings: $${rec.potentialSavings}/year`,
        effort: "medium",
        timeframe: "medium_term",
      });
    }
  }

  // Infrastructure recommendations
  if (modules.infrastructureAttribution) {
    const confidence =
      modules.infrastructureAttribution.confidence?.overall || 0;
    if (confidence < 50) {
      recommendations.push({
        priority: "low",
        category: "Infrastructure",
        title: "Improve DNS Configuration",
        description:
          "Update DNS records to improve infrastructure detection accuracy.",
        impact: "Better monitoring and troubleshooting capabilities",
        effort: "low",
        timeframe: "short_term",
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

function generateActionItems(recommendations: Recommendation[]): ActionItem[] {
  return recommendations.slice(0, 10).map((rec, index) => {
    const dueDate = new Date();
    switch (rec.timeframe) {
      case "immediate":
        dueDate.setDate(dueDate.getDate() + 1);
        break;
      case "short_term":
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case "medium_term":
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case "long_term":
        dueDate.setDate(dueDate.getDate() + 90);
        break;
    }

    return {
      id: `action-${index + 1}`,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      dueDate,
      status: "pending" as const,
      dependencies: [],
    };
  });
}

// ============================================================================
// METADATA
// ============================================================================

function buildMetadata(
  modules: IntelligenceModules,
  startTime: number,
): ReportMetadata {
  const dataSourcesUsed: string[] = [];
  const dataFreshness: Record<string, Date> = {};
  let modulesWithData = 0;
  const totalModules = 10;

  // Check each module
  if (modules.dnsIntelligence) {
    dataSourcesUsed.push("DNS");
    dataFreshness.dns = new Date(modules.dnsIntelligence.scannedAt);
    modulesWithData++;
  }

  if (modules.ipIntelligence) {
    dataSourcesUsed.push("IP Intelligence");
    dataFreshness.ip = new Date(modules.ipIntelligence.scannedAt);
    modulesWithData++;
  }

  if (modules.whoisHistory) {
    dataSourcesUsed.push("WHOIS");
    modulesWithData++;
  }

  if (modules.technologyStack) {
    dataSourcesUsed.push("Technology Detection");
    dataFreshness.technology = new Date(modules.technologyStack.scannedAt);
    modulesWithData++;
  }

  if (modules.urlscanAnalysis) {
    dataSourcesUsed.push("URLScan");
    dataFreshness.urlscan = new Date(modules.urlscanAnalysis.scannedAt);
    modulesWithData++;
  }

  if (modules.domainExpiry) {
    dataSourcesUsed.push("Domain Expiry Monitoring");
    modulesWithData++;
  }

  if (modules.registrarAnalysis) {
    dataSourcesUsed.push("Registrar Analysis");
    modulesWithData++;
  }

  if (modules.ownershipCorrelation) {
    dataSourcesUsed.push("Ownership Correlation");
    modulesWithData++;
  }

  if (modules.securityPosture) {
    dataSourcesUsed.push("Security Posture Scoring");
    modulesWithData++;
  }

  if (modules.infrastructureAttribution) {
    dataSourcesUsed.push("Infrastructure Attribution");
    modulesWithData++;
  }

  const completeness = (modulesWithData / totalModules) * 100;
  const confidenceScore = Math.min(100, completeness * 0.9); // Slightly lower than completeness

  return {
    version: "1.0.0",
    dataSourcesUsed,
    dataFreshness,
    confidenceScore: Math.round(confidenceScore),
    completeness: Math.round(completeness),
    generationTime: Date.now() - startTime,
  };
}

// ============================================================================
// BATCH REPORT GENERATION
// ============================================================================

/**
 * Generate comprehensive reports for multiple domains
 */
export async function generateBatchReports(
  domains: string[],
): Promise<ComprehensiveReport[]> {
  const reports = await Promise.all(
    domains.map((domain) =>
      generateComprehensiveReport(domain).catch((error) => {
        console.error(`Error generating report for ${domain}:`, error);
        return null;
      }),
    ),
  );

  return reports.filter((r): r is ComprehensiveReport => r !== null);
}

/**
 * Compare comprehensive reports across multiple domains
 */
export async function compareReports(domains: string[]): Promise<{
  reports: ComprehensiveReport[];
  comparison: {
    averageHealthScore: number;
    totalCriticalIssues: number;
    totalHighPriorityIssues: number;
    commonRisks: string[];
    bestPerformer: string;
    worstPerformer: string;
  };
}> {
  const reports = await generateBatchReports(domains);

  const healthScores = reports.map(
    (r) => r.executiveSummary.overallHealthScore,
  );
  const averageHealthScore =
    healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

  const totalCriticalIssues = reports.reduce(
    (sum, r) => sum + r.executiveSummary.criticalIssues,
    0,
  );

  const totalHighPriorityIssues = reports.reduce(
    (sum, r) => sum + r.executiveSummary.highPriorityIssues,
    0,
  );

  // Find common risks
  const riskDescriptions = reports.flatMap((r) =>
    r.riskAssessment.riskFactors.map((f) => f.description),
  );
  const riskCounts = riskDescriptions.reduce(
    (acc, desc) => {
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const commonRisks = Object.entries(riskCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([desc]) => desc);

  // Find best and worst performers
  const bestPerformer = reports.reduce((best, current) =>
    current.executiveSummary.overallHealthScore >
    best.executiveSummary.overallHealthScore
      ? current
      : best,
  ).domain;

  const worstPerformer = reports.reduce((worst, current) =>
    current.executiveSummary.overallHealthScore <
    worst.executiveSummary.overallHealthScore
      ? current
      : worst,
  ).domain;

  return {
    reports,
    comparison: {
      averageHealthScore: Math.round(averageHealthScore),
      totalCriticalIssues,
      totalHighPriorityIssues,
      commonRisks,
      bestPerformer,
      worstPerformer,
    },
  };
}
