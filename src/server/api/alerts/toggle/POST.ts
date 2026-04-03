import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { alertSettings, claimedDomains } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";
import { validateBody, monitoringSchema } from "../../../middleware/index.js";

/**
 * POST /api/alerts/toggle
 * Enable or disable email alerts for a domain
 */
async function handler(req: Request, res: Response) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = decoded.userId;
    const { domain, enabled, alertTypes, thresholds } = req.body;
    // Validation handled by middleware

    // Verify user owns and has verified this domain
    const claimed = await db
      .select()
      .from(claimedDomains)
      .where(
        and(
          eq(claimedDomains.userId, userId),
          eq(claimedDomains.domain, domain),
          eq(claimedDomains.isVerified, true),
        ),
      )
      .limit(1);

    if (claimed.length === 0) {
      return res.status(403).json({
        error: "Domain not verified",
        message: "You must verify domain ownership before enabling alerts",
      });
    }

    // Check if alert settings already exist
    const existing = await db
      .select()
      .from(alertSettings)
      .where(
        and(eq(alertSettings.userId, userId), eq(alertSettings.domain, domain)),
      )
      .limit(1);

    const now = new Date();

    const updateData: Partial<typeof alertSettings.$inferInsert> = {
      enabled,
      updatedAt: now,
    };

    // Update alert types if provided
    if (alertTypes) {
      if (alertTypes.performance !== undefined)
        updateData.alertPerformance = alertTypes.performance;
      if (alertTypes.security !== undefined)
        updateData.alertSecurity = alertTypes.security;
      if (alertTypes.ssl !== undefined) updateData.alertSsl = alertTypes.ssl;
      if (alertTypes.downtime !== undefined)
        updateData.alertDowntime = alertTypes.downtime;
    }

    // Update thresholds if provided
    if (thresholds) {
      if (thresholds.performance !== undefined)
        updateData.performanceThreshold = thresholds.performance;
      if (thresholds.sslExpiry !== undefined)
        updateData.sslExpiryDays = thresholds.sslExpiry;
    }

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(alertSettings)
        .set(updateData)
        .where(eq(alertSettings.id, existing[0].id));
    } else {
      // Create new settings with defaults
      await db.insert(alertSettings).values({
        userId,
        domain,
        enabled,
        alertPerformance: alertTypes?.performance ?? true,
        alertSecurity: alertTypes?.security ?? true,
        alertSsl: alertTypes?.ssl ?? true,
        alertDowntime: alertTypes?.downtime ?? true,
        performanceThreshold: thresholds?.performance ?? 50,
        sslExpiryDays: thresholds?.sslExpiry ?? 30,
      });
    }

    res.json({
      success: true,
      message: enabled
        ? "Email alerts enabled. You will be notified of any issues."
        : "Email alerts disabled.",
    });
  } catch (error) {
    console.error("Toggle alerts error:", error);
    res.status(500).json({
      error: "Failed to update alert settings",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware (reusing monitoringSchema)
export default [validateBody(monitoringSchema), handler];
