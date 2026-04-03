/**
 * URLScan Integration Module
 *
 * Provides comprehensive security and performance scanning via URLScan.io:
 * - Security threat detection
 * - Malware scanning
 * - Phishing detection
 * - Performance metrics (load time, page size)
 * - Screenshot capture
 * - Resource analysis
 * - Certificate validation
 * - HTTP security headers
 *
 * Part of Phase 1: Core Intelligence Engine
 */

import { db } from "../../db/client.js";
import { urlscanResults } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { calculateConfidence, createSignal } from "../confidence-scorer.js";
import { checkRateLimit, incrementRateLimit } from "../rate-limiter.js";
import { getSecret } from "#secrets";

export interface URLScanResult {
  uuid: string;
  domain: string;
  url: string;
  scanTime: Date;
  verdict: {
    overall: "malicious" | "suspicious" | "clean";
    score: number;
    malicious: boolean;
    categories: string[];
  };
  security: {
    https: boolean;
    validCertificate: boolean;
    certificateIssuer: string | null;
    securityHeaders: {
      strictTransportSecurity: boolean;
      contentSecurityPolicy: boolean;
      xFrameOptions: boolean;
      xContentTypeOptions: boolean;
    };
    threats: {
      malware: boolean;
      phishing: boolean;
      spam: boolean;
      suspicious: boolean;
    };
  };
  performance: {
    loadTime: number;
    pageSize: number;
    requests: number;
    domains: number;
    ips: string[];
  };
  technologies: string[];
  screenshot: string | null;
  confidence: number;
}

interface URLScanCertificate {
  validTo?: string;
  validFrom?: string;
  issuer?: string;
  protocol?: string;
}

interface URLScanResponseEntry {
  response?: {
    headers?: Record<string, unknown>;
  };
}

interface URLScanWappaTechnology {
  app?: string;
}

interface URLScanRawResult {
  task?: {
    uuid?: string;
    time?: string;
    screenshotURL?: string;
    reportURL?: string;
  };
  page?: {
    url?: string;
    loadTime?: number;
    country?: string;
    server?: string;
  };
  stats?: {
    dataLength?: number;
    totalRequests?: number;
    domains?: number;
  };
  verdicts?: {
    overall?: {
      malicious?: boolean;
      suspicious?: boolean;
      score?: number;
      categories?: string[];
    };
  };
  lists?: {
    certificates?: URLScanCertificate[];
    ips?: string[];
    asns?: Array<number | string>;
    tags?: string[];
  };
  data?: {
    responses?: URLScanResponseEntry[];
  };
  meta?: {
    processors?: {
      wappa?: {
        data?: URLScanWappaTechnology[];
      };
    };
  };
}

function hasSecurityHeader(
  responses: URLScanResponseEntry[] | undefined,
  headerName: string,
): boolean {
  return Boolean(
    responses?.find((responseEntry) =>
      Boolean(responseEntry.response?.headers?.[headerName]),
    ),
  );
}

function getUrlscanApiKey(): string {
  const secretValue = getSecret("URLSCAN_API_KEY");
  if (typeof secretValue === "string" && secretValue.trim().length > 0) {
    return secretValue.trim();
  }
  throw new Error(
    "URLScan API key not configured. Please add URLSCAN_API_KEY secret.",
  );
}

/**
 * Submit URL to URLScan.io for scanning
 */
async function submitURLScan(url: string): Promise<string> {
  const apiKey = getUrlscanApiKey();

  try {
    const response = await fetch("https://urlscan.io/api/v1/scan/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": apiKey,
      },
      body: JSON.stringify({
        url,
        visibility: "public",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `URLScan submission failed: ${response.status} - ${error}`,
      );
    }

    const data = await response.json();
    return data.uuid;
  } catch (error) {
    console.error("URLScan submission error:", error);
    throw error;
  }
}

/**
 * Retrieve URLScan results
 */
async function retrieveURLScanResults(
  uuid: string,
  maxRetries: number = 10,
): Promise<URLScanRawResult> {
  const apiKey = getUrlscanApiKey();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(
        `https://urlscan.io/api/v1/result/${uuid}/`,
        {
          headers: {
            "API-Key": apiKey,
          },
        },
      );

      if (response.status === 404) {
        // Scan still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`URLScan retrieval failed: ${response.status}`);
      }

      return (await response.json()) as URLScanRawResult;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error("URLScan results not available after maximum retries");
}

/**
 * Parse URLScan results into structured format
 */
function parseURLScanResults(
  data: URLScanRawResult,
  domain: string,
): URLScanResult {
  const page = data.page || {};
  const stats = data.stats || {};
  const verdicts = data.verdicts || {};
  const lists = data.lists || {};

  // Determine overall verdict
  let overallVerdict: "malicious" | "suspicious" | "clean" = "clean";
  let verdictScore = 100;

  if (verdicts.overall?.malicious) {
    overallVerdict = "malicious";
    verdictScore = 0;
  } else if (
    verdicts.overall?.suspicious ||
    (verdicts.overall?.score || 0) < 50
  ) {
    overallVerdict = "suspicious";
    verdictScore = 50;
  }

  // Extract security information
  const responses = data.data?.responses;
  const security = {
    https: page.url?.startsWith("https://") || false,
    validCertificate: !lists.certificates?.some(
      (certificate) =>
        certificate.validTo && new Date(certificate.validTo) < new Date(),
    ),
    certificateIssuer: lists.certificates?.[0]?.issuer || null,
    securityHeaders: {
      strictTransportSecurity: hasSecurityHeader(
        responses,
        "strict-transport-security",
      ),
      contentSecurityPolicy: hasSecurityHeader(
        responses,
        "content-security-policy",
      ),
      xFrameOptions: hasSecurityHeader(responses, "x-frame-options"),
      xContentTypeOptions: hasSecurityHeader(
        responses,
        "x-content-type-options",
      ),
    },
    threats: {
      malware: verdicts.overall?.malicious || false,
      phishing: verdicts.overall?.categories?.includes("phishing") || false,
      spam: verdicts.overall?.categories?.includes("spam") || false,
      suspicious: verdicts.overall?.suspicious || false,
    },
  };

  // Extract performance metrics
  const performance = {
    loadTime: page.loadTime || 0,
    pageSize: stats.dataLength || 0,
    requests: stats.totalRequests || 0,
    domains: stats.domains || 0,
    ips: lists.ips || [],
  };

  // Extract technologies
  const technologies =
    data.meta?.processors?.wappa?.data
      ?.map((technology) => technology.app)
      .filter(
        (app): app is string => typeof app === "string" && app.length > 0,
      ) || [];

  // Calculate confidence score
  const confidenceResult = calculateConfidence([
    createSignal("http", "scan_complete", 100, "urlscan"),
    createSignal("http", security.https ? "https" : "http", 80, "urlscan"),
    createSignal(
      "http",
      performance.loadTime > 0
        ? "performance_available"
        : "performance_missing",
      70,
      "urlscan",
    ),
    createSignal(
      "tech",
      technologies.length > 0 ? "tech_detected" : "tech_missing",
      60,
      "urlscan",
    ),
    createSignal(
      "cert",
      security.validCertificate ? "cert_valid" : "cert_invalid",
      70,
      "urlscan",
    ),
  ]);
  const confidence = confidenceResult.score;

  return {
    uuid: data.task?.uuid || "",
    domain,
    url: page.url || "",
    scanTime: new Date(data.task?.time || Date.now()),
    verdict: {
      overall: overallVerdict,
      score: verdictScore,
      malicious: verdicts.overall?.malicious || false,
      categories: verdicts.overall?.categories || [],
    },
    security,
    performance,
    technologies,
    screenshot: data.task?.screenshotURL || null,
    confidence,
  };
}

/**
 * Perform URLScan analysis on a domain
 */
export async function performURLScan(
  domain: string,
  _userId?: number,
): Promise<URLScanResult> {
  // Check rate limit
  const rateCheck = await checkRateLimit("urlscan");
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)} seconds`,
    );
  }

  // Prepare URL
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  // Submit scan
  const uuid = await submitURLScan(url);
  await incrementRateLimit("urlscan");

  // Wait for results (with retries)
  const rawResults = await retrieveURLScanResults(uuid);

  // Parse results
  const results = parseURLScanResults(rawResults, domain);
  const certificate = rawResults?.lists?.certificates?.[0];
  const firstIp = results.performance.ips[0];
  const asnValue = rawResults?.lists?.asns?.[0];

  // Store in database
  await db.insert(urlscanResults).values({
    domain,
    scanId: results.uuid,
    scanUrl: rawResults?.task?.reportURL || null,
    verdict: results.verdict.overall,
    score: results.verdict.score,
    malwareDetected: results.security.threats.malware,
    phishingDetected: results.security.threats.phishing,
    suspiciousActivity: results.security.threats.suspicious,
    categories: results.verdict.categories,
    tags: rawResults?.lists?.tags || [],
    ipAddress: firstIp || null,
    asn: asnValue ? String(asnValue) : null,
    country: rawResults?.page?.country || null,
    server: rawResults?.page?.server || null,
    tlsVersion: certificate?.protocol || null,
    tlsIssuer: certificate?.issuer || null,
    tlsValidFrom: certificate?.validFrom
      ? new Date(certificate.validFrom)
      : null,
    tlsValidTo: certificate?.validTo ? new Date(certificate.validTo) : null,
    totalRequests: results.performance.requests,
    totalDomains: results.performance.domains,
    totalIps: results.performance.ips.length,
    screenshotUrl: results.screenshot,
    rawData: rawResults,
    scannedAt: results.scanTime,
  });

  return results;
}

/**
 * Get URLScan history for a domain
 */
export async function getURLScanHistory(domain: string, limit: number = 10) {
  const history = await db
    .select()
    .from(urlscanResults)
    .where(eq(urlscanResults.domain, domain))
    .orderBy(desc(urlscanResults.scannedAt))
    .limit(limit);

  return history;
}

/**
 * Analyze URLScan results for insights
 */
export function analyzeURLScanResults(results: URLScanResult): {
  securityScore: number;
  performanceScore: number;
  issues: string[];
  recommendations: string[];
  strengths: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const strengths: string[] = [];

  // Security analysis
  let securityScore = 100;

  if (results.verdict.malicious) {
    issues.push("Site flagged as malicious");
    securityScore -= 50;
  }

  if (results.verdict.overall === "suspicious") {
    issues.push("Site has suspicious characteristics");
    securityScore -= 30;
  }

  if (!results.security.https) {
    issues.push("Site not using HTTPS");
    recommendations.push("Enable HTTPS with a valid SSL/TLS certificate");
    securityScore -= 20;
  } else {
    strengths.push("Site uses HTTPS encryption");
  }

  if (!results.security.validCertificate) {
    issues.push("Invalid or expired SSL certificate");
    recommendations.push("Renew SSL certificate");
    securityScore -= 15;
  }

  if (!results.security.securityHeaders.strictTransportSecurity) {
    recommendations.push("Add Strict-Transport-Security header");
    securityScore -= 5;
  }

  if (!results.security.securityHeaders.contentSecurityPolicy) {
    recommendations.push("Add Content-Security-Policy header");
    securityScore -= 5;
  }

  if (!results.security.securityHeaders.xFrameOptions) {
    recommendations.push("Add X-Frame-Options header to prevent clickjacking");
    securityScore -= 5;
  }

  if (results.security.threats.phishing) {
    issues.push("Site flagged for phishing");
    securityScore -= 40;
  }

  if (results.security.threats.malware) {
    issues.push("Malware detected");
    securityScore -= 40;
  }

  // Performance analysis
  let performanceScore = 100;

  if (results.performance.loadTime > 5000) {
    issues.push(
      `Slow load time: ${(results.performance.loadTime / 1000).toFixed(2)}s`,
    );
    recommendations.push("Optimize page load time (target: under 3 seconds)");
    performanceScore -= 30;
  } else if (results.performance.loadTime > 3000) {
    recommendations.push("Consider optimizing load time further");
    performanceScore -= 15;
  } else {
    strengths.push("Fast page load time");
  }

  if (results.performance.pageSize > 5000000) {
    issues.push(
      `Large page size: ${(results.performance.pageSize / 1000000).toFixed(2)}MB`,
    );
    recommendations.push("Optimize images and assets to reduce page size");
    performanceScore -= 20;
  }

  if (results.performance.requests > 100) {
    recommendations.push("Reduce number of HTTP requests");
    performanceScore -= 10;
  }

  return {
    securityScore: Math.max(0, securityScore),
    performanceScore: Math.max(0, performanceScore),
    issues,
    recommendations,
    strengths,
  };
}
