import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { intelligenceScans } from "../../../../db/schema.js";
import { requireAuthenticatedUserId } from "../../../../lib/request-auth.js";

type JsonObject = Record<string, unknown>;

function parseJsonSafe<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toRecord(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildReportFromStoredData(
  domain: string,
  createdAt: string,
  hostingData: JsonObject,
  dnsData: JsonObject,
  ipData: JsonObject,
  techData: JsonObject,
): JsonObject {
  const infrastructure = toRecord(hostingData.infrastructure);
  const security = toRecord(hostingData.security);
  const whois = toRecord(ipData.whois);

  const ipAddresses = toArray<string>(ipData.ipAddresses).filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  const report: JsonObject = {
    domain,
    security: {
      overall: toNumber(security.overall, 0),
      grade: toStringValue(security.grade) || "N/A",
      categories: {
        dns: toNumber(toRecord(security.categories).dns, 0),
        ssl: toNumber(toRecord(security.categories).ssl, 0),
        malware: toNumber(toRecord(security.categories).malware, 0),
        email: toNumber(toRecord(security.categories).email, 0),
        technology: toNumber(toRecord(security.categories).technology, 0),
      },
      issues: toArray(security.issues),
    },
    whois: {
      domain,
      registrar: toStringValue(whois.registrar) || "Unknown",
      creationDate: toStringValue(whois.creationDate),
      expirationDate: toStringValue(whois.expirationDate),
      updatedDate: toStringValue(whois.updatedDate),
      nameservers: toArray<string>(whois.nameservers),
      status: toArray<string>(whois.status),
      dnssecEnabled: toBoolean(whois.dnssecEnabled),
      transferLock: toBoolean(whois.transferLock),
      daysUntilExpiry: toNumber(whois.daysUntilExpiry, 0),
    },
    infrastructure: {
      hostingProvider:
        toStringValue(infrastructure.hostingProvider) || "Unknown",
      providerType: toStringValue(infrastructure.providerType) || "unknown",
      cdn: toStringValue(infrastructure.cdn) || undefined,
      ipAddress: ipAddresses[0] || "",
      ipVersion: toStringValue(infrastructure.ipVersion) || undefined,
      asn:
        toStringValue(ipData.asn) ||
        toStringValue(infrastructure.asn) ||
        undefined,
      asnOrg: toStringValue(infrastructure.asnOrg) || undefined,
      datacenterLocation:
        toStringValue(ipData.location) ||
        toStringValue(infrastructure.datacenterLocation) ||
        undefined,
      reverseProxy: toBoolean(infrastructure.reverseProxy),
      loadBalancer: toBoolean(infrastructure.loadBalancer),
      isSharedHosting: toBoolean(infrastructure.isSharedHosting),
    },
    dns: toArray(dnsData.records),
    technologies: toArray(techData.technologies),
    recommendations: toArray(hostingData.recommendations),
    generatedAt: createdAt,
    lastScanned: createdAt,
  };

  return report;
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const scanId = Number(req.params.scanId);
    if (!Number.isInteger(scanId) || scanId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid scan ID",
      });
    }

    const [scan] = await db
      .select()
      .from(intelligenceScans)
      .where(
        and(
          eq(intelligenceScans.id, scanId),
          eq(intelligenceScans.userId, userId),
        ),
      )
      .limit(1);

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    const hostingData = parseJsonSafe<JsonObject>(scan.hostingData, {});
    const dnsData = parseJsonSafe<JsonObject>(scan.dnsData, {});
    const ipData = parseJsonSafe<JsonObject>(scan.ipData, {});
    const techData = parseJsonSafe<JsonObject>(scan.techData, {});
    const openPorts = parseJsonSafe(scan.openPorts, [] as unknown[]);

    const snapshot = toRecord(hostingData.reportSnapshot);
    const report =
      Object.keys(snapshot).length > 0
        ? snapshot
        : buildReportFromStoredData(
            scan.domain,
            scan.createdAt
              ? new Date(scan.createdAt).toISOString()
              : new Date().toISOString(),
            hostingData,
            dnsData,
            ipData,
            techData,
          );

    res.json({
      success: true,
      scan: {
        ...scan,
        hostingData,
        dnsData,
        ipData,
        techData,
        openPorts,
      },
      report,
    });
  } catch (error) {
    console.error("Failed to load intelligence scan detail:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load intelligence scan detail",
      message: "An internal error occurred",
    });
  }
}
