import type { Request, Response } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { favoriteDomainScans, favoriteDomains } from "../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

function scoreToGrade(score: number | null | undefined): string {
  if (typeof score !== "number") return "N/A";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function parseFullResults(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function toIsoStringSafe(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  }

  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getTechnologyName(
  parsed: Record<string, unknown> | null,
): string | null {
  if (!parsed) return null;

  const performance = parsed.performance;
  const security = parsed.security;
  const candidates: unknown[] = [];

  if (performance && typeof performance === "object") {
    candidates.push((performance as Record<string, unknown>).technology);
  }
  if (security && typeof security === "object") {
    candidates.push((security as Record<string, unknown>).technology);
  }
  candidates.push(parsed.technology, parsed.platform);

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function getHostingProviderName(
  parsed: Record<string, unknown> | null,
): string | null {
  if (!parsed) return null;

  const candidates = [parsed.hostingProvider, parsed.provider];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (candidate && typeof candidate === "object") {
      const name = (candidate as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim().length > 0) {
        return name.trim();
      }
    }
  }

  return null;
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { days = "30" } = req.query;
    const parsedDays = Number(days);
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() -
        (Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30),
    );

    const favorites = await db
      .select()
      .from(favoriteDomains)
      .where(eq(favoriteDomains.userId, userId))
      .orderBy(desc(favoriteDomains.addedAt));

    const favoritesWithScans = await Promise.all(
      favorites.map(async (favorite) => {
        try {
          const [latestScan] = await db
            .select()
            .from(favoriteDomainScans)
            .where(
              and(
                eq(favoriteDomainScans.favoriteDomainId, favorite.id),
                eq(favoriteDomainScans.userId, userId),
              ),
            )
            .orderBy(desc(favoriteDomainScans.scannedAt))
            .limit(1);

          const [recentScan] = await db
            .select()
            .from(favoriteDomainScans)
            .where(
              and(
                eq(favoriteDomainScans.favoriteDomainId, favorite.id),
                eq(favoriteDomainScans.userId, userId),
                gte(favoriteDomainScans.scannedAt, cutoffDate),
              ),
            )
            .orderBy(desc(favoriteDomainScans.scannedAt))
            .limit(1);

          const scanForSummary = recentScan ?? latestScan ?? null;
          const parsedResults = parseFullResults(
            scanForSummary?.fullResults ?? null,
          );

          const mobileScore = toNumberOrNull(scanForSummary?.mobileScore);
          const desktopScore = toNumberOrNull(scanForSummary?.desktopScore);
          const securityScore = toNumberOrNull(scanForSummary?.securityScore);

          return {
            id: favorite.id,
            domain: favorite.domain,
            alias: favorite.alias,
            notes: favorite.notes,
            createdAt:
              toIsoStringSafe(favorite.addedAt) ?? new Date().toISOString(),
            lastScannedAt: toIsoStringSafe(favorite.lastScannedAt),
            scanCount: toNumberOrNull(favorite.scanCount) ?? 0,
            latestScan: scanForSummary
              ? {
                  performanceScore: mobileScore ?? desktopScore ?? 0,
                  securityScore: scoreToGrade(securityScore),
                  rawSecurityScore: securityScore,
                  sslStatus:
                    scanForSummary.sslValid === true
                      ? "valid"
                      : scanForSummary.sslValid === false
                        ? "invalid"
                        : "unknown",
                  technology: getTechnologyName(parsedResults),
                  hostingProvider: getHostingProviderName(parsedResults),
                  scannedAt: toIsoStringSafe(scanForSummary.scannedAt),
                  scanType: scanForSummary.scanType || "unknown",
                }
              : null,
          };
        } catch (favoriteError) {
          // Keep response resilient: a single malformed favorite should not fail the entire list.
          console.error("Error building favorite summary:", favoriteError);
          return {
            id: favorite.id,
            domain: favorite.domain,
            alias: favorite.alias,
            notes: favorite.notes,
            createdAt:
              toIsoStringSafe(favorite.addedAt) ?? new Date().toISOString(),
            lastScannedAt: toIsoStringSafe(favorite.lastScannedAt),
            scanCount: toNumberOrNull(favorite.scanCount) ?? 0,
            latestScan: null,
          };
        }
      }),
    );

    res.json({
      success: true,
      favorites: favoritesWithScans,
      count: favoritesWithScans.length,
    });
  } catch (error) {
    console.error("Error fetching favorites list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch favorites",
      message: "An internal error occurred",
    });
  }
}
