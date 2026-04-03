/**
 * GET /api/intelligence/ip/:ip
 *
 * Get IP intelligence for an IP address
 */

import type { Request, Response } from "express";
import {
  getIPIntelligence,
  analyzeIPSecurity,
} from "../../../../lib/intelligence/ip-intelligence.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({ error: "IP parameter is required" });
    }

    // Validate IP format (basic validation)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: "Invalid IP address format" });
    }

    // Get IP intelligence
    const intelligence = await getIPIntelligence(ip);

    // Analyze security
    const security = analyzeIPSecurity(intelligence);

    res.json({
      ...intelligence,
      security,
    });
  } catch (error) {
    console.error("IP intelligence error:", error);

    // Check if rate limit error
    if (error instanceof Error && error.message.includes("Rate limit")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "An internal error occurred",
      });
    }

    res.status(500).json({
      error: "Failed to get IP intelligence",
      message: "An internal error occurred",
    });
  }
}
