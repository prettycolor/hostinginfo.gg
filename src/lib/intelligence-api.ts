/**
 * Intelligence API Client
 *
 * Centralized client for all intelligence API endpoints.
 * Provides type-safe methods for fetching domain intelligence data.
 */

import { publicApiClient } from "./public-api-client";
import { normalizeScanDomainInput } from "./domain-input";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SecurityScore {
  overall: number;
  grade: string;
  categories: {
    dns: number;
    ssl: number;
    malware: number;
    email: number;
    technology: number;
  };
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    category: string;
    message: string;
    recommendation: string;
  }>;
}

export interface WhoisData {
  domain: string;
  registrar: string;
  registrantName?: string;
  registrantEmail?: string;
  creationDate: string;
  expirationDate: string;
  updatedDate: string;
  nameservers: string[];
  status: string[];
  dnssecEnabled: boolean;
  transferLock: boolean;
  daysUntilExpiry: number;
}

export interface InfrastructureData {
  hostingProvider: string;
  providerType: "cloud" | "shared" | "dedicated" | "unknown";
  cdn?: string;
  ipAddresses: string[];
  ipVersion?: string;
  asn?: string;
  asnOrg?: string;
  organization?: string;
  country?: string;
  datacenterLocation?: string;
  reverseProxy?: boolean;
  loadBalancer?: boolean;
  isSharedHosting: boolean;
}

export interface DNSRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
  status: "active" | "missing" | "invalid";
}

export interface Technology {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  isEOL: boolean;
  eolDate?: string;
}

export interface Recommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: number;
  effort: "low" | "medium" | "high";
  actionUrl?: string;
}

export interface DomainIntelligence {
  domain: string;
  security: SecurityScore;
  whois: WhoisData;
  infrastructure: InfrastructureData;
  dns: DNSRecord[];
  technologies: Technology[];
  recommendations: Recommendation[];
  lastScanned: string;
  dataAvailability?: {
    dns: boolean;
    whois: boolean;
    ip: boolean;
    technology: boolean;
    urlscan: boolean;
  };
}

export interface BatchAnalysisJob {
  id: string;
  domains: string[];
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  completedDomains: number;
  totalDomains: number;
  results?: DomainIntelligence[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface BatchAnalysisStats {
  totalDomains: number;
  averageScore: number;
  criticalIssues: number;
  expiringWithin60Days: number;
  topHostingProviders: Array<{ provider: string; count: number }>;
  topIssues: Array<{ issue: string; count: number }>;
}

type ApiObject = Record<string, unknown>;
type ApiList = ApiObject[];

interface IntelligenceReportSecuritySection {
  overall?: number;
  grade?: string;
  categories?: {
    dns?: number;
    ssl?: number;
    malware?: number;
    email?: number;
    technology?: number;
    dnsScore?: number;
    sslScore?: number;
    malwareScore?: number;
    emailScore?: number;
    technologyScore?: number;
  };
  breakdown?: {
    dnsScore?: number;
    sslScore?: number;
    malwareScore?: number;
    emailScore?: number;
    technologyScore?: number;
  };
  issues?: SecurityScore["issues"];
  findings?: SecurityScore["issues"];
}

interface IntelligenceReportWhoisSection {
  domain?: string;
  registrar?: string;
  registrantName?: string;
  registrantEmail?: string;
  creationDate?: string;
  expirationDate?: string;
  expiryDate?: string;
  updatedDate?: string;
  nameservers?: string[];
  status?: string[];
  dnssecEnabled?: boolean;
  transferLock?: boolean;
  daysUntilExpiry?: number;
}

interface IntelligenceReportInfrastructureSection {
  hostingProvider?: string;
  providerType?: InfrastructureData["providerType"];
  cdn?: string;
  ipAddress?: string;
  ipAddresses?: string[];
  ipVersion?: string;
  asn?: string;
  asnOrg?: string;
  datacenterLocation?: string;
  location?: string;
  reverseProxy?: boolean;
  loadBalancer?: boolean;
}

interface IntelligenceReportModulesSection {
  dnsIntelligence?: DNSRecord[] | ApiList;
  technologyStack?: Technology[] | ApiList;
  urlscanAnalysis?: unknown;
}

interface IntelligenceReportSource {
  domain?: string;
  security?: IntelligenceReportSecuritySection;
  whois?: IntelligenceReportWhoisSection;
  infrastructure?: IntelligenceReportInfrastructureSection;
  intelligenceModules?: IntelligenceReportModulesSection;
  dns?: DNSRecord[] | ApiList;
  technologies?: Technology[] | ApiList;
  recommendations?: Recommendation[];
  generatedAt?: string;
  lastScanned?: string;
}

function asRecord(value: unknown): ApiObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ApiObject;
  }
  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeDnsRecords(raw: unknown): DNSRecord[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => asRecord(entry))
      .map((entry) => {
        const type =
          typeof entry.type === "string" && entry.type.trim()
            ? entry.type.trim()
            : "";
        const value =
          typeof entry.value === "string" && entry.value.trim()
            ? entry.value.trim()
            : "";
        if (!type || !value) return null;
        const status =
          entry.status === "active" ||
          entry.status === "missing" ||
          entry.status === "invalid"
            ? entry.status
            : "active";
        return {
          type,
          value,
          status,
          ttl:
            typeof entry.ttl === "number" && Number.isFinite(entry.ttl)
              ? entry.ttl
              : undefined,
          priority:
            typeof entry.priority === "number" &&
            Number.isFinite(entry.priority)
              ? entry.priority
              : undefined,
        } satisfies DNSRecord;
      })
      .filter((entry): entry is DNSRecord => Boolean(entry));
  }

  const root = asRecord(raw);
  const recordsContainer = asRecord(root.records);
  const records: DNSRecord[] = [];

  for (const [recordType, values] of Object.entries(recordsContainer)) {
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        records.push({
          type: recordType,
          value: value.trim(),
          status: "active",
        });
        continue;
      }

      const record = asRecord(value);
      const recordValue =
        (typeof record.value === "string" && record.value.trim()) ||
        (typeof record.exchange === "string" && record.exchange.trim()) ||
        (typeof record.target === "string" && record.target.trim()) ||
        "";
      if (!recordValue) continue;

      records.push({
        type: recordType,
        value: recordValue,
        status: "active",
        ttl:
          typeof record.ttl === "number" && Number.isFinite(record.ttl)
            ? record.ttl
            : undefined,
        priority:
          typeof record.priority === "number" &&
          Number.isFinite(record.priority)
            ? record.priority
            : undefined,
      });
    }
  }

  return records;
}

function normalizeTechnologies(raw: unknown): Technology[] {
  if (!Array.isArray(raw)) return [];

  const isPlaceholderTechnologyName = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "unknown" ||
      normalized === "unknown hosting" ||
      normalized === "unknown server" ||
      normalized === "n/a" ||
      normalized === "none" ||
      normalized === "not detected"
    );
  };

  return raw
    .map((entry) => asRecord(entry))
    .map((entry) => {
      const name =
        typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim()
          : "";
      if (!name || isPlaceholderTechnologyName(name)) return null;

      return {
        name,
        category:
          typeof entry.category === "string" && entry.category.trim()
            ? entry.category.trim()
            : "Technology",
        version:
          typeof entry.version === "string" && entry.version.trim()
            ? entry.version.trim()
            : undefined,
        confidence: asNumber(entry.confidence, 0),
        isEOL: entry.isEOL === true,
        eolDate:
          typeof entry.eolDate === "string" && entry.eolDate.trim()
            ? entry.eolDate.trim()
            : undefined,
      } satisfies Technology;
    })
    .filter((entry): entry is Technology => Boolean(entry));
}

function normalizeRecommendations(raw: unknown): Recommendation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => asRecord(entry))
    .map((entry, index) => {
      const title =
        typeof entry.title === "string" && entry.title.trim()
          ? entry.title.trim()
          : "";
      const description =
        typeof entry.description === "string" && entry.description.trim()
          ? entry.description.trim()
          : title;
      if (!title && !description) return null;
      const priority = String(entry.priority || "").toLowerCase();
      return {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id.trim()
            : `rec-${index + 1}`,
        priority:
          priority === "critical" ||
          priority === "high" ||
          priority === "medium" ||
          priority === "low"
            ? (priority as Recommendation["priority"])
            : "medium",
        category:
          typeof entry.category === "string" && entry.category.trim()
            ? entry.category.trim()
            : "general",
        title: title || description || `Recommendation ${index + 1}`,
        description: description || title || `Recommendation ${index + 1}`,
        impact: asNumber(entry.impact, 0),
        effort:
          entry.effort === "low" ||
          entry.effort === "medium" ||
          entry.effort === "high"
            ? entry.effort
            : "medium",
        actionUrl:
          typeof entry.actionUrl === "string" && entry.actionUrl.trim()
            ? entry.actionUrl.trim()
            : undefined,
      } satisfies Recommendation;
    })
    .filter((entry): entry is Recommendation => Boolean(entry));
}

function normalizeDomainInput(value: string): string {
  const normalized = normalizeScanDomainInput(value);
  if (normalized) {
    return normalized;
  }

  return (
    value
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//i, "")
      .split(/[/?#]/)[0]
      ?.replace(/\.$/, "")
      .split(":")[0]
      .trim() ?? ""
  );
}

function encodedDomain(domain: string): string {
  return encodeURIComponent(normalizeDomainInput(domain));
}

function encodedPath(value: string): string {
  return encodeURIComponent(value);
}

// ============================================================================
// API CLIENT
// ============================================================================

export const intelligenceApi = {
  // --------------------------------------------------------------------------
  // SECURITY ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get comprehensive security score for a domain
   */
  async getSecurityScore(domain: string): Promise<SecurityScore> {
    return publicApiClient.get(
      `/intelligence/security/score/${encodedDomain(domain)}`,
    );
  },

  /**
   * Get detailed security report with recommendations
   */
  async getSecurityReport(domain: string): Promise<ApiObject> {
    return publicApiClient.get(
      `/intelligence/security/report/${encodedDomain(domain)}`,
    );
  },

  /**
   * Get security recommendations for a domain
   */
  async getSecurityRecommendations(domain: string): Promise<Recommendation[]> {
    return publicApiClient.get(
      `/intelligence/security/recommendations/${encodedDomain(domain)}`,
    );
  },

  // --------------------------------------------------------------------------
  // WHOIS ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get WHOIS data for a domain
   */
  async getWhoisData(domain: string): Promise<WhoisData> {
    return publicApiClient.get(`/intelligence/whois/${encodedDomain(domain)}`);
  },

  /**
   * Get WHOIS change history
   */
  async getWhoisHistory(domain: string): Promise<ApiList> {
    return publicApiClient.get(
      `/intelligence/whois/history/${encodedDomain(domain)}`,
    );
  },

  /**
   * Get WHOIS timeline (visual timeline data)
   */
  async getWhoisTimeline(domain: string): Promise<ApiList> {
    return publicApiClient.get(
      `/intelligence/whois/timeline/${encodedDomain(domain)}`,
    );
  },

  /**
   * Get transfer eligibility status
   */
  async getTransferStatus(domain: string): Promise<ApiObject> {
    return publicApiClient.get(
      `/intelligence/whois/transfer/${encodedDomain(domain)}`,
    );
  },

  // --------------------------------------------------------------------------
  // INFRASTRUCTURE ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get infrastructure attribution data
   */
  async getInfrastructure(domain: string): Promise<InfrastructureData> {
    return publicApiClient.get(
      `/intelligence/infrastructure/${encodedDomain(domain)}`,
    );
  },

  /**
   * Get hosting provider details
   */
  async getHostingProvider(domain: string): Promise<ApiObject> {
    return publicApiClient.get(
      `/intelligence/hosting/lookup/${encodedDomain(domain)}`,
    );
  },

  /**
   * Attribute infrastructure (run attribution analysis)
   */
  async attributeInfrastructure(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/hosting/attribute", {
      domain: normalizeDomainInput(domain),
    });
  },

  // --------------------------------------------------------------------------
  // DNS ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get DNS records for a domain
   */
  async getDNSRecords(domain: string): Promise<DNSRecord[]> {
    return publicApiClient.get(`/intelligence/dns/${encodedDomain(domain)}`);
  },

  /**
   * Resolve DNS records (trigger fresh resolution)
   */
  async resolveDNS(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/dns/resolve", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Get DNS change history
   */
  async getDNSChanges(domain: string): Promise<ApiList> {
    return publicApiClient.get("/intelligence/dns/changes", {
      params: { domain: normalizeDomainInput(domain) },
    });
  },

  // --------------------------------------------------------------------------
  // TECHNOLOGY ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get detected technologies for a domain
   */
  async getTechnologies(domain: string): Promise<Technology[]> {
    return publicApiClient.get(
      `/intelligence/technology/${encodedDomain(domain)}`,
    );
  },

  /**
   * Detect technologies (trigger fresh detection)
   */
  async detectTechnologies(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/tech/detect", {
      domain: normalizeDomainInput(domain),
    });
  },

  // --------------------------------------------------------------------------
  // IP INTELLIGENCE ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get IP intelligence data
   */
  async getIPIntelligence(ip: string): Promise<ApiObject> {
    return publicApiClient.get(`/intelligence/ip/${encodedPath(ip)}`);
  },

  /**
   * Get IP fingerprint analysis
   */
  async getIPFingerprint(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/ip/fingerprint", {
      domain: normalizeDomainInput(domain),
    });
  },

  // --------------------------------------------------------------------------
  // EXPIRY MONITORING ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Get expiry information for a domain
   */
  async getExpiryInfo(domain: string): Promise<ApiObject> {
    return publicApiClient.get(`/intelligence/expiry/${encodedDomain(domain)}`);
  },

  /**
   * Get expiry alerts (domains expiring soon)
   */
  async getExpiryAlerts(): Promise<ApiList> {
    return publicApiClient.get("/intelligence/expiry/alerts");
  },

  /**
   * Get expiry summary statistics
   */
  async getExpirySummary(): Promise<ApiObject> {
    return publicApiClient.get("/intelligence/expiry/summary");
  },

  // --------------------------------------------------------------------------
  // ANALYSIS ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Run comprehensive domain analysis
   */
  async analyzeDomain(domain: string): Promise<DomainIntelligence> {
    return publicApiClient.post("/intelligence/analyze", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Compare multiple domains
   */
  async compareDomains(domains: string[]): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/compare", { domains });
  },

  /**
   * Get cost analysis
   */
  async getCostAnalysis(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/cost-analysis", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Get migration analysis
   */
  async getMigrationAnalysis(
    domain: string,
    targetProvider: string,
  ): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/migration-analysis", {
      domain: normalizeDomainInput(domain),
      targetProvider,
    });
  },

  /**
   * Get performance analysis
   */
  async getPerformanceAnalysis(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/performance", {
      domain: normalizeDomainInput(domain),
    });
  },

  // --------------------------------------------------------------------------
  // COMPREHENSIVE REPORT ENDPOINT
  // --------------------------------------------------------------------------

  /**
   * Get comprehensive intelligence report (all data in one call)
   */
  async getComprehensiveReport(domain: string): Promise<DomainIntelligence> {
    return publicApiClient.get(`/intelligence/report/${encodedDomain(domain)}`);
  },

  // --------------------------------------------------------------------------
  // BATCH ANALYSIS ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Start batch analysis job
   */
  async startBatchAnalysis(domains: string[]): Promise<BatchAnalysisJob> {
    return publicApiClient.post("/intelligence/batch/start", { domains });
  },

  /**
   * Get batch analysis job status
   */
  async getBatchStatus(jobId: string): Promise<BatchAnalysisJob> {
    return publicApiClient.get(`/intelligence/batch/${encodedPath(jobId)}`);
  },

  /**
   * Get batch analysis results
   */
  async getBatchResults(jobId: string): Promise<DomainIntelligence[]> {
    return publicApiClient.get(
      `/intelligence/batch/${encodedPath(jobId)}/results`,
    );
  },

  /**
   * Get batch analysis statistics
   */
  async getBatchStats(jobId: string): Promise<BatchAnalysisStats> {
    return publicApiClient.get(
      `/intelligence/batch/${encodedPath(jobId)}/stats`,
    );
  },

  /**
   * Cancel batch analysis job
   */
  async cancelBatchAnalysis(jobId: string): Promise<void> {
    return publicApiClient.post(
      `/intelligence/batch/${encodedPath(jobId)}/cancel`,
    );
  },

  // --------------------------------------------------------------------------
  // DATA COLLECTION ENDPOINTS (Trigger fresh scans)
  // --------------------------------------------------------------------------

  /**
   * Collect all intelligence data (DNS, IP, WHOIS, Tech, URLScan)
   */
  async collectAll(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/all", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Collect DNS data only
   */
  async collectDNS(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/dns", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Collect IP intelligence only
   */
  async collectIP(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/ip", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Collect WHOIS data only
   */
  async collectWhois(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/whois", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Collect technology data only
   */
  async collectTechnology(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/technology", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Trigger URLScan security scan
   */
  async collectURLScan(domain: string): Promise<ApiObject> {
    return publicApiClient.post("/intelligence/collect/urlscan", {
      domain: normalizeDomainInput(domain),
    });
  },

  /**
   * Get URLScan results by scan ID
   */
  async getURLScanResults(scanId: string): Promise<ApiObject> {
    return publicApiClient.get(
      `/intelligence/collect/urlscan/${encodedPath(scanId)}`,
    );
  },

  // --------------------------------------------------------------------------
  // SYSTEM STATUS ENDPOINT
  // --------------------------------------------------------------------------

  /**
   * Get intelligence system status (API health, service availability)
   */
  async getSystemStatus(): Promise<ApiObject> {
    return publicApiClient.get("/intelligence/status");
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate security grade from score (0-100)
 */
export function getSecurityGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

/**
 * Get color class for security score
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 80) return "text-blue-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 60) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get badge variant for priority
 */
export function getPriorityVariant(
  priority: string,
): "destructive" | "default" | "secondary" | "outline" {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Format days until expiry with color coding
 */
/**
 * Normalize intelligence report data to ensure all required fields exist
 * Prevents "Cannot read properties of undefined" errors
 */
export function normalizeIntelligenceReport(
  report: unknown,
): DomainIntelligence {
  const source: IntelligenceReportSource =
    report && typeof report === "object"
      ? (report as IntelligenceReportSource)
      : {};
  const securityCategories = source.security?.categories;
  const ipAddressesFromSource = Array.isArray(
    source.infrastructure?.ipAddresses,
  )
    ? asStringArray(source.infrastructure.ipAddresses)
    : [];
  const dnsRecords = normalizeDnsRecords(
    source.intelligenceModules?.dnsIntelligence ?? source.dns,
  );
  const technologies = normalizeTechnologies(
    source.intelligenceModules?.technologyStack ?? source.technologies,
  );
  const recommendations = normalizeRecommendations(source.recommendations);

  const normalized: DomainIntelligence = {
    domain: source.domain || "",
    security: {
      overall: asNumber(source.security?.overall, 0),
      grade: source.security?.grade || "N/A",
      categories: {
        dns: asNumber(
          securityCategories?.dns ??
            securityCategories?.dnsScore ??
            source.security?.breakdown?.dnsScore,
          0,
        ),
        ssl: asNumber(
          securityCategories?.ssl ??
            securityCategories?.sslScore ??
            source.security?.breakdown?.sslScore,
          0,
        ),
        malware: asNumber(
          securityCategories?.malware ??
            securityCategories?.malwareScore ??
            source.security?.breakdown?.malwareScore,
          0,
        ),
        email: asNumber(
          securityCategories?.email ??
            securityCategories?.emailScore ??
            source.security?.breakdown?.emailScore,
          0,
        ),
        technology: asNumber(
          securityCategories?.technology ??
            securityCategories?.technologyScore ??
            source.security?.breakdown?.technologyScore,
          0,
        ),
      },
      issues: source.security?.issues || source.security?.findings || [],
    },
    whois: {
      domain: source.whois?.domain || source.domain || "",
      registrar: source.whois?.registrar || "Unknown",
      registrantName: source.whois?.registrantName,
      registrantEmail: source.whois?.registrantEmail,
      creationDate: source.whois?.creationDate || "",
      expirationDate:
        source.whois?.expirationDate || source.whois?.expiryDate || "",
      updatedDate: source.whois?.updatedDate || "",
      nameservers: source.whois?.nameservers || [],
      status: source.whois?.status || [],
      dnssecEnabled: source.whois?.dnssecEnabled || false,
      transferLock: source.whois?.transferLock || false,
      daysUntilExpiry: source.whois?.daysUntilExpiry || 0,
    },
    infrastructure: {
      hostingProvider: source.infrastructure?.hostingProvider || "Unknown",
      providerType: source.infrastructure?.providerType || "unknown",
      cdn: source.infrastructure?.cdn,
      ipAddresses:
        ipAddressesFromSource.length > 0
          ? ipAddressesFromSource
          : source.infrastructure?.ipAddress
            ? [source.infrastructure.ipAddress]
            : [],
      ipVersion: source.infrastructure?.ipVersion || "IPv4",
      asn: source.infrastructure?.asn,
      asnOrg: source.infrastructure?.asnOrg,
      datacenterLocation:
        source.infrastructure?.datacenterLocation ||
        source.infrastructure?.location,
      reverseProxy: source.infrastructure?.reverseProxy || false,
      loadBalancer: source.infrastructure?.loadBalancer || false,
      isSharedHosting: source.infrastructure?.providerType === "shared",
    },
    dns: dnsRecords,
    technologies,
    recommendations,
    lastScanned:
      source.generatedAt || source.lastScanned || new Date().toISOString(),
    dataAvailability: {
      dns: dnsRecords.length > 0,
      whois: Boolean(source.whois),
      ip: Boolean(
        ipAddressesFromSource.length > 0 ||
        source.infrastructure?.ipAddress ||
        source.infrastructure?.asn,
      ),
      technology: technologies.length > 0,
      urlscan: Boolean(
        source.intelligenceModules?.urlscanAnalysis ||
        source.security?.categories?.malwareScore,
      ),
    },
  };

  return normalized;
}

export function formatExpiryDays(days: number): {
  text: string;
  color: string;
} {
  if (days < 0) {
    return { text: "Expired", color: "text-red-600" };
  }
  if (days <= 30) {
    return { text: `${days} days`, color: "text-red-600" };
  }
  if (days <= 60) {
    return { text: `${days} days`, color: "text-orange-600" };
  }
  if (days <= 90) {
    return { text: `${days} days`, color: "text-yellow-600" };
  }
  return { text: `${days} days`, color: "text-green-600" };
}
