import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { performanceHistory } from "../../../../db/schema.js";
import { eq, desc } from "drizzle-orm";

/**
 * Get performance history for a domain
 * Query params: domain (required), limit (optional, default 365 for 1 year)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const domain = req.query.domain as string;
    const limit = parseInt(req.query.limit as string) || 365;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Fetch history for this domain, ordered by most recent first
    const history = await db
      .select()
      .from(performanceHistory)
      .where(eq(performanceHistory.domain, domain))
      .orderBy(desc(performanceHistory.scanDate))
      .limit(limit);

    // Transform data for chart display
    const chartData = history.reverse().map((record) => ({
      date: record.scanDate,
      mobileScore: record.mobileScore,
      desktopScore: record.desktopScore,
      mobileFcp: parseFloat(record.mobileFcp || "0"),
      mobileLcp: parseFloat(record.mobileLcp || "0"),
      mobileTbt: parseFloat(record.mobileTbt || "0"),
      mobileCls: parseFloat(record.mobileCls || "0"),
      mobileSpeedIndex: parseFloat(record.mobileSpeedIndex || "0"),
      desktopFcp: parseFloat(record.desktopFcp || "0"),
      desktopLcp: parseFloat(record.desktopLcp || "0"),
      desktopTbt: parseFloat(record.desktopTbt || "0"),
      desktopCls: parseFloat(record.desktopCls || "0"),
      desktopSpeedIndex: parseFloat(record.desktopSpeedIndex || "0"),
    }));

    return res.json({
      domain,
      totalRecords: chartData.length,
      history: chartData,
    });
  } catch (error) {
    console.error("[Performance History] Fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch performance history",
      message: "An internal error occurred",
    });
  }
}
