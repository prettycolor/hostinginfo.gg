import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { filterPresets } from "../../db/schema.js";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

function normalizeFilters(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const presets = await db
      .select()
      .from(filterPresets)
      .where(eq(filterPresets.userId, userId))
      .orderBy(desc(filterPresets.updatedAt), desc(filterPresets.createdAt));

    res.json({
      success: true,
      presets: presets.map((preset) => ({
        id: preset.id.toString(),
        name: preset.name,
        filters: normalizeFilters(preset.filters),
        createdAt: preset.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: preset.updatedAt?.toISOString() ?? new Date().toISOString(),
      })),
      count: presets.length,
    });
  } catch (error) {
    console.error("Error fetching filter presets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch filter presets",
      message: "An internal error occurred",
    });
  }
}
