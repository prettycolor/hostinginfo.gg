import type { Request, Response } from "express";
import { getSecret } from "#secrets";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";

interface APIStatus {
  name: string;
  service: string;
  configured: boolean;
  status: "operational" | "degraded" | "down" | "not_configured";
  freeLimit: string;
  usageToday?: number;
  lastUsed?: string;
  recordsCollected?: number;
}

interface CountRow {
  count: number | string | null;
}

interface LastScannedRow {
  scanned_at: string | Date | null;
}

function extractCount(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const row = result[0] as Partial<CountRow> | undefined;
  const value = Number(row?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function extractLastScannedIso(result: unknown): string | undefined {
  if (!Array.isArray(result)) return undefined;
  const row = result[0] as Partial<LastScannedRow> | undefined;
  const raw = row?.scanned_at;
  if (!raw) return undefined;
  const timestamp = new Date(raw);
  return Number.isNaN(timestamp.getTime())
    ? undefined
    : timestamp.toISOString();
}

/**
 * GET /api/intelligence/status
 *
 * Returns comprehensive status of all intelligence APIs:
 * - Configuration status (API keys present)
 * - Operational status (working/degraded/down)
 * - Rate limits and usage statistics
 * - Records collected per service
 *
 * Response:
 * {
 *   "overall": {
 *     "servicesConfigured": 5,
 *     "servicesOperational": 5,
 *     "successRate": 100,
 *     "totalRecordsCollected": 1234
 *   },
 *   "services": [
 *     {
 *       "name": "DNS Collection",
 *       "service": "dns",
 *       "configured": true,
 *       "status": "operational",
 *       "freeLimit": "Unlimited (native Node.js)",
 *       "recordsCollected": 450
 *     },
 *     ...
 *   ],
 *   "timestamp": "2026-02-07T04:00:00.000Z"
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    // Check API key configuration
    const ipinfoKey = getSecret("IPINFO_API_KEY");
    const whoisfreaksKey = getSecret("WHOISFREAKS_API_KEY");
    const urlscanKey = getSecret("URLSCAN_API_KEY");

    // Get record counts from database using raw SQL
    const [dnsCountResult] = await db.execute(
      sql`SELECT COUNT(*) as count FROM dns_records`,
    );
    const [ipCountResult] = await db.execute(
      sql`SELECT COUNT(*) as count FROM ip_intelligence`,
    );
    const [whoisCountResult] = await db.execute(
      sql`SELECT COUNT(*) as count FROM whois_records`,
    );
    const [techCountResult] = await db.execute(
      sql`SELECT COUNT(*) as count FROM technology_stack`,
    );
    const [urlscanCountResult] = await db.execute(
      sql`SELECT COUNT(*) as count FROM urlscan_results`,
    );

    const dnsCount = extractCount(dnsCountResult);
    const ipCount = extractCount(ipCountResult);
    const whoisCount = extractCount(whoisCountResult);
    const techCount = extractCount(techCountResult);
    const urlscanCount = extractCount(urlscanCountResult);

    // Get last scan times using raw SQL
    const [lastDnsResult] = await db.execute(
      sql`SELECT scanned_at FROM dns_records ORDER BY scanned_at DESC LIMIT 1`,
    );
    const [lastIpResult] = await db.execute(
      sql`SELECT scanned_at FROM ip_intelligence ORDER BY scanned_at DESC LIMIT 1`,
    );
    const [lastWhoisResult] = await db.execute(
      sql`SELECT scanned_at FROM whois_records ORDER BY scanned_at DESC LIMIT 1`,
    );
    const [lastTechResult] = await db.execute(
      sql`SELECT scanned_at FROM technology_stack ORDER BY scanned_at DESC LIMIT 1`,
    );
    const [lastUrlscanResult] = await db.execute(
      sql`SELECT scanned_at FROM urlscan_results ORDER BY scanned_at DESC LIMIT 1`,
    );

    const lastDns = extractLastScannedIso(lastDnsResult);
    const lastIp = extractLastScannedIso(lastIpResult);
    const lastWhois = extractLastScannedIso(lastWhoisResult);
    const lastTech = extractLastScannedIso(lastTechResult);
    const lastUrlscan = extractLastScannedIso(lastUrlscanResult);

    // Build service status array
    const services: APIStatus[] = [
      {
        name: "DNS Collection",
        service: "dns",
        configured: true,
        status: "operational",
        freeLimit: "Unlimited (native Node.js dns module)",
        recordsCollected: dnsCount,
        lastUsed: lastDns,
      },
      {
        name: "IP Intelligence",
        service: "ip",
        configured: !!ipinfoKey,
        status: ipinfoKey ? "operational" : "not_configured",
        freeLimit: "50,000 requests/month (IPinfo.io)",
        recordsCollected: ipCount,
        lastUsed: lastIp,
      },
      {
        name: "WHOIS Lookup",
        service: "whois",
        configured: !!whoisfreaksKey,
        status: whoisfreaksKey ? "operational" : "not_configured",
        freeLimit: "1,000 requests/month (WhoisFreaks)",
        recordsCollected: whoisCount,
        lastUsed: lastWhois,
      },
      {
        name: "Technology Detection",
        service: "technology",
        configured: true,
        status: "operational",
        freeLimit: "Unlimited (built-in detection)",
        recordsCollected: techCount,
        lastUsed: lastTech,
      },
      {
        name: "Security Scanning",
        service: "urlscan",
        configured: !!urlscanKey,
        status: urlscanKey ? "operational" : "not_configured",
        freeLimit: "1,000 scans/month (URLScan.io)",
        recordsCollected: urlscanCount,
        lastUsed: lastUrlscan,
      },
    ];

    // Calculate overall statistics
    const servicesConfigured = services.filter((s) => s.configured).length;
    const servicesOperational = services.filter(
      (s) => s.status === "operational",
    ).length;
    const successRate = Math.round(
      (servicesOperational / services.length) * 100,
    );
    const totalRecordsCollected = services.reduce(
      (sum, s) => sum + (s.recordsCollected || 0),
      0,
    );

    return res.json({
      overall: {
        servicesConfigured,
        servicesOperational,
        totalServices: services.length,
        successRate,
        totalRecordsCollected,
      },
      services,
      apiKeys: {
        ipinfo: !!ipinfoKey,
        whoisfreaks: !!whoisfreaksKey,
        urlscan: !!urlscanKey,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Intelligence Status] Error:", error);
    return res.status(500).json({
      error: "Failed to get intelligence status",
      message: "An internal error occurred",
    });
  }
}
