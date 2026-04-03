/**
 * POST /api/intelligence/urlscan/:domain
 *
 * Perform URLScan security and performance analysis
 */

import type { Request, Response } from "express";
import {
  performURLScan,
  analyzeURLScanResults,
} from "../../../../lib/intelligence/urlscan-integration.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Perform URLScan
    const results = await performURLScan(domain);

    // Analyze results
    const analysis = analyzeURLScanResults(results);

    res.json({
      ...results,
      analysis,
    });
  } catch (error) {
    console.error("URLScan error:", error);

    // Check if rate limit error
    if (error instanceof Error && error.message.includes("Rate limit")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "An internal error occurred",
      });
    }

    // Check if API key error
    if (error instanceof Error && error.message.includes("API key")) {
      return res.status(503).json({
        error: "URLScan API not configured",
        message: "An internal error occurred",
      });
    }

    res.status(500).json({
      error: "Failed to perform URLScan",
      message: "An internal error occurred",
    });
  }
}
