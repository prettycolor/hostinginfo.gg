/**
 * GET /api/intelligence/dns/changes?domain=example.com
 *
 * Detect DNS changes for a domain
 */

import type { Request, Response } from "express";
import { detectDNSChanges } from "../../../../../lib/engines/dns-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const changes = await detectDNSChanges(domain);

    res.json({
      success: true,
      data: changes,
    });
  } catch (error: unknown) {
    console.error("DNS changes detection error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to detect DNS changes",
      message,
    });
  }
}
