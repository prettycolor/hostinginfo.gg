/**
 * POST /api/intelligence/infrastructure/compare
 *
 * Compare infrastructure across multiple domains
 *
 * Request Body:
 * {
 *   "domains": ["example.com", "example.net", "example.org"]
 * }
 *
 * Returns:
 * - Infrastructure attributions for all domains
 * - Common providers across domains
 * - Unique providers per domain
 * - Shared infrastructure analysis
 */

import type { Request, Response } from "express";
import { compareInfrastructure } from "../../../../lib/infrastructure-attribution.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: "domains array is required" });
    }

    if (domains.length < 2) {
      return res
        .status(400)
        .json({ error: "At least 2 domains are required for comparison" });
    }

    if (domains.length > 10) {
      return res
        .status(400)
        .json({ error: "Maximum 10 domains allowed for comparison" });
    }

    // Compare infrastructure
    const comparison = await compareInfrastructure(domains);

    res.json(comparison);
  } catch (error) {
    console.error("Error comparing infrastructure:", error);
    res.status(500).json({
      error: "Failed to compare infrastructure",
      message: "An internal error occurred",
    });
  }
}
