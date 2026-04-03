import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scanHistory } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";

/**
 * DELETE /api/scan-history/:id
 * Delete a specific scan from user's history
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
    const scanId = parseInt(req.params.id);

    if (isNaN(scanId)) {
      return res.status(400).json({ error: "Invalid scan ID" });
    }

    // Delete scan only if it belongs to the user
    await db
      .delete(scanHistory)
      .where(and(eq(scanHistory.id, scanId), eq(scanHistory.userId, userId)));

    res.json({
      success: true,
      message: "Scan deleted successfully",
    });
  } catch (error) {
    console.error("Delete scan error:", error);
    res.status(500).json({
      error: "Failed to delete scan",
      message: "An internal error occurred",
    });
  }
}
