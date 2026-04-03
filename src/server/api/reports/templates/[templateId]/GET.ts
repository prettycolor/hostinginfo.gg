/**
 * GET /api/reports/templates/:templateId
 *
 * Get a specific template by ID
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { reportTemplates } from "../../../../db/schema.js";
import { eq, and, or } from "drizzle-orm";
import { SYSTEM_TEMPLATES } from "../../../../lib/reports/templates.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const templateId = req.params.templateId;
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Check if it's a system template
    const systemTemplate = SYSTEM_TEMPLATES.find((t) => t.id === templateId);
    if (systemTemplate) {
      return res.json({
        success: true,
        template: {
          ...systemTemplate,
          isCustom: false,
        },
      });
    }

    // Check custom templates
    const numericId = parseInt(templateId);
    if (isNaN(numericId)) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const template = await db
      .select()
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, numericId),
          or(
            eq(reportTemplates.userId, userId),
            eq(reportTemplates.isSystem, true),
          ),
        ),
      )
      .limit(1);

    if (!template.length) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    res.json({
      success: true,
      template: {
        ...template[0],
        sections: template[0].sections ?? [],
        isCustom: true,
      },
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
      message: "An internal error occurred",
    });
  }
}
