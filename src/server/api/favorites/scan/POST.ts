import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { favoriteDomains, favoriteDomainScans } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { getSecret } from "#secrets";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";

interface PageSpeedPairResult {
  mobileScore: number;
  desktopScore: number;
  mobileFcp?: number;
  mobileLcp?: number;
  mobileTbt?: number;
  mobileCls?: number;
  desktopFcp?: number;
  desktopLcp?: number;
  desktopTbt?: number;
  desktopCls?: number;
}

interface SecurityScanResult {
  sslValid: boolean;
  securityHeaders: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
  };
  securityScore: number;
}

interface ScanResults {
  performance?: PageSpeedPairResult | { error: string };
  security?: SecurityScanResult | { error: string };
}

interface FavoriteScanInsertPayload {
  favoriteDomainId: number;
  userId: number;
  domain: string;
  scanType: string;
  fullResults: string;
  mobileScore?: number;
  desktopScore?: number;
  mobileFcp?: number;
  mobileLcp?: number;
  mobileTbt?: number;
  mobileCls?: number;
  desktopFcp?: number;
  desktopLcp?: number;
  desktopTbt?: number;
  desktopCls?: number;
  securityScore?: number;
  sslValid?: boolean;
  malwareDetected?: boolean;
  vulnerabilities?: string;
}

function normalizeApiKey(
  value: string | object | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shouldRetryWithFallbackKey(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("blocked") ||
    normalized.includes("forbidden") ||
    normalized.includes("code 403") ||
    normalized.includes("access not configured") ||
    normalized.includes("permission denied") ||
    normalized.includes("insufficient authentication scopes")
  );
}

async function runPageSpeedPair(domain: string, apiKey: string) {
  const mobileUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&key=${apiKey}`;
  const desktopUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=desktop&key=${apiKey}`;

  const [mobileRes, desktopRes] = await Promise.all([
    fetch(mobileUrl),
    fetch(desktopUrl),
  ]);

  const mobileData = await mobileRes.json();
  const desktopData = await desktopRes.json();

  if (mobileData.error || desktopData.error) {
    const apiError = mobileData.error || desktopData.error;
    const apiMessage =
      typeof apiError?.message === "string"
        ? apiError.message
        : "PageSpeed API error";
    const apiCode = Number(apiError?.code);
    throw new Error(
      Number.isFinite(apiCode) && apiCode > 0
        ? `${apiMessage} (code ${apiCode})`
        : apiMessage,
    );
  }

  return {
    mobileScore: Math.round(
      mobileData.lighthouseResult.categories.performance.score * 100,
    ),
    desktopScore: Math.round(
      desktopData.lighthouseResult.categories.performance.score * 100,
    ),
    mobileFcp:
      mobileData.lighthouseResult.audits["first-contentful-paint"]
        ?.numericValue / 1000,
    mobileLcp:
      mobileData.lighthouseResult.audits["largest-contentful-paint"]
        ?.numericValue / 1000,
    mobileTbt:
      mobileData.lighthouseResult.audits["total-blocking-time"]?.numericValue,
    mobileCls:
      mobileData.lighthouseResult.audits["cumulative-layout-shift"]
        ?.numericValue,
    desktopFcp:
      desktopData.lighthouseResult.audits["first-contentful-paint"]
        ?.numericValue / 1000,
    desktopLcp:
      desktopData.lighthouseResult.audits["largest-contentful-paint"]
        ?.numericValue / 1000,
    desktopTbt:
      desktopData.lighthouseResult.audits["total-blocking-time"]?.numericValue,
    desktopCls:
      desktopData.lighthouseResult.audits["cumulative-layout-shift"]
        ?.numericValue,
  };
}

export default async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { favoriteId, scanType } = req.body;

    if (!favoriteId || !scanType) {
      return res
        .status(400)
        .json({ error: "favoriteId and scanType are required" });
    }

    if (!["performance", "security", "full"].includes(scanType)) {
      return res.status(400).json({ error: "Invalid scan type" });
    }

    // Verify ownership and get favorite
    const [favorite] = await db
      .select()
      .from(favoriteDomains)
      .where(
        and(
          eq(favoriteDomains.id, favoriteId),
          eq(favoriteDomains.userId, userId),
        ),
      )
      .limit(1);

    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    const domain = favorite.domain;
    const scanResults: ScanResults = {};

    // Perform scan based on type
    if (scanType === "performance" || scanType === "full") {
      const sharedApiKey = normalizeApiKey(
        process.env.GOOGLE_SAFE_BROWSING_API_KEY ||
          getSecret("GOOGLE_SAFE_BROWSING_API_KEY"),
      );
      const fallbackApiKey = normalizeApiKey(
        process.env.GOOGLE_PAGESPEED_API_KEY ||
          getSecret("GOOGLE_PAGESPEED_API_KEY"),
      );
      const primaryApiKey = sharedApiKey || fallbackApiKey;

      if (!primaryApiKey) {
        return res.status(500).json({
          error:
            "PageSpeed API key not configured (checked GOOGLE_SAFE_BROWSING_API_KEY and GOOGLE_PAGESPEED_API_KEY)",
        });
      }

      try {
        try {
          scanResults.performance = await runPageSpeedPair(
            domain,
            primaryApiKey,
          );
        } catch (error) {
          const internalMessage =
            error instanceof Error ? error.message : String(error);
          if (
            sharedApiKey &&
            fallbackApiKey &&
            fallbackApiKey !== sharedApiKey &&
            shouldRetryWithFallbackKey(internalMessage)
          ) {
            console.warn(
              `Shared key blocked for PageSpeed in favorites scan, retrying with GOOGLE_PAGESPEED_API_KEY for ${domain}`,
            );
            scanResults.performance = await runPageSpeedPair(
              domain,
              fallbackApiKey,
            );
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("Performance scan error:", error);
        scanResults.performance = { error: "Failed to fetch performance data" };
      }
    }

    if (scanType === "security" || scanType === "full") {
      // Basic security checks (SSL, headers, etc.)
      try {
        const response = await fetch(`https://${domain}`, { method: "HEAD" });
        const headers = response.headers;

        scanResults.security = {
          sslValid: response.url.startsWith("https://"),
          securityHeaders: {
            strictTransportSecurity:
              headers.get("strict-transport-security") !== null,
            contentSecurityPolicy:
              headers.get("content-security-policy") !== null,
            xFrameOptions: headers.get("x-frame-options") !== null,
            xContentTypeOptions: headers.get("x-content-type-options") !== null,
          },
        };

        // Calculate security score (0-100)
        let score = 0;
        if (scanResults.security.sslValid) score += 40;
        if (scanResults.security.securityHeaders.strictTransportSecurity)
          score += 15;
        if (scanResults.security.securityHeaders.contentSecurityPolicy)
          score += 15;
        if (scanResults.security.securityHeaders.xFrameOptions) score += 15;
        if (scanResults.security.securityHeaders.xContentTypeOptions)
          score += 15;
        scanResults.security.securityScore = score;
      } catch (error) {
        console.error("Security scan error:", error);
        scanResults.security = { error: "Failed to fetch security data" };
      }
    }

    // Save scan to history
    const scanData: FavoriteScanInsertPayload = {
      favoriteDomainId: favoriteId,
      userId,
      domain,
      scanType,
      fullResults: JSON.stringify(scanResults),
    };

    if (scanResults.performance && "mobileScore" in scanResults.performance) {
      scanData.mobileScore = scanResults.performance.mobileScore;
      scanData.desktopScore = scanResults.performance.desktopScore;
      scanData.mobileFcp = scanResults.performance.mobileFcp;
      scanData.mobileLcp = scanResults.performance.mobileLcp;
      scanData.mobileTbt = scanResults.performance.mobileTbt;
      scanData.mobileCls = scanResults.performance.mobileCls;
      scanData.desktopFcp = scanResults.performance.desktopFcp;
      scanData.desktopLcp = scanResults.performance.desktopLcp;
      scanData.desktopTbt = scanResults.performance.desktopTbt;
      scanData.desktopCls = scanResults.performance.desktopCls;
    }

    if (scanResults.security && "securityScore" in scanResults.security) {
      scanData.securityScore = scanResults.security.securityScore;
      scanData.sslValid = scanResults.security.sslValid;
      scanData.malwareDetected = false; // Placeholder
      scanData.vulnerabilities = JSON.stringify([]);
    }

    await db.insert(favoriteDomainScans).values(scanData);

    // Update favorite's lastScannedAt and scanCount
    await db
      .update(favoriteDomains)
      .set({
        lastScannedAt: new Date(),
        scanCount: favorite.scanCount + 1,
      })
      .where(eq(favoriteDomains.id, favoriteId));

    res.json({ success: true, results: scanResults });
  } catch (error) {
    console.error("Scan error:", error);
    res.status(500).json({
      error: "Failed to perform scan",
      message: "An internal error occurred",
    });
  }
}
