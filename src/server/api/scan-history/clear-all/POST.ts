import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scanHistory } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";

/**
 * POST /api/scan-history/clear-all
 * Delete all scans from user's history
 */
export default async function handler(req: Request, res: Response) {
  try {
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

    // Delete all scans for this user
    await db.delete(scanHistory).where(eq(scanHistory.userId, userId));

    res.json({
      success: true,
      message: "All scan history cleared successfully",
    });
  } catch (error) {
    console.error("Clear scan history error:", error);
    res.status(500).json({
      error: "Failed to clear scan history",
      message: "An internal error occurred",
    });
  }
}
