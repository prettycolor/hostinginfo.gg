/**
 * Comprehensive Intelligence Report Generator
 *
 * Orchestrates all intelligence modules to generate a complete domain report
 */

import {
  calculateSecurityScore,
  type SecurityScore,
} from "./security-scoring.js";
import {
  detectInfrastructure,
  type InfrastructureAttribution,
} from "./infrastructure-attribution.js";
import { monitorDomainExpiry, type ExpiryAlert } from "./expiry-monitor.js";
import { db } from "../../db/client.js";
import {
  dnsRecords,
  ipIntelligence,
  technologyStack,
  urlscanResults,
  whoisRecords,
} from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

type TechnologyRecord = typeof technologyStack.$inferSelect;
type UrlscanRecord = typeof urlscanResults.$inferSelect;

export interface ComprehensiveReport {
  domain: string;
  generatedAt: Date;
  executiveSummary: ExecutiveSummary;
  sections: {
    domainInfo: DomainInfoSection;
    dnsAnalysis: DNSAnalysisSection;
    ipIntelligence: IPIntelligenceSection;
    technologyStack: TechnologyStackSection;
    securityPosture: SecurityPostureSection;
    infrastructure: InfrastructureSection;
    recommendations: RecommendationSection;
  };
}

export interface ExecutiveSummary {
  overallHealth: "excellent" | "good" | "fair" | "poor" | "critical";
  healthScore: number; // 0-100
  criticalIssues: number;
  highPriorityIssues: number;
  keyFindings: string[];
  topRecommendations: string[];
}

export interface DomainInfoSection {
  domain: string;
  registrar: string | null;
  registrationDate: Date | null;
  expirationDate: Date | null;
  daysUntilExpiry: number | null;
  expiryStatus: string;
  autoRenewal: boolean | null;
  transferLock: boolean | null;
}

export interface DNSAnalysisSection {
  recordCount: number;
  recordTypes: string[];
  nameservers: string[];
  dnssecEnabled: boolean;
  hasSpf: boolean;
  hasDmarc: boolean;
  issues: string[];
}

export interface IPIntelligenceSection {
  ipAddresses: {
    ip: string;
    type: string;
    country: string | null;
    organization: string | null;
    asn: number | null;
    threatLevel: number;
  }[];
  geographicDistribution: Record<string, number>;
  securityFlags: {
    hasProxy: boolean;
    hasVpn: boolean;
    hasTor: boolean;
    hasHosting: boolean;
  };
}

export interface TechnologyStackSection {
  technologies: {
    name: string;
    category: string;
    version: string | null;
    isEol: boolean;
  }[];
  totalTechnologies: number;
  eolCount: number;
  categories: string[];
}

export interface SecurityPostureSection {
  overallScore: number;
  grade: string;
  breakdown: {
    dns: number;
    ssl: number;
    malware: number;
    email: number;
    technology: number;
  };
  criticalFindings: number;
  highFindings: number;
}

export interface InfrastructureSection {
  hostingProvider: string | null;
  hostingType: string | null;
  cdnProvider: string | null;
  isSharedHosting: boolean;
  sharedWithDomains: number;
}

export interface RecommendationSection {
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
  totalRecommendations: number;
}

function parseAsnNumber(asn: string | null | undefined): number | null {
  if (!asn) return null;
  const match = asn.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
}

function mapThreatLevelToNumber(level: string | null | undefined): number {
  if (!level) return 0;
  const normalized = level.toLowerCase();
  if (normalized === "critical") return 100;
  if (normalized === "high") return 75;
  if (normalized === "medium") return 50;
  if (normalized === "low") return 25;
  const numeric = Number.parseInt(normalized, 10);
  return Number.isNaN(numeric) ? 0 : numeric;
}

/**
 * Generate comprehensive intelligence report
 */
export async function generateComprehensiveReport(
  domain: string,
  sections: string[] = ["all"],
): Promise<ComprehensiveReport | null> {
  try {
    const includeAll = sections.includes("all");
    const startTime = Date.now();

    // Parallel data collection
    const [
      securityScore,
      infrastructure,
      expiryInfo,
      whoisData,
      dnsData,
      ipData,
      techData,
      urlscanData,
    ] = await Promise.all([
      includeAll || sections.includes("security")
        ? calculateSecurityScore(domain)
        : null,
      includeAll || sections.includes("infrastructure")
        ? detectInfrastructure(domain)
        : null,
      includeAll || sections.includes("domain")
        ? monitorDomainExpiry(domain)
        : null,
      includeAll || sections.includes("domain")
        ? db
            .select()
            .from(whoisRecords)
            .where(eq(whoisRecords.domain, domain))
            .limit(1)
        : null,
      includeAll || sections.includes("dns")
        ? db.select().from(dnsRecords).where(eq(dnsRecords.domain, domain))
        : null,
      includeAll || sections.includes("ip")
        ? db
            .select()
            .from(dnsRecords)
            .where(eq(dnsRecords.domain, domain))
            .then(async (records) => {
              const aRecords = records.filter(
                (r) => r.recordType === "A" && r.value,
              );
              const ipPromises = aRecords.map((r) =>
                db
                  .select()
                  .from(ipIntelligence)
                  .where(eq(ipIntelligence.ipAddress, r.value!))
                  .limit(1),
              );
              return Promise.all(ipPromises);
            })
        : null,
      includeAll || sections.includes("technology")
        ? db
            .select()
            .from(technologyStack)
            .where(eq(technologyStack.domain, domain))
        : null,
      includeAll || sections.includes("security")
        ? db
            .select()
            .from(urlscanResults)
            .where(eq(urlscanResults.domain, domain))
            .orderBy(desc(urlscanResults.scannedAt))
            .limit(1)
        : null,
    ]);

    // Build executive summary
    const executiveSummary = buildExecutiveSummary({
      securityScore,
      infrastructure,
      expiryInfo,
      techData: techData || [],
      urlscanData: urlscanData?.[0] || null,
    });

    // Build domain info section
    const whoisRecord = whoisData?.[0] || null;
    const domainInfo: DomainInfoSection = {
      domain,
      registrar: whoisRecord?.registrar || null,
      registrationDate: whoisRecord?.createdDate || null,
      expirationDate: whoisRecord?.expiryDate || null,
      daysUntilExpiry: expiryInfo?.daysUntilExpiry || null,
      expiryStatus: expiryInfo?.status || "unknown",
      autoRenewal: expiryInfo?.autoRenewalEnabled ?? null,
      transferLock:
        whoisRecord?.status?.some((s) =>
          s.toLowerCase().includes("transferprohibited"),
        ) ?? null,
    };

    // Build DNS analysis section
    const dnsAnalysis: DNSAnalysisSection = {
      recordCount: dnsData?.length || 0,
      recordTypes: [
        ...new Set(dnsData?.map((r) => r.recordType).filter(Boolean) || []),
      ],
      nameservers:
        dnsData
          ?.filter((r) => r.recordType === "NS")
          .map((r) => r.value!)
          .filter(Boolean) || [],
      dnssecEnabled:
        dnsData?.some(
          (r) => r.recordType === "DNSKEY" || r.recordType === "RRSIG",
        ) || false,
      hasSpf:
        dnsData?.some(
          (r) => r.recordType === "TXT" && r.value?.includes("v=spf1"),
        ) || false,
      hasDmarc:
        dnsData?.some(
          (r) => r.recordType === "TXT" && r.value?.includes("v=DMARC1"),
        ) || false,
      issues: [],
    };

    // Add DNS issues
    if (!dnsAnalysis.dnssecEnabled)
      dnsAnalysis.issues.push("DNSSEC not enabled");
    if (!dnsAnalysis.hasSpf) dnsAnalysis.issues.push("No SPF record");
    if (!dnsAnalysis.hasDmarc) dnsAnalysis.issues.push("No DMARC record");
    if (dnsAnalysis.nameservers.length < 2)
      dnsAnalysis.issues.push("Insufficient nameservers");

    // Build IP intelligence section
    const flatIpData = ipData?.flat().filter(Boolean) || [];
    const ipIntelligenceSection: IPIntelligenceSection = {
      ipAddresses: flatIpData.map((ip) => ({
        ip: ip.ipAddress || "",
        type: "A",
        country: ip.country,
        organization: ip.organization,
        asn: parseAsnNumber(ip.asn),
        threatLevel: mapThreatLevelToNumber(ip.threatLevel),
      })),
      geographicDistribution: flatIpData.reduce(
        (acc, ip) => {
          if (ip.country) {
            acc[ip.country] = (acc[ip.country] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      ),
      securityFlags: {
        hasProxy: flatIpData.some((ip) => ip.isProxy),
        hasVpn: flatIpData.some((ip) => ip.isVpn),
        hasTor: flatIpData.some((ip) => ip.isTor),
        hasHosting: flatIpData.some((ip) => ip.isHosting),
      },
    };

    // Build technology stack section
    const technologyStackSection: TechnologyStackSection = {
      technologies:
        techData?.map((t) => ({
          name: t.name || "",
          category: t.category || "unknown",
          version: t.version,
          isEol: t.isEol || false,
        })) || [],
      totalTechnologies: techData?.length || 0,
      eolCount: techData?.filter((t) => t.isEol).length || 0,
      categories: [
        ...new Set(techData?.map((t) => t.category).filter(Boolean) || []),
      ],
    };

    // Build security posture section
    const securityPosture: SecurityPostureSection = {
      overallScore: securityScore?.overallScore || 0,
      grade: securityScore?.grade || "F",
      breakdown: {
        dns: securityScore?.breakdown.dnsScore || 0,
        ssl: securityScore?.breakdown.sslScore || 0,
        malware: securityScore?.breakdown.malwareScore || 0,
        email: securityScore?.breakdown.emailScore || 0,
        technology: securityScore?.breakdown.technologyScore || 0,
      },
      criticalFindings:
        securityScore?.findings.filter((f) => f.severity === "critical")
          .length || 0,
      highFindings:
        securityScore?.findings.filter((f) => f.severity === "high").length ||
        0,
    };

    // Build infrastructure section
    const infrastructureSection: InfrastructureSection = {
      hostingProvider: infrastructure?.hostingProvider?.name || null,
      hostingType: infrastructure?.hostingProvider?.type || null,
      cdnProvider: infrastructure?.cdnProvider?.name || null,
      isSharedHosting: infrastructure?.sharedInfrastructure.isShared || false,
      sharedWithDomains: infrastructure?.sharedInfrastructure.sharedWith || 0,
    };

    // Build recommendations section
    const recommendations: RecommendationSection = {
      critical:
        securityScore?.recommendations
          .filter((r) => r.priority === "critical")
          .map((r) => r.title) || [],
      high:
        securityScore?.recommendations
          .filter((r) => r.priority === "high")
          .map((r) => r.title) || [],
      medium:
        securityScore?.recommendations
          .filter((r) => r.priority === "medium")
          .map((r) => r.title) || [],
      low:
        securityScore?.recommendations
          .filter((r) => r.priority === "low")
          .map((r) => r.title) || [],
      totalRecommendations: securityScore?.recommendations.length || 0,
    };

    const duration = Date.now() - startTime;
    console.log(
      `[Comprehensive Report] Generated for ${domain} in ${duration}ms`,
    );

    return {
      domain,
      generatedAt: new Date(),
      executiveSummary,
      sections: {
        domainInfo,
        dnsAnalysis,
        ipIntelligence: ipIntelligenceSection,
        technologyStack: technologyStackSection,
        securityPosture,
        infrastructure: infrastructureSection,
        recommendations,
      },
    };
  } catch (error) {
    console.error("[Comprehensive Report] Error:", error);
    return null;
  }
}

/**
 * Build executive summary
 */
function buildExecutiveSummary(data: {
  securityScore: SecurityScore | null;
  infrastructure: InfrastructureAttribution | null;
  expiryInfo: ExpiryAlert | null;
  techData: TechnologyRecord[];
  urlscanData: UrlscanRecord | null;
}): ExecutiveSummary {
  const keyFindings: string[] = [];
  const topRecommendations: string[] = [];
  let criticalIssues = 0;
  let highPriorityIssues = 0;

  // Security findings
  if (data.securityScore) {
    criticalIssues += data.securityScore.findings.filter(
      (finding) => finding.severity === "critical",
    ).length;
    highPriorityIssues += data.securityScore.findings.filter(
      (finding) => finding.severity === "high",
    ).length;

    if (data.securityScore.overallScore >= 90) {
      keyFindings.push("Excellent security posture");
    } else if (data.securityScore.overallScore < 70) {
      keyFindings.push(
        `Security score is ${data.securityScore.grade} - needs improvement`,
      );
    }

    // Add top 3 recommendations
    data.securityScore.recommendations.slice(0, 3).forEach((recommendation) => {
      topRecommendations.push(recommendation.title);
    });
  }

  // Expiry findings
  if (data.expiryInfo) {
    if (data.expiryInfo.daysUntilExpiry < 30) {
      keyFindings.push(
        `Domain expires in ${data.expiryInfo.daysUntilExpiry} days`,
      );
      criticalIssues++;
    } else if (data.expiryInfo.daysUntilExpiry < 90) {
      keyFindings.push(
        `Domain expires in ${data.expiryInfo.daysUntilExpiry} days`,
      );
      highPriorityIssues++;
    }
  }

  // Technology findings
  const eolCount = data.techData.filter(
    (technology) => technology.isEol,
  ).length;
  if (eolCount > 0) {
    keyFindings.push(`${eolCount} end-of-life technologies detected`);
    criticalIssues += eolCount;
  }

  // Malware findings
  if (data.urlscanData?.malwareDetected) {
    keyFindings.push("Malware detected on domain");
    criticalIssues++;
  }
  if (data.urlscanData?.phishingDetected) {
    keyFindings.push("Phishing activity detected");
    criticalIssues++;
  }

  // Infrastructure findings
  if (data.infrastructure?.sharedInfrastructure.isShared) {
    keyFindings.push(
      `Shared hosting with ${data.infrastructure.sharedInfrastructure.sharedWith} other domains`,
    );
  }
  if (data.infrastructure?.cdnProvider) {
    keyFindings.push(`Using ${data.infrastructure.cdnProvider.name} CDN`);
  }

  // Calculate overall health score
  let healthScore = 100;
  healthScore -= criticalIssues * 15;
  healthScore -= highPriorityIssues * 5;
  healthScore = Math.max(0, healthScore);

  // Determine overall health
  let overallHealth: ExecutiveSummary["overallHealth"];
  if (healthScore >= 90) overallHealth = "excellent";
  else if (healthScore >= 75) overallHealth = "good";
  else if (healthScore >= 60) overallHealth = "fair";
  else if (healthScore >= 40) overallHealth = "poor";
  else overallHealth = "critical";

  return {
    overallHealth,
    healthScore,
    criticalIssues,
    highPriorityIssues,
    keyFindings: keyFindings.slice(0, 5), // Top 5
    topRecommendations: topRecommendations.slice(0, 5), // Top 5
  };
}
