import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { recommendationsTable } from "../../../../db/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    const { recId } = req.params;

    if (!recId) {
      return res.status(400).json({ error: "Recommendation ID is required" });
    }

    await db
      .update(recommendationsTable)
      .set({ status: "dismissed" })
      .where(eq(recommendationsTable.id, parseInt(recId)));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to dismiss recommendation:", error);
    res
      .status(500)
      .json({
        error: "Failed to dismiss recommendation",
        message: "An internal error occurred",
      });
  }
}
