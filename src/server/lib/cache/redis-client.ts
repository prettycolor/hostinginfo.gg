/**
 * Redis Client with Graceful Fallback
 *
 * This module provides a Redis connection with automatic fallback to in-memory cache
 * if Redis is unavailable. This ensures the application works even without Redis.
 *
 * Features:
 * - Automatic connection management
 * - Graceful fallback to memory cache
 * - Connection health monitoring
 * - Automatic reconnection
 */

import Redis from "ioredis";

// In-memory cache fallback
class MemoryCache {
  private cache: Map<string, { value: string; expiry: number | null }> =
    new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    modeOrTtl?: string | number,
    ttlSecondsArg?: number,
  ): Promise<"OK"> {
    let ttlSeconds: number | undefined;
    if (typeof modeOrTtl === "number") {
      ttlSeconds = modeOrTtl;
    } else if (
      typeof modeOrTtl === "string" &&
      modeOrTtl.toUpperCase() === "EX" &&
      typeof ttlSecondsArg === "number"
    ) {
      ttlSeconds = ttlSecondsArg;
    }

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    return existed ? 1 : 0;
  }

  async flushall(): Promise<"OK"> {
    this.cache.clear();
    return "OK";
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for memory cache
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    if (!entry.expiry) return -1; // No expiry set

    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async exists(key: string): Promise<number> {
    return this.cache.has(key) ? 1 : 0;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  disconnect() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Redis client instance
let redisClient: Redis | MemoryCache | null = null;
let isRedisAvailable = false;
let connectionAttempted = false;

/**
 * Initialize Redis connection with fallback to memory cache
 */
export async function initializeRedis(): Promise<void> {
  if (connectionAttempted) return;
  connectionAttempted = true;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log("[Redis] No REDIS_URL configured, using in-memory cache");
    redisClient = new MemoryCache();
    isRedisAvailable = false;
    return;
  }

  try {
    console.log("[Redis] Attempting to connect to Redis...");
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log(
            "[Redis] Max retries reached, falling back to memory cache",
          );
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Exponential backoff
      },
      lazyConnect: true, // Don't connect immediately
    });

    // Try to connect
    await client.connect();

    // Test connection
    await client.ping();

    console.log("[Redis] ✅ Connected successfully");
    redisClient = client;
    isRedisAvailable = true;

    // Handle connection errors
    client.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    client.on("close", () => {
      console.log("[Redis] Connection closed");
    });

    client.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });
  } catch {
    console.error("[Redis] Failed to connect:", "An internal error occurred");
    console.log("[Redis] Falling back to in-memory cache");
    redisClient = new MemoryCache();
    isRedisAvailable = false;
  }
}

/**
 * Get Redis client instance (or memory cache fallback)
 */
export function getRedisClient(): Redis | MemoryCache {
  if (!redisClient) {
    // Initialize synchronously with memory cache if not already initialized
    console.log("[Redis] Client not initialized, using in-memory cache");
    redisClient = new MemoryCache();
    isRedisAvailable = false;
  }
  return redisClient;
}

/**
 * Check if Redis is available (vs memory cache fallback)
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable;
}

/**
 * Get cache backend type
 */
export function getCacheBackend(): "redis" | "memory" {
  return isRedisAvailable ? "redis" : "memory";
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    if (redisClient instanceof MemoryCache) {
      redisClient.disconnect();
    } else {
      await redisClient.quit();
    }
    redisClient = null;
    isRedisAvailable = false;
    connectionAttempted = false;
  }
}

// Initialize on module load (async, non-blocking)
initializeRedis().catch((err) => {
  console.error("[Redis] Initialization error:", err);
});
