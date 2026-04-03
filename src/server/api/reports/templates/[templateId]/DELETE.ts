/**
 * DELETE /api/reports/templates/:templateId
 *
 * Delete a custom template
 */

import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { reportTemplates } from "../../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { SYSTEM_TEMPLATES } from "../../../../lib/reports/templates.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const templateId = req.params.templateId;

    // Prevent deletion of system templates
    if (SYSTEM_TEMPLATES.find((t) => t.id === templateId)) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete system templates",
      });
    }

    const numericId = parseInt(templateId);
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid template ID",
      });
    }
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Check if template exists and belongs to user
    const template = await db
      .select()
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, numericId),
          eq(reportTemplates.userId, userId),
        ),
      )
      .limit(1);

    if (!template.length) {
      return res.status(404).json({
        success: false,
        error: "Template not found or you do not have permission to delete it",
      });
    }

    // Delete template
    await db
      .delete(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, numericId),
          eq(reportTemplates.userId, userId),
        ),
      );

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete template",
      message: "An internal error occurred",
    });
  }
}
