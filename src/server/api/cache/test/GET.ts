/**
 * Cache Test Endpoint
 *
 * Tests Redis/Memory cache connection and basic operations
 * GET /api/cache/test
 */

import type { Request, Response } from "express";
import {
  getRedisClient,
  getCacheBackend,
  isRedisConnected,
} from "@/server/lib/cache/redis-client";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const client = getRedisClient();
    const backend = getCacheBackend();
    const connected = isRedisConnected();

    // Test basic operations
    const testKey = "test:cache:health";
    const testValue = JSON.stringify({
      timestamp: Date.now(),
      message: "Cache is working!",
    });

    // Set a value with 60 second TTL
    await client.set(testKey, testValue, "EX", 60);

    // Get the value back
    const retrieved = await client.get(testKey);

    // Check TTL
    const ttl = await client.ttl(testKey);

    // Clean up
    await client.del(testKey);

    res.json({
      status: "ok",
      backend,
      redisConnected: connected,
      test: {
        set: "success",
        get: retrieved ? "success" : "failed",
        ttl: ttl > 0 ? "success" : "failed",
        delete: "success",
      },
      message: `Cache is using ${backend} backend`,
    });
  } catch (error) {
    console.error("[Cache Test] Error:", error);
    res.status(500).json({
      status: "error",
      error: "An internal error occurred",
    });
  }
}
