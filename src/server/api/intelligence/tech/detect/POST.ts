/**
 * POST /api/intelligence/tech/detect
 *
 * Detect technologies used by a domain
 *
 * Body:
 * {
 *   "domain": "example.com"
 * }
 */

import type { Request, Response } from "express";
import {
  detectTechnologies,
  storeTechSignatures,
} from "../../../../../lib/engines/tech-detection-engine.js";

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

    // Detect technologies
    const result = await detectTechnologies(domain);

    // Store in database
    await storeTechSignatures(result);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Technology detection error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to detect technologies",
      message,
    });
  }
}
