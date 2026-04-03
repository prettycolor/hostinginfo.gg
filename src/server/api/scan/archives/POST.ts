import type { Request, Response } from "express";
import { getRedisClient } from "@/server/lib/cache/redis-client.js";

interface ArchivesRequest {
  domain: string;
  limit?: number;
  fromYear?: number;
  toYear?: number;
  collapseMonthly?: boolean;
}

interface Archive {
  timestamp: string;
  date: string;
  url: string;
  originalUrl: string;
  statusCode: number;
  mimeType: string;
  contentLength: number;
  digest: string;
}

interface ArchivesResponse {
  domain: string;
  totalSnapshots: number;
  workingSnapshots: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
  yearRange: string;
  archives: Archive[];
}

/**
 * Web Archives API - Find working snapshots from Wayback Machine
 *
 * Uses CDX Server API to fetch all archived snapshots with filters:
 * - statuscode:200 (only working archives)
 * - mimetype:text/html (only HTML pages)
 * - collapse:timestamp:6 (group by month to reduce duplicates)
 *
 * Returns clean list of working archives with metadata.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const {
      domain,
      limit = 50,
      fromYear,
      toYear,
      collapseMonthly = true,
    } = req.body as ArchivesRequest;

    // Validate domain
    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Clean domain (remove http://, https://, www.)
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .trim();

    if (!cleanDomain) {
      return res.status(400).json({ error: "Invalid domain" });
    }

    // Check cache first (7 day TTL)
    const cacheKey = `archives:${cleanDomain}:${fromYear || "all"}:${toYear || "current"}`;
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`[Archives] Cache hit for ${cleanDomain}`);
      const cachedData = JSON.parse(cached) as ArchivesResponse;
      // Apply limit to cached data
      return res.json({
        ...cachedData,
        archives: cachedData.archives.slice(0, limit),
        fromCache: true,
      });
    }

    console.log(`[Archives] Fetching archives for ${cleanDomain}`);

    // Build CDX API URL
    const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
    cdxUrl.searchParams.set("url", cleanDomain);
    cdxUrl.searchParams.set("output", "json");
    cdxUrl.searchParams.set("filter", "statuscode:200");
    cdxUrl.searchParams.set("filter", "mimetype:text/html");

    if (collapseMonthly) {
      cdxUrl.searchParams.set("collapse", "timestamp:6"); // Group by month
    }

    cdxUrl.searchParams.set("limit", "1000"); // Fetch up to 1000 snapshots

    // Add date range filters if provided
    if (fromYear) {
      cdxUrl.searchParams.set("from", `${fromYear}0101`);
    }
    if (toYear) {
      cdxUrl.searchParams.set("to", `${toYear}1231`);
    }

    // Fetch from Wayback Machine CDX API
    const response = await fetch(cdxUrl.toString(), {
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis Tool)",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`CDX API returned ${response.status}`);
    }

    const data = await response.json();

    // CDX API returns array of arrays: [header, ...rows]
    // Format: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
    if (!Array.isArray(data) || data.length === 0) {
      // No archives found
      const emptyResponse: ArchivesResponse = {
        domain: cleanDomain,
        totalSnapshots: 0,
        workingSnapshots: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        yearRange: "No archives",
        archives: [],
      };

      // Cache empty result for 1 day
      await redis.set(cacheKey, JSON.stringify(emptyResponse), "EX", 86400);

      return res.json(emptyResponse);
    }

    // Skip header row
    const rows = data.slice(1);

    // Parse archives
    const archives: Archive[] = rows.map((row: string[]) => {
      const [, timestamp, original, mimetype, statuscode, digest, length] = row;

      // Parse timestamp (YYYYMMDDHHMMSS)
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(8, 10);
      const minute = timestamp.substring(10, 12);
      const second = timestamp.substring(12, 14);

      const date = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
      );
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return {
        timestamp,
        date: formattedDate,
        url: `https://web.archive.org/web/${timestamp}/${original}`,
        originalUrl: original,
        statusCode: parseInt(statuscode, 10),
        mimeType: mimetype,
        contentLength: parseInt(length, 10) || 0,
        digest,
      };
    });

    // Sort by timestamp descending (newest first)
    archives.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Remove duplicates (same digest hash)
    const uniqueArchives = archives.filter((archive, index, self) => {
      return index === self.findIndex((a) => a.digest === archive.digest);
    });

    // Calculate stats
    const totalSnapshots = rows.length;
    const workingSnapshots = uniqueArchives.length;
    const oldestSnapshot =
      uniqueArchives.length > 0
        ? uniqueArchives[uniqueArchives.length - 1].date
        : null;
    const newestSnapshot =
      uniqueArchives.length > 0 ? uniqueArchives[0].date : null;

    // Calculate year range
    let yearRange = "No archives";
    if (uniqueArchives.length > 0) {
      const oldestYear = uniqueArchives[
        uniqueArchives.length - 1
      ].timestamp.substring(0, 4);
      const newestYear = uniqueArchives[0].timestamp.substring(0, 4);
      yearRange =
        oldestYear === newestYear
          ? oldestYear
          : `${oldestYear} - ${newestYear}`;
    }

    const result: ArchivesResponse = {
      domain: cleanDomain,
      totalSnapshots,
      workingSnapshots,
      oldestSnapshot,
      newestSnapshot,
      yearRange,
      archives: uniqueArchives.slice(0, limit), // Apply limit
    };

    // Cache for 7 days
    await redis.set(cacheKey, JSON.stringify(result), "EX", 7 * 24 * 60 * 60);

    console.log(
      `[Archives] Found ${workingSnapshots} working archives for ${cleanDomain}`,
    );

    res.json(result);
  } catch (error) {
    console.error("[Archives] Error:", error);

    // Check if it's a timeout
    if (error instanceof Error && error.name === "AbortError") {
      return res.status(504).json({
        error: "Request timeout",
        message: "Wayback Machine API took too long to respond",
      });
    }

    res.status(500).json({
      error: "Failed to fetch archives",
      message: "An internal error occurred",
    });
  }
}
