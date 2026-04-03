/**
 * Correlation Engine
 *
 * Cross-references data from multiple intelligence sources (DNS, IP, WHOIS, Technology, URLScan)
 * to identify relationships, patterns, and connections between domains.
 *
 * @module correlation-engine
 */

import { db } from "../../db/client.js";
import {
  dnsRecords,
  ipIntelligence,
  whoisRecords,
  technologyStack,
  urlscanResults,
} from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import type {
  CorrelationAnalysis,
  Correlation,
  CorrelationEvidence,
  CorrelationType,
  CorrelationConfidence,
  HostingCorrelation,
  OwnershipCorrelation,
  TechnologyCorrelation,
  InfrastructureCorrelation,
  SecurityCorrelation,
  CorrelationSummary,
} from "../../../types/correlation.js";

type DnsRecordRow = typeof dnsRecords.$inferSelect;
type WhoisRecordRow = typeof whoisRecords.$inferSelect;
type TechnologyRecordRow = typeof technologyStack.$inferSelect;

/**
 * Calculate confidence level from numeric score
 */
function getConfidenceLevel(score: number): CorrelationConfidence {
  if (score >= 90) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/**
 * Generate unique correlation ID
 */
function generateCorrelationId(
  type: CorrelationType,
  sourceA: string,
  sourceB: string,
): string {
  return `${type}-${sourceA}-${sourceB}-${Date.now()}`;
}

function toUniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))];
}

function extractDnsValues(
  records: DnsRecordRow[],
  recordType: string,
): string[] {
  return toUniqueStrings(
    records.filter((r) => r.recordType === recordType).map((r) => r.value),
  );
}

function parseNameservers(value: WhoisRecordRow["nameservers"]): string[] {
  if (Array.isArray(value)) {
    return toUniqueStrings(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return toUniqueStrings(
          parsed.filter((item): item is string => typeof item === "string"),
        );
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseAsn(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function findTechnologyByCategory(
  techRows: TechnologyRecordRow[],
  keyword: string,
): string | undefined {
  return (
    techRows.find((t) => t.category.toLowerCase().includes(keyword))?.name ||
    undefined
  );
}

/**
 * Analyze hosting correlations (DNS + IP data)
 */
async function analyzeHostingCorrelation(domain: string): Promise<{
  correlations: Correlation[];
  details?: HostingCorrelation;
}> {
  const correlations: Correlation[] = [];

  try {
    // Get DNS records and use A records for infrastructure linkage.
    const dnsData = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain))
      .orderBy(desc(dnsRecords.scannedAt))
      .limit(500);

    if (!dnsData.length) {
      return { correlations };
    }

    const aRecords = extractDnsValues(dnsData, "A");

    if (aRecords.length === 0) {
      return { correlations };
    }

    // Get IP intelligence for first A record
    const primaryIp = aRecords[0];
    const ipData = await db
      .select()
      .from(ipIntelligence)
      .where(eq(ipIntelligence.ipAddress, primaryIp))
      .orderBy(desc(ipIntelligence.scannedAt))
      .limit(1);

    if (!ipData.length) {
      return { correlations };
    }

    const ip = ipData[0];
    const evidence: CorrelationEvidence[] = [
      {
        source: "dns",
        field: "aRecords",
        value: primaryIp,
        matchType: "exact",
      },
      {
        source: "ip",
        field: "isp",
        value: ip.isp || "Unknown",
        matchType: "exact",
      },
    ];

    // Create hosting correlation
    correlations.push({
      id: generateCorrelationId("hosting", "dns", "ip"),
      type: "hosting",
      sourceA: "dns",
      sourceB: "ip",
      confidence: 95,
      confidenceLevel: getConfidenceLevel(95),
      description: `Domain hosted on ${ip.isp || "Unknown ISP"} (${primaryIp})`,
      evidence,
      createdAt: new Date(),
    });

    const details: HostingCorrelation = {
      ipAddress: primaryIp,
      hostingProvider: ip.isp || "Unknown",
      asn: parseAsn(ip.asn),
      asnOrg: ip.asnOrganization || ip.organization || "Unknown",
      location: {
        country: ip.country || "Unknown",
        city: ip.city || "Unknown",
      },
    };

    return { correlations, details };
  } catch (error) {
    console.error("Error analyzing hosting correlation:", error);
    return { correlations };
  }
}

/**
 * Analyze ownership correlations (WHOIS + DNS data)
 */
async function analyzeOwnershipCorrelation(domain: string): Promise<{
  correlations: Correlation[];
  details?: OwnershipCorrelation;
}> {
  const correlations: Correlation[] = [];

  try {
    // Get latest WHOIS data
    const whoisData = await db
      .select()
      .from(whoisRecords)
      .where(eq(whoisRecords.domain, domain))
      .orderBy(desc(whoisRecords.scannedAt))
      .limit(1);

    if (!whoisData.length) {
      return { correlations };
    }

    const whois = whoisData[0];

    // Get DNS data for nameserver correlation
    const dnsData = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain))
      .orderBy(desc(dnsRecords.scannedAt))
      .limit(500);

    const evidence: CorrelationEvidence[] = [
      {
        source: "whois",
        field: "registrar",
        value: whois.registrar || "Unknown",
        matchType: "exact",
      },
    ];

    if (dnsData.length > 0) {
      const nsRecords = extractDnsValues(dnsData, "NS");

      if (nsRecords.length > 0) {
        evidence.push({
          source: "dns",
          field: "nsRecords",
          value: nsRecords.join(", "),
          matchType: "exact",
        });

        correlations.push({
          id: generateCorrelationId("ownership", "whois", "dns"),
          type: "ownership",
          sourceA: "whois",
          sourceB: "dns",
          confidence: 90,
          confidenceLevel: getConfidenceLevel(90),
          description: `Domain registered with ${whois.registrar || "Unknown"}, using ${nsRecords.length} nameserver(s)`,
          evidence,
          createdAt: new Date(),
        });
      }
    }

    const nameserversFromWhois = parseNameservers(whois.nameservers);
    const details: OwnershipCorrelation = {
      registrar: whois.registrar || "Unknown",
      registrant: whois.registrantName || undefined,
      registrantOrg: whois.registrantOrganization || undefined,
      nameservers:
        nameserversFromWhois.length > 0
          ? nameserversFromWhois
          : extractDnsValues(dnsData, "NS"),
      registrationDate: whois.createdDate
        ? new Date(whois.createdDate)
        : undefined,
      expiryDate: whois.expiryDate ? new Date(whois.expiryDate) : undefined,
    };

    return { correlations, details };
  } catch (error) {
    console.error("Error analyzing ownership correlation:", error);
    return { correlations };
  }
}

/**
 * Analyze technology correlations (Technology + URLScan data)
 */
async function analyzeTechnologyCorrelation(domain: string): Promise<{
  correlations: Correlation[];
  details?: TechnologyCorrelation;
}> {
  const correlations: Correlation[] = [];

  try {
    // technology_stack stores one technology per row.
    const techData = await db
      .select()
      .from(technologyStack)
      .where(eq(technologyStack.domain, domain))
      .orderBy(desc(technologyStack.scannedAt))
      .limit(200);

    if (!techData.length) {
      return { correlations };
    }

    const technologies = techData;

    // Get URLScan data for supplemental correlation confidence.
    const urlscanData = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.domain, domain))
      .orderBy(desc(urlscanResults.scannedAt))
      .limit(1);

    const evidence: CorrelationEvidence[] = [
      {
        source: "technology",
        field: "technologies",
        value: technologies.length,
        matchType: "exact",
      },
    ];

    if (urlscanData.length > 0) {
      const urlscan = urlscanData[0];
      const urlscanScore = urlscan.score ?? 0;
      evidence.push({
        source: "urlscan",
        field: "score",
        value: urlscanScore,
        matchType: "exact",
      });
    }

    if (evidence.length > 1) {
      correlations.push({
        id: generateCorrelationId("technology", "technology", "urlscan"),
        type: "technology",
        sourceA: "technology",
        sourceB: "urlscan",
        confidence: 82,
        confidenceLevel: getConfidenceLevel(82),
        description: `${technologies.length} technology fingerprint(s) correlated with URLScan data`,
        evidence,
        createdAt: new Date(),
      });
    }

    const analyticsTech = toUniqueStrings(
      technologies
        .filter((t) => {
          const category = t.category.toLowerCase();
          const name = t.name.toLowerCase();
          return (
            category.includes("analytics") ||
            name.includes("analytics") ||
            name.includes("tag manager")
          );
        })
        .map((t) => t.name),
    );

    const details: TechnologyCorrelation = {
      cms: findTechnologyByCategory(technologies, "cms"),
      framework: findTechnologyByCategory(technologies, "framework"),
      server: findTechnologyByCategory(technologies, "server"),
      cdn:
        findTechnologyByCategory(technologies, "cdn") ||
        technologies.find((t) =>
          /cloudflare|akamai|fastly|cloudfront/i.test(t.name),
        )?.name,
      analytics: analyticsTech,
      commonTechnologies: toUniqueStrings(technologies.map((t) => t.name)),
    };

    return { correlations, details };
  } catch (error) {
    console.error("Error analyzing technology correlation:", error);
    return { correlations };
  }
}

/**
 * Analyze infrastructure correlations (DNS + IP + WHOIS)
 */
async function analyzeInfrastructureCorrelation(domain: string): Promise<{
  correlations: Correlation[];
  details?: InfrastructureCorrelation;
}> {
  const correlations: Correlation[] = [];

  try {
    // Get DNS data
    const dnsData = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain))
      .orderBy(desc(dnsRecords.scannedAt))
      .limit(500);

    if (!dnsData.length) {
      return { correlations };
    }

    const nsRecords = extractDnsValues(dnsData, "NS");
    const mxRecords = extractDnsValues(dnsData, "MX");
    const aaaaRecords = extractDnsValues(dnsData, "AAAA");

    const evidence: CorrelationEvidence[] = [
      {
        source: "dns",
        field: "nsRecords",
        value: nsRecords.length,
        matchType: "exact",
      },
      {
        source: "dns",
        field: "mxRecords",
        value: mxRecords.length,
        matchType: "exact",
      },
    ];

    // Detect DNS provider from nameservers
    let dnsProvider: string | undefined;
    const nsString = nsRecords.join(" ").toLowerCase();
    if (nsString.includes("cloudflare")) dnsProvider = "Cloudflare";
    else if (nsString.includes("awsdns")) dnsProvider = "AWS Route 53";
    else if (nsString.includes("googledomains")) dnsProvider = "Google Domains";
    else if (nsString.includes("azure")) dnsProvider = "Azure DNS";

    // Detect mail provider from MX records
    let mailProvider: string | undefined;
    const mxString = mxRecords.join(" ").toLowerCase();
    if (mxString.includes("google")) mailProvider = "Google Workspace";
    else if (mxString.includes("outlook") || mxString.includes("microsoft"))
      mailProvider = "Microsoft 365";
    else if (mxString.includes("proton")) mailProvider = "ProtonMail";

    if (dnsProvider || mailProvider) {
      correlations.push({
        id: generateCorrelationId("infrastructure", "dns", "dns"),
        type: "infrastructure",
        sourceA: "dns",
        sourceB: "dns",
        confidence: 80,
        confidenceLevel: getConfidenceLevel(80),
        description: `Infrastructure: ${dnsProvider || "Unknown DNS"}, ${mailProvider || "Unknown Mail"}`,
        evidence,
        createdAt: new Date(),
      });
    }

    const details: InfrastructureCorrelation = {
      dnsProvider,
      nameservers: nsRecords,
      mailProvider,
      mxRecords,
      dnssecEnabled: dnsData.some(
        (r) =>
          r.recordType === "DNSKEY" ||
          r.recordType === "RRSIG" ||
          r.recordType === "DS",
      ),
      ipv6Enabled: aaaaRecords.length > 0,
    };

    return { correlations, details };
  } catch (error) {
    console.error("Error analyzing infrastructure correlation:", error);
    return { correlations };
  }
}

/**
 * Analyze security correlations (URLScan + Technology data)
 */
async function analyzeSecurityCorrelation(domain: string): Promise<{
  correlations: Correlation[];
  details?: SecurityCorrelation;
}> {
  const correlations: Correlation[] = [];

  try {
    // Get URLScan data
    const urlscanData = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.domain, domain))
      .orderBy(desc(urlscanResults.scannedAt))
      .limit(1);

    if (!urlscanData.length) {
      return { correlations };
    }

    const urlscan = urlscanData[0];
    const securityScore = urlscan.score ?? 0;

    // Get technology data for security tool detection.
    const techData = await db
      .select()
      .from(technologyStack)
      .where(eq(technologyStack.domain, domain))
      .orderBy(desc(technologyStack.scannedAt))
      .limit(200);

    const evidence: CorrelationEvidence[] = [
      {
        source: "urlscan",
        field: "score",
        value: securityScore,
        matchType: "exact",
      },
    ];

    let wafDetected = false;
    const securityHeaders: string[] = [];

    if (techData.length > 0) {
      const technologies = techData;

      // Detect WAF
      wafDetected = technologies.some(
        (t) =>
          t.category.toLowerCase().includes("waf") ||
          t.category.toLowerCase().includes("security") ||
          /cloudflare|sucuri|imperva|akamai/i.test(t.name),
      );

      if (wafDetected) {
        evidence.push({
          source: "technology",
          field: "waf",
          value: true,
          matchType: "exact",
        });
      }
    }

    correlations.push({
      id: generateCorrelationId("security", "urlscan", "technology"),
      type: "security",
      sourceA: "urlscan",
      sourceB: "technology",
      confidence: 75,
      confidenceLevel: getConfidenceLevel(75),
      description: `Security score: ${securityScore}/100${wafDetected ? ", WAF detected" : ""}`,
      evidence,
      createdAt: new Date(),
    });

    const threats: string[] = [];
    if (urlscan.malwareDetected) threats.push("Malicious content detected");
    if (urlscan.phishingDetected) threats.push("Phishing indicators detected");
    if (urlscan.suspiciousActivity)
      threats.push("Suspicious activity detected");

    const details: SecurityCorrelation = {
      sslIssuer: urlscan.tlsIssuer || undefined,
      securityHeaders,
      wafDetected,
      securityScore,
      threats,
    };

    return { correlations, details };
  } catch (error) {
    console.error("Error analyzing security correlation:", error);
    return { correlations };
  }
}

/**
 * Generate correlation summary
 */
function generateSummary(correlations: Correlation[]): CorrelationSummary {
  const highConfidenceCount = correlations.filter(
    (c) => c.confidence >= 70,
  ).length;

  const correlationsByType: Record<CorrelationType, number> = {
    hosting: 0,
    ownership: 0,
    technology: 0,
    infrastructure: 0,
    security: 0,
  };

  correlations.forEach((c) => {
    correlationsByType[c.type]++;
  });

  const keyFindings: string[] = [];
  const recommendations: string[] = [];

  // Generate key findings
  if (correlationsByType.hosting > 0) {
    keyFindings.push("Hosting provider identified");
  }
  if (correlationsByType.ownership > 0) {
    keyFindings.push("Domain ownership verified");
  }
  if (correlationsByType.technology > 0) {
    keyFindings.push("Technology stack analyzed");
  }
  if (correlationsByType.infrastructure > 0) {
    keyFindings.push("Infrastructure configuration mapped");
  }
  if (correlationsByType.security > 0) {
    keyFindings.push("Security posture assessed");
  }

  // Generate recommendations
  if (highConfidenceCount < correlations.length * 0.5) {
    recommendations.push(
      "Consider gathering more intelligence data for higher confidence",
    );
  }
  if (correlationsByType.security === 0) {
    recommendations.push("Run security scan for comprehensive analysis");
  }

  // Calculate risk level
  let riskLevel: "low" | "medium" | "high" = "low";
  if (highConfidenceCount < 2) riskLevel = "high";
  else if (highConfidenceCount < 4) riskLevel = "medium";

  return {
    totalCorrelations: correlations.length,
    highConfidenceCount,
    correlationsByType,
    keyFindings,
    riskLevel,
    recommendations,
  };
}

/**
 * Perform complete correlation analysis for a domain
 *
 * @param domain - Domain to analyze
 * @returns Complete correlation analysis
 */
export async function analyzeCorrelations(
  domain: string,
): Promise<CorrelationAnalysis> {
  const allCorrelations: Correlation[] = [];

  // Run all correlation analyses in parallel
  const [hosting, ownership, technology, infrastructure, security] =
    await Promise.all([
      analyzeHostingCorrelation(domain),
      analyzeOwnershipCorrelation(domain),
      analyzeTechnologyCorrelation(domain),
      analyzeInfrastructureCorrelation(domain),
      analyzeSecurityCorrelation(domain),
    ]);

  // Combine all correlations
  allCorrelations.push(...hosting.correlations);
  allCorrelations.push(...ownership.correlations);
  allCorrelations.push(...technology.correlations);
  allCorrelations.push(...infrastructure.correlations);
  allCorrelations.push(...security.correlations);

  const summary = generateSummary(allCorrelations);

  return {
    domain,
    analyzedAt: new Date(),
    correlations: allCorrelations,
    hosting: hosting.details,
    ownership: ownership.details,
    technology: technology.details,
    infrastructure: infrastructure.details,
    security: security.details,
    summary,
  };
}
