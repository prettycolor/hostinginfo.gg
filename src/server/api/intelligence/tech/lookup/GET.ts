/**
 * GET /api/intelligence/tech/lookup?domain=example.com
 *
 * Get stored technology signatures for a domain
 */

import type { Request, Response } from "express";
import { getTechSignatures } from "../../../../../lib/engines/tech-detection-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const signatures = await getTechSignatures(domain);

    res.json({
      success: true,
      data: signatures,
    });
  } catch (error: unknown) {
    console.error("Technology lookup error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to lookup technologies",
      message,
    });
  }
}
