import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scanHistory } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";
import { extractCanonicalHostingProviderFromScanData } from "../../../lib/hosting-provider-canonical.js";

type ScanHistoryRow = typeof scanHistory.$inferSelect;

function parseScanData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid payloads.
  }

  return {};
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

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
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

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
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

function getSecurityGrade(data: Record<string, unknown>): string | null {
  const security = getNestedRecord(data, "security");
  const securityData = getNestedRecord(data, "securityData");

  const explicitGrade =
    toStringValue(data.securityGrade) ??
    toStringValue(security.grade) ??
    toStringValue(securityData.grade);

  if (explicitGrade) {
    return explicitGrade.toUpperCase();
  }

  const score = getSecurityScore(data);
  if (score !== null) {
    return scoreToGrade(score);
  }

  return null;
}

function getHostingProvider(data: Record<string, unknown>): string | null {
  return extractCanonicalHostingProviderFromScanData(data);
}

function getTechnologies(data: Record<string, unknown>): string[] {
  const technology = getNestedRecord(data, "technology");
  const technologyData = getNestedRecord(data, "technologyData");
  const results = new Set<string>();

  const addTech = (value: unknown) => {
    if (typeof value === "string" && value.trim() !== "") {
      results.add(value.trim());
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const name = toStringValue(record.name);
      if (name) results.add(name);
    }
  };

  addTech(data.platform);
  addTech(technology.name);
  addTech(technology.platform);

  const buckets: unknown[] = [
    data.technologies,
    technology.technologies,
    technologyData.technologies,
    technology.frameworks,
    technology.libraries,
  ];

  for (const bucket of buckets) {
    if (Array.isArray(bucket)) {
      bucket.forEach(addTech);
    }
  }

  return Array.from(results);
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

function isWithinNext30Days(value: Date | null): boolean {
  if (!value) return false;
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);
  return value >= now && value <= future;
}

/**
 * GET /api/scan-history/filter-options
 * Get available filter options for the user's scan history.
 */
export default async function handler(req: Request, res: Response) {
  try {
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

    const rows = await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId));

    const hostingProvidersSet = new Set<string>();
    const securityGradesSet = new Set<string>();
    const technologiesSet = new Set<string>();

    const statusCounts = {
      active: 0,
      expired: 0,
      expiring: 0,
    };

    const sslStatusCounts = {
      valid: 0,
      expired: 0,
      expiring: 0,
    };

    let oldest: Date | null = null;
    let newest: Date | null = null;

    rows.forEach((row: ScanHistoryRow) => {
      if (row.createdAt) {
        const createdAt = new Date(row.createdAt);
        if (!oldest || createdAt < oldest) oldest = createdAt;
        if (!newest || createdAt > newest) newest = createdAt;
      }

      const parsed = parseScanData(row.scanData);

      const provider = getHostingProvider(parsed);
      if (provider && provider !== "Unknown") {
        hostingProvidersSet.add(provider);
      }

      const grade = getSecurityGrade(parsed);
      if (grade) {
        securityGradesSet.add(grade);
      }

      getTechnologies(parsed).forEach((tech) => technologiesSet.add(tech));

      const domainExpiry = getDomainExpiryDate(parsed);
      if (domainExpiry) {
        const now = new Date();
        if (domainExpiry < now) {
          statusCounts.expired += 1;
        } else {
          statusCounts.active += 1;
          if (isWithinNext30Days(domainExpiry)) {
            statusCounts.expiring += 1;
          }
        }
      }

      const sslValid = getSslValid(parsed);
      const sslExpiry = getSslExpiryDate(parsed);

      if (sslValid === true) {
        if (sslExpiry && sslExpiry < new Date()) {
          sslStatusCounts.expired += 1;
        } else {
          sslStatusCounts.valid += 1;
          if (isWithinNext30Days(sslExpiry)) {
            sslStatusCounts.expiring += 1;
          }
        }
      } else if (sslValid === false) {
        sslStatusCounts.expired += 1;
      }
    });

    const hostingProviders = Array.from(hostingProvidersSet).sort();
    const securityGrades = Array.from(securityGradesSet).sort();
    const technologies = Array.from(technologiesSet).sort();

    res.json({
      hostingProviders,
      securityGrades,
      technologies,
      dateRange: {
        oldest,
        newest,
      },
      statusCounts,
      sslStatusCounts,
      performanceRanges: [
        { label: "Poor (0-30)", value: "0-30" },
        { label: "Needs Improvement (31-60)", value: "31-60" },
        { label: "Good (61-100)", value: "61-100" },
      ],
      dateRangePresets: [
        { label: "Last 30 days", value: "30" },
        { label: "Last 60 days", value: "60" },
        { label: "Last 90 days", value: "90" },
        { label: "Last 180 days", value: "180" },
        { label: "Custom range", value: "custom" },
      ],
    });
  } catch (error) {
    console.error("Get filter options error:", error);
    res.status(500).json({
      error: "Failed to get filter options",
      message: "An internal error occurred",
    });
  }
}
