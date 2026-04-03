/**
 * POST /api/reports/templates
 *
 * Create a custom report template
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { reportTemplates } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { name, description, type, sections } = req.body;

    if (!name || !type || !sections) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, type, sections",
      });
    }
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    // Validate type
    const validTypes = [
      "performance",
      "security",
      "uptime",
      "comprehensive",
      "comparison",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Create template
    const insertResult = await db.insert(reportTemplates).values({
      userId,
      name,
      description,
      type,
      sections: Array.isArray(sections) ? sections : [],
      isCustom: true,
      isSystem: false,
    });

    const templateId = Number(insertResult[0].insertId);

    // Fetch created template
    const newTemplate = await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, templateId))
      .limit(1);

    res.status(201).json({
      success: true,
      template: newTemplate[0],
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create template",
      message: "An internal error occurred",
    });
  }
}
