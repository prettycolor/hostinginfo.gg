/**
 * GET /api/intelligence/whois/:domain
 *
 * Get WHOIS intelligence for a domain
 */

import type { Request, Response } from "express";
import { getWhoisIntelligence } from "../../../../lib/intelligence/whois-intelligence.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Get WHOIS intelligence
    const intelligence = await getWhoisIntelligence(domain);

    res.json(intelligence);
  } catch (error) {
    console.error("WHOIS intelligence error:", error);

    // Check if rate limit error
    if (error instanceof Error && error.message.includes("Rate limit")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "An internal error occurred",
      });
    }

    res.status(500).json({
      error: "Failed to get WHOIS intelligence",
      message: "An internal error occurred",
    });
  }
}
