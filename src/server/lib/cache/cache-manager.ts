/**
 * Cache Manager
 *
 * Intelligent caching layer for domain scan results
 *
 * Features:
 * - Automatic cache key generation
 * - TTL management by scan type
 * - JSON serialization/deserialization
 * - Cache statistics tracking
 * - Batch operations
 */

import { getRedisClient, getCacheBackend } from "./redis-client.js";

/**
 * Cache configuration for different scan types
 */
export const CACHE_CONFIG = {
  // Fast-changing data (short TTL)
  dns: { ttl: 300, prefix: "scan:dns" }, // 5 minutes
  whois: { ttl: 3600, prefix: "scan:whois" }, // 1 hour
  ssl: { ttl: 3600, prefix: "scan:ssl" }, // 1 hour

  // Moderate-changing data (medium TTL)
  technology: { ttl: 7200, prefix: "scan:tech" }, // 2 hours
  security: { ttl: 1800, prefix: "scan:security" }, // 30 minutes
  performance: { ttl: 1800, prefix: "scan:perf" }, // 30 minutes
  email: { ttl: 3600, prefix: "scan:email" }, // 1 hour

  // Slow-changing data (long TTL)
  geolocation: { ttl: 86400, prefix: "scan:geo" }, // 24 hours

  // Intelligence data (medium TTL)
  intelligence: { ttl: 3600, prefix: "intel" }, // 1 hour
  correlation: { ttl: 7200, prefix: "corr" }, // 2 hours

  // Default fallback
  default: { ttl: 1800, prefix: "scan" }, // 30 minutes
} as const;

export type CacheType = keyof typeof CACHE_CONFIG;

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

/**
 * Generate cache key for a domain and scan type
 */
export function generateCacheKey(
  type: CacheType,
  domain: string,
  suffix?: string,
): string {
  const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;
  const normalizedDomain = domain.toLowerCase().trim();
  const key = `${config.prefix}:${normalizedDomain}`;
  return suffix ? `${key}:${suffix}` : key;
}

/**
 * Get TTL for a scan type
 */
export function getTTL(type: CacheType): number {
  const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;
  return config.ttl;
}

/**
 * Get cached data
 */
export async function getCached<T = unknown>(
  type: CacheType,
  domain: string,
  suffix?: string,
): Promise<T | null> {
  try {
    const client = getRedisClient();
    const key = generateCacheKey(type, domain, suffix);

    const cached = await client.get(key);

    if (cached) {
      stats.hits++;
      return JSON.parse(cached) as T;
    }

    stats.misses++;
    return null;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Get error:", error);
    return null;
  }
}

/**
 * Set cached data
 */
export async function setCached<T = unknown>(
  type: CacheType,
  domain: string,
  data: T,
  suffix?: string,
  customTTL?: number,
): Promise<boolean> {
  try {
    const client = getRedisClient();
    const key = generateCacheKey(type, domain, suffix);
    const ttl = customTTL || getTTL(type);

    await client.set(key, JSON.stringify(data), "EX", ttl);
    stats.sets++;
    return true;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Set error:", error);
    return false;
  }
}

/**
 * Delete cached data
 */
export async function deleteCached(
  type: CacheType,
  domain: string,
  suffix?: string,
): Promise<boolean> {
  try {
    const client = getRedisClient();
    const key = generateCacheKey(type, domain, suffix);

    await client.del(key);
    stats.deletes++;
    return true;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Delete error:", error);
    return false;
  }
}

/**
 * Delete all cached data for a domain
 */
export async function deleteDomainCache(domain: string): Promise<number> {
  try {
    const client = getRedisClient();
    const normalizedDomain = domain.toLowerCase().trim();

    // Find all keys for this domain
    const pattern = `*:${normalizedDomain}*`;
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    // Delete all keys
    let deleted = 0;
    for (const key of keys) {
      await client.del(key);
      deleted++;
    }

    stats.deletes += deleted;
    return deleted;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Delete domain error:", error);
    return 0;
  }
}

/**
 * Check if data is cached
 */
export async function isCached(
  type: CacheType,
  domain: string,
  suffix?: string,
): Promise<boolean> {
  try {
    const client = getRedisClient();
    const key = generateCacheKey(type, domain, suffix);

    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Exists error:", error);
    return false;
  }
}

/**
 * Get remaining TTL for cached data
 */
export async function getCacheTTL(
  type: CacheType,
  domain: string,
  suffix?: string,
): Promise<number> {
  try {
    const client = getRedisClient();
    const key = generateCacheKey(type, domain, suffix);

    return await client.ttl(key);
  } catch (error) {
    stats.errors++;
    console.error("[Cache] TTL error:", error);
    return -2; // Key doesn't exist
  }
}

/**
 * Get or set cached data (cache-aside pattern)
 */
export async function getOrSet<T = unknown>(
  type: CacheType,
  domain: string,
  fetchFn: () => Promise<T>,
  suffix?: string,
  customTTL?: number,
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(type, domain, suffix);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const data = await fetchFn();

  // Store in cache for next time
  await setCached(type, domain, data, suffix, customTTL);

  return data;
}

/**
 * Batch get multiple cached items
 */
export async function batchGet<T = unknown>(
  type: CacheType,
  domains: string[],
  suffix?: string,
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();

  for (const domain of domains) {
    const data = await getCached<T>(type, domain, suffix);
    results.set(domain, data);
  }

  return results;
}

/**
 * Batch set multiple cached items
 */
export async function batchSet<T = unknown>(
  type: CacheType,
  items: Array<{ domain: string; data: T; suffix?: string }>,
  customTTL?: number,
): Promise<number> {
  let successCount = 0;

  for (const item of items) {
    const success = await setCached(
      type,
      item.domain,
      item.data,
      item.suffix,
      customTTL,
    );
    if (success) successCount++;
  }

  return successCount;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats & {
  backend: string;
  hitRate: string;
} {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(2) : "0.00";

  return {
    ...stats,
    backend: getCacheBackend(),
    hitRate: `${hitRate}%`,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.errors = 0;
}

/**
 * Warm cache with data (preload)
 */
export async function warmCache<T = unknown>(
  type: CacheType,
  items: Array<{ domain: string; data: T; suffix?: string }>,
): Promise<number> {
  console.log(`[Cache] Warming cache with ${items.length} items...`);
  const successCount = await batchSet(type, items);
  console.log(`[Cache] Warmed ${successCount}/${items.length} items`);
  return successCount;
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.flushall();
    console.log("[Cache] All cache cleared");
    return true;
  } catch (error) {
    stats.errors++;
    console.error("[Cache] Clear all error:", error);
    return false;
  }
}

/**
 * Get cache info for debugging
 */
export async function getCacheInfo(
  type: CacheType,
  domain: string,
  suffix?: string,
) {
  const key = generateCacheKey(type, domain, suffix);
  const exists = await isCached(type, domain, suffix);
  const ttl = await getCacheTTL(type, domain, suffix);
  const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;

  return {
    key,
    exists,
    ttl,
    ttlFormatted: ttl > 0 ? `${Math.floor(ttl / 60)}m ${ttl % 60}s` : "expired",
    maxTTL: config.ttl,
    backend: getCacheBackend(),
  };
}
