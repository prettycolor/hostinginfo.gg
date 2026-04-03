/**
 * Rate Limiter - Simplified Version
 *
 * This is a simplified in-memory rate limiter.
 * The database-backed version was removed in Phase 2 cleanup.
 *
 * For production, consider implementing Redis-based rate limiting.
 */

import type { NextFunction, Request, Response } from "express";

// In-memory rate limit tracking
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit tiers
export enum RateLimitTier {
  FREE = "free",
  BASIC = "basic",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

// Rate limit configurations
const RATE_LIMITS = {
  [RateLimitTier.FREE]: { requests: 100, window: 3600000 }, // 100 requests per hour
  [RateLimitTier.BASIC]: { requests: 500, window: 3600000 }, // 500 requests per hour
  [RateLimitTier.PRO]: { requests: 2000, window: 3600000 }, // 2000 requests per hour
  [RateLimitTier.ENTERPRISE]: { requests: 10000, window: 3600000 }, // 10000 requests per hour
};

/**
 * Check if a service has exceeded its rate limit
 */
export async function checkRateLimit(
  service: string,
  tier: RateLimitTier = RateLimitTier.FREE,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = `${service}:${tier}`;
  const config = RATE_LIMITS[tier];

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // Reset if window has passed
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.window,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  const allowed = entry.count < config.requests;
  const remaining = Math.max(0, config.requests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Increment the rate limit counter for a service
 */
export async function incrementRateLimit(
  service: string,
  tier: RateLimitTier = RateLimitTier.FREE,
): Promise<void> {
  const now = Date.now();
  const key = `${service}:${tier}`;
  const config = RATE_LIMITS[tier];

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // Reset if window has passed
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.window,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
}

/**
 * Rate limit middleware for Express routes
 */
export function rateLimitMiddleware(tier: RateLimitTier = RateLimitTier.FREE) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const service = req.path;
    const { allowed, remaining, resetAt } = await checkRateLimit(service, tier);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", RATE_LIMITS[tier].requests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetAt);

    if (!allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again after ${new Date(resetAt).toISOString()}`,
        resetAt,
      });
    }

    // Increment counter
    await incrementRateLimit(service, tier);
    next();
  };
}

/**
 * Clean up expired entries (run periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
