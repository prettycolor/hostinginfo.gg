import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { monitoringSettings, claimedDomains } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "../../../lib/auth.js";
import { validateBody, monitoringSchema } from "../../../middleware/index.js";

/**
 * POST /api/monitoring/toggle
 * Enable or disable automated monitoring for a domain
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
    const { domain, enabled, clientTag } = req.body;
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
        message: "You must verify domain ownership before enabling monitoring",
      });
    }

    // Check if monitoring settings already exist
    const existing = await db
      .select()
      .from(monitoringSettings)
      .where(
        and(
          eq(monitoringSettings.userId, userId),
          eq(monitoringSettings.domain, domain),
        ),
      )
      .limit(1);

    const now = new Date();
    const nextScan = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(monitoringSettings)
        .set({
          enabled,
          clientTag: clientTag || null,
          nextScanAt: enabled ? nextScan : null,
          updatedAt: now,
        })
        .where(eq(monitoringSettings.id, existing[0].id));
    } else {
      // Create new settings
      await db.insert(monitoringSettings).values({
        userId,
        domain,
        enabled,
        clientTag: clientTag || null,
        frequency: "daily",
        nextScanAt: enabled ? nextScan : null,
      });
    }

    res.json({
      success: true,
      message: enabled
        ? "Automated monitoring enabled. Daily scans will begin within 24 hours."
        : "Automated monitoring disabled.",
    });
  } catch (error) {
    console.error("Toggle monitoring error:", error);
    res.status(500).json({
      error: "Failed to update monitoring settings",
      message: "An internal error occurred",
    });
  }
}

// Export with validation middleware
export default [validateBody(monitoringSchema), handler];
