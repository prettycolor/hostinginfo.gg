/**
 * Cache Statistics Endpoint
 *
 * Returns cache performance statistics
 * GET /api/cache/stats
 */

import type { Request, Response } from "express";
import { getCacheStats } from "@/server/lib/cache/cache-manager";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const stats = getCacheStats();

    res.json({
      status: "ok",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cache Stats] Error:", error);
    res.status(500).json({
      status: "error",
      error: "An internal error occurred",
    });
  }
}
