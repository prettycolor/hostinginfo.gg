import type { Request, Response } from "express";

/**
 * Usage Tracking API
 * Returns the current scan count
 */

// In-memory scan counter (resets on server restart)
let scanCount = 0;

export function incrementScanCount() {
  scanCount++;
}

export default async function handler(req: Request, res: Response) {
  try {
    return res.json({
      totalScans: scanCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Usage] Error:", error);
    return res.status(500).json({
      error: "Failed to get usage stats",
      message: "An internal error occurred",
    });
  }
}
