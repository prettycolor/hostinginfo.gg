/**
 * POST /api/seo-checklist/scan
 * Start a new SEO checklist scan
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { seoChecklistScans } from "../../../db/schema.js";
import { processScan } from "../../../lib/seo-checklist/scan-processor.js";
import { verifyToken } from "../../../lib/auth.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  try {
    const { target } = req.body;

    if (!target) {
      return res.status(400).json({ error: "Target domain/URL is required" });
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = decoded.userId;

    // Extract domain from target
    let domain = target;
    try {
      const url = new URL(
        target.startsWith("http") ? target : `https://${target}`,
      );
      domain = url.hostname;
    } catch {
      // Use target as-is if URL parsing fails
    }

    // Generate scan ID
    const scanId = randomUUID();

    // Create scan record
    await db.insert(seoChecklistScans).values({
      userId,
      scanId,
      domain,
      inputUrl: target,
      status: "pending",
    });

    // Start background processing (don't await)
    processScan(scanId).catch((error) => {
      console.error(`Background scan processing failed for ${scanId}:`, error);
    });

    // Return immediately
    res.json({
      scan_id: scanId,
      status_url: `/api/seo-checklist/scan/${scanId}`,
      status: "pending",
    });
  } catch (error) {
    console.error("Error starting SEO checklist scan:", error);
    res
      .status(500)
      .json({
        error: "Failed to start scan",
        message: "An internal error occurred",
      });
  }
}
