import type { Request, Response } from "express";
import type { ClientRequest } from "http";
import * as https from "https";
import { z } from "zod";
import { validateBody } from "../../../middleware/security.js";
// TEMPORARILY DISABLED: Database imports causing Vite SSR module loading errors
// import { db } from "../../db/client.js";
// import { performanceHistory } from "../../db/schema.js";
import { getSecret } from "#secrets";
import {
  getCached,
  setCached,
  deleteCached,
} from "../../../lib/cache/cache-manager.js";
import {
  getOrCreatePerformanceScanJob,
  markPerformanceScanJobProcessing,
  updatePerformanceScanJobProgress,
  completePerformanceScanJob,
  failPerformanceScanJob,
} from "../../../lib/performance-scan-jobs.js";

const PAGE_SPEED_API_ENDPOINT =
  process.env.PAGESPEED_API_ENDPOINT?.trim() ||
  "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";
const PAGE_SPEED_LOCALE = process.env.PAGESPEED_LOCALE?.trim() || "en-US";
const PAGE_SPEED_LAST_GOOD_TTL_SECONDS = Math.max(
  1800,
  Math.min(
    7 * 24 * 3600,
    Number.parseInt(
      process.env.PAGESPEED_LAST_GOOD_TTL_SECONDS ?? "21600",
      10,
    ) || 21600,
  ),
);
// PSI scans can legitimately take longer for complex pages; keep defaults close
// to documented API behavior while still bounding server request lifetimes.
const PAGE_SPEED_TOTAL_BUDGET_MS = Math.max(
  30000,
  Math.min(
    180000,
    Number.parseInt(process.env.PAGESPEED_TOTAL_BUDGET_MS ?? "130000", 10) ||
      130000,
  ),
);
const PAGE_SPEED_HARD_TIMEOUT_MS = Math.max(
  10000,
  Math.min(
    PAGE_SPEED_TOTAL_BUDGET_MS - 2500,
    Number.parseInt(process.env.PAGESPEED_REQUEST_TIMEOUT_MS ?? "85000", 10) ||
      85000,
  ),
);
const PAGE_SPEED_HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: PAGE_SPEED_HARD_TIMEOUT_MS + 10000,
});
const inFlightPerformanceScans = new Map<string, Promise<unknown>>();

const PAGE_SPEED_MAX_RETRIES = Math.max(
  0,
  Math.min(
    2,
    Number.parseInt(process.env.PAGESPEED_MAX_RETRIES ?? "1", 10) || 1,
  ),
);
const PAGE_SPEED_RETRY_DELAY_MS = 1200;
const PAGE_SPEED_RECOVERY_DELAY_MS = 2500;
const PAGE_SPEED_MAX_PAGES = Math.max(
  1,
  Math.min(5, Number.parseInt(process.env.PAGESPEED_MAX_PAGES ?? "1", 10) || 1),
);
const localDomainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(255, "Domain must be less than 255 characters")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format",
    ),
  async: z.boolean().optional(),
});

function normalizeDomainForPageSpeed(input: string): string {
  return input.trim().toLowerCase().replace(/\.+$/, "");
}

function normalizeApiKey(
  value: string | object | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shouldRetryWithFallbackKey(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("blocked") ||
    normalized.includes("forbidden") ||
    normalized.includes("code 403") ||
    normalized.includes("access not configured") ||
    normalized.includes("permission denied") ||
    normalized.includes("insufficient authentication scopes") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource_exhausted")
  );
}

function isTransientPageSpeedFailure(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();

  const transientMarkers = [
    "timeout",
    "timed out",
    "socket hang up",
    "econnreset",
    "etimedout",
    "eai_again",
    "backend error",
    "internal error",
    "temporarily unavailable",
    "code 500",
    "code 502",
    "code 503",
    "code 504",
  ];

  return transientMarkers.some((marker) => normalized.includes(marker));
}

function isTimeoutRelatedFailure(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("hard timeout")
  );
}

function resolvePageSpeedApiKeys(): {
  primaryApiKey: string | null;
  fallbackApiKey: string | null;
} {
  const dedicatedApiKey = normalizeApiKey(
    process.env.GOOGLE_PAGESPEED_API_KEY ||
      getSecret("GOOGLE_PAGESPEED_API_KEY"),
  );
  const sharedApiKey = normalizeApiKey(
    process.env.GOOGLE_SAFE_BROWSING_API_KEY ||
      getSecret("GOOGLE_SAFE_BROWSING_API_KEY"),
  );

  if (dedicatedApiKey) {
    return {
      primaryApiKey: dedicatedApiKey,
      fallbackApiKey:
        sharedApiKey && sharedApiKey !== dedicatedApiKey ? sharedApiKey : null,
    };
  }

  return {
    primaryApiKey: sharedApiKey,
    fallbackApiKey: null,
  };
}

/**
 * Performance Scanner API - Google PageSpeed Insights
 * Fetches Lighthouse scores for both mobile and desktop
 * Supports multi-page scanning for comprehensive analysis
 */
async function performPerformanceScan(domain: string) {
  console.log(`[Performance Scan] Starting PageSpeed scan for: ${domain}`);

  const { primaryApiKey, fallbackApiKey } = resolvePageSpeedApiKeys();
  if (!primaryApiKey) {
    throw new Error(
      "PageSpeed API key missing (checked GOOGLE_SAFE_BROWSING_API_KEY and GOOGLE_PAGESPEED_API_KEY)",
    );
  }

  try {
    return await performPerformanceScanWithApiKey(domain, primaryApiKey);
  } catch (error) {
    const internalMessage =
      error instanceof Error ? error.message : String(error);
    if (fallbackApiKey && shouldRetryWithFallbackKey(internalMessage)) {
      console.warn(
        `[Performance Scan] Shared key blocked for PageSpeed, retrying with GOOGLE_PAGESPEED_API_KEY for ${domain}`,
      );
      return performPerformanceScanWithApiKey(domain, fallbackApiKey);
    }
    throw error;
  }
}

async function performPerformanceScanWithApiKey(
  domain: string,
  apiKey: string,
) {
  const scanDeadlineMs = Date.now() + PAGE_SPEED_TOTAL_BUDGET_MS;
  const allPagesToScan = [
    { path: "", label: "Homepage" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/blog", label: "Blog" },
    { path: "/services", label: "Services" },
  ];
  const pagesToScan = allPagesToScan.slice(0, PAGE_SPEED_MAX_PAGES);

  // Always scan homepage first. If it fully fails, skip extra requests to reduce quota burn.
  const homepageResult = await scanPage(
    domain,
    pagesToScan[0],
    apiKey,
    scanDeadlineMs,
  );
  const homepageHasAnyData =
    !homepageResult.mobile.error || !homepageResult.desktop.error;
  const canScanAdditionalPages =
    getRemainingBudgetMs(scanDeadlineMs) > PAGE_SPEED_HARD_TIMEOUT_MS + 500;

  const additionalPageResults =
    homepageHasAnyData && canScanAdditionalPages
      ? await Promise.all(
          pagesToScan
            .slice(1)
            .map((page) => scanPage(domain, page, apiKey, scanDeadlineMs)),
        )
      : [];

  if (homepageHasAnyData && !canScanAdditionalPages && pagesToScan.length > 1) {
    console.warn(
      `[Performance Scan] Budget nearly exhausted for ${domain}; skipping ${pagesToScan.length - 1} additional page scans`,
    );
  }

  const pageResults = [homepageResult, ...additionalPageResults];
  const existingPages = pageResults.filter(
    (p) => !p.mobile.error || !p.desktop.error,
  );

  const mobileSuccessResults = existingPages
    .map((p) => p.mobile)
    .filter((result) => !result.error);
  const desktopSuccessResults = existingPages
    .map((p) => p.desktop)
    .filter((result) => !result.error);

  const totalRequests = pageResults.length * 2;
  const successfulRequests =
    mobileSuccessResults.length + desktopSuccessResults.length;
  const failedRequests = totalRequests - successfulRequests;

  if (successfulRequests === 0) {
    const fatalReason = summarizeFatalPageSpeedFailure(pageResults);
    const timeoutDominatedFailure = isTimeoutRelatedFailure(fatalReason);

    const canAttemptRecovery =
      !timeoutDominatedFailure &&
      getRemainingBudgetMs(scanDeadlineMs) >
        PAGE_SPEED_RECOVERY_DELAY_MS + 3000;

    if (isTransientPageSpeedFailure(fatalReason) && canAttemptRecovery) {
      console.warn(
        `[Performance Scan] Transient PageSpeed failure for ${domain}, attempting homepage-only recovery`,
      );
      await wait(PAGE_SPEED_RECOVERY_DELAY_MS);

      const recoveryHomepage = await scanPage(
        domain,
        pagesToScan[0],
        apiKey,
        scanDeadlineMs,
      );
      const recoveryPages = [recoveryHomepage].filter(
        (p) => !p.mobile.error || !p.desktop.error,
      );

      if (recoveryPages.length > 0) {
        const recoveryMobileSuccessResults = recoveryPages
          .map((p) => p.mobile)
          .filter((result) => !result.error);
        const recoveryDesktopSuccessResults = recoveryPages
          .map((p) => p.desktop)
          .filter((result) => !result.error);

        const recoverySuccessfulRequests =
          recoveryMobileSuccessResults.length +
          recoveryDesktopSuccessResults.length;
        const recoveryTotalRequests = 2;
        const recoveryFailedRequests =
          recoveryTotalRequests - recoverySuccessfulRequests;

        const recoveryAggregateMobile =
          recoveryMobileSuccessResults.length > 0
            ? calculateAggregateScore(recoveryMobileSuccessResults)
            : {
                score: 0,
                grade: "F",
                color: "red" as const,
                metrics: getEmptyMetrics(),
                error: "No successful mobile PageSpeed responses",
              };

        const recoveryAggregateDesktop =
          recoveryDesktopSuccessResults.length > 0
            ? calculateAggregateScore(recoveryDesktopSuccessResults)
            : {
                score: 0,
                grade: "F",
                color: "red" as const,
                metrics: getEmptyMetrics(),
                error: "No successful desktop PageSpeed responses",
              };

        console.log(
          `[Performance Scan] Recovery succeeded for ${domain} (${recoverySuccessfulRequests}/${recoveryTotalRequests} successful requests)`,
        );

        return {
          mobile: recoveryAggregateMobile,
          desktop: recoveryAggregateDesktop,
          pages: recoveryPages,
          totalPagesScanned: recoveryPages.length,
          diagnostics: {
            totalRequests: recoveryTotalRequests,
            successfulRequests: recoverySuccessfulRequests,
            failedRequests: recoveryFailedRequests,
            partialResults: recoveryFailedRequests > 0,
            recoveryAttempted: true,
            recoveredFromTransientFailure: true,
          },
        };
      }
    } else if (
      isTransientPageSpeedFailure(fatalReason) &&
      !canAttemptRecovery
    ) {
      console.warn(
        timeoutDominatedFailure
          ? `[Performance Scan] Skipping recovery for ${domain}; timeout-dominated failures are unlikely to improve immediately`
          : `[Performance Scan] Skipping recovery for ${domain}; request budget exhausted`,
      );
    }

    const fatalMessage = fatalReason
      ? `PageSpeed Insights unavailable: ${fatalReason}`
      : "PageSpeed Insights returned no usable data";

    console.warn(
      `[Performance Scan] All PageSpeed requests failed for ${domain}: ${fatalMessage}`,
    );

    return {
      mobile: {
        score: 0,
        grade: "F",
        color: "red" as const,
        metrics: getEmptyMetrics(),
        error: fatalMessage,
      },
      desktop: {
        score: 0,
        grade: "F",
        color: "red" as const,
        metrics: getEmptyMetrics(),
        error: fatalMessage,
      },
      pages: [],
      totalPagesScanned: 0,
      diagnostics: {
        totalRequests,
        successfulRequests: 0,
        failedRequests: totalRequests,
        partialResults: false,
        fatal: true,
      },
      error: fatalMessage,
    };
  }

  const aggregateMobile =
    mobileSuccessResults.length > 0
      ? calculateAggregateScore(mobileSuccessResults)
      : {
          score: 0,
          grade: "F",
          color: "red" as const,
          metrics: getEmptyMetrics(),
          error: "No successful mobile PageSpeed responses",
        };

  const aggregateDesktop =
    desktopSuccessResults.length > 0
      ? calculateAggregateScore(desktopSuccessResults)
      : {
          score: 0,
          grade: "F",
          color: "red" as const,
          metrics: getEmptyMetrics(),
          error: "No successful desktop PageSpeed responses",
        };

  console.log(
    `[Performance Scan] Complete for: ${domain} (${existingPages.length} pages usable, ${successfulRequests}/${totalRequests} successful requests)`,
  );

  return {
    mobile: aggregateMobile,
    desktop: aggregateDesktop,
    pages: existingPages,
    totalPagesScanned: existingPages.length,
    diagnostics: {
      totalRequests,
      successfulRequests,
      failedRequests,
      partialResults: failedRequests > 0,
    },
  };
}

async function resolvePerformancePayload(
  domain: string,
): Promise<Record<string, unknown>> {
  // Read cache first so we can discard known-failed cached payloads.
  const cached = await getCached<unknown>("performance", domain);
  if (cached && !isCachedFailureResult(cached)) {
    return {
      ...(cached as Record<string, unknown>),
      _cache: {
        cached: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (cached && isCachedFailureResult(cached)) {
    await deleteCached("performance", domain);
  }

  let scanPromise = inFlightPerformanceScans.get(domain) as
    | Promise<Record<string, unknown>>
    | undefined;
  if (!scanPromise) {
    scanPromise = (
      performPerformanceScan(domain) as Promise<Record<string, unknown>>
    ).finally(() => {
      inFlightPerformanceScans.delete(domain);
    });
    inFlightPerformanceScans.set(domain, scanPromise as Promise<unknown>);
  } else {
    console.log(`[Performance Scan] Reusing in-flight scan for: ${domain}`);
  }

  const result = await scanPromise;
  await setCached("performance", domain, result);
  const isFailurePayload = isCachedFailureResult(result);

  if (!isFailurePayload) {
    await setCached(
      "performance",
      domain,
      result,
      "lastgood",
      PAGE_SPEED_LAST_GOOD_TTL_SECONDS,
    );
  } else {
    const lastKnownGood = await getCached<unknown>(
      "performance",
      domain,
      "lastgood",
    );
    if (lastKnownGood && !isCachedFailureResult(lastKnownGood)) {
      return {
        ...(lastKnownGood as Record<string, unknown>),
        _cache: {
          cached: true,
          stale: true,
          timestamp: new Date().toISOString(),
        },
        _fallback: {
          reason: "served_last_known_good_due_to_pagespeed_failure",
        },
      };
    }
  }

  return {
    ...result,
    _cache: {
      cached: false,
      timestamp: new Date().toISOString(),
    },
  };
}

async function processPerformanceScanJob(jobId: string, domain: string) {
  if (!markPerformanceScanJobProcessing(jobId)) {
    return;
  }

  updatePerformanceScanJobProgress(jobId, 10);

  try {
    const result = await resolvePerformancePayload(domain);
    updatePerformanceScanJobProgress(jobId, 95);
    completePerformanceScanJob(jobId, result);
  } catch {
    const message = "An internal error occurred";
    failPerformanceScanJob(jobId, message);
  }
}

async function handler(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");

  const rawDomain = typeof req.body?.domain === "string" ? req.body.domain : "";
  const domain = normalizeDomainForPageSpeed(rawDomain);
  if (!domain) {
    return res.status(400).json({ error: "Invalid domain" });
  }

  const asyncMode = req.body?.async === true;
  if (asyncMode) {
    const { job, reused } = getOrCreatePerformanceScanJob(domain);

    if (job.status === "queued") {
      void processPerformanceScanJob(job.id, domain);
    }

    const statusCode =
      job.status === "completed" || job.status === "failed" ? 200 : 202;
    return res.status(statusCode).json({
      jobId: job.id,
      domain: job.domain,
      status: job.status,
      progress: job.progress,
      pollAfterMs: job.status === "completed" ? 0 : 2000,
      reused,
      result: job.status === "completed" ? job.result : undefined,
      error: job.status === "failed" ? job.error : undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  }

  try {
    const response = await resolvePerformancePayload(domain);
    return res.json(response);
  } catch (error) {
    console.error("[Performance Scan] Error:", error);
    const lastKnownGood = await getCached<unknown>(
      "performance",
      domain,
      "lastgood",
    );
    if (lastKnownGood && !isCachedFailureResult(lastKnownGood)) {
      return res.json({
        ...(lastKnownGood as Record<string, unknown>),
        _cache: {
          cached: true,
          stale: true,
          timestamp: new Date().toISOString(),
        },
        _fallback: {
          reason: "served_last_known_good_due_to_runtime_error",
        },
      });
    }

    const internalMessage =
      error instanceof Error ? error.message : String(error);
    const lowerMessage = internalMessage.toLowerCase();
    const isQuotaOrRateLimitOrUnavailable =
      lowerMessage.includes("quota") ||
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("resource_exhausted") ||
      lowerMessage.includes("temporarily unavailable") ||
      lowerMessage.includes("backend error") ||
      lowerMessage.includes("code 500") ||
      lowerMessage.includes("code 502") ||
      lowerMessage.includes("code 503") ||
      lowerMessage.includes("code 504") ||
      lowerMessage.includes("timeout");

    return res.status(isQuotaOrRateLimitOrUnavailable ? 503 : 500).json({
      error: "Performance scan failed",
      message: "An internal error occurred",
      service: "pagespeed",
    });
  }
}

interface PageSpeedResult {
  score: number;
  grade: string;
  color: "green" | "orange" | "red";
  metrics: {
    fcp: { value: number; score: number; displayValue: string };
    lcp: { value: number; score: number; displayValue: string };
    tbt: { value: number; score: number; displayValue: string };
    cls: { value: number; score: number; displayValue: string };
    speedIndex: { value: number; score: number; displayValue: string };
  };
  opportunities?: Array<{
    title: string;
    description: string;
    savings: string;
  }>;
  error?: string;
}

interface PageScanResult {
  path: string;
  label: string;
  url: string;
  mobile: PageSpeedResult;
  desktop: PageSpeedResult;
}

type CachedErrorCarrier = {
  error?: unknown;
};

type CachedPerformancePage = {
  mobile?: CachedErrorCarrier;
  desktop?: CachedErrorCarrier;
};

type CachedPerformanceResult = {
  mobile?: CachedErrorCarrier;
  desktop?: CachedErrorCarrier;
  error?: unknown;
  pages?: unknown;
  totalPagesScanned?: unknown;
};

function buildFailedStrategyResult(
  strategy: "mobile" | "desktop",
  message: string,
): PageSpeedResult {
  return {
    score: 0,
    grade: "F",
    color: "red",
    metrics: getEmptyMetrics(),
    error: `${strategy === "mobile" ? "Mobile" : "Desktop"} ${message}`,
  };
}

function resolveAlternateScanHost(domain: string): string | null {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("www.")) {
    return normalized.replace(/^www\./, "");
  }
  return `www.${normalized}`;
}

function shouldRetryOnAlternateHost(result: PageSpeedResult): boolean {
  if (!result.error) return false;
  const message = result.error.toLowerCase();

  const nonRetryableMarkers = [
    "quota",
    "rate limit",
    "resource_exhausted",
    "api key",
    "missing or invalid",
    "invalid key",
    "access not configured",
    "permission denied",
  ];
  if (nonRetryableMarkers.some((marker) => message.includes(marker))) {
    return false;
  }

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("hard timeout") ||
    message.includes("socket hang up") ||
    message.includes("econnreset") ||
    message.includes("backend error") ||
    message.includes("temporarily unavailable") ||
    message.includes("no_fcp") ||
    message.includes("did not paint any content") ||
    message.includes("lighthouse returned error") ||
    message.includes("invalid pagespeed response") ||
    message.includes("code 400") ||
    message.includes("code 500") ||
    message.includes("code 502") ||
    message.includes("code 503") ||
    message.includes("code 504")
  );
}

async function scanPage(
  domain: string,
  page: { path: string; label: string },
  apiKey: string,
  deadlineMs: number,
): Promise<PageScanResult> {
  const fullUrl = `${domain}${page.path}`;
  if (getRemainingBudgetMs(deadlineMs) < 2000) {
    return {
      path: page.path,
      label: page.label,
      url: fullUrl,
      mobile: buildFailedStrategyResult(
        "mobile",
        "PageSpeed scan budget exhausted",
      ),
      desktop: buildFailedStrategyResult(
        "desktop",
        "PageSpeed scan budget exhausted",
      ),
    };
  }

  const [mobileResult, desktopResult] = await Promise.allSettled([
    fetchPageSpeedScore(fullUrl, "mobile", apiKey, deadlineMs),
    fetchPageSpeedScore(fullUrl, "desktop", apiKey, deadlineMs),
  ]);

  let normalizedMobile =
    mobileResult.status === "fulfilled"
      ? mobileResult.value
      : buildFailedStrategyResult("mobile", "PageSpeed request failed");

  let normalizedDesktop =
    desktopResult.status === "fulfilled"
      ? desktopResult.value
      : buildFailedStrategyResult("desktop", "PageSpeed request failed");

  const alternateDomain = resolveAlternateScanHost(domain);
  const shouldTryMobileFallback =
    Boolean(alternateDomain) && shouldRetryOnAlternateHost(normalizedMobile);
  const shouldTryDesktopFallback =
    Boolean(alternateDomain) && shouldRetryOnAlternateHost(normalizedDesktop);

  if (
    alternateDomain &&
    (shouldTryMobileFallback || shouldTryDesktopFallback)
  ) {
    const alternateFullUrl = `${alternateDomain}${page.path}`;
    console.warn(
      `[PageSpeed] Retrying failed strategy on alternate host ${alternateFullUrl}`,
    );

    const [alternateMobileResult, alternateDesktopResult] =
      await Promise.allSettled([
        shouldTryMobileFallback
          ? fetchPageSpeedScore(alternateFullUrl, "mobile", apiKey, deadlineMs)
          : Promise.resolve(normalizedMobile),
        shouldTryDesktopFallback
          ? fetchPageSpeedScore(alternateFullUrl, "desktop", apiKey, deadlineMs)
          : Promise.resolve(normalizedDesktop),
      ]);

    if (
      shouldTryMobileFallback &&
      alternateMobileResult.status === "fulfilled" &&
      !alternateMobileResult.value.error
    ) {
      normalizedMobile = alternateMobileResult.value;
    }

    if (
      shouldTryDesktopFallback &&
      alternateDesktopResult.status === "fulfilled" &&
      !alternateDesktopResult.value.error
    ) {
      normalizedDesktop = alternateDesktopResult.value;
    }
  }

  return {
    path: page.path,
    label: page.label,
    url: fullUrl,
    mobile: normalizedMobile,
    desktop: normalizedDesktop,
  };
}

function summarizeFatalPageSpeedFailure(
  pageResults: PageScanResult[],
): string | null {
  const messages = pageResults
    .flatMap((page) => [page.mobile.error, page.desktop.error])
    .filter((message): message is string => Boolean(message))
    .map((message) => message.trim());

  if (messages.length === 0) return null;

  const normalizedMessageCounts = new Map<string, number>();
  messages.forEach((message) => {
    const normalized = message.toLowerCase();
    normalizedMessageCounts.set(
      normalized,
      (normalizedMessageCounts.get(normalized) || 0) + 1,
    );
  });

  const dominantMessage = [...normalizedMessageCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  if (!dominantMessage) return messages[0];
  if (dominantMessage.includes("quota") || dominantMessage.includes("rate")) {
    return "Google PageSpeed API quota/rate limit reached";
  }
  if (
    dominantMessage.includes("code 504") ||
    dominantMessage.includes("gateway timeout")
  ) {
    return "Google PageSpeed API upstream timeout";
  }
  if (
    dominantMessage.includes("code 500") ||
    dominantMessage.includes("code 502") ||
    dominantMessage.includes("code 503") ||
    dominantMessage.includes("backend error") ||
    dominantMessage.includes("internal error") ||
    dominantMessage.includes("temporarily unavailable")
  ) {
    return "Google PageSpeed API temporarily unavailable";
  }
  if (dominantMessage.includes("key")) {
    return "Google PageSpeed API key is missing or invalid";
  }
  if (dominantMessage.includes("timeout")) {
    return "PageSpeed requests timed out";
  }
  return messages[0];
}

function isCachedFailureResult(cached: unknown): boolean {
  if (!cached || typeof cached !== "object") return true;

  const cachedResult = cached as CachedPerformanceResult;
  const mobileError =
    typeof cachedResult.mobile?.error === "string"
      ? cachedResult.mobile.error
      : "";
  const desktopError =
    typeof cachedResult.desktop?.error === "string"
      ? cachedResult.desktop.error
      : "";
  const hasTopLevelError =
    typeof cachedResult.error === "string" &&
    cachedResult.error.trim().length > 0;
  const pageLevelErrors: string[] = Array.isArray(cachedResult.pages)
    ? cachedResult.pages
        .flatMap((page) => {
          if (!page || typeof page !== "object") return [];
          const typedPage = page as CachedPerformancePage;
          return [typedPage.mobile?.error, typedPage.desktop?.error];
        })
        .filter((message): message is string => typeof message === "string")
    : [];
  const errorMessages = [mobileError, desktopError, ...pageLevelErrors].filter(
    (message) => message.trim().length > 0,
  );
  const hasTransientStrategyError = errorMessages.some((message) => {
    const normalized = message.toLowerCase();
    return (
      isRetryablePageSpeedError(message) ||
      normalized.includes("no_fcp") ||
      normalized.includes("did not paint any content") ||
      normalized.includes("lighthouse returned error") ||
      normalized.includes("invalid pagespeed response")
    );
  });
  const noPagesScanned =
    typeof cachedResult.totalPagesScanned === "number" &&
    cachedResult.totalPagesScanned === 0;

  // Invalidate cache for fatal/empty payloads and transient strategy failures.
  return Boolean(
    noPagesScanned ||
    hasTopLevelError ||
    (mobileError && desktopError) ||
    hasTransientStrategyError,
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRemainingBudgetMs(deadlineMs: number): number {
  return Math.max(0, deadlineMs - Date.now());
}

function isRetryablePageSpeedError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized) return false;

  const nonRetryableMarkers = [
    "quota",
    "rate limit",
    "resource_exhausted",
    "api key",
    "missing or invalid",
    "invalid key",
    "access not configured",
  ];
  if (nonRetryableMarkers.some((marker) => normalized.includes(marker))) {
    return false;
  }

  const retryableMarkers = [
    "timeout",
    "timed out",
    "hard timeout",
    "request timeout",
    "socket hang up",
    "econnreset",
    "eai_again",
    "request failed",
    "backend error",
    "internal error",
    "temporarily unavailable",
    "failed to parse pagespeed response",
    "code 500",
    "code 502",
    "code 503",
    "code 504",
    "code 524",
  ];

  return retryableMarkers.some((marker) => normalized.includes(marker));
}

async function fetchPageSpeedScore(
  domain: string,
  strategy: "mobile" | "desktop",
  apiKey: string,
  deadlineMs: number,
): Promise<PageSpeedResult> {
  const buildBudgetTimeout = (): PageSpeedResult => ({
    score: 0,
    grade: "F",
    color: "red",
    metrics: getEmptyMetrics(),
    error: "PageSpeed request budget exhausted",
  });

  const getAttemptTimeoutMs = (): number | null => {
    const remainingMs = getRemainingBudgetMs(deadlineMs);
    if (remainingMs < 1200) return null;
    return Math.max(
      3000,
      Math.min(PAGE_SPEED_HARD_TIMEOUT_MS, remainingMs - 400),
    );
  };

  const firstAttemptTimeoutMs = getAttemptTimeoutMs();
  if (!firstAttemptTimeoutMs) {
    return buildBudgetTimeout();
  }

  let result = await fetchPageSpeedScoreOnce(
    domain,
    strategy,
    apiKey,
    firstAttemptTimeoutMs,
  );

  for (let attempt = 1; attempt <= PAGE_SPEED_MAX_RETRIES; attempt++) {
    if (!result.error || !isRetryablePageSpeedError(result.error)) {
      break;
    }

    const retryDelayMs = PAGE_SPEED_RETRY_DELAY_MS * attempt;
    const remainingBeforeDelay = getRemainingBudgetMs(deadlineMs);
    if (remainingBeforeDelay <= retryDelayMs + 1000) {
      break;
    }

    console.warn(
      `[PageSpeed] Retry ${attempt}/${PAGE_SPEED_MAX_RETRIES} for ${strategy} ${domain}: ${result.error}`,
    );
    await wait(retryDelayMs);

    const retryTimeoutMs = getAttemptTimeoutMs();
    if (!retryTimeoutMs) {
      return buildBudgetTimeout();
    }

    result = await fetchPageSpeedScoreOnce(
      domain,
      strategy,
      apiKey,
      retryTimeoutMs,
    );
  }

  return result;
}

function fetchPageSpeedScoreOnce(
  domain: string,
  strategy: "mobile" | "desktop",
  apiKey: string,
  requestTimeoutMs: number,
): Promise<PageSpeedResult> {
  return new Promise((resolve) => {
    let settled = false;
    let req: ClientRequest | null = null;
    const params = new URLSearchParams({
      url: `https://${domain}`,
      strategy: strategy === "mobile" ? "MOBILE" : "DESKTOP",
      category: "PERFORMANCE",
      locale: PAGE_SPEED_LOCALE,
      key: apiKey,
    });
    const url = `${PAGE_SPEED_API_ENDPOINT}?${params.toString()}`;

    const hardTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (req) req.destroy();
      console.warn(
        `[PageSpeed] Hard timeout (${requestTimeoutMs}ms): ${strategy} ${domain}`,
      );
      resolve({
        score: 0,
        grade: "F",
        color: "red",
        metrics: getEmptyMetrics(),
        error: "PageSpeed hard timeout",
      });
    }, requestTimeoutMs);

    req = https.request(
      url,
      { timeout: requestTimeoutMs, agent: PAGE_SPEED_HTTPS_AGENT },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (settled) return;
          settled = true;
          clearTimeout(hardTimeout);
          try {
            const result = JSON.parse(data);

            // Check for API errors
            if (result.error) {
              const apiMessage =
                typeof result.error.message === "string"
                  ? result.error.message
                  : "PageSpeed API error";
              const apiCode = Number(result.error.code);
              resolve({
                score: 0,
                grade: "F",
                color: "red",
                metrics: getEmptyMetrics(),
                error:
                  Number.isFinite(apiCode) && apiCode > 0
                    ? `${apiMessage} (code ${apiCode})`
                    : apiMessage,
              });
              return;
            }

            const lighthouseResult = result.lighthouseResult;
            const runtimeError = lighthouseResult?.runtimeError;
            if (runtimeError && (runtimeError.message || runtimeError.code)) {
              const runtimeMessage =
                typeof runtimeError.message === "string"
                  ? runtimeError.message
                  : "Lighthouse runtime error";
              const runtimeCode =
                typeof runtimeError.code === "string"
                  ? runtimeError.code
                  : "UNKNOWN";
              resolve({
                score: 0,
                grade: "F",
                color: "red",
                metrics: getEmptyMetrics(),
                error: `Lighthouse returned error (${runtimeCode}): ${runtimeMessage}`,
              });
              return;
            }

            const categories = lighthouseResult?.categories;
            const audits = lighthouseResult?.audits;

            if (!categories || !audits) {
              resolve({
                score: 0,
                grade: "F",
                color: "red",
                metrics: getEmptyMetrics(),
                error: "Invalid PageSpeed response",
              });
              return;
            }

            // Get performance score (0-100)
            const performanceCategoryScore = categories.performance?.score;
            if (typeof performanceCategoryScore !== "number") {
              resolve({
                score: 0,
                grade: "F",
                color: "red",
                metrics: getEmptyMetrics(),
                error: "Missing performance score in PageSpeed response",
              });
              return;
            }

            const performanceScore = Math.round(performanceCategoryScore * 100);

            // Determine color based on score
            let color: "green" | "orange" | "red" = "red";
            if (performanceScore >= 75) color = "green";
            else if (performanceScore >= 59) color = "orange";

            // Determine grade
            let grade = "F";
            if (performanceScore >= 90) grade = "A";
            else if (performanceScore >= 75) grade = "B";
            else if (performanceScore >= 59) grade = "C";
            else if (performanceScore >= 40) grade = "D";

            // Extract Core Web Vitals
            const metrics = {
              fcp: extractMetric(audits["first-contentful-paint"]),
              lcp: extractMetric(audits["largest-contentful-paint"]),
              tbt: extractMetric(audits["total-blocking-time"]),
              cls: extractMetric(audits["cumulative-layout-shift"]),
              speedIndex: extractMetric(audits["speed-index"]),
            };

            // Extract top opportunities
            const opportunities: Array<{
              title: string;
              description: string;
              savings: string;
            }> = [];
            const opportunityAudits = [
              "render-blocking-resources",
              "unused-css-rules",
              "unused-javascript",
              "modern-image-formats",
              "offscreen-images",
              "unminified-css",
              "unminified-javascript",
            ];

            for (const auditKey of opportunityAudits) {
              const audit = audits[auditKey];
              if (audit && audit.score !== null && audit.score < 1) {
                opportunities.push({
                  title: audit.title,
                  description: audit.description,
                  savings: audit.displayValue || "Potential savings available",
                });
              }
              if (opportunities.length >= 5) break; // Limit to top 5
            }

            resolve({
              score: performanceScore,
              grade,
              color,
              metrics,
              opportunities:
                opportunities.length > 0 ? opportunities : undefined,
            });
          } catch (parseError) {
            console.error("[PageSpeed] Parse error:", parseError);
            resolve({
              score: 0,
              grade: "F",
              color: "red",
              metrics: getEmptyMetrics(),
              error: "Failed to parse PageSpeed response",
            });
          }
        });
      },
    );

    req.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      console.error("[PageSpeed] Request error:", error);
      resolve({
        score: 0,
        grade: "F",
        color: "red",
        metrics: getEmptyMetrics(),
        error: "PageSpeed request failed",
      });
    });

    req.on("timeout", () => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      req.destroy();
      resolve({
        score: 0,
        grade: "F",
        color: "red",
        metrics: getEmptyMetrics(),
        error: "PageSpeed request timeout",
      });
    });

    req.end();
  });
}

function extractMetric(audit: unknown): {
  value: number;
  score: number;
  displayValue: string;
} {
  if (!audit || typeof audit !== "object") {
    return { value: 0, score: 0, displayValue: "N/A" };
  }

  const typedAudit = audit as {
    numericValue?: unknown;
    score?: unknown;
    displayValue?: unknown;
  };
  const numericValue =
    typeof typedAudit.numericValue === "number" ? typedAudit.numericValue : 0;
  const scoreValue =
    typeof typedAudit.score === "number" ? typedAudit.score : 0;
  const displayValue =
    typeof typedAudit.displayValue === "string"
      ? typedAudit.displayValue
      : "N/A";

  return {
    value: numericValue,
    score: Math.round(scoreValue * 100),
    displayValue,
  };
}

function getEmptyMetrics() {
  return {
    fcp: { value: 0, score: 0, displayValue: "N/A" },
    lcp: { value: 0, score: 0, displayValue: "N/A" },
    tbt: { value: 0, score: 0, displayValue: "N/A" },
    cls: { value: 0, score: 0, displayValue: "N/A" },
    speedIndex: { value: 0, score: 0, displayValue: "N/A" },
  };
}

function calculateAggregateScore(results: PageSpeedResult[]): PageSpeedResult {
  if (results.length === 0) {
    return {
      score: 0,
      grade: "F",
      color: "red",
      metrics: getEmptyMetrics(),
      error: "No pages scanned",
    };
  }

  // Calculate average score
  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length,
  );

  // Determine color and grade based on average
  let color: "green" | "orange" | "red" = "red";
  if (avgScore >= 75) color = "green";
  else if (avgScore >= 59) color = "orange";

  let grade = "F";
  if (avgScore >= 90) grade = "A";
  else if (avgScore >= 75) grade = "B";
  else if (avgScore >= 59) grade = "C";
  else if (avgScore >= 40) grade = "D";

  // Average metrics
  const avgMetrics = {
    fcp: averageMetric(results.map((r) => r.metrics.fcp)),
    lcp: averageMetric(results.map((r) => r.metrics.lcp)),
    tbt: averageMetric(results.map((r) => r.metrics.tbt)),
    cls: averageMetric(results.map((r) => r.metrics.cls)),
    speedIndex: averageMetric(results.map((r) => r.metrics.speedIndex)),
  };

  // Collect all unique opportunities across pages
  const allOpportunities: Array<{
    title: string;
    description: string;
    savings: string;
  }> = [];
  const seenTitles = new Set<string>();

  results.forEach((result) => {
    if (result.opportunities) {
      result.opportunities.forEach((opp) => {
        if (!seenTitles.has(opp.title)) {
          seenTitles.add(opp.title);
          allOpportunities.push(opp);
        }
      });
    }
  });

  return {
    score: avgScore,
    grade,
    color,
    metrics: avgMetrics,
    opportunities:
      allOpportunities.length > 0 ? allOpportunities.slice(0, 5) : undefined,
  };
}

function averageMetric(
  metrics: Array<{ value: number; score: number; displayValue: string }>,
) {
  const avgValue =
    metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  const avgScore = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length,
  );
  return {
    value: avgValue,
    score: avgScore,
    displayValue: metrics[0]?.displayValue || "N/A",
  };
}

// Export with validation middleware
export default [validateBody(localDomainSchema), handler];
