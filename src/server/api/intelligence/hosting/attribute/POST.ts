/**
 * POST /api/intelligence/hosting/attribute
 *
 * Perform hosting attribution analysis for a domain.
 * Combines DNS, IP fingerprinting, and tech detection to determine hosting providers.
 */

import type { Request, Response } from "express";
import { attributeHosting } from "@/lib/engines/fusion-engine.js";

export default async function handler(req: Request, res: Response) {
  console.log("[API] Hosting attribution request received");

  try {
    const { domain } = req.body;
    console.log(`[API] Domain: ${domain}`);

    if (!domain) {
      console.log("[API] Error: Domain is required");
      return res.status(400).json({ error: "Domain is required" });
    }

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      console.log(`[API] Error: Invalid domain format: ${domain}`);
      return res.status(400).json({ error: "Invalid domain format" });
    }

    console.log(`[API] Starting attribution for: ${domain}`);

    // Perform attribution
    const attribution = await attributeHosting(domain);

    console.log(`[API] Attribution complete for: ${domain}`);
    res.json(attribution);
  } catch (error) {
    console.error("[API] Hosting attribution error:", error);
    console.error(
      "[API] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    res.status(500).json({
      error: "Failed to perform hosting attribution",
      message: "An internal error occurred",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
