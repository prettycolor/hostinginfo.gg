/**
 * GET /api/seo-checklist/history
 * Get scan history for user
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { seoChecklistScans } from "../../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain, limit = "10" } = req.query;

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

    const whereClause = domain
      ? and(
          eq(seoChecklistScans.userId, userId),
          eq(seoChecklistScans.domain, domain as string),
        )
      : eq(seoChecklistScans.userId, userId);

    const scans = await db
      .select({
        scan_id: seoChecklistScans.scanId,
        domain: seoChecklistScans.domain,
        decision: seoChecklistScans.decision,
        total_score: seoChecklistScans.totalScore,
        status: seoChecklistScans.status,
        created_at: seoChecklistScans.createdAt,
      })
      .from(seoChecklistScans)
      .where(whereClause)
      .orderBy(desc(seoChecklistScans.createdAt))
      .limit(parseInt(limit as string));

    res.json({ scans });
  } catch (error) {
    console.error("Error getting SEO checklist history:", error);
    res
      .status(500)
      .json({
        error: "Failed to get history",
        message: "An internal error occurred",
      });
  }
}
