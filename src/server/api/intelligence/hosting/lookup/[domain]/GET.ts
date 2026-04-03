/**
 * GET /api/intelligence/hosting/lookup/:domain
 *
 * Retrieve cached hosting attribution for a domain.
 */

import type { Request, Response } from "express";
import { getAttribution } from "@/lib/engines/fusion-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    const attribution = await getAttribution(domain);

    if (!attribution) {
      return res
        .status(404)
        .json({ error: "No attribution found for this domain" });
    }

    res.json(attribution);
  } catch (error) {
    console.error("Hosting attribution lookup error:", error);
    res.status(500).json({
      error: "Failed to lookup hosting attribution",
      message: "An internal error occurred",
    });
  }
}
