import type { Request, Response } from "express";
import {
  getExpiringDomains,
  getDomainsByAlertLevel,
} from "../../../../lib/intelligence/expiry-monitor.js";

/**
 * GET /api/intelligence/expiry/alerts
 *
 * Get all expiry alerts, optionally filtered by:
 * - withinDays: Number of days to look ahead (default: 90)
 * - level: Alert level (critical, high, medium, low)
 *
 * Query params:
 * - withinDays: number (optional, default: 90)
 * - level: string (optional, one of: critical, high, medium, low)
 *
 * Response:
 * {
 *   "alerts": [
 *     {
 *       "domain": "example.com",
 *       "expiryDate": "2026-03-15T00:00:00.000Z",
 *       "daysUntilExpiry": 36,
 *       "alertLevel": "medium",
 *       "status": "expiring_soon",
 *       "registrar": "HostingInfo",
 *       "recommendations": [...]
 *     }
 *   ],
 *   "count": 1
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { withinDays, level } = req.query;

    let alerts;

    if (level) {
      // Filter by alert level
      const validLevels = ["critical", "high", "medium", "low"];
      if (!validLevels.includes(level as string)) {
        return res.status(400).json({
          error: "Invalid alert level",
          message: "Level must be one of: critical, high, medium, low",
        });
      }
      alerts = await getDomainsByAlertLevel(
        level as "critical" | "high" | "medium" | "low",
      );
    } else {
      // Get all expiring domains within specified days
      const days = withinDays ? parseInt(withinDays as string, 10) : 90;
      if (isNaN(days) || days < 1) {
        return res.status(400).json({
          error: "Invalid withinDays parameter",
          message: "withinDays must be a positive integer",
        });
      }
      alerts = await getExpiringDomains(days);
    }

    return res.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("[Expiry Alerts API] Error:", error);
    return res.status(500).json({
      error: "Failed to get expiry alerts",
      message: "An internal error occurred",
    });
  }
}
