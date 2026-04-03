/**
 * GET /api/intelligence/technology/:domain
 *
 * Get technology stack detection for a domain
 */

import type { Request, Response } from "express";
import {
  detectTechnologyStack,
  analyzeTechnologyStack,
} from "../../../../lib/intelligence/technology-detection.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Detect technology stack
    const stack = await detectTechnologyStack(domain);

    // Analyze stack
    const analysis = analyzeTechnologyStack(stack);

    res.json({
      ...stack,
      analysis,
    });
  } catch (error) {
    console.error("Technology detection error:", error);
    res.status(500).json({
      error: "Failed to detect technology stack",
      message: "An internal error occurred",
    });
  }
}
