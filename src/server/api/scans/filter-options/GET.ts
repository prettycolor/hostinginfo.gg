/**
 * GET /api/scans/filter-options
 * Returns available filter options (technologies, hosting providers, etc.)
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { scanHistory } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";
import { extractCanonicalHostingProviderFromScanData } from "../../../lib/hosting-provider-canonical.js";

function parseScanData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed payloads.
  }

  return {};
}

function getNestedRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

function getTechnologyName(scanData: Record<string, unknown>): string | null {
  const technology = getNestedRecord(scanData, "technology");
  return toStringValue(technology.name) ?? toStringValue(scanData.platform);
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const rows = await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId));

    const technologiesSet = new Set<string>();
    const hostingProvidersSet = new Set<string>();

    rows.forEach((row) => {
      const parsed = parseScanData(row.scanData);
      const technologyName = getTechnologyName(parsed);
      const hostingProvider =
        extractCanonicalHostingProviderFromScanData(parsed);

      if (technologyName) {
        technologiesSet.add(technologyName);
      }
      if (hostingProvider) {
        hostingProvidersSet.add(hostingProvider);
      }
    });

    const technologies = Array.from(technologiesSet).sort();
    const hostingProviders = Array.from(hostingProvidersSet).sort();

    res.json({
      technologies,
      hostingProviders,
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
}
