/**
 * Correlation Analysis API Endpoint
 *
 * GET /api/intelligence/correlate/:domain
 *
 * Cross-references all intelligence sources to identify relationships and patterns.
 *
 * @example
 * GET /api/intelligence/correlate/google.com
 *
 * Response:
 * {
 *   "domain": "google.com",
 *   "analyzedAt": "2026-02-07T02:00:00.000Z",
 *   "correlations": [...],
 *   "hosting": {...},
 *   "ownership": {...},
 *   "technology": {...},
 *   "infrastructure": {...},
 *   "security": {...},
 *   "summary": {...}
 * }
 */

import type { Request, Response } from "express";
import { analyzeCorrelations } from "../../../../lib/intelligence/correlation-engine.js";

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    // Validate domain
    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({
        error: "Invalid domain",
        message: "Please provide a valid domain name (e.g., example.com)",
      });
    }

    // Perform correlation analysis
    const analysis = await analyzeCorrelations(domain);

    // Check if any data was found
    if (analysis.correlations.length === 0) {
      return res.status(404).json({
        error: "No intelligence data found",
        message: `No intelligence data available for ${domain}. Please run individual intelligence scans first (DNS, IP, WHOIS, Technology, URLScan).`,
        domain,
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error("Correlation analysis error:", error);
    res.status(500).json({
      error: "Correlation analysis failed",
      message: "An internal error occurred",
    });
  }
}
