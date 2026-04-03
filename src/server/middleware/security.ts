/**
 * Security Middleware
 *
 * Comprehensive security middleware for API protection:
 * - Rate limiting (prevent API abuse)
 * - Input validation (prevent malicious input)
 * - Security headers (helmet.js)
 * - CORS configuration
 * - Authorization checks
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

interface SessionData {
  userId?: number | string;
  role?: string;
}

function getSessionData(req: Request): SessionData | null {
  const session = req.session as unknown;
  if (!session || typeof session !== "object") {
    return null;
  }
  return session as SessionData;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limiter configuration
 * Uses in-memory store (replace with Redis for production clusters)
 */
export const rateLimitConfig = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Scan endpoints (homepage triggers multiple parallel scan requests)
  scan: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 scan endpoint requests per window
    message: "Scan rate limit reached. Please wait a minute and try again.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Homepage analyze flow: only third-party calling scan routes
  scanThirdPartyAnalyze: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 third-party scan requests per window
    message: "Analyze rate limit reached. Please wait a minute and try again.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Frequent client polling endpoint used by XP bar/dashboard reads
  levelingStatsRead: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 600, // high cap so passive polling does not consume general bucket
    message: "Leveling stats rate limit reached. Please try again shortly.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Strict rate limit for expensive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: "Rate limit exceeded for this operation.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window (non-GET auth actions only)
    message: {
      error: "Too many authentication attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

/**
 * Domain validation schema
 * Validates domain names (e.g., example.com, sub.example.co.uk)
 */
export const domainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(255, "Domain must be less than 255 characters")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format",
    ),
});

/**
 * Domain list validation schema
 * For batch operations (max 100 domains)
 */
export const domainListSchema = z.object({
  domains: z
    .array(
      z
        .string()
        .min(3)
        .max(255)
        .regex(
          /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
        ),
    )
    .min(1, "At least one domain required")
    .max(100, "Maximum 100 domains allowed"),
});

/**
 * Batch analysis schema
 */
export const batchAnalysisSchema = z.object({
  name: z.string().min(1, "Batch name required").max(100, "Name too long"),
  domains: z
    .array(
      z
        .string()
        .regex(
          /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
        ),
    )
    .min(1, "At least one domain required")
    .max(100, "Maximum 100 domains allowed"),
});

/**
 * Report generation schema
 */
export const reportSchema = z.object({
  domain: z
    .string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    ),
  format: z.enum(["pdf", "json", "csv"]).optional().default("json"),
  includeHistory: z.boolean().optional().default(false),
});

/**
 * Scheduled report schema
 */
export const scheduledReportSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z
    .string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    ),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  format: z.enum(["pdf", "json", "csv"]),
  enabled: z.boolean().optional().default(true),
});

/**
 * Monitoring configuration schema
 */
export const monitoringSchema = z.object({
  domain: z
    .string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    ),
  interval: z.enum(["5min", "15min", "30min", "1hour", "6hour", "24hour"]),
  alerts: z
    .object({
      email: z.boolean().optional().default(true),
      slack: z.boolean().optional().default(false),
    })
    .optional(),
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns 400 with validation errors if invalid
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!schema || typeof schema.safeParse !== "function") {
        return res.status(500).json({
          error: "Validation middleware misconfigured",
          message: "Request schema is unavailable",
        });
      }

      const result = schema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch {
      return res.status(500).json({
        error: "Validation error",
        message: "An internal error occurred",
      });
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        return res.status(400).json({
          error: "Invalid parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      req.params = result.data;
      next();
    } catch {
      return res.status(500).json({
        error: "Validation error",
        message: "An internal error occurred",
      });
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: result.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      req.query = result.data as Request["query"];
      next();
    } catch {
      return res.status(500).json({
        error: "Validation error",
        message: "An internal error occurred",
      });
    }
  };
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Require authentication
 * Checks if user is logged in via session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check for session (BetterAuth)
  const session = getSessionData(req);
  if (!session?.userId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  next();
}

/**
 * Require admin role
 * Checks if user has admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSessionData(req);
  if (!session?.userId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const userRole = session.role;
  if (userRole !== "admin") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Admin privileges required",
    });
  }

  next();
}

/**
 * Verify resource ownership
 * NOT YET IMPLEMENTED — always rejects with 403 to avoid false sense of security.
 * Implement ownership checks directly in route handlers using the authenticated userId.
 */
export function requireOwnership(_resourceType: string, _paramName: string) {
  return async (_req: Request, res: Response, _next: NextFunction) => {
    return res.status(403).json({
      error: "Forbidden",
      message: "Ownership verification is not configured for this resource",
    });
  };
}

// ============================================================================
// SECURITY HEADERS CONFIGURATION
// ============================================================================

/**
 * Helmet.js configuration
 * Adds security headers to all responses
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // unsafe-eval needed for Vite dev
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
      ],
      // Some browsers report/handle external <script> checks via script-src-elem.
      // Firefox ignores unsafe-eval in script-src-elem and logs warnings, so omit it here.
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: [
        "'self'",
        "https://api.ipify.org",
        "https://ipinfo.io",
        "https://api.whoisfreaks.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://stats.g.doubleclick.net",
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  noSniff: true,
  xssFilter: true,
};

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * CORS configuration
 * Allows requests from specific origins
 */
export const corsConfig = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");

    // Allowed origins (defaults + environment-configured origins)
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://hostinginfo.gg",
      "https://www.hostinginfo.gg",
      "https://hostinginfo.gg",
      "https://www.hostinginfo.gg",
      process.env.APP_URL,
      process.env.VITE_PREVIEW_URL,
      process.env.VITE_PUBLIC_URL,
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((item) => item.trim())
        : []),
    ]
      .filter((item): item is string => Boolean(item))
      .map(normalizeOrigin);

    const normalizedAllowedOrigins = [...new Set(allowedOrigins)];
    const normalizedOrigin = normalizeOrigin(origin);

    let hostname = "";
    try {
      hostname = new URL(normalizedOrigin).hostname.toLowerCase();
    } catch {
      hostname = "";
    }

    const isAllowedSubdomain =
      hostname === "hostinginfo.gg" ||
      hostname.endsWith(".hostinginfo.gg") ||
      hostname === "hostinginfo.gg" ||
      hostname.endsWith(".hostinginfo.gg");

    if (
      normalizedAllowedOrigins.includes(normalizedOrigin) ||
      isAllowedSubdomain
    ) {
      callback(null, true);
    } else {
      // Do not throw hard errors for unrelated/browser-extension origins.
      // Returning false skips CORS headers without taking down API responses.
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Scan-Context",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400, // 24 hours
};

// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

/**
 * Request size limits
 * Prevents large payloads from overwhelming the server
 */
export const requestLimits = {
  json: "10mb",
  urlencoded: "10mb",
  text: "10mb",
};

// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>"']/g, "") // Remove HTML/script tags
    .replace(/\0/g, "") // Remove null bytes
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize domain name
 * Ensures domain is in valid format
 */
export function sanitizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "") // Remove protocol
    .replace(/\/.*$/, "") // Remove path
    .replace(/[^a-z0-9.-]/g, "") // Remove invalid chars
    .substring(0, 255); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, "")
    .substring(0, 255);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler
 * Catches all errors and returns safe error messages
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Error:", err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: "Internal Server Error",
    message: isDevelopment ? err.message : "An unexpected error occurred",
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * 404 handler
 * Returns consistent 404 response
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
}
