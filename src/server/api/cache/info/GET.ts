/**
 * Cache Info Endpoint
 *
 * Get cache information for a specific domain and scan type
 * GET /api/cache/info?type=dns&domain=google.com
 */

import type { Request, Response } from "express";
import { getCacheInfo, type CacheType } from "@/server/lib/cache/cache-manager";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const { type, domain, suffix } = req.query;

    if (!type || !domain) {
      return res.status(400).json({
        status: "error",
        error: "Missing required parameters: type and domain",
      });
    }

    const info = await getCacheInfo(
      type as CacheType,
      domain as string,
      suffix as string | undefined,
    );

    res.json({
      status: "ok",
      info,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cache Info] Error:", error);
    res.status(500).json({
      status: "error",
      error: "An internal error occurred",
    });
  }
}
