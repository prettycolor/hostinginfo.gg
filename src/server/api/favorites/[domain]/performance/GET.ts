import type { Request, Response } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { favoriteDomainScans, favoriteDomains } from "../../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function calculateAverage(values: Array<number | null>): number | null {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function calculateTrend(
  values: Array<number | null>,
): "improving" | "declining" | "stable" {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (validValues.length < 2) {
    return "stable";
  }

  const first = validValues[validValues.length - 1];
  const last = validValues[0];
  const change = ((last - first) / Math.max(first, 1)) * 100;

  if (change > 5) return "improving";
  if (change < -5) return "declining";
  return "stable";
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const domain = req.params.domain?.trim().toLowerCase();
    const days = Number(req.query.days ?? "30");

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    const [favorite] = await db
      .select()
      .from(favoriteDomains)
      .where(
        and(
          eq(favoriteDomains.userId, userId),
          eq(favoriteDomains.domain, domain),
        ),
      )
      .limit(1);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: "Favorite not found",
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - (Number.isFinite(days) && days > 0 ? days : 30),
    );

    const scans = await db
      .select()
      .from(favoriteDomainScans)
      .where(
        and(
          eq(favoriteDomainScans.favoriteDomainId, favorite.id),
          eq(favoriteDomainScans.userId, userId),
          gte(favoriteDomainScans.scannedAt, cutoffDate),
        ),
      )
      .orderBy(desc(favoriteDomainScans.scannedAt));

    const history = scans.map((scan) => ({
      id: scan.id,
      domain: scan.domain,
      scanType: scan.scanType,
      mobileScore: scan.mobileScore,
      desktopScore: scan.desktopScore,
      mobileFcp: toNumber(scan.mobileFcp),
      mobileLcp: toNumber(scan.mobileLcp),
      mobileTbt: toNumber(scan.mobileTbt),
      mobileCls: toNumber(scan.mobileCls),
      desktopFcp: toNumber(scan.desktopFcp),
      desktopLcp: toNumber(scan.desktopLcp),
      desktopTbt: toNumber(scan.desktopTbt),
      desktopCls: toNumber(scan.desktopCls),
      scannedAt: scan.scannedAt?.toISOString() ?? new Date().toISOString(),
    }));

    res.json({
      success: true,
      domain,
      count: history.length,
      dateRange: {
        days: Number.isFinite(days) && days > 0 ? days : 30,
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
      },
      history,
      trends: {
        mobile: calculateTrend(history.map((item) => item.mobileScore ?? null)),
        desktop: calculateTrend(
          history.map((item) => item.desktopScore ?? null),
        ),
      },
      averages: {
        mobile: {
          score: calculateAverage(
            history.map((item) => item.mobileScore ?? null),
          ),
          fcp: calculateAverage(history.map((item) => item.mobileFcp)),
          lcp: calculateAverage(history.map((item) => item.mobileLcp)),
          tbt: calculateAverage(history.map((item) => item.mobileTbt)),
          cls: calculateAverage(history.map((item) => item.mobileCls)),
        },
        desktop: {
          score: calculateAverage(
            history.map((item) => item.desktopScore ?? null),
          ),
          fcp: calculateAverage(history.map((item) => item.desktopFcp)),
          lcp: calculateAverage(history.map((item) => item.desktopLcp)),
          tbt: calculateAverage(history.map((item) => item.desktopTbt)),
          cls: calculateAverage(history.map((item) => item.desktopCls)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching favorite performance history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch performance history",
      message: "An internal error occurred",
    });
  }
}
