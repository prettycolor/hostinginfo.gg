/**
 * GET /api/intelligence/security/score/:domain
 *
 * Calculate comprehensive security score for a domain
 *
 * Returns:
 * - Overall security score (0-100)
 * - Security grade (A+ to F)
 * - Category scores (SSL/TLS, headers, DNS, email, vulnerabilities, threats)
 * - Risk level assessment
 * - Security findings with severity
 * - Prioritized recommendations
 */

import type { Request, Response } from "express";
import { calculateSecurityScore } from "../../../../../lib/security-posture-scoring.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Calculate security score
    const securityScore = await calculateSecurityScore(domain);

    res.json(securityScore);
  } catch (error) {
    console.error("Error calculating security score:", error);
    res.status(500).json({
      error: "Failed to calculate security score",
      message: "An internal error occurred",
    });
  }
}
