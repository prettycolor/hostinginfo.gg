import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { alerts } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { filter = "all" } = req.query;

    const query = db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isArchived, false)))
      .orderBy(desc(alerts.createdAt));

    const allAlerts = await query;

    // Apply filter
    let filteredAlerts = allAlerts;
    if (filter === "unread") {
      filteredAlerts = allAlerts.filter((a) => !a.isRead);
    } else if (filter === "critical") {
      filteredAlerts = allAlerts.filter((a) => a.severity === "critical");
    }

    res.json({ alerts: filteredAlerts });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch alerts",
        message: "An internal error occurred",
      });
  }
}
