#!/usr/bin/env node

/**
 * Post-build bundling script
 *
 * This script uses esbuild to bundle the Vite-generated dist/app.js
 * and all its dependencies into a single self-contained JavaScript file.
 *
 * @fileoverview Bundles server code with all dependencies for runtime deployment
 */

import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main bundling function
 *
 * @returns {Promise<void>}
 */
async function bundle() {
  console.log("📦 Bundling server code with esbuild...");

  try {
    // Step 1: Fix the static path in dist/app.js
    console.log("🔧 Fixing static file paths...");
    const appJsPath = join(__dirname, "dist", "app.js");
    const tempAppJsPath = join(__dirname, "dist", "app.temp.js");

    let appJsContent = readFileSync(appJsPath, "utf-8");

    // Replace relative "client" path with absolute path using __dirname
    // This ensures the bundle can find client files regardless of where it's run from
    appJsContent = appJsContent.replace(
      /express\.static\("client"\)/g,
      'express.static(require("path").join(__dirname, "client"))',
    );

    writeFileSync(tempAppJsPath, appJsContent, "utf-8");
    console.log("✓ Static paths fixed");

    // Step 2: Bundle the modified server entry point with all dependencies
    console.log("📦 Creating bundle...");
    await esbuild.build({
      entryPoints: [tempAppJsPath],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs", // Use CommonJS format to avoid dynamic require issues
      outfile: join(__dirname, "dist", "server.bundle.cjs"), // Use .cjs extension for CommonJS
      // Playwright uses dynamic internal requires that should remain external.
      external: [
        "playwright",
        "playwright-core",
        "chromium-bidi",
        "chromium-bidi/*",
        // jsdom resolves runtime assets (e.g. browser/default-stylesheet.css)
        // relative to its package directory. Keep it external so those files
        // are loaded from node_modules at runtime instead of bundled paths.
        "jsdom",
        "jsdom/*",
      ],
      minify: false,
      sourcemap: true,
      packages: "bundle", // Bundle all packages
    });

    // Clean up temp file
    unlinkSync(tempAppJsPath);

    console.log("✓ Server bundle created at dist/server.bundle.cjs");

    // Copy the bin directory (contains API routes)
    console.log("📁 API routes are already in dist/bin/");

    console.log("✅ Bundling complete!");
    console.log("");
    console.log("To run the bundled server:");
    console.log("  node dist/server.bundle.cjs");
  } catch (error) {
    console.error("❌ Bundling failed:", error);
    process.exit(1);
  }
}

bundle();
