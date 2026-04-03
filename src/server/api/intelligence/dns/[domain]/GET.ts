/**
 * GET /api/intelligence/dns/:domain
 *
 * Get DNS intelligence for a domain
 */

import type { Request, Response } from "express";
import {
  getDNSIntelligence,
  analyzeDNSConfiguration,
} from "../../../../lib/intelligence/dns-intelligence.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Get DNS intelligence
    const intelligence = await getDNSIntelligence(domain);

    // Analyze configuration
    const analysis = analyzeDNSConfiguration(intelligence.records);

    res.json({
      ...intelligence,
      analysis,
    });
  } catch (error) {
    console.error("DNS intelligence error:", error);
    res.status(500).json({
      error: "Failed to get DNS intelligence",
      message: "An internal error occurred",
    });
  }
}
