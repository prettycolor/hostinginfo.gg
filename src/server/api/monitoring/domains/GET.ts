import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { monitoringConfig, uptimeChecks } from "../../../db/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Fetch all monitoring configurations for the user
    const configs = await db
      .select()
      .from(monitoringConfig)
      .where(eq(monitoringConfig.userId, userId));

    // For each config, get the latest uptime check and calculate stats
    const domains = await Promise.all(
      configs.map(async (config) => {
        // Get latest check
        const latestCheck = await db
          .select()
          .from(uptimeChecks)
          .where(eq(uptimeChecks.monitoringConfigId, config.id))
          .orderBy(desc(uptimeChecks.checkedAt))
          .limit(1);

        // Calculate uptime percentage (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentChecks = await db
          .select()
          .from(uptimeChecks)
          .where(
            and(
              eq(uptimeChecks.monitoringConfigId, config.id),
              gte(uptimeChecks.checkedAt, oneDayAgo),
            ),
          );

        const upChecks = recentChecks.filter((c) => c.status === "up").length;
        const uptime =
          recentChecks.length > 0
            ? (upChecks / recentChecks.length) * 100
            : 100;

        // Calculate average response time
        const avgResponseTime =
          recentChecks.length > 0
            ? Math.round(
                recentChecks.reduce(
                  (sum, c) => sum + (c.responseTime || 0),
                  0,
                ) / recentChecks.length,
              )
            : 0;

        return {
          id: config.id,
          domain: config.domain,
          status: latestCheck[0]?.status || "unknown",
          uptime: Math.round(uptime * 100) / 100,
          responseTime: latestCheck[0]?.responseTime || avgResponseTime,
          lastCheck:
            latestCheck[0]?.checkedAt?.toISOString() ||
            new Date().toISOString(),
          enabled: config.enabled,
          checkInterval: config.checkInterval,
          regions: config.regions || [],
        };
      }),
    );

    res.json({ domains });
  } catch (error) {
    console.error("Failed to fetch monitored domains:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch monitored domains",
        message: "An internal error occurred",
      });
  }
}
