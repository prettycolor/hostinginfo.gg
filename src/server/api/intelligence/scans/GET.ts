import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { intelligenceScans } from "../../../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

function parseJsonSafe<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { domain, limit = "10" } = req.query;
    const parsedLimit = Math.min(
      Math.max(parseInt(String(limit), 10) || 10, 1),
      100,
    );
    const conditions = [eq(intelligenceScans.userId, userId)];
    if (typeof domain === "string" && domain.trim().length > 0) {
      conditions.push(
        eq(intelligenceScans.domain, domain.trim().toLowerCase()),
      );
    }

    const scans = await db
      .select()
      .from(intelligenceScans)
      .where(and(...conditions))
      .orderBy(desc(intelligenceScans.createdAt))
      .limit(parsedLimit);

    // Parse JSON fields
    const parsedScans = scans.map((scan) => ({
      ...scan,
      hostingData: parseJsonSafe(scan.hostingData, null),
      dnsData: parseJsonSafe(scan.dnsData, null),
      ipData: parseJsonSafe(scan.ipData, null),
      techData: parseJsonSafe(scan.techData, null),
      openPorts: parseJsonSafe(scan.openPorts, [] as unknown[]),
    }));

    res.json({
      success: true,
      scans: parsedScans,
      count: parsedScans.length,
    });
  } catch (error) {
    console.error("Failed to fetch intelligence scans:", error);
    res.status(500).json({
      error: "Failed to fetch scans",
      message: "An internal error occurred",
    });
  }
}
