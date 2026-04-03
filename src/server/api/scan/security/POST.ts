import type { Request, Response } from "express";
import * as https from "https";
import * as http from "http";
import { z } from "zod";
import { validateBody } from "../../../middleware/security.js";
import {
  checkUrlSafety,
  calculateSafeBrowsingScore,
} from "../../../lib/safe-browsing.js";
import {
  fetchPeerCertificate,
  getCertificateValidity,
} from "../../../lib/tls-certificate.js";
import { assertPublicDomain } from "../../../lib/ssrf-protection.js";
import {
  collectIpCandidates,
  detectFirewallProtection,
  type EnhancedWafDetectionResult,
} from "../../../lib/firewall-intelligence.js";
// import * as tls from "tls";

const localDomainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(255, "Domain must be less than 255 characters")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format",
    ),
});

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "An internal error occurred";
}

function classifySecurityErrorType(message: string): string {
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
    normalized.includes("temporarily unavailable")
  ) {
    return "upstream";
  }
  if (
    normalized.includes("econnreset") ||
    normalized.includes("socket") ||
    normalized.includes("connect")
  ) {
    return "network";
  }
  return "runtime";
}

function buildSafeBrowsingFailure() {
  return {
    safe: true,
    threats: [],
    checked: false,
    error: "Safe Browsing unavailable",
  };
}

function buildSecurityFailureResult(
  domain: string,
  error: unknown,
): SecurityScanResult & {
  _module: {
    name: string;
    status: string;
    errorType: string;
    message: string;
    timestamp: string;
    domain: string;
  };
} {
  const message = toErrorMessage(error);
  return {
    score: 0,
    grade: "F",
    breakdown: {
      headers: { score: 0, maxScore: 240, percentage: 0 },
      ssl: { score: 0, maxScore: 100, percentage: 0 },
      cookies: { score: 0, maxScore: 50, percentage: 0 },
      waf: { bonus: 0, provider: null },
    },
    securityHeaders: {},
    deprecatedHeaders: {},
    cookies: [],
    ssl: {
      valid: false,
      daysUntilExpiry: 0,
      protocol: "None",
      issuer: "None",
    },
    waf: {
      detected: false,
      provider: null,
      confidence: 0,
      evidence: [],
      evidenceDetails: [],
      corroborated: false,
      hostProvider: null,
      sourceVersion: null,
      ipCandidates: [],
    },
    ddos: { protected: false, provider: null, method: "none" },
    recommendations: [],
    criticalIssues: ["Security scan unavailable"],
    serverHeader: "Unknown",
    error: message,
    _module: {
      name: "security",
      status: "failed",
      errorType: classifySecurityErrorType(message),
      message,
      timestamp: new Date().toISOString(),
      domain,
    },
  };
}

/**
 * Security Scanner API
 * Comprehensive security analysis including headers, SSL/TLS, cookies, and WAF
 */
async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;
    // Validation handled by middleware

    // SSRF protection: ensure domain doesn't resolve to internal IP
    try {
      await assertPublicDomain(domain);
    } catch {
      return res.status(400).json({
        error: "Domain resolves to a private/internal IP address",
      });
    }

    console.log(`[Security Scan] Starting comprehensive scan for: ${domain}`);

    // Run security checks in parallel and degrade gracefully if dependencies fail.
    const [securityResult, safeBrowsingResult] = await Promise.all([
      checkSecurity(domain).catch((securityError) => {
        const degraded = buildSecurityFailureResult(domain, securityError);
        console.error(
          "[Security Scan] checkSecurity failed, returning degraded payload:",
          degraded._module,
        );
        return degraded;
      }),
      checkUrlSafety(domain).catch((safeBrowsingError) => {
        console.error(
          "[Security Scan] Safe Browsing check failed:",
          toErrorMessage(safeBrowsingError),
        );
        return buildSafeBrowsingFailure();
      }),
    ]);

    // Calculate Safe Browsing score impact
    const safeBrowsingScore = calculateSafeBrowsingScore(safeBrowsingResult);

    // Integrate Safe Browsing into overall score
    const result = {
      ...securityResult,
      safeBrowsing: {
        safe: safeBrowsingResult.safe,
        threats: safeBrowsingResult.threats,
        checked: safeBrowsingResult.checked,
        score: safeBrowsingScore.score,
        severity: safeBrowsingScore.severity,
      },
    };

    // Adjust overall score based on Safe Browsing results
    if (safeBrowsingResult.checked) {
      if (!safeBrowsingResult.safe) {
        // Critical threat detected - override score
        result.score = Math.min(result.score, 20);
        result.grade = "F";
        result.criticalIssues = [
          ...result.criticalIssues,
          "🚨 CRITICAL: Site flagged by Google Safe Browsing",
          ...safeBrowsingResult.threats.map((t) => `⚠️ ${t.description}`),
        ];
      } else {
        // No threats - add positive note
        result.recommendations = [
          "✅ No security threats detected by Google Safe Browsing",
          ...result.recommendations,
        ];
      }
    }

    console.log(`[Security Scan] Complete for: ${domain}`);
    return res.json(result);
  } catch (error) {
    const domain =
      typeof req.body?.domain === "string" ? req.body.domain : "unknown";
    const degraded = buildSecurityFailureResult(domain, error);
    console.error("[Security Scan] Fatal error (degraded response):", {
      module: degraded._module,
      error,
    });
    return res.json({
      ...degraded,
      safeBrowsing: buildSafeBrowsingFailure(),
    });
  }
}

interface HeaderValidation {
  present: boolean;
  value: string | null;
  score: number;
  maxScore: number;
  issues: string[];
  name: string;
}

interface SSLScore {
  score: number;
  maxScore: number;
  grade: string;
  issues: string[];
  details: {
    valid: boolean;
    daysUntilExpiry: number;
    protocol: string;
    issuer: string;
  };
}

interface CookieSecurityScore {
  score: number;
  maxScore: number;
  issues: string[];
  cookies: Array<{
    name: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string | null;
  }>;
}

type WafDetectionResult = EnhancedWafDetectionResult;

interface DdosDetectionResult {
  protected: boolean;
  provider: string | null;
  method: "waf" | "dedicated" | "none";
}

interface SecurityScanResult {
  score: number;
  grade: string;
  breakdown: {
    headers: { score: number; maxScore: number; percentage: number };
    ssl: { score: number; maxScore: number; percentage: number };
    cookies: { score: number; maxScore: number; percentage: number };
    waf: { bonus: number; provider: string | null };
  };
  securityHeaders: Record<string, HeaderValidation>;
  deprecatedHeaders: Record<string, string>;
  cookies: CookieSecurityScore["cookies"];
  ssl: SSLScore["details"];
  waf: WafDetectionResult;
  ddos: DdosDetectionResult;
  recommendations: string[];
  criticalIssues: string[];
  serverHeader: string | string[];
  error?: string;
}

function validateHSTS(value: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;

  const maxAgeMatch = value.match(/max-age=(\d+)/);
  if (!maxAgeMatch) {
    issues.push("Missing max-age directive");
    return { score: 0, issues };
  }

  const maxAge = parseInt(maxAgeMatch[1]);

  if (maxAge >= 31536000) {
    score = 30;
  } else if (maxAge >= 15768000) {
    score = 25;
    issues.push("HSTS max-age should be at least 1 year (31536000)");
  } else if (maxAge >= 86400) {
    score = 15;
    issues.push("HSTS max-age is too short (minimum 6 months recommended)");
  } else {
    score = 5;
    issues.push("HSTS max-age is critically short");
  }

  if (value.includes("includeSubDomains")) {
    score += 5;
  } else {
    issues.push("Consider adding includeSubDomains directive");
  }

  if (value.includes("preload")) {
    score += 5;
  }

  return { score, issues };
}

function validateCSP(value: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;

  if (value.includes("'unsafe-inline'")) {
    issues.push("CSP allows unsafe-inline scripts (security risk)");
    score -= 10;
  }

  if (value.includes("'unsafe-eval'")) {
    issues.push("CSP allows unsafe-eval (security risk)");
    score -= 10;
  }

  if (value.includes("default-src *") || value.includes("script-src *")) {
    issues.push("CSP uses wildcard (*) which defeats the purpose");
    return { score: 0, issues };
  }

  const goodDirectives = [
    "default-src",
    "script-src",
    "style-src",
    "img-src",
    "connect-src",
    "font-src",
    "object-src",
    "frame-ancestors",
  ];

  const presentDirectives = goodDirectives.filter((d) => value.includes(d));
  score = Math.min(30, presentDirectives.length * 4);

  if (!value.includes("frame-ancestors")) {
    issues.push("Consider adding frame-ancestors directive");
  }

  return { score, issues };
}

function validateReferrerPolicy(value: string): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;

  const goodPolicies = [
    "no-referrer",
    "no-referrer-when-downgrade",
    "strict-origin",
    "strict-origin-when-cross-origin",
  ];

  if (goodPolicies.some((p) => value.includes(p))) {
    score = 15;
  } else if (value.includes("unsafe-url")) {
    score = 0;
    issues.push("Referrer-Policy set to unsafe-url (exposes full URL)");
  } else {
    score = 5;
    issues.push("Consider using a stricter referrer policy");
  }

  return { score, issues };
}

function normalizeHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value.join("; ");
  return value ?? null;
}

function checkSecurity(domain: string): Promise<SecurityScanResult> {
  return new Promise((resolve) => {
    const options = {
      method: "HEAD",
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HostingInfoBot/1.0)",
      },
    };

    const req = https.request(`https://${domain}`, options, (res) => {
      const headers = res.headers;

      // Security Headers Check with Validation
      const securityHeaders: Record<string, HeaderValidation> = {
        "strict-transport-security": {
          present:
            normalizeHeaderValue(headers["strict-transport-security"]) !== null,
          value: normalizeHeaderValue(headers["strict-transport-security"]),
          score: 0,
          maxScore: 40,
          issues: [],
          name: "HSTS (HTTP Strict Transport Security)",
        },
        "content-security-policy": {
          present:
            normalizeHeaderValue(headers["content-security-policy"]) !== null,
          value: normalizeHeaderValue(headers["content-security-policy"]),
          score: 0,
          maxScore: 40,
          issues: [],
          name: "Content Security Policy (CSP)",
        },
        "x-frame-options": {
          present: normalizeHeaderValue(headers["x-frame-options"]) !== null,
          value: normalizeHeaderValue(headers["x-frame-options"]),
          score: normalizeHeaderValue(headers["x-frame-options"]) ? 25 : 0,
          maxScore: 25,
          issues: [],
          name: "X-Frame-Options",
        },
        "x-content-type-options": {
          present:
            normalizeHeaderValue(headers["x-content-type-options"]) !== null,
          value: normalizeHeaderValue(headers["x-content-type-options"]),
          score: normalizeHeaderValue(headers["x-content-type-options"])
            ? 25
            : 0,
          maxScore: 25,
          issues: [],
          name: "X-Content-Type-Options",
        },
        "cross-origin-opener-policy": {
          present:
            normalizeHeaderValue(headers["cross-origin-opener-policy"]) !==
            null,
          value: normalizeHeaderValue(headers["cross-origin-opener-policy"]),
          score: normalizeHeaderValue(headers["cross-origin-opener-policy"])
            ? 25
            : 0,
          maxScore: 25,
          issues: [],
          name: "Cross-Origin-Opener-Policy (COOP)",
        },
        "cross-origin-embedder-policy": {
          present:
            normalizeHeaderValue(headers["cross-origin-embedder-policy"]) !==
            null,
          value: normalizeHeaderValue(headers["cross-origin-embedder-policy"]),
          score: normalizeHeaderValue(headers["cross-origin-embedder-policy"])
            ? 25
            : 0,
          maxScore: 25,
          issues: [],
          name: "Cross-Origin-Embedder-Policy (COEP)",
        },
        "referrer-policy": {
          present: normalizeHeaderValue(headers["referrer-policy"]) !== null,
          value: normalizeHeaderValue(headers["referrer-policy"]),
          score: 0,
          maxScore: 15,
          issues: [],
          name: "Referrer Policy",
        },
        "permissions-policy": {
          present: normalizeHeaderValue(headers["permissions-policy"]) !== null,
          value: normalizeHeaderValue(headers["permissions-policy"]),
          score: normalizeHeaderValue(headers["permissions-policy"]) ? 15 : 0,
          maxScore: 15,
          issues: [],
          name: "Permissions Policy",
        },
        "cross-origin-resource-policy": {
          present:
            normalizeHeaderValue(headers["cross-origin-resource-policy"]) !==
            null,
          value: normalizeHeaderValue(headers["cross-origin-resource-policy"]),
          score: normalizeHeaderValue(headers["cross-origin-resource-policy"])
            ? 15
            : 0,
          maxScore: 15,
          issues: [],
          name: "Cross-Origin-Resource-Policy (CORP)",
        },
        "x-permitted-cross-domain-policies": {
          present:
            normalizeHeaderValue(
              headers["x-permitted-cross-domain-policies"],
            ) !== null,
          value: normalizeHeaderValue(
            headers["x-permitted-cross-domain-policies"],
          ),
          score: normalizeHeaderValue(
            headers["x-permitted-cross-domain-policies"],
          )
            ? 5
            : 0,
          maxScore: 5,
          issues: [],
          name: "X-Permitted-Cross-Domain-Policies",
        },
      };

      // Validate HSTS
      if (securityHeaders["strict-transport-security"].present) {
        const validation = validateHSTS(
          securityHeaders["strict-transport-security"].value!,
        );
        securityHeaders["strict-transport-security"].score = validation.score;
        securityHeaders["strict-transport-security"].issues = validation.issues;
      }

      // Validate CSP
      if (securityHeaders["content-security-policy"].present) {
        const validation = validateCSP(
          securityHeaders["content-security-policy"].value!,
        );
        securityHeaders["content-security-policy"].score = validation.score;
        securityHeaders["content-security-policy"].issues = validation.issues;
      }

      // Validate Referrer Policy
      if (securityHeaders["referrer-policy"].present) {
        const validation = validateReferrerPolicy(
          securityHeaders["referrer-policy"].value!,
        );
        securityHeaders["referrer-policy"].score = validation.score;
        securityHeaders["referrer-policy"].issues = validation.issues;
      }

      // Check for deprecated headers
      const deprecatedHeaders: Record<string, string> = {};
      if (headers["x-xss-protection"]) {
        deprecatedHeaders["x-xss-protection"] = headers[
          "x-xss-protection"
        ] as string;
      }
      if (headers["expect-ct"]) {
        deprecatedHeaders["expect-ct"] = headers["expect-ct"] as string;
      }

      // Calculate header score
      let headerScore = 0;
      let headerMaxScore = 0;
      Object.values(securityHeaders).forEach((header) => {
        headerScore += header.score;
        headerMaxScore += header.maxScore;
      });

      // Cookie Security Analysis
      const cookieScore = analyzeCookies(headers);

      // SSL/TLS Analysis
      const sslScore = analyzeSSL(domain);

      const wafDetectionPromise = collectIpCandidates(
        domain,
        res.socket?.remoteAddress,
      )
        .then((ipCandidates) =>
          detectFirewallProtection({
            headers,
            domain,
            ipCandidates,
          }),
        )
        .catch((error) => {
          console.warn("[Security Scan] Enhanced WAF detection failed:", error);
          return {
            detected: false,
            provider: null,
            confidence: 0,
            evidence: [],
            hostProvider: null,
            evidenceDetails: [],
            corroborated: false,
            sourceVersion: null,
            ipCandidates: [],
          } as WafDetectionResult;
        });

      Promise.all([sslScore, wafDetectionPromise]).then(
        ([ssl, wafDetection]) => {
          // Calculate comprehensive score
          const headerPercentage = (headerScore / headerMaxScore) * 100;
          const sslPercentage = ssl.score;
          const cookiePercentage =
            (cookieScore.score / cookieScore.maxScore) * 100;
          const wafBonus = calculateWAFBonus(wafDetection);

          // Weighted calculation
          let totalScore =
            headerPercentage * 0.5 +
            sslPercentage * 0.3 +
            cookiePercentage * 0.15;

          // Add WAF bonus
          totalScore += wafBonus * 0.05;

          const displayScore = Math.min(100, Math.round(totalScore));

          // Determine grade
          let grade = "F";
          if (totalScore >= 97) grade = "A+";
          else if (totalScore >= 93) grade = "A";
          else if (totalScore >= 90) grade = "A-";
          else if (totalScore >= 87) grade = "B+";
          else if (totalScore >= 83) grade = "B";
          else if (totalScore >= 80) grade = "B-";
          else if (totalScore >= 77) grade = "C+";
          else if (totalScore >= 73) grade = "C";
          else if (totalScore >= 70) grade = "C-";
          else if (totalScore >= 60) grade = "D";

          // Collect all issues
          const allIssues: string[] = [];
          Object.values(securityHeaders).forEach((header) => {
            if (!header.present && header.maxScore >= 25) {
              allIssues.push(`Add ${header.name} header for better security`);
            }
            allIssues.push(...header.issues);
          });
          allIssues.push(...ssl.issues);
          allIssues.push(...cookieScore.issues);

          if (!wafDetection.detected) {
            allIssues.push(
              "Consider adding a Web Application Firewall (WAF) for protection",
            );
          }

          // Separate critical issues
          const criticalIssues = allIssues.filter(
            (issue) =>
              issue.includes("Invalid") ||
              issue.includes("expired") ||
              issue.includes("Outdated TLS") ||
              issue.includes("wildcard") ||
              issue.includes("critically short"),
          );

          const recommendations = allIssues.filter(
            (issue) => !criticalIssues.includes(issue),
          );

          resolve({
            score: displayScore,
            grade,
            breakdown: {
              headers: {
                score: headerScore,
                maxScore: headerMaxScore,
                percentage: Math.round(headerPercentage),
              },
              ssl: {
                score: ssl.score,
                maxScore: ssl.maxScore,
                percentage: Math.round(ssl.score),
              },
              cookies: {
                score: cookieScore.score,
                maxScore: cookieScore.maxScore,
                percentage: Math.round(cookiePercentage),
              },
              waf: {
                bonus: wafBonus,
                provider: wafDetection.provider,
              },
            },
            securityHeaders,
            deprecatedHeaders,
            cookies: cookieScore.cookies,
            ssl: ssl.details,
            waf: wafDetection,
            ddos: detectDDoS(wafDetection),
            recommendations,
            criticalIssues,
            serverHeader: headers["server"] || "Not disclosed",
          });
        },
      );
    });

    req.on("error", () => {
      // Try HTTP fallback
      const httpReq = http.request(`http://${domain}`, options, (res) => {
        const headers = res.headers;
        collectIpCandidates(domain, res.socket?.remoteAddress)
          .then((ipCandidates) =>
            detectFirewallProtection({
              headers,
              domain,
              ipCandidates,
            }),
          )
          .catch((error) => {
            console.warn(
              "[Security Scan] HTTP fallback enhanced WAF detection failed:",
              error,
            );
            return {
              detected: false,
              provider: null,
              confidence: 0,
              evidence: [],
              hostProvider: null,
              evidenceDetails: [],
              corroborated: false,
              sourceVersion: null,
              ipCandidates: [],
            } as WafDetectionResult;
          })
          .then((wafDetection) => {
            resolve({
              score: 0,
              grade: "F",
              breakdown: {
                headers: { score: 0, maxScore: 240, percentage: 0 },
                ssl: { score: 0, maxScore: 100, percentage: 0 },
                cookies: { score: 0, maxScore: 50, percentage: 0 },
                waf: { bonus: 0, provider: null },
              },
              securityHeaders: {},
              deprecatedHeaders: {},
              cookies: [],
              ssl: {
                valid: false,
                daysUntilExpiry: 0,
                protocol: "None",
                issuer: "None",
              },
              waf: wafDetection,
              ddos: detectDDoS(wafDetection),
              recommendations: [],
              criticalIssues: [
                "No HTTPS detected - SSL certificate required",
                "Site is not secure - all data transmitted in plain text",
              ],
              serverHeader: headers["server"] || "Not disclosed",
              error: "Site not using HTTPS",
            });
          });
      });

      httpReq.on("error", () => {
        resolve({
          score: 0,
          grade: "F",
          breakdown: {
            headers: { score: 0, maxScore: 240, percentage: 0 },
            ssl: { score: 0, maxScore: 100, percentage: 0 },
            cookies: { score: 0, maxScore: 50, percentage: 0 },
            waf: { bonus: 0, provider: null },
          },
          securityHeaders: {},
          deprecatedHeaders: {},
          cookies: [],
          ssl: {
            valid: false,
            daysUntilExpiry: 0,
            protocol: "None",
            issuer: "None",
          },
          waf: { detected: false, provider: null, confidence: 0, evidence: [] },
          ddos: { protected: false, provider: null, method: "none" },
          recommendations: [],
          criticalIssues: ["Unable to connect to domain"],
          serverHeader: "Unknown",
          error: "Unable to connect",
        });
      });

      httpReq.end();
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        score: 0,
        grade: "F",
        breakdown: {
          headers: { score: 0, maxScore: 240, percentage: 0 },
          ssl: { score: 0, maxScore: 100, percentage: 0 },
          cookies: { score: 0, maxScore: 50, percentage: 0 },
          waf: { bonus: 0, provider: null },
        },
        securityHeaders: {},
        deprecatedHeaders: {},
        cookies: [],
        ssl: {
          valid: false,
          daysUntilExpiry: 0,
          protocol: "None",
          issuer: "None",
        },
        waf: { detected: false, provider: null, confidence: 0, evidence: [] },
        ddos: { protected: false, provider: null, method: "none" },
        recommendations: [],
        criticalIssues: ["Connection timeout"],
        serverHeader: "Unknown",
        error: "Timeout",
      });
    });

    req.end();
  });
}

function analyzeCookies(
  headers: http.IncomingHttpHeaders,
): CookieSecurityScore {
  const setCookieHeaders = Array.isArray(headers["set-cookie"])
    ? headers["set-cookie"]
    : headers["set-cookie"]
      ? [headers["set-cookie"]]
      : [];

  const cookies: Array<{
    name: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string | null;
  }> = [];
  let score = 0;
  const issues: string[] = [];

  if (setCookieHeaders.length === 0) {
    return { score: 50, maxScore: 50, issues: [], cookies: [] };
  }

  for (const cookie of setCookieHeaders) {
    const name = cookie.split("=")[0];
    const secure = cookie.toLowerCase().includes("secure");
    const httpOnly = cookie.toLowerCase().includes("httponly");
    const sameSiteMatch = cookie.match(/samesite=(strict|lax|none)/i);
    const sameSite = sameSiteMatch ? sameSiteMatch[1] : null;

    cookies.push({ name, secure, httpOnly, sameSite });

    let cookieScore = 0;
    if (secure) cookieScore += 5;
    else issues.push(`Cookie "${name}" missing Secure flag`);

    if (httpOnly) cookieScore += 5;
    else issues.push(`Cookie "${name}" missing HttpOnly flag`);

    if (sameSite === "Strict" || sameSite === "Lax") cookieScore += 5;
    else issues.push(`Cookie "${name}" missing or weak SameSite attribute`);

    score += cookieScore;
  }

  const maxPossible = setCookieHeaders.length * 15;
  score = Math.round((score / maxPossible) * 50);

  return { score, maxScore: 50, issues, cookies };
}

function analyzeSSL(domain: string): Promise<SSLScore> {
  return (async () => {
    try {
      const { cert, protocol } = await fetchPeerCertificate(domain, 10_000);
      const { validFrom, validTo } = getCertificateValidity(cert);
      const nowMs = Date.now();
      const validityKnown = Boolean(validFrom && validTo);
      const daysUntilExpiry = validTo
        ? Math.floor((validTo.getTime() - nowMs) / (1000 * 60 * 60 * 24))
        : 0;
      const issuer = cert.issuer?.O || "Unknown";

      let score = 0;
      const issues: string[] = [];

      // Valid certificate (40 points)
      if (!validityKnown || daysUntilExpiry > 0) {
        score += 40;
      } else {
        issues.push("SSL certificate has expired");
        return {
          score: 0,
          maxScore: 100,
          grade: "F",
          issues,
          details: { valid: false, daysUntilExpiry, protocol, issuer },
        };
      }

      // Certificate expiry (20 points)
      if (!validityKnown || daysUntilExpiry > 30) {
        score += 20;
      } else if (daysUntilExpiry > 7) {
        score += 10;
        issues.push(`Certificate expires in ${daysUntilExpiry} days`);
      } else {
        issues.push(`Certificate expires soon (${daysUntilExpiry} days)`);
      }

      // TLS version (30 points)
      if (protocol === "TLSv1.3") {
        score += 30;
      } else if (protocol === "TLSv1.2") {
        score += 25;
        issues.push("Consider upgrading to TLS 1.3");
      } else {
        score += 5;
        issues.push(`Outdated TLS version: ${protocol}`);
      }

      // Certificate chain (10 points)
      if (cert.issuer) {
        score += 10;
      }

      let grade = "F";
      if (score >= 90) grade = "A";
      else if (score >= 80) grade = "B";
      else if (score >= 70) grade = "C";
      else if (score >= 60) grade = "D";

      return {
        score,
        maxScore: 100,
        grade,
        issues,
        details: { valid: true, daysUntilExpiry, protocol, issuer },
      };
    } catch {
      return {
        score: 0,
        maxScore: 100,
        grade: "F",
        issues: ["Unable to connect via HTTPS"],
        details: {
          valid: false,
          daysUntilExpiry: 0,
          protocol: "None",
          issuer: "None",
        },
      };
    }
  })();
}

function detectDDoS(waf: {
  detected: boolean;
  provider: string | null;
}): DdosDetectionResult {
  // DDoS protection is typically included with enterprise WAFs
  const wafWithDDoS = [
    "Cloudflare",
    "Akamai",
    "AWS WAF",
    "Imperva",
    "F5 BIG-IP",
    "Fortinet",
    "GoDaddy Edge Security",
  ];

  if (waf.detected && waf.provider && wafWithDDoS.includes(waf.provider)) {
    return {
      protected: true,
      provider: waf.provider,
      method: "waf",
    };
  }

  return {
    protected: false,
    provider: null,
    method: "none",
  };
}

function calculateWAFBonus(waf: {
  detected: boolean;
  provider: string | null;
}): number {
  if (!waf.detected) return 0;

  const enterpriseWAFs = [
    "Cloudflare",
    "Akamai",
    "AWS WAF",
    "Imperva",
    "F5 BIG-IP",
    "GoDaddy Edge Security",
  ];
  const basicWAFs = ["Wordfence", "Sucuri", "ModSecurity"];

  if (enterpriseWAFs.includes(waf.provider || "")) {
    return 30;
  } else if (basicWAFs.includes(waf.provider || "")) {
    return 20;
  } else {
    return 15;
  }
}

// Export with validation middleware
export default [validateBody(localDomainSchema), handler];
