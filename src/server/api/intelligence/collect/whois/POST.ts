import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { whoisRecords } from "../../../../db/schema.js";
import { getSecret } from "#secrets";
import { eq } from "drizzle-orm";

interface WHOISCollectionRequest {
  domain: string;
}

interface ParsedWHOIS {
  registrar?: string;
  registrarUrl?: string;
  registrarIanaId?: string;
  createdDate?: Date;
  updatedDate?: Date;
  expiryDate?: Date;
  status?: string[];
  registrantName?: string;
  registrantOrganization?: string;
  registrantEmail?: string;
  registrantCountry?: string;
  adminName?: string;
  adminEmail?: string;
  techName?: string;
  techEmail?: string;
  nameservers?: string[];
  dnssec?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter(
    (item): item is string => typeof item === "string",
  );
  return values.length > 0 ? values : undefined;
}

/**
 * POST /api/intelligence/collect/whois
 *
 * Collects WHOIS data for a domain and stores in whois_records table.
 *
 * Uses WhoisFreaks API (1000 free requests/month)
 * Get your free API key at: https://whoisfreaks.com/
 *
 * Add WHOISFREAKS_API_KEY to your secrets.
 *
 * Request body:
 * {
 *   "domain": "example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "example.com",
 *   "registrar": "Example Registrar, Inc.",
 *   "expiryDate": "2025-08-13T04:00:00.000Z"
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body as WHOISCollectionRequest;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Normalize domain
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .split("/")[0];

    console.log(
      `[WHOIS Collection] Starting WHOIS lookup for: ${normalizedDomain}`,
    );

    // Get API key
    const apiKeySecret = getSecret("WHOISFREAKS_API_KEY");
    const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : null;

    if (!apiKey) {
      console.warn("[WHOIS Collection] WHOISFREAKS_API_KEY not configured");
      return res.status(500).json({
        error: "WHOIS API key not configured",
        message:
          "Add WHOISFREAKS_API_KEY to your secrets. Get a free key at https://whoisfreaks.com/ (1000 requests/month)",
        domain: normalizedDomain,
      });
    }

    // Call WhoisFreaks API
    let rawWhois: unknown;
    try {
      const response = await fetch(
        `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${normalizedDomain}&apiKey=${apiKey}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `WhoisFreaks API error: ${response.status} ${response.statusText}`,
        );
      }

      rawWhois = await response.json();
      console.log(
        `[WHOIS Collection] WHOIS data retrieved for ${normalizedDomain}`,
      );
    } catch (error) {
      console.error("[WHOIS Collection] WhoisFreaks API failed:", error);
      return res.status(500).json({
        error: "WHOIS lookup failed",
        message: "An internal error occurred",
        domain: normalizedDomain,
      });
    }

    // Parse WHOIS data
    const parsed = parseWhoisFreaksResponse(rawWhois);

    // Store in database
    const scannedAt = new Date();

    try {
      // Check if record exists
      const existing = await db
        .select()
        .from(whoisRecords)
        .where(eq(whoisRecords.domain, normalizedDomain))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(whoisRecords)
          .set({
            registrar: parsed.registrar || null,
            registrarUrl: parsed.registrarUrl || null,
            registrarIanaId: parsed.registrarIanaId || null,
            createdDate: parsed.createdDate || null,
            updatedDate: parsed.updatedDate || null,
            expiryDate: parsed.expiryDate || null,
            status: parsed.status || null,
            registrantName: parsed.registrantName || null,
            registrantOrganization: parsed.registrantOrganization || null,
            registrantEmail: parsed.registrantEmail || null,
            registrantCountry: parsed.registrantCountry || null,
            adminName: parsed.adminName || null,
            adminEmail: parsed.adminEmail || null,
            techName: parsed.techName || null,
            techEmail: parsed.techEmail || null,
            nameservers: parsed.nameservers || null,
            dnssec: parsed.dnssec || null,
            rawWhois: JSON.stringify(rawWhois),
            scannedAt,
          })
          .where(eq(whoisRecords.domain, normalizedDomain));

        console.log(
          `[WHOIS Collection] Updated existing record for ${normalizedDomain}`,
        );
      } else {
        // Insert new record
        await db.insert(whoisRecords).values({
          domain: normalizedDomain,
          registrar: parsed.registrar || null,
          registrarUrl: parsed.registrarUrl || null,
          registrarIanaId: parsed.registrarIanaId || null,
          createdDate: parsed.createdDate || null,
          updatedDate: parsed.updatedDate || null,
          expiryDate: parsed.expiryDate || null,
          status: parsed.status || null,
          registrantName: parsed.registrantName || null,
          registrantOrganization: parsed.registrantOrganization || null,
          registrantEmail: parsed.registrantEmail || null,
          registrantCountry: parsed.registrantCountry || null,
          adminName: parsed.adminName || null,
          adminEmail: parsed.adminEmail || null,
          techName: parsed.techName || null,
          techEmail: parsed.techEmail || null,
          nameservers: parsed.nameservers || null,
          dnssec: parsed.dnssec || null,
          rawWhois: JSON.stringify(rawWhois),
          scannedAt,
        });

        console.log(
          `[WHOIS Collection] Stored new record for ${normalizedDomain}`,
        );
      }

      return res.json({
        success: true,
        domain: normalizedDomain,
        registrar: parsed.registrar,
        createdDate: parsed.createdDate?.toISOString(),
        updatedDate: parsed.updatedDate?.toISOString(),
        expiryDate: parsed.expiryDate?.toISOString(),
        status: parsed.status,
        nameservers: parsed.nameservers,
        dnssec: parsed.dnssec,
        timestamp: scannedAt.toISOString(),
      });
    } catch (error) {
      console.error("[WHOIS Collection] Database error:", error);
      return res.status(500).json({
        error: "Failed to store WHOIS data",
        message: "An internal error occurred",
      });
    }
  } catch (error) {
    console.error("[WHOIS Collection] Error:", error);
    return res.status(500).json({
      error: "WHOIS collection failed",
      message: "An internal error occurred",
    });
  }
}

/**
 * Parse WhoisFreaks API response into structured format
 */
function parseWhoisFreaksResponse(data: unknown): ParsedWHOIS {
  const result: ParsedWHOIS = {};
  const payload = asRecord(data);

  // Registrar
  const registrarName = asString(payload.registrar_name);
  const registrarUrl = asString(payload.registrar_url);
  if (registrarName) result.registrar = registrarName;
  if (registrarUrl) result.registrarUrl = registrarUrl;
  if (payload.registrar_iana_id)
    result.registrarIanaId = String(payload.registrar_iana_id);

  // Dates
  const createDate = asString(payload.create_date);
  const updateDate = asString(payload.update_date);
  const expiryDate = asString(payload.expiry_date);
  if (createDate) result.createdDate = parseDate(createDate);
  if (updateDate) result.updatedDate = parseDate(updateDate);
  if (expiryDate) result.expiryDate = parseDate(expiryDate);

  // Status
  result.status = asStringArray(payload.domain_status);

  // Registrant
  const registrant = asRecord(payload.registrant_contact);
  const registrantName = asString(registrant.name);
  const registrantOrg = asString(registrant.organization);
  const registrantEmail = asString(registrant.email);
  const registrantCountry = asString(registrant.country);
  if (registrantName) result.registrantName = registrantName;
  if (registrantOrg) result.registrantOrganization = registrantOrg;
  if (registrantEmail) result.registrantEmail = registrantEmail;
  if (registrantCountry) result.registrantCountry = registrantCountry;

  // Admin
  const admin = asRecord(payload.administrative_contact);
  const adminName = asString(admin.name);
  const adminEmail = asString(admin.email);
  if (adminName) result.adminName = adminName;
  if (adminEmail) result.adminEmail = adminEmail;

  // Tech
  const tech = asRecord(payload.technical_contact);
  const techName = asString(tech.name);
  const techEmail = asString(tech.email);
  if (techName) result.techName = techName;
  if (techEmail) result.techEmail = techEmail;

  // Nameservers
  const nameservers = asStringArray(payload.name_servers);
  if (nameservers) {
    result.nameservers = nameservers.map((ns) => ns.toLowerCase());
  }

  // DNSSEC
  const dnssec = asString(payload.dnssec);
  if (dnssec) result.dnssec = dnssec;

  return result;
}

/**
 * Parse date string from WHOIS data
 */
function parseDate(dateStr: string): Date | undefined {
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}
