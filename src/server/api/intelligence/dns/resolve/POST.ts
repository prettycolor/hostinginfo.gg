/**
 * POST /api/intelligence/dns/resolve
 *
 * Resolve DNS records for a domain with historical tracking
 *
 * Body:
 * {
 *   "domain": "example.com",
 *   "includeSubdomains": true,
 *   "resolver": "8.8.8.8" // optional
 * }
 */

import type { Request, Response } from "express";
import { resolveDomain } from "../../../../../lib/engines/dns-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Validate domain format
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: "Invalid domain format" });
    }

    // Resolve DNS records
    const result = await resolveDomain(domain);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("DNS resolution error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to resolve DNS records",
      message,
    });
  }
}
