import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { existsSync, readFileSync } from "node:fs";
import { closeConnection, db } from "./db/client.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureOAuth, passport } from "./lib/oauth-config.ts";
import { extractToken, verifyToken } from "./lib/auth.ts";
import { users, sessions } from "./db/schema.ts";
import { and, eq, gt } from "drizzle-orm";
import {
  createSessionOptions,
  closeSessionStore,
} from "./lib/session-store.ts";
import { initMonitoringCron } from "./cron/monitoring.ts";
import { startScheduler } from "./lib/reports/scheduler.ts";
import {
  rateLimitConfig,
  helmetConfig,
  corsConfig,
  errorHandler as securityErrorHandler,
  notFoundHandler,
} from "./middleware/security.ts";

const importMetaUrl =
  typeof import.meta !== "undefined" && typeof import.meta.url === "string"
    ? import.meta.url
    : undefined;
const moduleDir = importMetaUrl
  ? path.dirname(fileURLToPath(importMetaUrl))
  : process.cwd();
const clientDirCandidates = [
  process.env.CLIENT_DIR,
  process.env.APP_ROOT
    ? path.join(process.env.APP_ROOT, "dist", "client")
    : undefined,
  process.env.APP_ROOT ? path.join(process.env.APP_ROOT, "client") : undefined,
  path.join(process.cwd(), "dist", "client"),
  path.join(process.cwd(), "client"),
  process.argv[1]
    ? path.join(path.dirname(process.argv[1]), "client")
    : undefined,
  process.argv[1]
    ? path.join(path.dirname(process.argv[1]), "..", "dist", "client")
    : undefined,
  process.argv[1]
    ? path.join(path.dirname(process.argv[1]), "..", "client")
    : undefined,
  path.join(moduleDir, "client"),
  path.join(moduleDir, "..", "dist", "client"),
  path.join(moduleDir, "..", "client"),
  path.join(moduleDir, "..", "..", "dist", "client"),
  path.join(moduleDir, "..", "..", "client"),
]
  .filter((candidate) => Boolean(candidate))
  .map((candidate) => path.resolve(candidate));

const isDevSourceIndex = (indexHtmlPath) => {
  try {
    const html = readFileSync(indexHtmlPath, "utf8");
    return html.includes("/src/main.tsx");
  } catch {
    return false;
  }
};

const hasUsableClientIndex = (candidate) => {
  const indexPath = path.join(candidate, "index.html");
  if (!existsSync(indexPath)) {
    return false;
  }
  return !isDevSourceIndex(indexPath);
};

const uniqueClientDirCandidates = [...new Set(clientDirCandidates)];
const resolvedClientDir =
  uniqueClientDirCandidates.find((candidate) =>
    hasUsableClientIndex(candidate),
  ) ||
  uniqueClientDirCandidates.find((candidate) =>
    existsSync(path.join(candidate, "index.html")),
  ) ||
  path.resolve(process.cwd(), "dist", "client");

const clientDir = resolvedClientDir;
const clientIndexPath = path.join(clientDir, "index.html");
const hasClientDir = existsSync(clientDir);
const hasClientIndex = existsSync(clientIndexPath);

if (hasClientIndex && isDevSourceIndex(clientIndexPath)) {
  console.error(
    `[Static] Selected client index appears to be a dev source file (${clientIndexPath}). Expected built assets from dist/client.`,
  );
}

function logSecretReadiness() {
  const jwtReady = Boolean(process.env.JWT_SECRET?.trim());
  const sessionReady = Boolean(process.env.SESSION_SECRET?.trim());
  console.log(
    `[Security] Secret readiness: JWT_SECRET=${jwtReady ? "present" : "missing"}, SESSION_SECRET=${sessionReady ? "present" : "missing"}`,
  );
}

function installAuthStateMiddleware(server) {
  server.use("/api", async (req, res, next) => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    try {
      const now = new Date();
      const [sessionRow] = await db
        .select({
          id: sessions.id,
        })
        .from(sessions)
        .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
        .limit(1);

      if (!sessionRow) {
        return res.status(401).json({ error: "Session expired" });
      }

      const [userRow] = await db
        .select({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          isDisabled: users.isDisabled,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!userRow) {
        return res.status(401).json({ error: "Invalid session user" });
      }

      if (userRow.isDisabled) {
        return res.status(403).json({ error: "Account disabled" });
      }

      const reqWithAuth = req;
      reqWithAuth.authUser = {
        id: userRow.id,
        email: userRow.email,
        isAdmin: Boolean(userRow.isAdmin),
        isDisabled: Boolean(userRow.isDisabled),
      };
      reqWithAuth.userId = userRow.id;
      reqWithAuth.user = { id: userRow.id };

      return next();
    } catch (error) {
      console.error("[Auth] Failed to hydrate request auth state", error);
      return res.status(500).json({ error: "Authentication failed" });
    }
  });
}

function installAuthNoStoreMiddleware(server) {
  server.use("/api/auth", (_req, res, next) => {
    // OAuth/session endpoints must never be cached by edge/CDN/WAF layers.
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });
}

export const viteServerBefore = (server) => {
  console.log("VITEJS SERVER");
  logSecretReadiness();

  // ============================================================================
  // TRUST PROXY CONFIGURATION
  // ============================================================================
  // Enable trust proxy to properly handle X-Forwarded-For headers
  // This is required for rate limiting and IP detection behind proxies
  server.set("trust proxy", true);
  console.log("[Security] Trust proxy enabled for X-Forwarded-For headers");

  // ============================================================================
  // SECURITY MIDDLEWARE (Development Mode)
  // ============================================================================

  // Security headers (relaxed for development)
  const devHelmetConfig = {
    ...helmetConfig,
    contentSecurityPolicy: false, // Disable CSP in dev for HMR
    frameguard: false, // Allow iframe embedding for preview
  };
  server.use(helmet(devHelmetConfig));
  console.log("[Security] Helmet.js security headers enabled (dev mode)");

  // CORS (allow all origins in development)
  const devCorsConfig = {
    origin: true, // Allow all origins in dev
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Scan-Context",
    ],
  };
  server.use(cors(devCorsConfig));
  console.log("[Security] CORS enabled (dev mode - all origins)");

  // Rate limiting (relaxed for development)
  const devRateLimitConfig = {
    ...rateLimitConfig.general,
    max: 1000, // Higher limit for dev
    message: "Rate limit exceeded (dev mode)",
    validate: { trustProxy: false }, // Disable trust proxy validation in dev
  };
  const generalLimiter = rateLimit(devRateLimitConfig);
  server.use("/api/", generalLimiter);
  console.log("[Security] Rate limiting enabled (dev mode - 1000 req/15min)");

  // Request parsing with size limits
  server.use(express.json({ limit: "10mb" }));
  server.use(express.urlencoded({ extended: true, limit: "10mb" }));
  console.log("[Security] Request size limits: 10mb");

  installAuthStateMiddleware(server);
  installAuthNoStoreMiddleware(server);

  // Initialize session for OAuth
  server.use(session(createSessionOptions(false)));

  // Initialize Passport
  server.use(passport.initialize());
  server.use(passport.session());

  // Configure OAuth strategies
  configureOAuth();

  // Initialize automated monitoring cron job
  initMonitoringCron();
  console.log(
    "[Monitoring Cron] Automated monitoring enabled - daily scans at 2 AM UTC",
  );

  // Initialize report scheduler
  startScheduler();
  console.log(
    "[Report Scheduler] Automated report generation enabled - checks every hour",
  );
};

export const viteServerAfter = (server) => {
  // 404 handler for API routes
  server.use("/api", notFoundHandler);

  // Global error handler
  server.use(securityErrorHandler);

  console.log("[Security] Error handlers registered");
};

// ServerHook
export const serverBefore = (server) => {
  logSecretReadiness();
  const homepageAnalyzeThirdPartyScanRoutes = new Set([
    "/performance",
    "/dns",
    "/whois",
    "/security",
    "/geolocation",
    "/malware",
  ]);

  const normalizeScanPath = (scanPath) => {
    const normalized = (scanPath || "/").toLowerCase();
    if (normalized.length > 1 && normalized.endsWith("/")) {
      return normalized.slice(0, -1);
    }
    return normalized;
  };

  const isHomepageAnalyzeContext = (req) =>
    (req.get("x-scan-context") || "").toLowerCase() === "homepage-analyze";

  const isThirdPartyAnalyzeScanRoute = (req) =>
    homepageAnalyzeThirdPartyScanRoutes.has(normalizeScanPath(req.path));

  const resolveScanRateLimitBucket = (req) =>
    isHomepageAnalyzeContext(req) && isThirdPartyAnalyzeScanRoute(req)
      ? "scan-third-party-analyze"
      : "scan-fallback";

  const isScanRoute = (req) =>
    req.path === "/scan" || req.path.startsWith("/scan/");

  const isLevelingStatsReadRoute = (req) =>
    req.method === "GET" &&
    (req.path === "/leveling/stats" || req.path === "/leveling/stats/");

  const buildRateLimitHandler = (bucket) => (req, res, _next, options) => {
    const resetTime = req.rateLimit?.resetTime;
    const scanContext = req.get("x-scan-context");
    res.setHeader("X-RateLimit-Bucket", bucket);
    if (scanContext) {
      res.setHeader("X-Scan-Context", scanContext);
    }

    console.warn("[RateLimit] Exceeded", {
      bucket,
      method: req.method,
      path: req.originalUrl || req.url,
      routePath: req.path,
      ip: req.ip,
      forwardedFor: req.headers["x-forwarded-for"],
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset:
        resetTime instanceof Date ? resetTime.toISOString() : resetTime || null,
    });

    return res.status(options.statusCode).send(options.message);
  };

  const shutdown = async (signal) => {
    console.log(`Got ${signal}, shutting down gracefully...`);

    try {
      // Close database connection pool before exiting
      await closeConnection();
      console.log("Database connections closed");
      await closeSessionStore();
      console.log("Session store closed");
    } catch (error) {
      console.error("Error closing database connections:", error);
    }

    process.exit(0);
  };

  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.on(signal, shutdown);
  });

  // ============================================================================
  // TRUST PROXY CONFIGURATION
  // ============================================================================
  // Enable trust proxy to properly handle X-Forwarded-For headers
  // This is required for rate limiting and IP detection behind proxies
  server.set("trust proxy", true);
  console.log("[Security] Trust proxy enabled for X-Forwarded-For headers");

  // ============================================================================
  // SECURITY MIDDLEWARE (Production Mode)
  // ============================================================================

  // Security headers (strict for production)
  server.use(helmet(helmetConfig));
  console.log(
    "[Security] Helmet.js security headers enabled (production mode)",
  );

  // CORS (strict whitelist for production)
  server.use(cors(corsConfig));
  console.log("[Security] CORS enabled (production mode - whitelist only)");

  // Rate limiting (strict for production)
  const generalLimiter = rateLimit({
    ...rateLimitConfig.general,
    validate: { trustProxy: false }, // Disable trust proxy validation
    skip: (req) =>
      req.method === "OPTIONS" ||
      isScanRoute(req) ||
      isLevelingStatsReadRoute(req),
    handler: buildRateLimitHandler("general"),
  });
  const levelingStatsReadLimiter = rateLimit({
    ...rateLimitConfig.levelingStatsRead,
    validate: { trustProxy: false },
    skip: (req) => req.method === "OPTIONS" || !isLevelingStatsReadRoute(req),
    handler: buildRateLimitHandler("leveling-stats-read"),
  });
  const scanThirdPartyAnalyzeLimiter = rateLimit({
    ...rateLimitConfig.scanThirdPartyAnalyze,
    validate: { trustProxy: false },
    skip: (req) =>
      req.method === "OPTIONS" ||
      !isHomepageAnalyzeContext(req) ||
      !isThirdPartyAnalyzeScanRoute(req),
    handler: buildRateLimitHandler("scan-third-party-analyze"),
  });
  const scanFallbackLimiter = rateLimit({
    ...rateLimitConfig.scan,
    validate: { trustProxy: false },
    skip: (req) =>
      req.method === "OPTIONS" ||
      (isHomepageAnalyzeContext(req) && isThirdPartyAnalyzeScanRoute(req)),
    handler: buildRateLimitHandler("scan-fallback"),
  });
  const strictLimiter = rateLimit({
    ...rateLimitConfig.strict,
    validate: { trustProxy: false },
    handler: buildRateLimitHandler("batch"),
  });
  const authLimiter = rateLimit({
    ...rateLimitConfig.auth,
    validate: { trustProxy: false },
    // Don't count GET auth status checks (e.g. /api/auth/me on reload).
    // Non-GET auth actions (login/signup/etc.) remain protected.
    skip: (req) => req.method === "GET" || req.method === "OPTIONS",
    handler: buildRateLimitHandler("auth"),
  });

  // Annotate scan requests so logs and clients can attribute bucket usage.
  server.use("/api/scan/", (req, res, next) => {
    const scanContext = (req.get("x-scan-context") || "").toLowerCase();
    const bucket = resolveScanRateLimitBucket(req);

    res.setHeader("X-RateLimit-Bucket", bucket);
    if (scanContext) {
      res.setHeader("X-Scan-Context", scanContext);
    }

    if (scanContext === "homepage-analyze") {
      console.log("[RateLimit] Scan bucket attribution", {
        bucket,
        routePath: req.path,
        method: req.method,
        ip: req.ip,
      });
    }

    next();
  });

  // Apply rate limiters
  server.use("/api/scan/", scanThirdPartyAnalyzeLimiter);
  server.use("/api/scan/", scanFallbackLimiter);
  server.use("/api/leveling/stats", levelingStatsReadLimiter);
  server.use("/api/", generalLimiter);
  server.use("/api/intelligence/batch/", strictLimiter);
  server.use("/api/auth/", authLimiter);
  console.log("[Security] Rate limiting enabled (production mode)");
  console.log("  - Scan API (homepage analyze 3rd-party): 300 req/15min");
  console.log("  - Scan API (fallback): 300 req/15min");
  console.log("  - Leveling stats reads: 600 req/15min");
  console.log("  - General API: 100 req/15min");
  console.log("  - Batch operations: 20 req/15min");
  console.log("  - Authentication: 20 req/15min (non-GET)");

  // Request parsing with size limits
  server.use(express.json({ limit: "10mb" }));
  server.use(express.urlencoded({ extended: true, limit: "10mb" }));
  console.log("[Security] Request size limits: 10mb");

  installAuthStateMiddleware(server);
  installAuthNoStoreMiddleware(server);

  // Initialize session for OAuth
  server.use(session(createSessionOptions(true)));

  // Initialize Passport
  server.use(passport.initialize());
  server.use(passport.session());

  // Configure OAuth strategies
  configureOAuth();

  if (hasClientDir) {
    server.use(express.static(clientDir));
    console.log(`[Static] Serving client files from: ${clientDir}`);
  } else {
    console.error(`[Static] Client directory not found: ${clientDir}`);
  }
};

export const serverAfter = (server) => {
  // Add SPA fallback for client-side routing
  // This middleware serves index.html for any GET request that doesn't match
  // an API endpoint or static file, enabling React Router to handle the route.
  // Prerendered HTML is served when available for better SEO crawlability.
  server.use((req, res, next) => {
    // Only handle GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip if this is an API request
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Skip if this is a static asset request (has file extension)
    if (path.extname(req.path)) {
      return next();
    }

    // For all other GET requests, serve index.html to support client-side routing
    if (!hasClientIndex) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Client application bundle is unavailable on this server",
      });
    }

    // Check for prerendered HTML first (e.g. /guide → dist/client/guide/index.html)
    if (req.path !== "/") {
      const prerenderedPath = path.join(
        clientDir,
        req.path.slice(1),
        "index.html",
      );
      if (existsSync(prerenderedPath)) {
        return res.sendFile(prerenderedPath, (error) => {
          if (error) return res.sendFile(clientIndexPath);
        });
      }
    }

    // Check for prerendered homepage
    if (req.path === "/") {
      const prerenderedHome = path.join(clientDir, "index.prerendered.html");
      if (existsSync(prerenderedHome)) {
        return res.sendFile(prerenderedHome, (error) => {
          if (error) return res.sendFile(clientIndexPath);
        });
      }
    }

    return res.sendFile(clientIndexPath, (error) => {
      if (error) {
        return next(error);
      }
    });
  });

  // 404 handler for API routes
  server.use("/api", notFoundHandler);

  // Global error handler
  server.use(securityErrorHandler);

  console.log("[Security] Error handlers registered");
};
