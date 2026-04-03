/**
 * GET /api/intelligence/infrastructure/fingerprint/:domain
 *
 * Get infrastructure fingerprint for a domain
 *
 * Returns:
 * - IP addresses
 * - Nameservers
 * - Mail servers
 * - ASN numbers
 * - Organizations
 * - Technologies
 * - Unique identifiers
 */

import type { Request, Response } from "express";
import { attributeInfrastructure } from "../../../../../lib/infrastructure-attribution.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Get full attribution
    const attribution = await attributeInfrastructure(domain);

    // Return only the fingerprint
    res.json({
      domain: attribution.domain,
      fingerprint: attribution.infrastructureFingerprint,
      technologyMapping: attribution.technologyMapping,
      lastAnalyzed: attribution.lastAnalyzed,
    });
  } catch (error) {
    console.error("Error fetching infrastructure fingerprint:", error);
    res.status(500).json({
      error: "Failed to fetch infrastructure fingerprint",
      message: "An internal error occurred",
    });
  }
}
