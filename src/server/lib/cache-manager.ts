/**
 * Cache Manager - Intelligent caching layer for API responses
 *
 * Features:
 * - 30-day TTL for URLScan.io and IPinfo.io responses
 * - Automatic cache invalidation
 * - Hit count tracking
 * - Memory + Database dual-layer caching
 */

import { db } from "../db/client.js";
import { scanCache } from "../db/schema.js";
import { eq, and, lt } from "drizzle-orm";

// In-memory cache for hot data (last 100 lookups)
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const MAX_MEMORY_CACHE_SIZE = 100;

export type CacheSource = "urlscan" | "ipinfo" | "dns" | "whois";

export interface CacheOptions {
  ttlDays?: number; // Default: 30 days
  forceRefresh?: boolean; // Bypass cache
}

/**
 * Get cached data from memory or database
 */
export async function getCachedData(
  lookupKey: string,
  apiSource: CacheSource,
): Promise<unknown | null> {
  const cacheKey = `${apiSource}:${lookupKey}`;

  // Check memory cache first (fastest)
  const memCached = memoryCache.get(cacheKey);
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached.data;
  }

  // Check database cache
  try {
    const cached = await db
      .select()
      .from(scanCache)
      .where(
        and(
          eq(scanCache.lookupKey, lookupKey),
          eq(scanCache.apiSource, apiSource),
        ),
      )
      .limit(1);

    if (cached.length === 0) {
      return null;
    }

    const record = cached[0];

    // Check if expired
    if (new Date(record.expiresAt) < new Date()) {
      // Delete expired cache
      await db.delete(scanCache).where(eq(scanCache.id, record.id));
      return null;
    }

    // Update hit count and last accessed
    await db
      .update(scanCache)
      .set({
        hitCount: (record.hitCount || 0) + 1,
        lastHitAt: new Date(),
      })
      .where(eq(scanCache.id, record.id));

    // Parse and store in memory cache
    const data = JSON.parse(record.responseJson);
    memoryCache.set(cacheKey, {
      data,
      expiresAt: new Date(record.expiresAt).getTime(),
    });

    // Limit memory cache size (LRU)
    if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
      const firstKey = memoryCache.keys().next().value;
      if (typeof firstKey === "string") {
        memoryCache.delete(firstKey);
      }
    }

    return data;
  } catch (error) {
    console.error("[CacheManager] Error reading cache:", error);
    return null;
  }
}

/**
 * Store data in cache (memory + database)
 */
export async function setCachedData(
  lookupKey: string,
  apiSource: CacheSource,
  data: unknown,
  options: CacheOptions = {},
): Promise<void> {
  const ttlDays = options.ttlDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  const cacheKey = `${apiSource}:${lookupKey}`;

  // Store in memory cache
  memoryCache.set(cacheKey, {
    data,
    expiresAt: expiresAt.getTime(),
  });

  // Store in database
  try {
    // Check if exists
    const existing = await db
      .select()
      .from(scanCache)
      .where(
        and(
          eq(scanCache.lookupKey, lookupKey),
          eq(scanCache.apiSource, apiSource),
        ),
      )
      .limit(1);

    const responseJson = JSON.stringify(data);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(scanCache)
        .set({
          responseJson,
          cachedAt: new Date(),
          expiresAt,
          lastHitAt: new Date(),
        })
        .where(eq(scanCache.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(scanCache).values({
        lookupKey,
        apiSource,
        responseJson,
        cachedAt: new Date(),
        expiresAt,
        hitCount: 0,
        lastHitAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[CacheManager] Error writing cache:", error);
  }
}

/**
 * Invalidate cache for a specific lookup
 */
export async function invalidateCache(
  lookupKey: string,
  apiSource?: CacheSource,
): Promise<void> {
  // Clear from memory
  if (apiSource) {
    const cacheKey = `${apiSource}:${lookupKey}`;
    memoryCache.delete(cacheKey);
  } else {
    // Clear all sources for this key
    const sources: CacheSource[] = ["urlscan", "ipinfo", "dns", "whois"];
    sources.forEach((source) => {
      memoryCache.delete(`${source}:${lookupKey}`);
    });
  }

  // Clear from database
  try {
    if (apiSource) {
      await db
        .delete(scanCache)
        .where(
          and(
            eq(scanCache.lookupKey, lookupKey),
            eq(scanCache.apiSource, apiSource),
          ),
        );
    } else {
      await db.delete(scanCache).where(eq(scanCache.lookupKey, lookupKey));
    }
  } catch (error) {
    console.error("[CacheManager] Error invalidating cache:", error);
  }
}

/**
 * Clean up expired cache entries (run periodically)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    await db.delete(scanCache).where(lt(scanCache.expiresAt, new Date()));

    console.log(`[CacheManager] Cleaned up expired cache entries`);
    return 0; // MySQL doesn't return affected rows count easily
  } catch (error) {
    console.error("[CacheManager] Error cleaning up cache:", error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  memoryCacheSize: number;
  cacheHitRate: number;
}> {
  try {
    const allEntries = await db.select().from(scanCache);

    const totalHits = allEntries.reduce(
      (sum, entry) => sum + (entry.hitCount || 0),
      0,
    );
    const totalEntries = allEntries.length;
    const cacheHitRate =
      totalEntries > 0 ? (totalHits / totalEntries) * 100 : 0;

    return {
      totalEntries,
      memoryCacheSize: memoryCache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  } catch (error) {
    console.error("[CacheManager] Error getting cache stats:", error);
    return {
      totalEntries: 0,
      memoryCacheSize: memoryCache.size,
      cacheHitRate: 0,
    };
  }
}
