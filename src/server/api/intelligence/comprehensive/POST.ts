import type { Request, Response } from "express";
import { getOrSet } from "../../../lib/cache/cache-manager.js";

/**
 * Comprehensive Intelligence API
 *
 * Combines ALL data from:
 * - Main tool (8 APIs): technology, performance, DNS, email, SSL, security, geolocation, provider
 * - Intelligence engines: hosting attribution, security scoring, WHOIS history
 * - Computed insights: recommendations, critical issues, overall scores
 *
 * This is the PREMIUM intelligence endpoint for authenticated users.
 */

interface ComprehensiveIntelligenceRequest {
  domain: string;
  forceFresh?: boolean;
}

const COMPREHENSIVE_CACHE_SUFFIX = "comprehensive-builder-v3";

type JsonMap = Record<string, unknown>;

type IssueSeverity = "critical" | "high" | "medium" | "low";
type IssueImpact = "high" | "medium" | "low";

interface CriticalIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  title: string;
  description: string;
  impact: IssueImpact;
}

interface RecommendationItem {
  id: string;
  priority: IssueSeverity;
  category: string;
  title: string;
  description: string;
  impact: number;
  effort: "low" | "medium" | "high";
  cost: string;
  implementation?: string;
  resources?: string[];
}

interface TechnologySummary extends JsonMap {
  wordpressDetected?: boolean;
  phpVersion?: string;
}

interface PerformanceSummary extends JsonMap {
  mobile?: { score?: number };
  desktop?: { score?: number };
}

interface EmailSummary extends JsonMap {
  spfConfigured?: boolean;
  dmarcConfigured?: boolean;
  dkimConfigured?: boolean;
}

interface SslSummary extends JsonMap {
  valid?: boolean;
}

interface SecuritySummary extends JsonMap {
  securityScore?: number;
  wafDetected?: boolean;
}

interface ProviderSummary extends JsonMap {
  confidence?: number;
}

interface ComprehensiveScanData {
  technology: TechnologySummary | null;
  performance: PerformanceSummary | null;
  dns: JsonMap | null;
  email: EmailSummary | null;
  ssl: SslSummary | null;
  security: SecuritySummary | null;
  geolocation: JsonMap | null;
  provider: ProviderSummary | null;
  attribution: unknown;
  securityScore: unknown;
  whoisHistory: unknown[];
}

interface ComprehensiveIntelligenceResponse {
  success: boolean;
  domain: string;
  scannedAt: string;

  // Main tool data
  technology: TechnologySummary | null;
  performance: PerformanceSummary | null;
  dns: JsonMap | null;
  email: EmailSummary | null;
  ssl: SslSummary | null;
  security: SecuritySummary | null;
  geolocation: JsonMap | null;
  provider: ProviderSummary | null;

  // Intelligence data
  attribution: unknown;
  securityScore: unknown;
  whoisHistory: unknown[];

  // Computed insights
  overallScore: number;
  overallGrade: string;
  criticalIssues: CriticalIssue[];
  recommendations: RecommendationItem[];

  // Metadata
  confidence: number;
  dataCompleteness: number;
  moduleTelemetry: Record<string, ScanModuleTelemetry>;

  error?: string;
}

/**
 * Helper: Call internal API endpoint by importing handlers directly
 * This avoids HTTP overhead and port issues
 *
 * Note: Handlers are exported as [middleware, handler] arrays
 * We need to extract the actual handler function (last element)
 */
import technologyHandlerArray from "../../scan/technology/POST.js";
import performanceHandlerArray from "../../scan/performance/POST.js";
import dnsHandlerArray from "../../scan/dns/POST.js";
import emailHandlerArray from "../../scan/email/POST.js";
import sslHandlerArray from "../../scan/ssl/POST.js";
import securityHandlerArray from "../../scan/security/POST.js";
import geolocationHandlerArray from "../../scan/geolocation/POST.js";
import providerHandlerArray from "../../scan/provider/POST.js";

interface InternalMockRequest {
  body: Record<string, unknown>;
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

interface InternalInvocationResult {
  statusCode: number;
  payload: unknown;
}

interface ScanModuleTelemetry {
  name: string;
  status: "success" | "failed";
  statusCode: number | null;
  durationMs: number;
  errorType?: string;
  errorMessage?: string;
  timestamp: string;
}

interface ScanModuleCallResult {
  data: unknown | null;
  telemetry: ScanModuleTelemetry;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "An internal error occurred";
}

function classifyModuleErrorType(
  message: string,
  statusCode: number | null,
): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout")
  ) {
    return "timeout";
  }
  if (
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504") ||
    normalized.includes("bad gateway") ||
    (statusCode !== null && statusCode >= 502)
  ) {
    return "upstream";
  }
  if (normalized.includes("http 4")) {
    return "http-client";
  }
  if (normalized.includes("http 5")) {
    return "http-server";
  }
  if (
    normalized.includes("parse") ||
    normalized.includes("json") ||
    normalized.includes("invalid response")
  ) {
    return "parse";
  }
  if (
    normalized.includes("connect") ||
    normalized.includes("econnreset") ||
    normalized.includes("socket")
  ) {
    return "network";
  }
  return "runtime";
}

function extractPayloadErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : null;
  if (message && message.trim()) return message.trim();

  const moduleRecord =
    record._module && typeof record._module === "object"
      ? (record._module as Record<string, unknown>)
      : null;
  if (moduleRecord && typeof moduleRecord.message === "string") {
    return moduleRecord.message.trim() || null;
  }

  return null;
}

function payloadHasFailedModuleStatus(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  const moduleRecord =
    record._module && typeof record._module === "object"
      ? (record._module as Record<string, unknown>)
      : null;
  return moduleRecord?.status === "failed";
}

function extractHandler(handlerOrArray: unknown): InternalScanHandler {
  if (Array.isArray(handlerOrArray)) {
    return handlerOrArray[handlerOrArray.length - 1] as InternalScanHandler;
  }
  return handlerOrArray as InternalScanHandler;
}

// Extract actual handler functions from middleware arrays
const technologyHandler = extractHandler(technologyHandlerArray);
const performanceHandler = extractHandler(performanceHandlerArray);
const dnsHandler = extractHandler(dnsHandlerArray);
const emailHandler = extractHandler(emailHandlerArray);
const sslHandler = extractHandler(sslHandlerArray);
const securityHandler = extractHandler(securityHandlerArray);
const geolocationHandler = extractHandler(geolocationHandlerArray);
const providerHandler = extractHandler(providerHandlerArray);

/**
 * Mock Express request/response objects for internal calls
 */
function createMockReqRes(body: Record<string, unknown>): {
  req: InternalMockRequest;
  res: InternalMockResponse;
  promise: Promise<InternalInvocationResult>;
} {
  const req = {
    body,
    method: "POST",
  };

  let resolvePromise!: (value: InternalInvocationResult) => void;
  let settled = false;
  let statusCode = 200;

  const promise = new Promise<InternalInvocationResult>((resolve) => {
    resolvePromise = resolve;
  });

  const res: InternalMockResponse = {
    json: (data: unknown) => {
      if (!settled) {
        settled = true;
        resolvePromise({
          statusCode,
          payload: data,
        });
      }
      return res;
    },
    status: (code: number) => {
      statusCode = code;
      return {
        json: (data: unknown) => {
          if (!settled) {
            settled = true;
            resolvePromise({
              statusCode: code,
              payload: data,
            });
          }
          return res;
        },
      };
    },
  };

  return { req, res, promise };
}

/**
 * Call scan handler directly
 */
async function callScanHandler(
  handler: InternalScanHandler,
  body: Record<string, unknown>,
  scanName: string,
): Promise<ScanModuleCallResult> {
  const startedAt = Date.now();
  try {
    const domain =
      typeof body.domain === "string" ? body.domain : "<unknown-domain>";
    console.log(`[Comprehensive] Calling ${scanName} for ${domain}`);
    const { req, res, promise } = createMockReqRes(body);
    await handler(req, res);
    const result = await promise;
    const durationMs = Date.now() - startedAt;
    const payloadMessage = extractPayloadErrorMessage(result.payload);
    const moduleFailedPayload = payloadHasFailedModuleStatus(result.payload);

    if (result.statusCode >= 400 || moduleFailedPayload) {
      const errorMessage =
        payloadMessage || `${scanName} scan failed (HTTP ${result.statusCode})`;
      const telemetry: ScanModuleTelemetry = {
        name: scanName,
        status: "failed",
        statusCode: result.statusCode,
        durationMs,
        errorType: classifyModuleErrorType(errorMessage, result.statusCode),
        errorMessage,
        timestamp: new Date().toISOString(),
      };
      console.warn(`[Comprehensive] ${scanName} degraded:`, telemetry);
      return {
        data: result.payload,
        telemetry,
      };
    }

    return {
      data: result.payload,
      telemetry: {
        name: scanName,
        status: "success",
        statusCode: result.statusCode,
        durationMs,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    const telemetry: ScanModuleTelemetry = {
      name: scanName,
      status: "failed",
      statusCode: null,
      durationMs: Date.now() - startedAt,
      errorType: classifyModuleErrorType(errorMessage, null),
      errorMessage,
      timestamp: new Date().toISOString(),
    };
    console.error(`[Comprehensive] ${scanName} error:`, telemetry);
    return {
      data: null,
      telemetry,
    };
  }
}

/**
 * Helper: Calculate overall score from all data
 */
function getEmailSignalState(email: EmailSummary | null): {
  hasMx: boolean;
  spfConfigured: boolean;
  dmarcConfigured: boolean;
  dkimConfigured: boolean;
  spfRecord: string;
  isWebOnlyPosture: boolean;
} {
  const emailRecord = toRecord(email);
  const mxRecords = toArray(emailRecord.mx);
  const spfRecordRaw = toStringValue(toRecord(emailRecord.spf).record);
  const spfRecord = (spfRecordRaw || "").toLowerCase();
  const spfConfigured =
    email?.spfConfigured === true ||
    toBoolean(toRecord(emailRecord.spf).configured);
  const dmarcConfigured =
    email?.dmarcConfigured === true ||
    toBoolean(toRecord(emailRecord.dmarc).configured);
  const dkimConfigured =
    email?.dkimConfigured === true ||
    toBoolean(toRecord(emailRecord.dkim).configured);
  const spfDenyAll =
    /\bv=spf1\b/i.test(spfRecord) && /(?:^|\s)-all(?:\s|$)/i.test(spfRecord);

  return {
    hasMx: mxRecords.length > 0,
    spfConfigured,
    dmarcConfigured,
    dkimConfigured,
    spfRecord,
    isWebOnlyPosture: mxRecords.length === 0 && spfConfigured && spfDenyAll,
  };
}

function calculateOverallScore(data: ComprehensiveScanData): {
  score: number;
  grade: string;
} {
  let totalScore = 0;
  let weights = 0;

  // Security score (40% weight)
  if (data.security?.securityScore) {
    totalScore += data.security.securityScore * 0.4;
    weights += 0.4;
  }

  // Performance score (30% weight) - average mobile and desktop
  if (
    data.performance?.mobile?.score !== undefined &&
    data.performance?.desktop?.score !== undefined
  ) {
    const perfScore =
      (data.performance.mobile.score + data.performance.desktop.score) / 2;
    totalScore += perfScore * 0.3;
    weights += 0.3;
  }

  // Email security (15% weight) - 0-100 based on SPF/DMARC/DKIM
  if (data.email) {
    const emailSignals = getEmailSignalState(data.email);
    const emailScore = emailSignals.isWebOnlyPosture
      ? 100
      : (emailSignals.spfConfigured ? 33.33 : 0) +
        (emailSignals.dmarcConfigured ? 33.33 : 0) +
        (emailSignals.dkimConfigured ? 33.33 : 0);
    totalScore += emailScore * 0.15;
    weights += 0.15;
  }

  // SSL score (15% weight)
  if (data.ssl?.valid) {
    const sslScore = data.ssl.valid ? 100 : 0;
    totalScore += sslScore * 0.15;
    weights += 0.15;
  }

  // Normalize score
  const finalScore = weights > 0 ? Math.round(totalScore / weights) : 0;

  // Calculate grade
  let grade = "F";
  if (finalScore >= 90) grade = "A";
  else if (finalScore >= 80) grade = "B";
  else if (finalScore >= 70) grade = "C";
  else if (finalScore >= 60) grade = "D";

  return { score: finalScore, grade };
}

function toRecord(value: unknown): JsonMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonMap;
  }
  return {};
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasKnownWafProviderName(value: string | null | undefined): boolean {
  if (!value) return false;

  const normalized = value.toLowerCase();
  return [
    "sucuri",
    "cloudflare",
    "akamai",
    "imperva",
    "modsecurity",
    "wordfence",
    "aws waf",
    "go daddy edge security",
    "godaddy edge security",
    "incapsula",
    "f5",
    "fortinet",
  ].some((provider) => normalized.includes(provider));
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasStrongManagedEdgeSignal(wafRecord: JsonMap): boolean {
  const hostProvider = toStringValue(wafRecord.hostProvider);
  const confidence = Number(wafRecord.confidence);
  const corroborated = toBoolean(wafRecord.corroborated);
  const evidenceDetails = toArray(wafRecord.evidenceDetails);

  if (corroborated && hostProvider) {
    return true;
  }

  if (hostProvider && Number.isFinite(confidence) && confidence >= 80) {
    return true;
  }

  const hasCorroborativeRange = evidenceDetails.some((entry) => {
    const record = toRecord(entry);
    const type = toStringValue(record.type);
    const role = toStringValue(record.role);
    return type === "cidr" && (role === "waf-edge" || role === "edge-host");
  });

  return Boolean(hostProvider) && hasCorroborativeRange;
}

function isModuleMarkedFailed(record: unknown): boolean {
  const moduleRecord = toRecord(toRecord(record)._module);
  return toStringValue(moduleRecord.status) === "failed";
}

export function hasWafProtection(data: ComprehensiveScanData): boolean {
  if (!data.security) return false;

  if (data.security.wafDetected === true) {
    return true;
  }

  const securityRecord = toRecord(data.security);
  const wafRecord = toRecord(securityRecord.waf);
  if (wafRecord.detected === true) {
    return true;
  }

  if (hasStrongManagedEdgeSignal(wafRecord)) {
    return true;
  }

  if (hasKnownWafProviderName(toStringValue(wafRecord.provider))) {
    return true;
  }

  const breakdownWafProvider = toStringValue(
    toRecord(toRecord(securityRecord.breakdown).waf).provider,
  );
  if (hasKnownWafProviderName(breakdownWafProvider)) {
    return true;
  }

  const serverHeader = toStringValue(securityRecord.serverHeader);
  if (hasKnownWafProviderName(serverHeader)) {
    return true;
  }

  const providerRecord = toRecord(data.provider);
  const providerName = toStringValue(providerRecord.provider);
  if (hasKnownWafProviderName(providerName)) {
    return true;
  }

  const providerCategory = toStringValue(
    providerRecord.category,
  )?.toLowerCase();
  if (providerCategory?.includes("cdn")) {
    return true;
  }

  return false;
}

/**
 * Helper: Detect critical issues
 */
function detectCriticalIssues(data: ComprehensiveScanData): CriticalIssue[] {
  const issues: CriticalIssue[] = [];
  const emailSignals = getEmailSignalState(data.email);

  // SSL issues
  if (data.ssl && !data.ssl.valid) {
    issues.push({
      id: "ssl-invalid",
      severity: "critical",
      category: "security",
      title: "Invalid SSL Certificate",
      description:
        "Your SSL certificate is invalid or expired. This is a critical security issue.",
      impact: "high",
    });
  }

  // Missing DMARC
  if (
    data.email &&
    !emailSignals.isWebOnlyPosture &&
    !emailSignals.dmarcConfigured
  ) {
    issues.push({
      id: "email-no-dmarc",
      severity: "high",
      category: "email",
      title: "Missing DMARC Record",
      description: "Your domain does not have a DMARC record configured.",
      impact: "medium",
    });
  }

  // No WAF
  if (
    data.security &&
    !isModuleMarkedFailed(data.security) &&
    !hasWafProtection(data)
  ) {
    issues.push({
      id: "security-no-waf",
      severity: "medium",
      category: "security",
      title: "No Web Application Firewall",
      description:
        "No WAF detected. Consider adding protection like Cloudflare or Sucuri.",
      impact: "medium",
    });
  }

  // Outdated PHP (if WordPress)
  if (data.technology?.wordpressDetected && data.technology?.phpVersion) {
    const phpVersion = parseFloat(data.technology.phpVersion);
    if (phpVersion < 7.4) {
      issues.push({
        id: "tech-outdated-php",
        severity: "critical",
        category: "technology",
        title: "Critically Outdated PHP Version",
        description: `PHP ${data.technology.phpVersion} is end-of-life and has known security vulnerabilities.`,
        impact: "high",
      });
    } else if (phpVersion < 8.0) {
      issues.push({
        id: "tech-old-php",
        severity: "high",
        category: "technology",
        title: "Outdated PHP Version",
        description: `PHP ${data.technology.phpVersion} is outdated. Consider upgrading to PHP 8.3.`,
        impact: "medium",
      });
    }
  }

  // Low performance
  if (
    data.performance?.mobile?.score < 50 ||
    data.performance?.desktop?.score < 50
  ) {
    issues.push({
      id: "perf-low-score",
      severity: "medium",
      category: "performance",
      title: "Poor Performance Score",
      description:
        "Your site has a low performance score. This affects user experience and SEO.",
      impact: "medium",
    });
  }

  return issues;
}

/**
 * Helper: Generate recommendations
 */
function generateRecommendations(
  data: ComprehensiveScanData,
  issues: CriticalIssue[],
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  // Generate recommendations based on issues
  issues.forEach((issue, index) => {
    const recommendation: RecommendationItem = {
      id: `rec-${index + 1}`,
      priority: issue.severity,
      category: issue.category,
      title: `Fix: ${issue.title}`,
      description: issue.description,
      impact: issue.impact === "high" ? 10 : issue.impact === "medium" ? 5 : 2,
      effort: "medium",
      cost: "free",
    };

    // Add specific implementation guidance
    if (issue.id === "email-no-dmarc") {
      recommendation.implementation =
        "Add a TXT record for _dmarc.yourdomain.com with value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com";
      recommendation.resources = ["https://dmarc.org/overview/"];
      recommendation.effort = "low";
    } else if (issue.id === "security-no-waf") {
      recommendation.implementation =
        "Sign up for Cloudflare (free plan) or install Wordfence (WordPress plugin).";
      recommendation.resources = [
        "https://www.cloudflare.com/",
        "https://www.wordfence.com/",
      ];
      recommendation.effort = "medium";
    } else if (
      issue.id === "tech-outdated-php" ||
      issue.id === "tech-old-php"
    ) {
      recommendation.implementation =
        "Contact your hosting provider to upgrade PHP version. Most hosts offer one-click PHP upgrades.";
      recommendation.resources = ["https://www.php.net/supported-versions.php"];
      recommendation.effort = "low";
    }

    recommendations.push(recommendation);
  });

  // Add proactive recommendations
  if (
    data.security?.securityScore < 80 &&
    !isModuleMarkedFailed(data.security)
  ) {
    recommendations.push({
      id: "rec-improve-security",
      priority: "medium",
      category: "security",
      title: "Improve Security Score",
      description:
        "Your security score could be improved by adding missing security headers.",
      impact: 5,
      effort: "low",
      cost: "free",
      implementation:
        "Add security headers like Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security.",
      resources: ["https://securityheaders.com/"],
    });
  }

  return recommendations;
}

function buildDnsModuleFallback(
  domain: string,
  telemetry: ScanModuleTelemetry,
): JsonMap {
  return {
    domain,
    records: {
      A: [],
      AAAA: [],
      MX: [],
      TXT: [],
      NS: [],
      CNAME: [],
    },
    subdomains: [],
    subdomainCount: 0,
    errors: {
      module:
        telemetry.errorMessage || "DNS module unavailable for this scan window",
    },
    _module: telemetry,
  };
}

function buildSecurityModuleFallback(
  telemetry: ScanModuleTelemetry,
): SecuritySummary {
  return {
    score: 0,
    grade: "F",
    securityScore: 0,
    breakdown: {
      headers: { score: 0, maxScore: 240, percentage: 0 },
      ssl: { score: 0, maxScore: 100, percentage: 0 },
      cookies: { score: 0, maxScore: 50, percentage: 0 },
      waf: { bonus: 0, provider: null },
    },
    criticalIssues: [],
    recommendations: [],
    waf: {
      detected: false,
      provider: null,
      confidence: 0,
      evidence: [],
    },
    _module: telemetry,
    error:
      telemetry.errorMessage ||
      "Security module unavailable for this scan window",
  };
}

/**
 * Helper: Calculate data completeness
 */
function calculateDataCompleteness(
  moduleTelemetry: Record<string, ScanModuleTelemetry>,
): number {
  const telemetryEntries = Object.values(moduleTelemetry);
  if (telemetryEntries.length === 0) return 0;

  const completed = telemetryEntries.filter(
    (entry) => entry.status === "success",
  ).length;
  return Math.round((completed / telemetryEntries.length) * 100);
}

export async function runComprehensiveIntelligenceScan(
  domain: string,
): Promise<ComprehensiveIntelligenceResponse> {
  console.log(`[Comprehensive Intelligence] Running fresh scan for ${domain}`);
  console.log(`[Comprehensive Intelligence] Starting parallel API calls...`);
  const apiStart = Date.now();

  const [
    technologyScan,
    performanceScan,
    dnsScan,
    emailScan,
    sslScan,
    securityScan,
    geolocationScan,
  ] = await Promise.all([
    callScanHandler(technologyHandler, { domain }, "technology"),
    callScanHandler(performanceHandler, { domain }, "performance"),
    callScanHandler(dnsHandler, { domain }, "dns"),
    callScanHandler(emailHandler, { domain }, "email"),
    callScanHandler(sslHandler, { domain }, "ssl"),
    callScanHandler(securityHandler, { domain }, "security"),
    callScanHandler(geolocationHandler, { domain }, "geolocation"),
  ]);

  const technologyRecord = toRecord(technologyScan.data);
  const dnsRecord =
    dnsScan.data !== null
      ? toRecord(dnsScan.data)
      : buildDnsModuleFallback(domain, dnsScan.telemetry);
  const securityRecord =
    securityScan.data !== null
      ? toRecord(securityScan.data)
      : buildSecurityModuleFallback(securityScan.telemetry);
  const geolocationRecord = toRecord(geolocationScan.data);
  const serverRecord = toRecord(technologyRecord.server);
  const dnsRecords = toRecord(dnsRecord.records);

  const providerScan = await callScanHandler(
    providerHandler,
    {
      domain,
      nameservers: Array.isArray(dnsRecords.NS)
        ? dnsRecords.NS.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      isp: toStringValue(geolocationRecord.isp),
      organization: toStringValue(geolocationRecord.organization),
      isWebsiteBuilder: toBoolean(serverRecord.isWebsiteBuilder),
      builderType: toStringValue(serverRecord.builderType),
      ipAddress:
        toStringValue(geolocationRecord.ipAddress) ||
        toStringValue(geolocationRecord.ip) ||
        undefined,
    },
    "provider",
  );
  const providerRecord = toRecord(providerScan.data);
  const moduleTelemetry: Record<string, ScanModuleTelemetry> = {
    technology: technologyScan.telemetry,
    performance: performanceScan.telemetry,
    dns: dnsScan.telemetry,
    email: emailScan.telemetry,
    ssl: sslScan.telemetry,
    security: securityScan.telemetry,
    geolocation: geolocationScan.telemetry,
    provider: providerScan.telemetry,
  };

  console.log(
    `[Comprehensive Intelligence] All API calls completed in ${Date.now() - apiStart}ms`,
  );

  // Call intelligence engines
  // Note: These are imported directly, not via HTTP
  const attribution = null; // Fusion engine integration pending
  const securityScore = null; // Security scoring integration pending
  const whoisHistory: unknown[] = []; // WHOIS history integration pending

  // Combine all data
  const allData: ComprehensiveScanData = {
    technology: (technologyRecord as TechnologySummary | null) ?? null,
    performance: (performanceScan.data as PerformanceSummary | null) ?? null,
    dns: (dnsRecord as JsonMap | null) ?? null,
    email: (emailScan.data as EmailSummary | null) ?? null,
    ssl: (sslScan.data as SslSummary | null) ?? null,
    security: (securityRecord as SecuritySummary | null) ?? null,
    geolocation: (geolocationRecord as JsonMap | null) ?? null,
    provider: (providerRecord as ProviderSummary | null) ?? null,
    attribution,
    securityScore,
    whoisHistory,
  };

  const { score: overallScore, grade: overallGrade } =
    calculateOverallScore(allData);
  const criticalIssues = detectCriticalIssues(allData);
  const recommendations = generateRecommendations(allData, criticalIssues);
  const dataCompleteness = calculateDataCompleteness(moduleTelemetry);
  const confidence = allData.provider?.confidence ?? 75;

  const result: ComprehensiveIntelligenceResponse = {
    success: true,
    domain,
    scannedAt: new Date().toISOString(),

    // Main tool data
    technology: allData.technology,
    performance: allData.performance,
    dns: allData.dns,
    email: allData.email,
    ssl: allData.ssl,
    security: allData.security,
    geolocation: allData.geolocation,
    provider: allData.provider,

    // Intelligence data
    attribution,
    securityScore,
    whoisHistory,

    // Computed insights
    overallScore,
    overallGrade,
    criticalIssues,
    recommendations,

    // Metadata
    confidence,
    dataCompleteness,
    moduleTelemetry,
  };

  console.log(`[Comprehensive Intelligence] Scan complete for ${domain}:`, {
    overallScore,
    overallGrade,
    criticalIssues: criticalIssues.length,
    recommendations: recommendations.length,
    dataCompleteness,
    moduleTelemetry,
  });

  return result;
}

/**
 * Main handler
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain, forceFresh = false } =
      req.body as ComprehensiveIntelligenceRequest;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    console.log(`[Comprehensive Intelligence] Starting scan for: ${domain}`);
    const scanStart = Date.now();

    const result = forceFresh
      ? await runComprehensiveIntelligenceScan(domain)
      : await getOrSet<ComprehensiveIntelligenceResponse>(
          "intelligence",
          domain,
          () => runComprehensiveIntelligenceScan(domain),
          COMPREHENSIVE_CACHE_SUFFIX,
          900,
        );

    const scanDuration = Date.now() - scanStart;
    console.log(
      `[Comprehensive Intelligence] Total scan time: ${scanDuration}ms`,
    );

    res.json({
      ...result,
      _meta: {
        scanDuration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Comprehensive Intelligence] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform comprehensive intelligence scan",
      message: "An internal error occurred",
    });
  }
}
