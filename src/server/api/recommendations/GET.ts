import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { recommendationsTable } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { domain, filter = "all" } = req.query;

    const query = db
      .select()
      .from(recommendationsTable)
      .where(
        and(
          eq(recommendationsTable.userId, userId),
          eq(recommendationsTable.status, "active"),
        ),
      )
      .orderBy(
        desc(recommendationsTable.priority),
        desc(recommendationsTable.impactScore),
      );

    const allRecs = await query;

    // Apply filters
    let filteredRecs = allRecs;
    if (domain) {
      filteredRecs = filteredRecs.filter((r) => r.domain === domain);
    }
    if (filter !== "all") {
      filteredRecs = filteredRecs.filter(
        (r) => r.category.toLowerCase() === filter,
      );
    }

    res.json({ recommendations: filteredRecs });
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    res.status(500).json({
      error: "Failed to fetch recommendations",
      message: "An internal error occurred",
    });
  }
}
