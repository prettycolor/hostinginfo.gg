import type { Request, Response } from "express";
import {
  fetchPeerCertificate,
  getCertificateValidity,
} from "../../../lib/tls-certificate.js";
import { getCached, setCached } from "../../../lib/cache/cache-manager.js";

interface SSLScanResult {
  hasSSL: boolean;
  valid?: boolean;
  expired?: boolean;
  expiringSoon?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  daysUntilExpiry?: number;
  issuer?: string;
  isLetsEncrypt?: boolean;
  subject?: string;
  certType?: string;
  grade: string;
  protocol?: string;
  serialNumber?: string;
  fingerprint?: string;
  altNames?: string | null;
  validityKnown?: boolean;
  error?: string;
}

interface ErrorWithCode {
  code?: string;
  message?: string;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as ErrorWithCode).code;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as ErrorWithCode).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }

  return fallback;
}

/**
 * SSL/TLS Certificate Scanner API
 * Checks certificate validity, expiration, issuer, and coverage
 */
async function performSSLScan(domain: string): Promise<SSLScanResult> {
  console.log(`[SSL Scan] Starting scan for: ${domain}`);
  const result = await checkSSLCertificate(domain);
  console.log(`[SSL Scan] Complete for: ${domain}`);
  return result;
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    const cached = await getCached<SSLScanResult>("ssl", domain);
    if (cached && shouldUseCachedResult(cached)) {
      return res.json({
        ...cached,
        _cache: {
          cached: true,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await performSSLScan(domain);
    if (shouldCacheResult(result)) {
      await setCached("ssl", domain, result);
    }

    // Add cache metadata
    const response = {
      ...result,
      _cache: {
        cached: true,
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("[SSL Scan] Error:", error);
    return res.status(500).json({
      error: "SSL scan failed",
      message: "An internal error occurred",
      hasSSL: false,
    });
  }
}

function isDefinitiveNegativeError(error: string | null | undefined): boolean {
  const normalized = (error || "").toLowerCase();
  return (
    normalized.includes("domain not found") ||
    normalized.includes("connection refused")
  );
}

function shouldUseCachedResult(result: unknown): result is SSLScanResult {
  if (!result || typeof result !== "object") {
    return false;
  }

  if (result.hasSSL === true) {
    return true;
  }

  return isDefinitiveNegativeError(result.error);
}

function shouldCacheResult(result: SSLScanResult): boolean {
  return shouldUseCachedResult(result);
}

async function checkSSLCertificate(domain: string): Promise<SSLScanResult> {
  try {
    const { cert, protocol } = await fetchPeerCertificate(domain, 10_000);
    const now = new Date();
    const nowMs = now.getTime();
    const { validFrom, validTo } = getCertificateValidity(cert);

    // If validity timestamps can't be parsed, treat cert as present/usable to avoid false invalid labels.
    const validityKnown = Boolean(validFrom && validTo);
    const daysUntilExpiry = validTo
      ? Math.floor((validTo.getTime() - nowMs) / (1000 * 60 * 60 * 24))
      : 0;
    const isValid = validityKnown
      ? nowMs >= (validFrom as Date).getTime() &&
        nowMs <= (validTo as Date).getTime()
      : true;
    const isExpiringSoon = validityKnown
      ? daysUntilExpiry <= 30 && daysUntilExpiry > 0
      : false;
    const isExpired = validityKnown ? daysUntilExpiry < 0 : false;

    let grade = "A";
    if (isExpired) grade = "F";
    else if (isExpiringSoon) grade = "C";
    else if (validityKnown && daysUntilExpiry <= 60) grade = "B";

    const issuer = cert.issuer?.O || cert.issuer?.CN || "Unknown";
    const isLetsEncrypt = issuer.toLowerCase().includes("let's encrypt");

    let certType = "Single Domain";
    if (cert.subjectaltname) {
      const altNames = cert.subjectaltname
        .split(",")
        .map((n: string) => n.trim());
      if (altNames.some((n: string) => n.includes("*"))) {
        certType = "Wildcard";
      } else if (altNames.length > 2) {
        certType = "Multi-Domain";
      }
    }

    return {
      hasSSL: true,
      valid: isValid,
      expired: isExpired,
      expiringSoon: isExpiringSoon,
      validFrom: validFrom ? validFrom.toISOString() : null,
      validTo: validTo ? validTo.toISOString() : null,
      daysUntilExpiry,
      issuer,
      isLetsEncrypt,
      subject: cert.subject?.CN || domain,
      certType,
      grade,
      protocol,
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      altNames: cert.subjectaltname || null,
      validityKnown,
    };
  } catch (error: unknown) {
    if (getErrorCode(error) === "ENOTFOUND") {
      return {
        hasSSL: false,
        error: "Domain not found",
        valid: false,
        grade: "F",
      };
    }

    if (getErrorCode(error) === "ECONNREFUSED") {
      return {
        hasSSL: false,
        error: "Connection refused (no HTTPS)",
        valid: false,
        grade: "F",
      };
    }

    return {
      hasSSL: false,
      error: getErrorMessage(error, "SSL check failed"),
      valid: false,
      grade: "F",
    };
  }
}
