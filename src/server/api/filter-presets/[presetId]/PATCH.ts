import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { filterPresets } from "../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

function isFilterObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const presetId = Number(req.params.presetId);
    if (!Number.isInteger(presetId) || presetId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid preset ID",
      });
    }

    const { name, filters, isDefault } = req.body as {
      name?: unknown;
      filters?: unknown;
      isDefault?: unknown;
    };

    const [existing] = await db
      .select()
      .from(filterPresets)
      .where(
        and(eq(filterPresets.id, presetId), eq(filterPresets.userId, userId)),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Preset not found",
      });
    }

    const updateData: Partial<typeof filterPresets.$inferInsert> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Preset name cannot be empty",
        });
      }
      updateData.name = name.trim();
    }

    if (filters !== undefined) {
      if (!isFilterObject(filters)) {
        return res.status(400).json({
          success: false,
          error: "Preset filters must be an object",
        });
      }
      updateData.filters = filters;
    }

    if (isDefault !== undefined) {
      updateData.isDefault = Boolean(isDefault);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update",
      });
    }

    await db
      .update(filterPresets)
      .set(updateData)
      .where(
        and(eq(filterPresets.id, presetId), eq(filterPresets.userId, userId)),
      );

    const [updated] = await db
      .select()
      .from(filterPresets)
      .where(
        and(eq(filterPresets.id, presetId), eq(filterPresets.userId, userId)),
      )
      .limit(1);

    res.json({
      success: true,
      preset: {
        id: updated.id.toString(),
        name: updated.name,
        filters: updated.filters,
        createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating filter preset:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update filter preset",
      message: "An internal error occurred",
    });
  }
}
