/**
 * Post-build prerendering script for SEO-critical pages.
 *
 * Starts the production server, visits key routes with Puppeteer,
 * captures the fully-rendered HTML, and writes it to dist/client
 * so the server (or CDN) can serve static HTML to crawlers.
 *
 * Usage: node scripts/prerender.mjs
 * Runs automatically after build via `npm run build`
 */

/* global fetch */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTES = [
  "/",
  "/guide",
  "/ddc-calculator",
  "/leaderboard",
  "/archives",
  "/privacy",
  "/terms-of-service",
];

const PORT = 20099; // Use a non-conflicting port for prerendering
const ORIGIN = `http://localhost:${PORT}`;
const DIST_DIR = join(process.cwd(), "dist", "client");
const TIMEOUT_MS = 15_000;

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Server at ${url} did not start within ${maxRetries * 500}ms`,
  );
}

function routeToFilePath(route) {
  if (route === "/") return join(DIST_DIR, "index.prerendered.html");
  // /guide → dist/client/guide/index.html
  return join(DIST_DIR, route.slice(1), "index.html");
}

async function prerender() {
  console.log("🔍 Prerendering SEO-critical pages...\n");

  // Check that dist exists
  if (!existsSync(DIST_DIR)) {
    console.error("❌ dist/client not found. Run `npm run build:vite` first.");
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.log("📦 Installing puppeteer for prerendering...");
    execSync("npm install --no-save puppeteer", { stdio: "inherit" });
    puppeteer = await import("puppeteer");
  }

  // Start the production server on the prerender port
  console.log(`🚀 Starting server on port ${PORT}...`);
  const server = spawn("node", ["dist/server.js"], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: "pipe",
  });

  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d.toString()));
  server.stderr.on("data", (d) => (serverOutput += d.toString()));

  try {
    await waitForServer(`${ORIGIN}/api/health`);
    console.log("✅ Server is up\n");

    const browser = await puppeteer.default.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let succeeded = 0;
    let failed = 0;

    for (const route of ROUTES) {
      const page = await browser.newPage();

      // Block unnecessary resources for faster rendering
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        if (["image", "font", "media"].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      try {
        await page.goto(`${ORIGIN}${route}`, {
          waitUntil: "networkidle0",
          timeout: TIMEOUT_MS,
        });

        // Wait for React to finish rendering
        await page.waitForSelector("#app", { timeout: 5000 });

        // Get the full rendered HTML
        let html = await page.content();

        // Inject a marker so the server knows this is prerendered
        html = html.replace(
          "</head>",
          '<meta name="prerendered" content="true" />\n</head>',
        );

        const filePath = routeToFilePath(route);
        const dir = dirname(filePath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, html, "utf-8");

        const sizeKB = (Buffer.byteLength(html) / 1024).toFixed(1);
        console.log(
          `  ✅ ${route} → ${filePath.replace(process.cwd(), ".")} (${sizeKB} KB)`,
        );
        succeeded++;
      } catch (err) {
        console.error(`  ❌ ${route} — ${err.message}`);
        failed++;
      } finally {
        await page.close();
      }
    }

    await browser.close();
    console.log(
      `\n📊 Prerendered ${succeeded}/${ROUTES.length} pages (${failed} failed)`,
    );

    if (failed > 0) {
      console.warn(
        "⚠️  Some pages failed to prerender. They will still work as SPA fallback.",
      );
    }
  } finally {
    server.kill("SIGTERM");
    // Give it a moment to clean up
    await new Promise((r) => setTimeout(r, 500));
  }
}

prerender().catch((err) => {
  console.error("❌ Prerendering failed:", err.message);
  console.warn(
    "⚠️  Build will continue without prerendered pages — SPA fallback still works.",
  );
  // Don't fail the build — prerendering is a nice-to-have enhancement
  process.exit(0);
});
