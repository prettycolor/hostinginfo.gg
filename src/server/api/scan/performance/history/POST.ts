import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { performanceHistory } from "../../../../db/schema.js";

interface MetricValue {
  value: number;
}

interface PerformanceMetrics {
  fcp: MetricValue;
  lcp: MetricValue;
  tbt: MetricValue;
  cls: MetricValue;
  speedIndex: MetricValue;
}

interface PerformanceResult {
  score: number;
  metrics: PerformanceMetrics;
}

interface ScannedPage {
  url: string;
  mobile: PerformanceResult;
  desktop: PerformanceResult;
}

interface PerformanceHistoryRequestBody {
  domain: string;
  mobile: PerformanceResult;
  desktop: PerformanceResult;
  pages?: ScannedPage[];
}

/**
 * Save performance scan results to history
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain, mobile, desktop, pages } =
      req.body as PerformanceHistoryRequestBody;

    if (!domain || !mobile || !desktop) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract page URLs and scores
    const pagesScanned = pages
      ? pages.map((p: ScannedPage) => p.url)
      : [domain];
    const pageScores = pages
      ? pages.reduce(
          (
            acc: Record<string, { mobile: number; desktop: number }>,
            p: ScannedPage,
          ) => {
            acc[p.url] = {
              mobile: p.mobile.score,
              desktop: p.desktop.score,
            };
            return acc;
          },
          {},
        )
      : {};

    // Insert into database
    const result = await db.insert(performanceHistory).values({
      domain,
      mobileScore: mobile.score,
      desktopScore: desktop.score,
      mobileFcp: mobile.metrics.fcp.value.toString(),
      mobileLcp: mobile.metrics.lcp.value.toString(),
      mobileTbt: mobile.metrics.tbt.value.toString(),
      mobileCls: mobile.metrics.cls.value.toString(),
      mobileSpeedIndex: mobile.metrics.speedIndex.value.toString(),
      desktopFcp: desktop.metrics.fcp.value.toString(),
      desktopLcp: desktop.metrics.lcp.value.toString(),
      desktopTbt: desktop.metrics.tbt.value.toString(),
      desktopCls: desktop.metrics.cls.value.toString(),
      desktopSpeedIndex: desktop.metrics.speedIndex.value.toString(),
      pagesScanned: JSON.stringify(pagesScanned),
      pageScores: JSON.stringify(pageScores),
    });

    const insertId = Number(result[0].insertId);

    return res.status(201).json({
      success: true,
      id: insertId,
      message: "Performance history saved",
    });
  } catch (error) {
    console.error("[Performance History] Save error:", error);
    return res.status(500).json({
      error: "Failed to save performance history",
      message: "An internal error occurred",
    });
  }
}
