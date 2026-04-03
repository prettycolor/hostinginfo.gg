import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { intelligenceScans } from "../../../db/schema.js";
import { eq, desc } from "drizzle-orm";

interface Change {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
}

interface ScanWithChanges {
  id: number;
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number | null;
  techCount: number;
  createdAt: string;
  changes: Change[];
  hostingData: unknown;
  dnsData: unknown;
  ipData: unknown;
  techData: unknown;
}

function toIsoString(value: Date | null): string {
  return (value ?? new Date(0)).toISOString();
}

interface TechStackTechnology {
  name?: string;
}

interface TechStackData {
  technologies?: TechStackTechnology[];
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({
        success: false,
        error: "Domain parameter is required",
      });
    }

    // Fetch all scans for this domain, ordered by date
    const scans = await db
      .select()
      .from(intelligenceScans)
      .where(eq(intelligenceScans.domain, domain))
      .orderBy(desc(intelligenceScans.createdAt));

    if (scans.length === 0) {
      return res.json({
        success: true,
        scans: [],
        count: 0,
        message: "No scans found for this domain",
      });
    }

    // Parse JSON fields and detect changes
    const scansWithChanges: ScanWithChanges[] = [];

    for (let i = 0; i < scans.length; i++) {
      const scan = scans[i];
      const changes: Change[] = [];

      // Compare with previous scan (if exists)
      if (i < scans.length - 1) {
        const prevScan = scans[i + 1];
        const scanCreatedAt = toIsoString(scan.createdAt);
        const scanTechCount = scan.techCount ?? 0;
        const prevScanTechCount = prevScan.techCount ?? 0;

        // Check edge provider change
        if (scan.edgeProvider !== prevScan.edgeProvider) {
          changes.push({
            field: "Edge Provider",
            oldValue: prevScan.edgeProvider,
            newValue: scan.edgeProvider,
            timestamp: scanCreatedAt,
          });
        }

        // Check origin host change
        if (scan.originHost !== prevScan.originHost) {
          changes.push({
            field: "Origin Host",
            oldValue: prevScan.originHost,
            newValue: scan.originHost,
            timestamp: scanCreatedAt,
          });
        }

        // Check confidence score change (significant = >10 point difference)
        if (
          scan.confidenceScore !== null &&
          prevScan.confidenceScore !== null &&
          Math.abs(scan.confidenceScore - prevScan.confidenceScore) >= 10
        ) {
          changes.push({
            field: "Confidence Score",
            oldValue: prevScan.confidenceScore,
            newValue: scan.confidenceScore,
            timestamp: scanCreatedAt,
          });
        }

        // Check tech count change (significant = >3 tech difference)
        if (Math.abs(scanTechCount - prevScanTechCount) >= 3) {
          changes.push({
            field: "Technology Count",
            oldValue: prevScanTechCount,
            newValue: scanTechCount,
            timestamp: scanCreatedAt,
          });
        }

        // Deep tech stack comparison
        try {
          const currentTech = parseJson<TechStackData>(scan.techData);
          const prevTech = parseJson<TechStackData>(prevScan.techData);

          if (currentTech?.technologies && prevTech?.technologies) {
            const currentTechNames = currentTech.technologies
              .map((t) => t.name)
              .filter(
                (name): name is string =>
                  typeof name === "string" && name.length > 0,
              );
            const prevTechNames = prevTech.technologies
              .map((t) => t.name)
              .filter(
                (name): name is string =>
                  typeof name === "string" && name.length > 0,
              );

            // New technologies
            const addedTech = currentTechNames.filter(
              (name: string) => !prevTechNames.includes(name),
            );
            if (addedTech.length > 0) {
              changes.push({
                field: "Technologies Added",
                oldValue: null,
                newValue: addedTech.join(", "),
                timestamp: scanCreatedAt,
              });
            }

            // Removed technologies
            const removedTech = prevTechNames.filter(
              (name: string) => !currentTechNames.includes(name),
            );
            if (removedTech.length > 0) {
              changes.push({
                field: "Technologies Removed",
                oldValue: removedTech.join(", "),
                newValue: null,
                timestamp: scanCreatedAt,
              });
            }
          }
        } catch (err) {
          console.error("Error comparing tech stacks:", err);
        }
      }

      scansWithChanges.push({
        id: scan.id,
        domain: scan.domain,
        edgeProvider: scan.edgeProvider,
        originHost: scan.originHost,
        confidenceScore: scan.confidenceScore,
        techCount: scan.techCount ?? 0,
        createdAt: toIsoString(scan.createdAt),
        changes,
        hostingData: parseJson(scan.hostingData),
        dnsData: parseJson(scan.dnsData),
        ipData: parseJson(scan.ipData),
        techData: parseJson(scan.techData),
      });
    }

    // Calculate summary statistics
    const totalChanges = scansWithChanges.reduce(
      (sum, scan) => sum + scan.changes.length,
      0,
    );
    const hasHostingChanges = scansWithChanges.some((scan) =>
      scan.changes.some(
        (c) => c.field === "Edge Provider" || c.field === "Origin Host",
      ),
    );
    const hasTechChanges = scansWithChanges.some((scan) =>
      scan.changes.some((c) => c.field.includes("Technologies")),
    );

    return res.json({
      success: true,
      scans: scansWithChanges,
      count: scansWithChanges.length,
      summary: {
        totalScans: scansWithChanges.length,
        totalChanges,
        hasHostingChanges,
        hasTechChanges,
        firstScan: scansWithChanges[scansWithChanges.length - 1]?.createdAt,
        lastScan: scansWithChanges[0]?.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching intelligence history:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch intelligence history",
      message: "An internal error occurred",
    });
  }
}
