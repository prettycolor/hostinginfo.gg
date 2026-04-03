import type { Request, Response } from "express";
import { createOwnershipClusters } from "../../../../lib/ownership-correlation.js";

/**
 * POST /api/intelligence/ownership/clusters
 *
 * Create ownership clusters from a list of domains
 *
 * Body:
 * - domains: string[] - Array of domain names
 * - minClusterSize: number (optional, default: 2) - Minimum domains per cluster
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domains, minClusterSize = 2 } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        error: "domains array is required and must not be empty",
      });
    }

    if (domains.length > 1000) {
      return res.status(400).json({
        error: "Maximum 1000 domains allowed per request",
      });
    }

    if (minClusterSize < 2) {
      return res.status(400).json({
        error: "minClusterSize must be at least 2",
      });
    }

    const clusters = await createOwnershipClusters(domains, minClusterSize);

    // Calculate statistics
    const totalClustered = clusters.reduce((sum, c) => sum + c.clusterSize, 0);
    const unclustered = domains.length - totalClustered;

    return res.json({
      totalDomains: domains.length,
      totalClusters: clusters.length,
      totalClustered,
      unclustered,
      clusters,
    });
  } catch (error) {
    console.error("[Ownership Clusters API] Error:", error);
    return res.status(500).json({
      error: "Failed to create ownership clusters",
      message: "An internal error occurred",
    });
  }
}
