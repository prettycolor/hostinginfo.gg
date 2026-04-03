import type { Request, Response } from "express";
import { db } from "../../db/client.js";
import { scanHistory } from "../../db/schema.js";
import { requireAuthenticatedUserId } from "../../lib/request-auth.js";
import { normalizeHostingProviderLabel } from "../../lib/hosting-provider-canonical.js";

type SaveScanHistoryBody = {
  domain?: string;
  scanType?: string;
  scanData?: unknown;
};

const MAX_SCAN_DATA_CHARS = 60000;

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function compactScanDataForStorage(
  scanData: unknown,
  domain: string,
): string | null {
  if (scanData === undefined || scanData === null) {
    return null;
  }

  const data = asRecord(scanData);
  const performanceData = asRecord(data.performanceData);
  const securityData = asRecord(data.securityData);
  const technologyData = asRecord(data.technologyData);
  const wordpress = asRecord(technologyData.wordpress);
  const server = asRecord(technologyData.server);
  const hosting = asRecord(technologyData.hosting);
  const providerData = asRecord(data.providerData);
  const ssl = asRecord(data.ssl);
  const securitySsl = asRecord(securityData.ssl);

  const preferredHostingProvider =
    normalizeHostingProviderLabel(
      typeof data.hostingProvider === "string" ? data.hostingProvider : null,
    ) ||
    normalizeHostingProviderLabel(
      typeof providerData.provider === "string" ? providerData.provider : null,
    ) ||
    normalizeHostingProviderLabel(
      typeof hosting.provider === "string" ? hosting.provider : null,
    ) ||
    normalizeHostingProviderLabel(
      typeof server.builderType === "string" ? server.builderType : null,
    );

  const normalizedFullPayload = {
    ...data,
    hostingProvider: preferredHostingProvider,
    technologyData: {
      ...technologyData,
      hosting: {
        ...hosting,
        provider: preferredHostingProvider,
      },
    },
    providerData: {
      ...providerData,
      provider: preferredHostingProvider,
    },
  };

  const fullPayload = JSON.stringify(normalizedFullPayload);
  if (fullPayload.length <= MAX_SCAN_DATA_CHARS) {
    return fullPayload;
  }

  const sslValid =
    typeof data.sslValid === "boolean"
      ? data.sslValid
      : typeof ssl.valid === "boolean"
        ? ssl.valid
        : typeof securitySsl.valid === "boolean"
          ? securitySsl.valid
          : null;

  const sslExpiryDate =
    typeof data.sslExpiryDate === "string"
      ? data.sslExpiryDate
      : typeof ssl.validTo === "string"
        ? ssl.validTo
        : typeof ssl.expiresAt === "string"
          ? ssl.expiresAt
          : typeof securitySsl.validTo === "string"
            ? securitySsl.validTo
            : typeof securitySsl.expiresAt === "string"
              ? securitySsl.expiresAt
              : null;

  const compactPayload = {
    domain,
    compacted: true,
    hostingProvider: preferredHostingProvider,
    sslValid,
    sslExpiryDate,
    ssl: {
      hasSSL:
        typeof ssl.hasSSL === "boolean"
          ? ssl.hasSSL
          : typeof data.hasSSL === "boolean"
            ? data.hasSSL
            : null,
      valid: sslValid,
      expired:
        typeof ssl.expired === "boolean"
          ? ssl.expired
          : typeof securitySsl.expired === "boolean"
            ? securitySsl.expired
            : null,
      validTo: sslExpiryDate,
      issuer:
        typeof ssl.issuer === "string"
          ? ssl.issuer
          : typeof securitySsl.issuer === "string"
            ? securitySsl.issuer
            : null,
    },
    performanceData: {
      mobile: { score: Number(asRecord(performanceData.mobile).score || 0) },
      desktop: { score: Number(asRecord(performanceData.desktop).score || 0) },
    },
    securityData: {
      score: Number(securityData.score || 0),
      grade: typeof securityData.grade === "string" ? securityData.grade : null,
      issues: Array.isArray(securityData.issues)
        ? securityData.issues.slice(0, 12)
        : [],
    },
    technologyData: {
      wordpress: {
        detected: Boolean(wordpress.detected),
        version:
          typeof wordpress.version === "string" ? wordpress.version : null,
      },
      server: {
        type: typeof server.type === "string" ? server.type : null,
        isWebsiteBuilder: Boolean(server.isWebsiteBuilder),
        builderType:
          typeof server.builderType === "string" ? server.builderType : null,
      },
      hosting: {
        provider: preferredHostingProvider,
      },
    },
    whoisData: asRecord(data.whoisData),
    emailData: asRecord(data.emailData),
    providerData: {
      ...providerData,
      provider: preferredHostingProvider,
    },
    malwareData: asRecord(data.malwareData),
  };

  return JSON.stringify(compactPayload).slice(0, MAX_SCAN_DATA_CHARS);
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const body = (req.body || {}) as SaveScanHistoryBody;
    const domain = String(body.domain || "")
      .trim()
      .toLowerCase();
    const scanType = String(body.scanType || "full")
      .trim()
      .toLowerCase();

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    const scanData = compactScanDataForStorage(body.scanData, domain);

    const insertResult = await db.insert(scanHistory).values({
      userId,
      domain,
      scanType: scanType || "full",
      scanData,
    });

    const insertMeta = Array.isArray(insertResult)
      ? insertResult[0]
      : insertResult;
    const insertId =
      typeof insertMeta === "object" &&
      insertMeta !== null &&
      "insertId" in insertMeta
        ? Number((insertMeta as { insertId?: unknown }).insertId)
        : NaN;
    const id = Number.isFinite(insertId) ? insertId : null;

    return res.status(201).json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("Save scan history error:", error);
    return res.status(500).json({
      error: "Failed to save scan history",
      message: "An internal error occurred",
    });
  }
}
