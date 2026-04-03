/**
 * GET /api/intelligence/dns/cohosted?domain=example.com
 *
 * Find co-hosted domains (domains sharing the same IP)
 */

import type { Request, Response } from "express";
import { findCoHostedDomains } from "../../../../../lib/engines/dns-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const result = await findCoHostedDomains(domain);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Co-hosted domains error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to find co-hosted domains",
      message,
    });
  }
}
