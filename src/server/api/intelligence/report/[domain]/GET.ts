/**
 * GET /api/intelligence/report/:domain
 *
 * Generate comprehensive intelligence report for a domain
 * Returns data in DomainIntelligence format (flat structure)
 *
 * Returns:
 * - Security score with categories
 * - WHOIS data
 * - Infrastructure information
 * - DNS records (flat array)
 * - Technologies (flat array)
 * - Recommendations
 */

import type { Request, Response } from "express";
import { generateComprehensiveReport } from "../../../../lib/comprehensive-report.js";
import { transformComprehensiveReport } from "../../../../lib/intelligence-report-transform.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    const report = await generateComprehensiveReport(domain);
    const transformed = transformComprehensiveReport(report);

    console.error(
      "[INTELLIGENCE REPORT] Transformed report for domain:",
      domain,
    );
    console.error(
      "[INTELLIGENCE REPORT] DNS records count:",
      transformed.dns.length,
    );
    console.error(
      "[INTELLIGENCE REPORT] Technologies count:",
      transformed.technologies.length,
    );

    res.json(transformed);
  } catch (error) {
    console.error("Error generating comprehensive report:", error);
    res.status(500).json({
      error: "Failed to generate comprehensive report",
      message: "An internal error occurred",
    });
  }
}
