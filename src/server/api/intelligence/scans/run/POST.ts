import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { intelligenceScans, scanHistory } from "../../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";
import { runComprehensiveIntelligenceScan } from "../../comprehensive/POST.js";
import whoisHandlerArray from "../../../scan/whois/POST.js";
import { and, desc, eq } from "drizzle-orm";
import type { FirewallHistorySummary } from "../../../../lib/firewall-intelligence.js";
import { buildWafHistorySummaryFromRecords } from "../../../../lib/firewall-history-summary.js";
import {
  inferCanonicalProviderType,
  normalizeHostingProviderLabel,
  resolvePreferredHostingProvider,
} from "../../../../lib/hosting-provider-canonical.js";

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/\.$/, "")
    .split(":")[0];
}

type JsonObject = Record<string, unknown>;
type Severity = "critical" | "high" | "medium" | "low";

interface InternalMockRequest {
  body: { domain: string };
  method: "POST";
}

interface InternalStatusResponse {
  json: (data: unknown) => InternalMockResponse;
}

interface InternalMockResponse {
  json: (data: unknown) => InternalMockResponse;
  status: (code: number) => InternalStatusResponse;
}

type InternalScanHandler = (
  req: InternalMockRequest,
  res: InternalMockResponse,
) => void | Promise<void>;

interface DashboardIssue {
  severity: Severity;
  category: string;
  message: string;
  recommendation: string;
}

interface DashboardRecommendation {
  id: string;
  priority: Severity;
  category: string;
  title: string;
  description: string;
  impact: number;
  effort: "low" | "medium" | "high";
  actionUrl?: string;
}

interface DashboardDnsRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
  status: "active" | "missing" | "invalid";
}

interface DashboardTechnology {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  isEOL: boolean;
  eolDate?: string;
}

interface DashboardModuleTelemetry {
  name: string;
  status: "success" | "failed";
  statusCode: number | null;
  durationMs: number;
  errorType?: string;
  errorMessage?: string;
  timestamp: string;
}

interface DashboardReport {
  domain: string;
  security: {
    overall: number;
    grade: string;
    categories: {
      dns: number;
      ssl: number;
      malware: number;
      email: number;
      technology: number;
    };
    issues: DashboardIssue[];
    waf?: JsonObject;
    wafDetected?: boolean;
    wafProvider?: string | null;
    wafConfidence?: number;
    wafMethods?: string[];
    ddos?: {
      protected?: boolean;
      provider?: string | null;
      method?: string | null;
    };
    ddosProtection?: boolean;
  };
  whois: {
    domain: string;
    registrar: string;
    creationDate: string;
    expirationDate: string;
    updatedDate: string;
    nameservers: string[];
    status: string[];
    dnssecEnabled: boolean;
    transferLock: boolean;
    daysUntilExpiry: number;
  };
  infrastructure: {
    hostingProvider: string;
    providerType: "cloud" | "shared" | "dedicated" | "unknown";
    cdn?: string;
    ipAddresses: string[];
    ipVersion?: string;
    asn?: string;
    asnOrg?: string;
    datacenterLocation?: string;
    reverseProxy: boolean;
    loadBalancer: boolean;
    isSharedHosting: boolean;
  };
  dns: DashboardDnsRecord[];
  technologies: DashboardTechnology[];
  recommendations: DashboardRecommendation[];
  lastScanned: string;
  moduleTelemetry?: Record<string, DashboardModuleTelemetry>;
  dataAvailability: {
    dns: boolean;
    whois: boolean;
    ip: boolean;
    technology: boolean;
    urlscan: boolean;
  };
}

function toRecord(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown, fallback = 0): number {
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

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseModuleTelemetry(
  value: unknown,
): Record<string, DashboardModuleTelemetry> {
  const record = toRecord(value);
  const parsed: Record<string, DashboardModuleTelemetry> = {};

  for (const [moduleName, rawTelemetry] of Object.entries(record)) {
    const telemetryRecord = toRecord(rawTelemetry);
    const statusValue = toStringValue(telemetryRecord.status)?.toLowerCase();
    const status = statusValue === "failed" ? "failed" : ("success" as const);
    parsed[moduleName] = {
      name: toStringValue(telemetryRecord.name) || moduleName,
      status,
      statusCode: toNullableNumber(telemetryRecord.statusCode),
      durationMs: toNumber(telemetryRecord.durationMs, 0),
      errorType: toStringValue(telemetryRecord.errorType) || undefined,
      errorMessage: toStringValue(telemetryRecord.errorMessage) || undefined,
      timestamp:
        toStringValue(telemetryRecord.timestamp) || new Date().toISOString(),
    };
  }

  return parsed;
}

function moduleSucceeded(
  moduleTelemetry: Record<string, DashboardModuleTelemetry>,
  moduleName: string,
): boolean {
  const telemetry = moduleTelemetry[moduleName];
  if (!telemetry) return true;
  return telemetry.status === "success";
}

function parseJsonSafe<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function calculateDaysUntilExpiry(expirationDate: string | null): number {
  const expiry = parseDateValue(expirationDate);
  if (!expiry) return 0;
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function inferTransferLock(status: string[]): boolean {
  return status.some((entry) =>
    /clienttransferprohibited|servertransferprohibited|pendingtransfer/i.test(
      entry,
    ),
  );
}

function isDnssecEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["signed", "true", "yes", "enabled", "active"].includes(
    value.trim().toLowerCase(),
  );
}

function extractHandler(handlerOrArray: unknown): InternalScanHandler {
  if (Array.isArray(handlerOrArray)) {
    return handlerOrArray[handlerOrArray.length - 1] as InternalScanHandler;
  }
  return handlerOrArray as InternalScanHandler;
}

const whoisHandler = extractHandler(whoisHandlerArray);

export async function buildWafHistorySummary(
  userId: number,
  domain: string,
  currentWafRecord: JsonObject,
): Promise<FirewallHistorySummary> {
  const priorScans = await db
    .select({
      hostingData: intelligenceScans.hostingData,
      createdAt: intelligenceScans.createdAt,
    })
    .from(intelligenceScans)
    .where(
      and(
        eq(intelligenceScans.userId, userId),
        eq(intelligenceScans.domain, domain),
      ),
    )
    .orderBy(desc(intelligenceScans.createdAt))
    .limit(20);

  const historicalRecords: Array<{ waf: JsonObject; createdAt: string }> = [];

  for (const scan of priorScans) {
    const hosting = parseJsonSafe<JsonObject>(scan.hostingData, {});
    const reportSnapshot = toRecord(hosting.reportSnapshot);
    const security = toRecord(reportSnapshot.security);
    const waf = toRecord(security.waf);
    historicalRecords.push({
      waf,
      createdAt: scan.createdAt?.toISOString?.() ?? new Date().toISOString(),
    });
  }

  historicalRecords.unshift({
    waf: currentWafRecord,
    createdAt: new Date().toISOString(),
  });

  return buildWafHistorySummaryFromRecords(historicalRecords);
}

function createMockReqRes(domain: string): {
  req: InternalMockRequest;
  res: InternalMockResponse;
  promise: Promise<unknown>;
} {
  const req: InternalMockRequest = {
    body: { domain },
    method: "POST",
  };

  let resolvePromise!: (value: unknown) => void;
  let rejectPromise!: (error: Error) => void;

  const promise = new Promise<unknown>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const res: InternalMockResponse = {
    json: (data: unknown) => {
      resolvePromise(data);
      return res;
    },
    status: (code: number) => ({
      json: (data: unknown) => {
        rejectPromise(new Error(`HTTP ${code}: ${JSON.stringify(data)}`));
        return res;
      },
    }),
  };

  return { req, res, promise };
}

async function callScanHandler(
  handler: InternalScanHandler,
  domain: string,
  scanName: string,
): Promise<JsonObject | null> {
  try {
    const { req, res, promise } = createMockReqRes(domain);
    await handler(req, res);
    const result = await promise;
    return toRecord(result);
  } catch (error) {
    console.warn(`[Dashboard Intelligence] ${scanName} scan failed:`, error);
    return null;
  }
}

function normalizeSeverity(value: unknown): Severity {
  const normalized = toStringValue(value)?.toLowerCase();
  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low"
  ) {
    return normalized;
  }
  return "medium";
}

function inferProviderType(
  providerRaw: JsonObject,
  providerName: string,
): "cloud" | "shared" | "dedicated" | "unknown" {
  return inferCanonicalProviderType(
    providerName,
    toStringValue(providerRaw.category),
  );
}

function isMeaningfulLabel(value: string | null | undefined): value is string {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  const placeholders = new Set([
    "unknown",
    "unknown hosting",
    "unknown server",
    "n/a",
    "na",
    "none",
    "not detected",
    "unavailable",
    "generic",
  ]);

  return !placeholders.has(normalized);
}

function buildDnsRecords(dnsRaw: JsonObject): DashboardDnsRecord[] {
  const recordsContainer = toRecord(dnsRaw.records);
  const records: DashboardDnsRecord[] = [];

  for (const [type, rawEntries] of Object.entries(recordsContainer)) {
    if (!Array.isArray(rawEntries)) continue;

    for (const entry of rawEntries) {
      if (typeof entry === "string" && entry.trim()) {
        records.push({
          type,
          value: entry.trim(),
          status: "active",
        });
        continue;
      }

      const record = toRecord(entry);
      const value =
        toStringValue(record.value) ??
        toStringValue(record.exchange) ??
        toStringValue(record.host) ??
        toStringValue(record.target);

      if (!value) continue;

      const ttlCandidate = toNumber(record.ttl, Number.NaN);
      const priorityCandidate = toNumber(record.priority, Number.NaN);

      records.push({
        type,
        value,
        status: "active",
        ttl: Number.isFinite(ttlCandidate) ? ttlCandidate : undefined,
        priority: Number.isFinite(priorityCandidate)
          ? priorityCandidate
          : undefined,
      });
    }
  }

  return records;
}

function buildTechnologies(
  technologyRaw: JsonObject,
  providerRaw: JsonObject,
  securityRaw: JsonObject,
): DashboardTechnology[] {
  const technologies: DashboardTechnology[] = [];
  const pushUnique = (tech: DashboardTechnology) => {
    const key = tech.name.toLowerCase();
    if (technologies.some((existing) => existing.name.toLowerCase() === key)) {
      return;
    }
    technologies.push(tech);
  };

  const explicitTech = technologyRaw.technologies;
  if (Array.isArray(explicitTech)) {
    for (const item of explicitTech) {
      const record = toRecord(item);
      const name = toStringValue(record.name);
      if (!isMeaningfulLabel(name)) continue;
      pushUnique({
        name,
        category: toStringValue(record.category) || "Technology",
        version: toStringValue(record.version) || undefined,
        confidence: toNumber(record.confidence, 75),
        isEOL: toBoolean(record.isEOL),
        eolDate: toStringValue(record.eolDate) || undefined,
      });
    }
  }

  const wordpress = toRecord(technologyRaw.wordpress);
  if (toBoolean(wordpress.detected)) {
    pushUnique({
      name: "WordPress",
      category: "CMS",
      version: toStringValue(wordpress.version) || undefined,
      confidence: toNumber(wordpress.confidence, 90),
      isEOL: false,
    });
  }

  const php = toRecord(technologyRaw.php);
  const phpVersion = toStringValue(php.version);
  if (phpVersion || toBoolean(php.detected)) {
    pushUnique({
      name: "PHP",
      category: "Runtime",
      version: phpVersion || undefined,
      confidence: toNumber(php.confidence, 80),
      isEOL: false,
    });
  }

  const server = toRecord(technologyRaw.server);
  const serverType = toStringValue(server.type);
  if (isMeaningfulLabel(serverType)) {
    pushUnique({
      name: serverType,
      category: "Server",
      confidence: toNumber(server.confidence, 80),
      isEOL: false,
    });
  }

  const hosting = toRecord(technologyRaw.hosting);
  const hostingProvider = normalizeHostingProviderLabel(
    toStringValue(hosting.provider),
  );
  if (isMeaningfulLabel(hostingProvider)) {
    pushUnique({
      name: hostingProvider,
      category: "Hosting",
      confidence: toNumber(hosting.confidence, 80),
      isEOL: false,
    });
  }

  const providerName = normalizeHostingProviderLabel(
    toStringValue(providerRaw.provider),
  );
  if (isMeaningfulLabel(providerName)) {
    const providerCategory = toStringValue(providerRaw.category) || "";
    const lowerCategory = providerCategory.toLowerCase();
    const category = lowerCategory.includes("cdn")
      ? "CDN"
      : lowerCategory.includes("cloud")
        ? "Cloud Hosting"
        : "Hosting";

    pushUnique({
      name: providerName,
      category,
      confidence: toNumber(providerRaw.confidence, 80),
      isEOL: false,
    });
  }

  const securityWafProvider = toStringValue(toRecord(securityRaw.waf).provider);
  if (isMeaningfulLabel(securityWafProvider)) {
    pushUnique({
      name: securityWafProvider,
      category: "Security/WAF",
      confidence: toNumber(toRecord(securityRaw.waf).confidence, 85),
      isEOL: false,
    });
  }

  return technologies;
}

function inferCdnProvider(
  securityRaw: JsonObject,
  providerRaw: JsonObject,
): string | undefined {
  const wafProvider = toStringValue(toRecord(securityRaw.waf).provider);
  if (isMeaningfulLabel(wafProvider)) {
    return wafProvider;
  }

  const serverHeader = toStringValue(securityRaw.serverHeader)?.toLowerCase();
  if (serverHeader?.includes("sucuri")) return "Sucuri";
  if (serverHeader?.includes("cloudflare")) return "Cloudflare";
  if (serverHeader?.includes("akamai")) return "Akamai";

  const providerName = toStringValue(providerRaw.provider);
  const providerCategory = toStringValue(providerRaw.category)?.toLowerCase();
  if (providerCategory?.includes("cdn") && isMeaningfulLabel(providerName)) {
    return providerName;
  }

  return undefined;
}

function buildIssues(
  securityRaw: JsonObject,
  criticalIssuesRaw: unknown[],
): DashboardIssue[] {
  const issues: DashboardIssue[] = [];

  for (const issue of criticalIssuesRaw) {
    const record = toRecord(issue);
    const title = toStringValue(record.title);
    const description = toStringValue(record.description);
    if (!title && !description) continue;
    issues.push({
      severity: normalizeSeverity(record.severity),
      category: toStringValue(record.category) || "security",
      message: title || description || "Critical issue detected",
      recommendation:
        description || "Review this issue and apply recommended remediation.",
    });
  }

  const securityCriticalIssues = Array.isArray(securityRaw.criticalIssues)
    ? securityRaw.criticalIssues
    : [];

  for (const issue of securityCriticalIssues) {
    if (typeof issue !== "string" || !issue.trim()) continue;
    issues.push({
      severity: "high",
      category: "security",
      message: issue.trim(),
      recommendation: issue.trim(),
    });
  }

  return issues;
}

function buildModuleFailureIssues(
  moduleTelemetry: Record<string, DashboardModuleTelemetry>,
): DashboardIssue[] {
  return Object.values(moduleTelemetry)
    .filter((telemetry) => telemetry.status === "failed")
    .map((telemetry) => ({
      severity: "medium" as const,
      category: "scan",
      message: `${telemetry.name} scan degraded`,
      recommendation:
        telemetry.errorMessage ||
        "Retry scan later; partial intelligence data was returned.",
    }));
}

function buildRecommendations(
  raw: unknown,
  securityRecommendationsRaw: unknown,
): DashboardRecommendation[] {
  if (Array.isArray(raw)) {
    const structuredRecommendations = raw
      .map((item, index) => {
        const record = toRecord(item);
        const title =
          toStringValue(record.title) || `Recommendation ${index + 1}`;
        return {
          id: toStringValue(record.id) || `rec-${index + 1}`,
          priority: normalizeSeverity(record.priority),
          category: toStringValue(record.category) || "general",
          title,
          description: toStringValue(record.description) || title,
          impact: toNumber(record.impact, 0),
          effort: ["low", "medium", "high"].includes(
            String(record.effort).toLowerCase(),
          )
            ? (String(record.effort).toLowerCase() as "low" | "medium" | "high")
            : "medium",
          actionUrl: toStringValue(record.actionUrl) || undefined,
        };
      })
      .filter((item) => item.title.trim().length > 0);

    if (structuredRecommendations.length > 0) {
      return structuredRecommendations;
    }
  }

  if (!Array.isArray(securityRecommendationsRaw)) return [];

  return securityRecommendationsRaw
    .filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0,
    )
    .slice(0, 12)
    .map((entry, index) => ({
      id: `security-rec-${index + 1}`,
      priority: "medium" as const,
      category: "security",
      title: entry.trim(),
      description: entry.trim(),
      impact: 0,
      effort: "medium" as const,
    }));
}

function mapComprehensiveToDashboardReport(
  domain: string,
  payload: JsonObject,
  whoisRaw: JsonObject,
): DashboardReport {
  const moduleTelemetry = parseModuleTelemetry(payload.moduleTelemetry);
  const technologyRaw = toRecord(payload.technology);
  const dnsRaw = toRecord(payload.dns);
  const emailRaw = toRecord(payload.email);
  const sslRaw = toRecord(payload.ssl);
  const securityRaw = toRecord(payload.security);
  const geolocationRaw = toRecord(payload.geolocation);
  const providerRaw = toRecord(payload.provider);
  const criticalIssuesRaw = Array.isArray(payload.criticalIssues)
    ? payload.criticalIssues
    : [];

  const dnsRecords = buildDnsRecords(dnsRaw);
  const technologies = buildTechnologies(
    technologyRaw,
    providerRaw,
    securityRaw,
  );
  const issues = [
    ...buildIssues(securityRaw, criticalIssuesRaw),
    ...buildModuleFailureIssues(moduleTelemetry),
  ];
  const recommendations = buildRecommendations(
    payload.recommendations,
    securityRaw.recommendations,
  );

  const mxRecords = Array.isArray(emailRaw.mx) ? emailRaw.mx : [];
  const spf = toRecord(emailRaw.spf);
  const dmarc = toRecord(emailRaw.dmarc);
  const dkim = toRecord(emailRaw.dkim);
  const spfRecordValue = (toStringValue(spf.record) || "").toLowerCase();
  const webOnlyEmailPosture =
    mxRecords.length === 0 &&
    toBoolean(spf.configured) &&
    /\bv=spf1\b/i.test(spfRecordValue) &&
    /(?:^|\s)-all(?:\s|$)/i.test(spfRecordValue);
  const emailScore = toNumber(emailRaw.score, Number.NaN);
  const normalizedEmailScore = Number.isFinite(emailScore)
    ? emailScore
    : webOnlyEmailPosture
      ? 100
      : (toBoolean(spf.configured) || toBoolean(spf.valid) ? 34 : 0) +
        (toBoolean(dmarc.configured) || toBoolean(dmarc.valid) ? 33 : 0) +
        (toBoolean(dkim.configured) || toBoolean(dkim.hasRecord) ? 33 : 0);

  const securityBreakdown = toRecord(securityRaw.breakdown);
  const sslBreakdown = toRecord(securityBreakdown.ssl);
  const safeBrowsing = toRecord(securityRaw.safeBrowsing);
  const sslScore = toNumber(sslBreakdown.percentage, Number.NaN);
  const normalizedSslScore = Number.isFinite(sslScore)
    ? sslScore
    : toBoolean(sslRaw.valid)
      ? 100
      : toBoolean(sslRaw.hasSSL)
        ? 40
        : 0;

  const securityOverall = toNumber(
    securityRaw.securityScore,
    toNumber(securityRaw.score, toNumber(payload.overallScore, 0)),
  );
  const wafRaw = toRecord(securityRaw.waf);
  const ddosRaw = toRecord(securityRaw.ddos);

  const providerCandidate = toStringValue(providerRaw.provider);
  const technologyHostingProvider = toStringValue(
    toRecord(technologyRaw.hosting).provider,
  );
  const providerName =
    resolvePreferredHostingProvider(
      providerCandidate,
      technologyHostingProvider,
    ) || "Unknown";

  const location = toRecord(geolocationRaw.location);
  const locationLabel = [
    toStringValue(geolocationRaw.city),
    toStringValue(geolocationRaw.region),
    toStringValue(location.city),
    toStringValue(location.region),
    toStringValue(geolocationRaw.country),
    toStringValue(location.country),
  ]
    .filter(Boolean)
    .join(", ");

  const ipAddress =
    toStringValue(geolocationRaw.ipAddress) ||
    toStringValue(geolocationRaw.ip) ||
    toStringValue(location.ipAddress) ||
    "";

  const asnValue =
    toStringValue(geolocationRaw.asn) ||
    toStringValue(location.asn) ||
    undefined;

  const providerType = inferProviderType(providerRaw, providerName);
  const whoisStatus = toStringArray(whoisRaw.status);
  const whoisNameServers = toStringArray(
    whoisRaw.nameServers ?? whoisRaw.nameservers,
  );
  const whoisExpirationDate =
    toStringValue(whoisRaw.expiryDate) ||
    toStringValue(whoisRaw.expirationDate) ||
    "";
  const parsedExpiryDays = toNumber(whoisRaw.daysUntilExpiry, Number.NaN);
  const daysUntilExpiry = Number.isFinite(parsedExpiryDays)
    ? parsedExpiryDays
    : calculateDaysUntilExpiry(whoisExpirationDate || null);

  return {
    domain,
    security: {
      overall: securityOverall,
      grade:
        toStringValue(securityRaw.grade) ||
        toStringValue(payload.overallGrade) ||
        "N/A",
      categories: {
        dns: dnsRecords.length > 0 ? 100 : 0,
        ssl: normalizedSslScore,
        malware: toNumber(safeBrowsing.score, 0),
        email: normalizedEmailScore,
        technology: technologies.length > 0 ? 100 : 0,
      },
      issues,
      waf: wafRaw,
      wafDetected: toBoolean(wafRaw.detected),
      wafProvider: toStringValue(wafRaw.provider),
      wafConfidence: toNumber(wafRaw.confidence, 0),
      wafMethods: toStringArray(wafRaw.evidence),
      ddos: {
        protected: toBoolean(ddosRaw.protected),
        provider: toStringValue(ddosRaw.provider),
        method: toStringValue(ddosRaw.method),
      },
      ddosProtection: toBoolean(ddosRaw.protected),
    },
    whois: {
      domain,
      registrar:
        toStringValue(whoisRaw.registrarFriendly) ||
        toStringValue(whoisRaw.registrar) ||
        "Unknown",
      creationDate: toStringValue(whoisRaw.createdDate) || "",
      expirationDate: whoisExpirationDate,
      updatedDate: toStringValue(whoisRaw.updatedDate) || "",
      nameservers: whoisNameServers,
      status: whoisStatus,
      dnssecEnabled: isDnssecEnabled(whoisRaw.dnssec),
      transferLock: inferTransferLock(whoisStatus),
      daysUntilExpiry,
    },
    infrastructure: {
      hostingProvider: providerName,
      providerType,
      cdn: inferCdnProvider(securityRaw, providerRaw),
      ipAddresses: ipAddress ? [ipAddress] : [],
      ipVersion: ipAddress.includes(":")
        ? "IPv6"
        : ipAddress
          ? "IPv4"
          : undefined,
      asn: asnValue,
      datacenterLocation: locationLabel || undefined,
      reverseProxy: false,
      loadBalancer: false,
      isSharedHosting: providerType === "shared",
    },
    dns: dnsRecords,
    technologies,
    recommendations,
    lastScanned:
      toStringValue(payload.scannedAt) ||
      toStringValue(payload.generatedAt) ||
      new Date().toISOString(),
    moduleTelemetry,
    dataAvailability: {
      dns: moduleSucceeded(moduleTelemetry, "dns") && dnsRecords.length > 0,
      whois:
        Boolean(whoisNameServers.length) ||
        Boolean(whoisStatus.length) ||
        Boolean(toStringValue(whoisRaw.registrar)) ||
        Boolean(whoisExpirationDate),
      ip:
        moduleSucceeded(moduleTelemetry, "geolocation") &&
        Boolean(ipAddress || asnValue),
      technology:
        moduleSucceeded(moduleTelemetry, "technology") &&
        technologies.length > 0,
      urlscan: false,
    },
  };
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const rawDomain =
      typeof req.body?.domain === "string" ? req.body.domain : "";
    const domain = normalizeDomain(rawDomain);

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    const startTime = Date.now();
    const [comprehensiveResult, whoisResult] = await Promise.all([
      runComprehensiveIntelligenceScan(domain),
      callScanHandler(whoisHandler, domain, "whois"),
    ]);
    const comprehensivePayload = toRecord(comprehensiveResult);
    const securityPayload = toRecord(comprehensivePayload.security);
    const wafPayload = toRecord(securityPayload.waf);
    if (Object.keys(wafPayload).length > 0) {
      const historySummary = await buildWafHistorySummary(
        userId,
        domain,
        wafPayload,
      );
      wafPayload.historySummary = historySummary;
      securityPayload.waf = wafPayload;
      comprehensivePayload.security = securityPayload;
    }

    const transformed = mapComprehensiveToDashboardReport(
      domain,
      comprehensivePayload,
      toRecord(whoisResult),
    );
    const scanDuration = Date.now() - startTime;
    const providerConfidence = toNumber(
      toRecord(comprehensiveResult.provider).confidence,
      toNumber(comprehensiveResult.confidence, Number.NaN),
    );

    const insertResult = await db.insert(intelligenceScans).values({
      userId,
      domain,
      edgeProvider: transformed.infrastructure.cdn || null,
      edgeConfidence: null,
      originHost: transformed.infrastructure.hostingProvider || null,
      originConfidence: null,
      confidenceScore: Number.isFinite(providerConfidence)
        ? providerConfidence
        : null,
      detectionMethod: "dashboard_comprehensive_scan",
      hostingData: JSON.stringify({
        reportSnapshot: transformed,
        infrastructure: transformed.infrastructure,
        security: transformed.security,
        recommendations: transformed.recommendations,
      }),
      dnsData: JSON.stringify({
        records: transformed.dns,
      }),
      ipData: JSON.stringify({
        ipAddresses: transformed.infrastructure.ipAddresses,
        asn: transformed.infrastructure.asn,
        location: transformed.infrastructure.datacenterLocation,
        whois: transformed.whois,
      }),
      techData: JSON.stringify({
        technologies: transformed.technologies,
      }),
      techCount: transformed.technologies.length,
      recordCount: transformed.dns.length,
      openPorts: JSON.stringify([]),
      scanDuration,
    });

    const scanId = Number(insertResult[0].insertId);

    try {
      const performanceRecord = toRecord(
        toRecord(comprehensiveResult).performance,
      );
      const performanceMobile = toRecord(performanceRecord.mobile);
      const performanceDesktop = toRecord(performanceRecord.desktop);
      const wordpressTechnology = transformed.technologies.find((technology) =>
        technology.name.toLowerCase().includes("wordpress"),
      );
      const malwareIndicatorPattern = /malware|phish|blacklist/i;
      const malwareIssueDetected = transformed.security.issues.some((issue) =>
        malwareIndicatorPattern.test(
          `${issue.category || ""} ${issue.message || ""} ${issue.recommendation || ""}`,
        ),
      );

      const compactScanSnapshot = {
        domain,
        hostingProvider: transformed.infrastructure.hostingProvider || null,
        sslValid:
          typeof toRecord(comprehensiveResult.ssl).valid === "boolean"
            ? toBoolean(toRecord(comprehensiveResult.ssl).valid)
            : null,
        sslExpiryDate: transformed.whois.expirationDate || null,
        ssl: {
          valid:
            typeof toRecord(comprehensiveResult.ssl).valid === "boolean"
              ? toBoolean(toRecord(comprehensiveResult.ssl).valid)
              : null,
          validTo: transformed.whois.expirationDate || null,
        },
        performanceData: {
          mobile: {
            score: Number.isFinite(
              toNumber(performanceMobile.score, Number.NaN),
            )
              ? toNumber(performanceMobile.score, 0)
              : 0,
          },
          desktop: {
            score: Number.isFinite(
              toNumber(performanceDesktop.score, Number.NaN),
            )
              ? toNumber(performanceDesktop.score, 0)
              : 0,
          },
        },
        securityData: {
          score: transformed.security.overall,
          grade: transformed.security.grade,
          issues: transformed.security.issues.slice(0, 12),
        },
        technologyData: {
          wordpress: {
            detected: Boolean(wordpressTechnology),
            version: wordpressTechnology?.version || null,
          },
          server: {
            type: null,
            isWebsiteBuilder: false,
            builderType: null,
          },
          hosting: {
            provider: transformed.infrastructure.hostingProvider || null,
          },
        },
        whoisData: {
          registrar: transformed.whois.registrar || null,
          expiryDate: transformed.whois.expirationDate || null,
        },
        emailData: null,
        providerData: {
          provider: transformed.infrastructure.hostingProvider || null,
        },
        malwareData: {
          isMalware: malwareIssueDetected,
          isPhishing: malwareIssueDetected,
          isBlacklisted: malwareIssueDetected,
        },
      };

      await db.insert(scanHistory).values({
        userId,
        domain,
        scanType: "full",
        scanData: JSON.stringify(compactScanSnapshot),
      });
    } catch (historyError) {
      console.error(
        "[Dashboard Intelligence] Failed to mirror scan into scan history:",
        historyError,
      );
    }

    res.status(201).json({
      success: true,
      scan: {
        id: scanId,
        domain,
        createdAt: new Date().toISOString(),
      },
      report: transformed,
    });
  } catch (error) {
    console.error("Failed to run dashboard intelligence scan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to run intelligence scan",
      message: "An internal error occurred",
    });
  }
}
