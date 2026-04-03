import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { alerts } from "../../../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    await db
      .update(alerts)
      .set({ isArchived: true })
      .where(eq(alerts.id, parseInt(alertId)));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to archive alert:", error);
    res
      .status(500)
      .json({
        error: "Failed to archive alert",
        message: "An internal error occurred",
      });
  }
}
