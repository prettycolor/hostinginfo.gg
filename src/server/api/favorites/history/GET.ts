import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { favoriteDomainScans, favoriteDomains } from "../../../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { favoriteId, days } = req.query;

    if (!favoriteId) {
      return res.status(400).json({ error: "favoriteId is required" });
    }

    const favId = parseInt(favoriteId as string);
    if (isNaN(favId)) {
      return res.status(400).json({ error: "Invalid favoriteId" });
    }

    // Verify ownership
    const [favorite] = await db
      .select()
      .from(favoriteDomains)
      .where(
        and(eq(favoriteDomains.id, favId), eq(favoriteDomains.userId, userId)),
      )
      .limit(1);

    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    // Calculate date filter (default 30 days)
    const daysFilter = days ? parseInt(days as string) : 30;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysFilter);

    // Fetch scan history
    const scans = await db
      .select()
      .from(favoriteDomainScans)
      .where(
        and(
          eq(favoriteDomainScans.favoriteDomainId, favId),
          eq(favoriteDomainScans.userId, userId),
          gte(favoriteDomainScans.scannedAt, dateThreshold),
        ),
      )
      .orderBy(desc(favoriteDomainScans.scannedAt));

    // Parse fullResults JSON for each scan
    const scansWithParsedResults = scans.map((scan) => ({
      ...scan,
      fullResults: scan.fullResults ? JSON.parse(scan.fullResults) : null,
      vulnerabilities: scan.vulnerabilities
        ? JSON.parse(scan.vulnerabilities)
        : [],
    }));

    res.json({
      favorite,
      scans: scansWithParsedResults,
      daysFilter,
    });
  } catch (error) {
    console.error("Fetch history error:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch scan history",
        message: "An internal error occurred",
      });
  }
}
