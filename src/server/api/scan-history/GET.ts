import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { scanHistory } from "../../db/schema.js";
import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import { verifyToken } from "../../lib/auth.js";
import {
  extractCanonicalHostingProviderFromScanData,
  normalizeHostingProviderLabel,
} from "../../lib/hosting-provider-canonical.js";

/**
 * GET /api/scan-history
 * Get user's scan history with filtering based on persisted JSON scan payload.
 *
 * Query Parameters:
 * - days: number (30, 60, 90, 180) - Date range filter
 * - startDate: ISO date string - Custom start date
 * - endDate: ISO date string - Custom end date
 * - domain: string - Filter by domain (partial match)
 * - status: string - Filter by status (active, expired, expiring)
 * - securityScore: string - Filter by security grade (A,B,C,D,F)
 * - performanceScore: string - Filter by performance score range (0-30, 31-60, 61-100)
 * - technology: string - Filter by technology (comma-separated)
 * - hostingProvider: string - Filter by hosting provider (comma-separated)
 * - sslStatus: string - Filter by SSL status (valid, expired, expiring)
 * - sortBy: string - Sort field (date, domain, securityScore, performanceScore)
 * - sortOrder: string - Sort order (asc, desc)
 * - limit: number - Max results (default: 500)
 * - offset: number - Pagination offset (default: 0)
 */

type ScanHistoryRow = typeof scanHistory.$inferSelect;

interface EnrichedScanHistoryRow {
  row: ScanHistoryRow;
  parsedScanData: Record<string, unknown>;
  securityScore: number | null;
  securityGrade: string | null;
  performanceScore: number | null;
  technologies: string[];
  hostingProvider: string | null;
  sslValid: boolean | null;
  sslExpiryDate: Date | null;
  domainExpiryDate: Date | null;
}

function parseScanData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore parse errors and keep a safe empty object.
  }

  return {};
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

function getNestedRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getSecurityScore(data: Record<string, unknown>): number | null {
  const security = getNestedRecord(data, "security");
  const securityData = getNestedRecord(data, "securityData");

  const candidates: unknown[] = [
    data.securityScore,
    security.score,
    security.securityScore,
    securityData.score,
  ];

  for (const candidate of candidates) {
    const score = toNumber(candidate);
    if (score !== null) return score;
  }

  return null;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getSecurityGrade(
  data: Record<string, unknown>,
  securityScore: number | null,
): string | null {
  const security = getNestedRecord(data, "security");
  const securityData = getNestedRecord(data, "securityData");

  const explicitGrade =
    toStringValue(data.securityGrade) ??
    toStringValue(security.grade) ??
    toStringValue(securityData.grade);

  if (explicitGrade) {
    return explicitGrade.toUpperCase();
  }

  if (securityScore !== null) {
    return scoreToGrade(securityScore);
  }

  return null;
}

function getPerformanceScore(data: Record<string, unknown>): number | null {
  const performance = getNestedRecord(data, "performance");
  const performanceData = getNestedRecord(data, "performanceData");
  const mobile = getNestedRecord(performance, "mobile");
  const desktop = getNestedRecord(performance, "desktop");
  const performanceDataMobile = getNestedRecord(performanceData, "mobile");
  const performanceDataDesktop = getNestedRecord(performanceData, "desktop");

  const directCandidates: unknown[] = [
    data.performanceScore,
    performance.score,
    performanceData.score,
  ];

  for (const candidate of directCandidates) {
    const score = toNumber(candidate);
    if (score !== null) return score;
  }

  const mobileScore =
    toNumber(mobile.score) ?? toNumber(performanceDataMobile.score);
  const desktopScore =
    toNumber(desktop.score) ?? toNumber(performanceDataDesktop.score);

  if (mobileScore !== null && desktopScore !== null) {
    return Math.round((mobileScore + desktopScore) / 2);
  }

  if (mobileScore !== null) return mobileScore;
  if (desktopScore !== null) return desktopScore;

  return null;
}

function getTechnologies(data: Record<string, unknown>): string[] {
  const results = new Set<string>();
  const technology = getNestedRecord(data, "technology");
  const technologyData = getNestedRecord(data, "technologyData");

  const addValue = (value: unknown) => {
    if (typeof value === "string" && value.trim() !== "") {
      results.add(value.trim());
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const name = toStringValue(record.name);
      if (name) results.add(name);
    }
  };

  addValue(technology.name);
  addValue(technology.platform);
  addValue(data.platform);

  const arrays: unknown[] = [
    data.technologies,
    technology.technologies,
    technologyData.technologies,
    technology.frameworks,
    technology.libraries,
  ];

  for (const candidate of arrays) {
    if (Array.isArray(candidate)) {
      candidate.forEach(addValue);
    }
  }

  return Array.from(results);
}

function getHostingProvider(data: Record<string, unknown>): string | null {
  return extractCanonicalHostingProviderFromScanData(data);
}

function getSslValid(data: Record<string, unknown>): boolean | null {
  const ssl = getNestedRecord(data, "ssl");
  const securityData = getNestedRecord(data, "securityData");
  const securitySsl = getNestedRecord(securityData, "ssl");

  if (typeof data.sslValid === "boolean") return data.sslValid;
  if (typeof data.valid === "boolean") return data.valid;
  if (typeof ssl.valid === "boolean") return ssl.valid;
  if (typeof securitySsl.valid === "boolean") return securitySsl.valid;
  if (typeof ssl.expired === "boolean") return !ssl.expired;
  if (typeof securitySsl.expired === "boolean") return !securitySsl.expired;

  if (typeof data.hasSSL === "boolean") return data.hasSSL;
  if (typeof ssl.hasSSL === "boolean") return ssl.hasSSL;

  const securityIssues = Array.isArray(securityData.issues)
    ? securityData.issues
    : [];
  const hasKnownSslFailure = securityIssues.some((issue) =>
    typeof issue === "string"
      ? /(no https|ssl certificate required|unable to connect via https|expired ssl|invalid ssl)/i.test(
          issue,
        )
      : false,
  );
  if (hasKnownSslFailure) return false;

  return null;
}

function getSslExpiryDate(data: Record<string, unknown>): Date | null {
  const ssl = getNestedRecord(data, "ssl");
  const securityData = getNestedRecord(data, "securityData");
  const securitySsl = getNestedRecord(securityData, "ssl");

  return (
    toDate(data.sslExpiryDate) ??
    toDate(data.validTo) ??
    toDate(data.expiresAt) ??
    toDate(ssl.expiresAt) ??
    toDate(ssl.validTo) ??
    toDate(securitySsl.expiresAt) ??
    toDate(securitySsl.validTo)
  );
}

function getDomainExpiryDate(data: Record<string, unknown>): Date | null {
  const domain = getNestedRecord(data, "domain");
  const whois = getNestedRecord(data, "whois");

  return (
    toDate(data.domainExpiryDate) ??
    toDate(domain.expiryDate) ??
    toDate(whois.expirationDate) ??
    toDate(whois.expiryDate)
  );
}

function isSslExpiringSoon(expiryDate: Date | null): boolean {
  if (!expiryDate) return false;

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
}

function isDomainExpiringSoon(expiryDate: Date | null): boolean {
  if (!expiryDate) return false;

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
}

function buildEnrichedRow(row: ScanHistoryRow): EnrichedScanHistoryRow {
  const parsedScanData = parseScanData(row.scanData);
  const securityScore = getSecurityScore(parsedScanData);
  const securityGrade = getSecurityGrade(parsedScanData, securityScore);
  const performanceScore = getPerformanceScore(parsedScanData);
  const technologies = getTechnologies(parsedScanData);
  const hostingProvider = getHostingProvider(parsedScanData);
  const sslValid = getSslValid(parsedScanData);
  const sslExpiryDate = getSslExpiryDate(parsedScanData);
  const domainExpiryDate = getDomainExpiryDate(parsedScanData);

  return {
    row,
    parsedScanData,
    securityScore,
    securityGrade,
    performanceScore,
    technologies,
    hostingProvider,
    sslValid,
    sslExpiryDate,
    domainExpiryDate,
  };
}

function matchesPerformanceRange(score: number, range: string): boolean {
  if (range === "0-30") return score >= 0 && score <= 30;
  if (range === "31-60") return score >= 31 && score <= 60;
  if (range === "61-100") return score >= 61 && score <= 100;
  return false;
}

export default async function handler(req: Request, res: Response) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = decoded.userId;

    // Parse query parameters
    const {
      days,
      startDate,
      endDate,
      domain,
      status,
      securityScore,
      performanceScore,
      technology,
      hostingProvider,
      sslStatus,
      sortBy = "date",
      sortOrder = "desc",
      limit = "500",
      offset = "0",
    } = req.query as Record<string, string>;

    // Base SQL filtering (only fields that exist on scan_history table)
    const conditions = [eq(scanHistory.userId, userId)];

    if (startDate && endDate) {
      conditions.push(gte(scanHistory.createdAt, new Date(startDate)));
      conditions.push(lte(scanHistory.createdAt, new Date(endDate)));
    } else if (days) {
      const daysNum = parseInt(days, 10);
      if (Number.isFinite(daysNum) && daysNum > 0) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysNum);
        conditions.push(gte(scanHistory.createdAt, dateThreshold));
      }
    } else {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 30);
      conditions.push(gte(scanHistory.createdAt, dateThreshold));
    }

    if (domain) {
      conditions.push(like(scanHistory.domain, `%${domain}%`));
    }

    const baseRows = await db
      .select()
      .from(scanHistory)
      .where(and(...conditions))
      .orderBy(desc(scanHistory.createdAt));

    let filteredRows = baseRows.map(buildEnrichedRow);

    // Security grade filter
    if (securityScore) {
      const grades = securityScore
        .split(",")
        .map((grade) => grade.trim().toUpperCase())
        .filter(Boolean);

      if (grades.length > 0) {
        filteredRows = filteredRows.filter((item) => {
          return item.securityGrade
            ? grades.includes(item.securityGrade)
            : false;
        });
      }
    }

    // Performance score range filter
    if (performanceScore) {
      const ranges = performanceScore
        .split(",")
        .map((range) => range.trim())
        .filter(Boolean);

      if (ranges.length > 0) {
        filteredRows = filteredRows.filter((item) => {
          if (item.performanceScore === null) return false;
          return ranges.some((range) =>
            matchesPerformanceRange(item.performanceScore!, range),
          );
        });
      }
    }

    // Technology filter
    if (technology) {
      const requestedTechnologies = technology
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (requestedTechnologies.length > 0) {
        filteredRows = filteredRows.filter((item) =>
          item.technologies.some((tech) =>
            requestedTechnologies.some((needle) =>
              tech.toLowerCase().includes(needle),
            ),
          ),
        );
      }
    }

    // Hosting provider filter
    if (hostingProvider) {
      const providers = hostingProvider
        .split(",")
        .map((value) => normalizeHostingProviderLabel(value) || value.trim())
        .map((value) => value.toLowerCase())
        .filter(Boolean);

      if (providers.length > 0) {
        filteredRows = filteredRows.filter((item) => {
          if (!item.hostingProvider) return false;
          const normalized =
            normalizeHostingProviderLabel(item.hostingProvider) ||
            item.hostingProvider;
          const normalizedLower = normalized.toLowerCase();
          return providers.some(
            (provider) =>
              normalizedLower === provider ||
              normalizedLower.includes(provider),
          );
        });
      }
    }

    // SSL status filter
    if (sslStatus) {
      const statuses = sslStatus
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (statuses.length > 0) {
        filteredRows = filteredRows.filter((item) => {
          const valid = item.sslValid;
          const expiry = item.sslExpiryDate;
          const now = new Date();

          return statuses.some((statusValue) => {
            if (statusValue === "valid") {
              return valid === true && (!expiry || expiry >= now);
            }
            if (statusValue === "expired") {
              return valid === false || (expiry !== null && expiry < now);
            }
            if (statusValue === "expiring") {
              return valid === true && isSslExpiringSoon(expiry);
            }
            return false;
          });
        });
      }
    }

    // Domain status filter (active, expired, expiring)
    if (status) {
      const statuses = status
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (statuses.length > 0) {
        filteredRows = filteredRows.filter((item) => {
          const expiry = item.domainExpiryDate;
          const now = new Date();

          return statuses.some((statusValue) => {
            if (!expiry) return false;
            if (statusValue === "active") return expiry >= now;
            if (statusValue === "expired") return expiry < now;
            if (statusValue === "expiring") return isDomainExpiringSoon(expiry);
            return false;
          });
        });
      }
    }

    // Sort
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    filteredRows.sort((a, b) => {
      if (sortBy === "domain") {
        return a.row.domain.localeCompare(b.row.domain) * sortDirection;
      }

      if (sortBy === "securityScore") {
        const left = a.securityScore ?? -1;
        const right = b.securityScore ?? -1;
        return (left - right) * sortDirection;
      }

      if (sortBy === "performanceScore") {
        const left = a.performanceScore ?? -1;
        const right = b.performanceScore ?? -1;
        return (left - right) * sortDirection;
      }

      const leftDate = a.row.createdAt
        ? new Date(a.row.createdAt).getTime()
        : 0;
      const rightDate = b.row.createdAt
        ? new Date(b.row.createdAt).getTime()
        : 0;
      return (leftDate - rightDate) * sortDirection;
    });

    // Pagination
    const limitNum = parseInt(limit, 10) || 500;
    const offsetNum = parseInt(offset, 10) || 0;
    const totalCount = filteredRows.length;
    const page = filteredRows.slice(offsetNum, offsetNum + limitNum);

    const data = page.map((item) => ({
      ...item.row,
      securityScore: item.securityScore,
      securityGrade: item.securityGrade,
      performanceScore: item.performanceScore,
      technologies: item.technologies,
      hostingProvider: item.hostingProvider,
      sslValid: item.sslValid,
      sslExpiryDate: item.sslExpiryDate?.toISOString() ?? null,
      domainExpiryDate: item.domainExpiryDate?.toISOString() ?? null,
    }));

    res.json({
      data,
      scans: data, // backward compatibility for legacy consumers
      pagination: {
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + page.length < totalCount,
      },
      filters: {
        days: days || "30",
        startDate,
        endDate,
        domain,
        status,
        securityScore,
        performanceScore,
        technology,
        hostingProvider,
        sslStatus,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Get scan history error:", error);
    res.status(500).json({
      error: "Failed to get scan history",
      message: "An internal error occurred",
    });
  }
}
