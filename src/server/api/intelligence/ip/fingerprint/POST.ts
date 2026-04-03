/**
 * POST /api/intelligence/ip/fingerprint
 *
 * Fingerprint an IP address (port scan, service detection, geolocation)
 *
 * Body:
 * {
 *   "ip": "8.8.8.8"
 * }
 */

import type { Request, Response } from "express";
import {
  fingerprintIP,
  storeIPFingerprint,
} from "../../../../../lib/engines/ip-fingerprint-engine.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "IP address is required" });
    }

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: "Invalid IP address format" });
    }

    // Fingerprint the IP
    const fingerprint = await fingerprintIP(ip);

    // Store in database
    await storeIPFingerprint(fingerprint);

    res.json({
      success: true,
      data: fingerprint,
    });
  } catch (error: unknown) {
    console.error("IP fingerprinting error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to fingerprint IP",
      message,
    });
  }
}
