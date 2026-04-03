import type { Request, Response } from "express";
import { buildOwnershipGraph } from "../../../../../lib/ownership-correlation.js";

/**
 * GET /api/intelligence/ownership/graph/:domain
 *
 * Build ownership graph showing all related domains
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        error: "Domain parameter is required",
      });
    }

    const graph = await buildOwnershipGraph(domain);

    if (!graph) {
      return res.status(404).json({
        error: "No ownership data found",
        message: "Domain has not been scanned yet",
      });
    }

    return res.json(graph);
  } catch (error) {
    console.error("[Ownership Graph API] Error:", error);
    return res.status(500).json({
      error: "Failed to build ownership graph",
      message: "An internal error occurred",
    });
  }
}
