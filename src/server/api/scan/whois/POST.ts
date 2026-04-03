import type { Request, Response } from "express";
import { promises as dns } from "dns";
import { Socket } from "node:net";
import { db } from "../../../db/client.js";
import { whoisApiUsage } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSecret } from "#secrets";
import { validateBody } from "../../../middleware/security.js";
import { getOrSet } from "../../../lib/cache/cache-manager.js";
import {
  formatWhoisDate,
  normalizeRegistrarFields,
  parseWhoisProtocolRaw,
} from "../../../lib/whois/protocol-parser.js";
import { inferFriendlyRegistrar } from "../../../lib/whois/registrar-inference.js";

const localDomainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(255, "Domain must be less than 255 characters")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format",
    ),
});

interface WhoisData {
  domain: string;
  registrar: string | null;
  registrarUrl: string | null;
  registrarRaw?: string | null;
  registrarFriendly?: string | null;
  registrarInferenceConfidence?: number;
  registrarInferenceMethod?: string;
  registrarInferenceReason?: string;
  createdDate: string | null;
  expiryDate: string | null;
  updatedDate: string | null;
  nameServers: string[];
  status: string[];
  registrantOrg: string | null;
  registrantCountry: string | null;
  dnssec: string | null;
  error?: string;
}

interface RDAPEvent {
  eventAction: string;
  eventDate: string;
}

interface RDAPEntity {
  roles?: string[];
  vcardArray?: unknown[];
}

interface RDAPNameserver {
  ldhName: string;
}

interface RDAPResponse {
  events?: RDAPEvent[];
  nameservers?: RDAPNameserver[];
  status?: string[];
  entities?: RDAPEntity[];
  secureDNS?: {
    delegationSigned: boolean;
  };
}

/**
 * Perform WHOIS scan (extracted for caching)
 */
async function performWhoisScan(cleanDomain: string): Promise<WhoisData> {
  console.log(`[WHOIS] Fetching domain info for: ${cleanDomain}`);

  // Tier 1: Try RDAP (free, unlimited, full data)
  try {
    const rdapData = await fetchRDAP(cleanDomain);
    if (rdapData) {
      console.log("[WHOIS] RDAP data retrieved successfully");
      return rdapData;
    }
  } catch (error) {
    console.log("[WHOIS] RDAP failed, falling back to DNS detection:", error);
  }

  // Tier 2: DNS-based detection (always works)
  const dnsData = await getDNSBasedWhois(cleanDomain);
  let fallbackData = dnsData;

  // Tier 2.5: WHOIS protocol lookup (authoritative per-registry WHOIS, no API key)
  try {
    const protocolData = await fetchWhoisProtocol(cleanDomain);
    if (protocolData) {
      console.log("[WHOIS] WHOIS protocol data retrieved successfully");
      fallbackData = mergeWhoisData(dnsData, protocolData);
    }
  } catch (error) {
    console.log("[WHOIS] WHOIS protocol lookup failed:", error);
  }

  // Tier 3: WhoisFreaks API (only if missing critical data and within monthly limit)
  const apiKeySecret = getSecret("WHOISFREAKS_API_KEY");
  const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : "";
  if (apiKey && shouldUseWhoisFreaks(fallbackData)) {
    try {
      const canUseApi = await checkApiUsageLimit();
      if (canUseApi) {
        const whoisData = await fetchWhoisFreaks(cleanDomain, apiKey);
        if (whoisData) {
          await incrementApiUsage();
          console.log("[WHOIS] WhoisFreaks data retrieved successfully");
          return whoisData;
        }
      } else {
        console.log("[WHOIS] WhoisFreaks monthly limit reached (1000/month)");
      }
    } catch (error) {
      console.log("[WHOIS] WhoisFreaks API failed:", error);
    }
  }

  console.log("[WHOIS] Using fallback WHOIS detection");
  return fallbackData;
}

async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;
    // Validation handled by middleware

    // Clean domain (remove protocol, www, paths)
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();

    // Use cache-aside pattern
    const cachedResult = await getOrSet("whois", cleanDomain, async () => {
      return await performWhoisScan(cleanDomain);
    });
    const result = normalizeWhoisResult(cachedResult);

    // Add cache metadata
    const response = {
      ...result,
      _cache: {
        cached: true,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("[WHOIS] Error:", error);
    res.status(500).json({
      error: "Failed to fetch domain information",
      message: "An internal error occurred",
      domain: req.body.domain,
      registrar: null,
      registrarUrl: null,
      createdDate: null,
      expiryDate: null,
      updatedDate: null,
      nameServers: [],
      status: [],
      registrantOrg: null,
      registrantCountry: null,
      dnssec: null,
    });
  }
}

function normalizeWhoisResult(result: WhoisData): WhoisData {
  const normalized: WhoisData = {
    ...result,
    nameServers: Array.from(
      new Set(
        (result.nameServers || [])
          .map((ns) => ns.toLowerCase().replace(/\.$/, "").trim())
          .filter(Boolean),
      ),
    ),
    status: Array.from(
      new Set(
        (result.status || [])
          .map((entry) => entry.replace(/\s+https?:\/\/\S+$/i, "").trim())
          .filter(Boolean),
      ),
    ),
    createdDate: result.createdDate
      ? formatWhoisDate(result.createdDate)
      : null,
    expiryDate: result.expiryDate ? formatWhoisDate(result.expiryDate) : null,
    updatedDate: result.updatedDate
      ? formatWhoisDate(result.updatedDate)
      : null,
  };

  const normalizedRegistrar = normalizeRegistrarFields(
    result.registrar || null,
    result.registrarUrl || null,
  );
  if (normalizedRegistrar.registrar) {
    normalized.registrar = normalizedRegistrar.registrar;
  }
  if (!normalized.registrarUrl && normalizedRegistrar.registrarUrl) {
    normalized.registrarUrl = normalizedRegistrar.registrarUrl;
  }

  normalized.registrarRaw = normalized.registrar || null;

  const inference = inferFriendlyRegistrar({
    authoritativeRegistrar: normalized.registrarRaw,
    authoritativeUrl: normalized.registrarUrl || null,
    nameServers: normalized.nameServers || [],
  });

  normalized.registrarFriendly = inference.friendlyRegistrar;
  normalized.registrarInferenceConfidence = inference.confidence;
  normalized.registrarInferenceMethod = inference.method;
  normalized.registrarInferenceReason = inference.reason;

  if (inference.friendlyRegistrar && inference.confidence >= 85) {
    normalized.registrar = inference.friendlyRegistrar;
    if (inference.friendlyRegistrarUrl) {
      normalized.registrarUrl = inference.friendlyRegistrarUrl;
    }
  }

  return normalized;
}

// Fetch RDAP data (Registration Data Access Protocol - modern WHOIS replacement)
async function fetchRDAP(domain: string): Promise<WhoisData | null> {
  try {
    // Get TLD from domain
    const tld = domain.split(".").pop()?.toLowerCase();

    // RDAP endpoints for common TLDs
    const rdapEndpoints: Record<string, string> = {
      // Original endpoints (64% coverage)
      com: "https://rdap.verisign.com/com/v1/domain",
      net: "https://rdap.verisign.com/net/v1/domain",
      org: "https://rdap.publicinterestregistry.org/rdap/domain",
      io: "https://rdap.nic.io/domain",
      ai: "https://rdap.nic.ai/domain",
      co: "https://rdap.nic.co/domain",
      me: "https://rdap.nic.me/domain",
      dev: "https://rdap.nic.google/domain",
      app: "https://rdap.nic.google/domain",

      // Phase 1: Additional endpoints (80% coverage)
      uk: "https://rdap.nominet.uk/uk/domain",
      de: "https://rdap.denic.de/domain",
      fr: "https://rdap.nic.fr/domain",
      ca: "https://rdap.ca/domain",
      au: "https://rdap.ausregistry.net.au/domain",
      nl: "https://rdap.sidn.nl/domain",
      eu: "https://rdap.eu/domain",
      info: "https://rdap.afilias.net/rdap/info/domain",
      biz: "https://rdap.afilias.net/rdap/biz/domain",
      us: "https://rdap.nic.us/domain",
      tv: "https://rdap.nic.tv/domain",
      cc: "https://rdap.nic.cc/domain",
    };

    const endpoint = rdapEndpoints[tld || ""];
    if (!endpoint) {
      console.log(`[WHOIS] No RDAP endpoint for TLD: ${tld}`);
      return null;
    }

    const response = await fetch(`${endpoint}/${domain}`, {
      headers: {
        Accept: "application/rdap+json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`[WHOIS] RDAP returned ${response.status}`);
      return null;
    }

    const data: RDAPResponse = await response.json();

    // Parse RDAP response
    const result: WhoisData = {
      domain,
      registrar: extractRegistrar(data),
      registrarUrl: null,
      createdDate: extractEventDate(data, "registration"),
      expiryDate: extractEventDate(data, "expiration"),
      updatedDate: extractEventDate(data, "last changed"),
      nameServers:
        data.nameservers?.map((ns) => ns.ldhName.toLowerCase()) || [],
      status: data.status || [],
      registrantOrg: null, // Usually privacy-protected
      registrantCountry: null, // Usually privacy-protected
      dnssec: data.secureDNS?.delegationSigned
        ? "signedDelegation"
        : "unsigned",
    };

    return result;
  } catch (error) {
    console.error("[WHOIS] RDAP fetch error:", error);
    return null;
  }
}

// Extract registrar from RDAP entities
function extractRegistrar(data: RDAPResponse): string | null {
  if (!data.entities) return null;

  for (const entity of data.entities) {
    if (entity.roles?.includes("registrar") && entity.vcardArray) {
      // Parse vCard format
      const vcard = Array.isArray(entity.vcardArray)
        ? entity.vcardArray[1]
        : null;
      if (!Array.isArray(vcard)) {
        continue;
      }
      for (const field of vcard) {
        if (
          Array.isArray(field) &&
          field[0] === "fn" &&
          typeof field[3] === "string"
        ) {
          return field[3];
        }
      }
    }
  }

  return null;
}

// Extract date from RDAP events
function extractEventDate(
  data: RDAPResponse,
  eventAction: string,
): string | null {
  if (!data.events) return null;

  const event = data.events.find((e) => e.eventAction === eventAction);
  if (!event) return null;

  try {
    const date = new Date(event.eventDate);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return event.eventDate;
  }
}

// DNS-based WHOIS detection (fallback)
async function getDNSBasedWhois(domain: string): Promise<WhoisData> {
  // Get nameservers from DNS
  let nameServers: string[] = [];
  try {
    const nsRecords = await dns.resolveNs(domain);
    nameServers = nsRecords.map((ns) => ns.toLowerCase());
    console.log(`[WHOIS] Found ${nameServers.length} nameservers`);
  } catch (error) {
    console.error("[WHOIS] NS lookup failed:", error);
  }

  // Check for DNSSEC
  let dnssec: string | null = null;
  try {
    await dns.resolve(domain, "DNSKEY");
    dnssec = "signedDelegation";
    console.log("[WHOIS] DNSSEC enabled");
  } catch {
    dnssec = "unsigned";
  }

  return {
    domain,
    // Registrar must come from authoritative WHOIS/RDAP sources only.
    // Nameserver patterns are not reliable registrar evidence.
    registrar: null,
    registrarUrl: null,
    createdDate: null,
    expiryDate: null,
    updatedDate: null,
    nameServers,
    status: ["clientTransferProhibited"],
    registrantOrg: null,
    registrantCountry: null,
    dnssec,
  };
}

// Merge fallback WHOIS sources, preferring richer protocol data while preserving DNS scan fidelity.
function mergeWhoisData(
  dnsData: WhoisData,
  protocolData: WhoisData,
): WhoisData {
  return {
    domain: dnsData.domain,
    registrar: protocolData.registrar || dnsData.registrar,
    registrarUrl: protocolData.registrarUrl || dnsData.registrarUrl,
    createdDate: protocolData.createdDate || dnsData.createdDate,
    expiryDate: protocolData.expiryDate || dnsData.expiryDate,
    updatedDate: protocolData.updatedDate || dnsData.updatedDate,
    nameServers:
      protocolData.nameServers.length > 0
        ? protocolData.nameServers
        : dnsData.nameServers,
    status:
      protocolData.status.length > 0 ? protocolData.status : dnsData.status,
    registrantOrg: protocolData.registrantOrg || dnsData.registrantOrg,
    registrantCountry:
      protocolData.registrantCountry || dnsData.registrantCountry,
    dnssec: protocolData.dnssec || dnsData.dnssec,
  };
}

// Query WHOIS protocol (port 43) with timeout/size guards.
function queryWhoisServer(server: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let response = "";
    let settled = false;
    const maxBytes = 1024 * 1024; // 1MB safety cap

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    };

    socket.setTimeout(10_000);
    socket.on("connect", () => {
      socket.write(`${query}\r\n`);
    });
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString("utf8");
      if (response.length > maxBytes) {
        finish(new Error(`WHOIS response too large from ${server}`));
      }
    });
    socket.on("end", () => finish());
    socket.on("timeout", () =>
      finish(new Error(`WHOIS timeout from ${server}`)),
    );
    socket.on("error", (err) => finish(err));

    socket.connect(43, server);
  });
}

async function lookupWhoisServerForTld(tld: string): Promise<string | null> {
  try {
    const ianaResponse = await queryWhoisServer("whois.iana.org", tld);
    const match = ianaResponse.match(/^whois:\s*(\S+)/im);
    return match?.[1]?.trim().toLowerCase() ?? null;
  } catch (error) {
    console.error("[WHOIS] Failed WHOIS server lookup from IANA:", error);
    return null;
  }
}

async function fetchWhoisProtocol(domain: string): Promise<WhoisData | null> {
  try {
    const tld = domain.split(".").pop()?.toLowerCase();
    if (!tld) return null;

    const whoisServer = await lookupWhoisServerForTld(tld);
    if (!whoisServer) {
      console.log(`[WHOIS] No WHOIS server published by IANA for TLD: ${tld}`);
      return null;
    }

    const rawResponse = await queryWhoisServer(whoisServer, domain);
    const parsedRaw = parseWhoisProtocolRaw(rawResponse);
    const parsed: WhoisData = {
      domain,
      registrar: parsedRaw.registrar,
      registrarUrl: parsedRaw.registrarUrl,
      createdDate: parsedRaw.createdDate,
      expiryDate: parsedRaw.expiryDate,
      updatedDate: parsedRaw.updatedDate,
      nameServers: parsedRaw.nameServers,
      status: parsedRaw.status,
      registrantOrg: parsedRaw.registrantOrg,
      registrantCountry: parsedRaw.registrantCountry,
      dnssec: parsedRaw.dnssec,
    };

    if (
      !parsed.registrar &&
      !parsed.createdDate &&
      !parsed.expiryDate &&
      parsed.nameServers.length === 0
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("[WHOIS] WHOIS protocol fetch error:", error);
    return null;
  }
}

// Check if we should use WhoisFreaks API (only for missing critical data)
function shouldUseWhoisFreaks(dnsData: WhoisData): boolean {
  // Use API only when key fields are critically missing.
  // Avoid overriding authoritative WHOIS protocol data when registrar is known.
  const missingRegistrar = !dnsData.registrar;
  const missingAllDates =
    !dnsData.createdDate && !dnsData.expiryDate && !dnsData.updatedDate;
  return missingRegistrar || missingAllDates;
}

// Check if we're within the monthly API usage limit (1,000/month free tier)
async function checkApiUsageLimit(): Promise<boolean> {
  const MONTHLY_LIMIT = 1000;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    const usage = await db
      .select()
      .from(whoisApiUsage)
      .where(eq(whoisApiUsage.yearMonth, currentMonth))
      .limit(1);

    if (usage.length === 0) {
      // No usage this month yet
      return true;
    }

    return usage[0].queryCount < MONTHLY_LIMIT;
  } catch (error) {
    console.error("[WHOIS] Error checking API usage:", error);
    // On error, allow the query (fail open)
    return true;
  }
}

// Increment API usage counter for the current month
async function incrementApiUsage(): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    const usage = await db
      .select()
      .from(whoisApiUsage)
      .where(eq(whoisApiUsage.yearMonth, currentMonth))
      .limit(1);

    if (usage.length === 0) {
      // Create new record for this month
      await db.insert(whoisApiUsage).values({
        yearMonth: currentMonth,
        queryCount: 1,
        lastQueryAt: new Date(),
      });
    } else {
      // Increment existing record
      await db
        .update(whoisApiUsage)
        .set({
          queryCount: usage[0].queryCount + 1,
          lastQueryAt: new Date(),
        })
        .where(eq(whoisApiUsage.yearMonth, currentMonth));
    }

    console.log(`[WHOIS] API usage incremented for ${currentMonth}`);
  } catch (error) {
    console.error("[WHOIS] Error incrementing API usage:", error);
  }
}

// Fetch WHOIS data from WhoisFreaks API
async function fetchWhoisFreaks(
  domain: string,
  apiKey: string,
): Promise<WhoisData | null> {
  try {
    const response = await fetch(
      `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${domain}&apiKey=${apiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.log(`[WHOIS] WhoisFreaks returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Parse WhoisFreaks response
    const result: WhoisData = {
      domain,
      registrar: data.registrar_name || null,
      registrarUrl: data.registrar_url || null,
      createdDate: data.create_date ? formatWhoisDate(data.create_date) : null,
      expiryDate: data.expires_date ? formatWhoisDate(data.expires_date) : null,
      updatedDate: data.update_date ? formatWhoisDate(data.update_date) : null,
      nameServers: data.name_servers || [],
      status: data.domain_status || [],
      registrantOrg: data.registrant_organization || null,
      registrantCountry: data.registrant_country || null,
      dnssec: data.dnssec || null,
    };

    return result;
  } catch (error) {
    console.error("[WHOIS] WhoisFreaks fetch error:", error);
    return null;
  }
}

// Export with validation middleware
export default [validateBody(localDomainSchema), handler];
