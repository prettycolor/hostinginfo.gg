/**
 * GET /api/seo-checklist/scan/:scan_id
 * Get scan status and results
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { seoChecklistScans } from "../../../../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "../../../../lib/auth.js";

interface SeoChecklistScanResponse {
  scan_id: string;
  status: string;
  created_at: Date | null;
  completed_at: Date | null;
  target?: {
    host: string;
    input_url: string;
    final_url: string;
    redirect_chain: unknown;
  };
  decision?: unknown;
  summary?: unknown;
  score?: {
    total: number | null;
    categories: unknown;
  };
  checklist?: unknown;
  evidence?: unknown;
  errors?: unknown;
}

interface CategoryScorePayload {
  access: number;
  mobile_speed: number;
  page_basics: number;
  site_health: number;
  tracking: number;
}

const DEFAULT_CATEGORY_SCORES: CategoryScorePayload = {
  access: 0,
  mobile_speed: 0,
  page_basics: 0,
  site_health: 0,
  tracking: 0,
};

function parseCategoryScores(raw: unknown): CategoryScorePayload {
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;

  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_CATEGORY_SCORES;
  }

  const source = parsed as Record<string, unknown>;
  const toScore = (value: unknown): number => {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  };

  return {
    access: toScore(source.access),
    mobile_speed: toScore(source.mobile_speed),
    page_basics: toScore(source.page_basics),
    site_health: toScore(source.site_health),
    tracking: toScore(source.tracking),
  };
}

export default async function handler(req: Request, res: Response) {
  try {
    const { scan_id } = req.params;

    if (!scan_id) {
      return res.status(400).json({ error: "Scan ID is required" });
    }

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

    // Get scan from database
    const scans = await db
      .select()
      .from(seoChecklistScans)
      .where(eq(seoChecklistScans.scanId, scan_id))
      .limit(1);

    if (scans.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const scan = scans[0];

    // Check ownership
    if (scan.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Format response
    const response: SeoChecklistScanResponse = {
      scan_id: scan.scanId,
      status: scan.status,
      created_at: scan.createdAt,
      completed_at: scan.completedAt,
    };

    // Add target info if available
    if (scan.finalUrl) {
      response.target = {
        host: scan.domain,
        input_url: scan.inputUrl,
        final_url: scan.finalUrl,
        redirect_chain: scan.redirectChain,
      };
    }

    // Add results if completed
    if (scan.status === "completed") {
      response.decision = scan.decision;
      response.summary = scan.summary;
      response.score = {
        total: scan.totalScore,
        categories: parseCategoryScores(scan.categoryScores),
      };
      response.checklist = scan.checklist;
      response.evidence = scan.evidence;
    }

    // Add errors if failed
    if (scan.status === "failed") {
      response.errors = scan.errors;
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting SEO checklist scan:", error);
    res
      .status(500)
      .json({
        error: "Failed to get scan",
        message: "An internal error occurred",
      });
  }
}
