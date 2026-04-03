/**
 * GET /api/intelligence/ip/lookup?ip=8.8.8.8
 *
 * Get stored IP fingerprint from database
 */

import type { Request, Response } from "express";
import { getIPFingerprint } from "../../../../../lib/engines/ip-fingerprint-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { ip } = req.query;

    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ error: "IP address is required" });
    }

    const fingerprint = await getIPFingerprint(ip);

    if (!fingerprint) {
      return res.status(404).json({ error: "IP fingerprint not found" });
    }

    res.json({
      success: true,
      data: fingerprint,
    });
  } catch (error: unknown) {
    console.error("IP lookup error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to lookup IP",
      message,
    });
  }
}
