import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { monitoringConfig, uptimeChecks } from "../../../../db/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;
    const { range = "24h" } = req.query;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Get monitoring config for this domain
    const config = await db
      .select()
      .from(monitoringConfig)
      .where(eq(monitoringConfig.domain, domain))
      .limit(1);

    if (config.length === 0) {
      return res.status(404).json({ error: "Domain not found in monitoring" });
    }

    // Calculate time range
    let startTime: Date;
    switch (range) {
      case "7d":
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "24h":
      default:
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
    }

    // Fetch uptime checks
    const checks = await db
      .select({
        timestamp: uptimeChecks.checkedAt,
        status: uptimeChecks.status,
        responseTime: uptimeChecks.responseTime,
        region: uptimeChecks.region,
      })
      .from(uptimeChecks)
      .where(
        and(
          eq(uptimeChecks.monitoringConfigId, config[0].id),
          gte(uptimeChecks.checkedAt, startTime),
        ),
      )
      .orderBy(desc(uptimeChecks.checkedAt))
      .limit(1000);

    // Format the data
    const formattedChecks = checks.map((check) => ({
      timestamp: check.timestamp?.toISOString() || new Date().toISOString(),
      status: check.status,
      responseTime: check.responseTime || 0,
      region: check.region || "unknown",
    }));

    res.json({ checks: formattedChecks });
  } catch (error) {
    console.error("Failed to fetch uptime data:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch uptime data",
        message: "An internal error occurred",
      });
  }
}
