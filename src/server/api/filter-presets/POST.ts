import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { filterPresets } from "../../db/schema.js";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";

function isFilterObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const {
      name,
      filters,
      isDefault = false,
    } = req.body as {
      name?: unknown;
      filters?: unknown;
      isDefault?: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Preset name is required",
      });
    }

    if (!isFilterObject(filters)) {
      return res.status(400).json({
        success: false,
        error: "Preset filters must be an object",
      });
    }

    const insertResult = await db.insert(filterPresets).values({
      userId,
      name: name.trim(),
      filters,
      isDefault: Boolean(isDefault),
    });

    const presetId = Number(insertResult[0].insertId);
    const [preset] = await db
      .select()
      .from(filterPresets)
      .where(eq(filterPresets.id, presetId))
      .limit(1);

    res.status(201).json({
      success: true,
      preset: {
        id: preset.id.toString(),
        name: preset.name,
        filters: preset.filters,
        createdAt: preset.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: preset.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating filter preset:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create filter preset",
      message: "An internal error occurred",
    });
  }
}
