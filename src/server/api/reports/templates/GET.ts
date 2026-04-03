/**
 * GET /api/reports/templates
 *
 * List all available report templates (system + custom)
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { reportTemplates } from "../../../db/schema.js";
import { eq, or } from "drizzle-orm";
import { SYSTEM_TEMPLATES } from "../../../lib/reports/templates.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Get custom templates (user's own + system templates)
    const customTemplates = await db
      .select()
      .from(reportTemplates)
      .where(
        or(
          eq(reportTemplates.userId, userId),
          eq(reportTemplates.isSystem, true),
        ),
      );

    // Combine system and custom templates
    const allTemplates = [
      ...SYSTEM_TEMPLATES.map((t) => ({
        ...t,
        isCustom: false,
      })),
      ...customTemplates.map((t) => ({
        id: t.id.toString(),
        name: t.name,
        description: t.description || "",
        type: t.type,
        sections: t.sections ?? [],
        isSystem: t.isSystem || false,
        isCustom: true,
      })),
    ];

    res.json({
      success: true,
      templates: allTemplates,
      count: allTemplates.length,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
      message: "An internal error occurred",
    });
  }
}
