/**
 * GET /api/reports
 *
 * List all reports for the authenticated user
 */

import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { reports } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const userReports = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.generatedAt));

    res.json({
      success: true,
      reports: userReports,
      count: userReports.length,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports",
      message: "An internal error occurred",
    });
  }
}
