import type { Request, Response } from "express";
import { monitorDomainExpiry } from "../../../../lib/intelligence/expiry-monitor.js";

/**
 * GET /api/intelligence/expiry/:domain
 *
 * Get expiry monitoring information for a specific domain
 *
 * Response:
 * {
 *   "domain": "example.com",
 *   "expiryDate": "2027-08-13T04:00:00.000Z",
 *   "daysUntilExpiry": 553,
 *   "alertLevel": "low",
 *   "status": "active",
 *   "registrar": "RESERVED-Internet Assigned Numbers Authority",
 *   "autoRenewalEnabled": false,
 *   "recommendations": []
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const alert = await monitorDomainExpiry(domain);

    if (!alert) {
      return res.status(404).json({
        error: "No expiry data found for domain",
        message:
          "Domain may not have been scanned yet or WHOIS data is unavailable",
      });
    }

    return res.json(alert);
  } catch (error) {
    console.error("[Expiry API] Error:", error);
    return res.status(500).json({
      error: "Failed to get expiry information",
      message: "An internal error occurred",
    });
  }
}
