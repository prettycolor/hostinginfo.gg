import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { filterPresets } from "../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

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

    await db
      .delete(filterPresets)
      .where(
        and(eq(filterPresets.id, presetId), eq(filterPresets.userId, userId)),
      );

    res.json({
      success: true,
      message: "Preset deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting filter preset:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete filter preset",
      message: "An internal error occurred",
    });
  }
}
