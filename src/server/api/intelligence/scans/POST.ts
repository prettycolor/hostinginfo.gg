import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { intelligenceScans } from "../../../db/schema.js";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";

export default async function handler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { domain, hostingData, dnsData, ipData, techData, scanDuration } =
      req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Extract summary data
    const edgeProvider = hostingData?.edgeProvider || null;
    const edgeConfidence = hostingData?.edgeConfidence || null;
    const originHost = hostingData?.originHost || null;
    const originConfidence = hostingData?.originConfidence || null;
    const confidenceScore = hostingData?.confidenceScore || null;
    const detectionMethod = hostingData?.detectionMethod || null;
    const techCount = techData?.technologies?.length || 0;
    const recordCount = dnsData?.records?.length || 0;
    const openPorts = ipData?.openPorts
      ? JSON.stringify(ipData.openPorts)
      : null;

    // Insert scan result
    const result = await db.insert(intelligenceScans).values({
      userId,
      domain,
      edgeProvider,
      edgeConfidence,
      originHost,
      originConfidence,
      confidenceScore,
      detectionMethod,
      hostingData: JSON.stringify(hostingData),
      dnsData: JSON.stringify(dnsData),
      ipData: JSON.stringify(ipData),
      techData: JSON.stringify(techData),
      techCount,
      recordCount,
      openPorts,
      scanDuration,
    });

    const insertId = Number(result[0].insertId);

    res.status(201).json({
      success: true,
      scanId: insertId,
      message: "Scan saved successfully",
    });
  } catch (error) {
    console.error("Failed to save intelligence scan:", error);
    res.status(500).json({
      error: "Failed to save scan",
      message: "An internal error occurred",
    });
  }
}
