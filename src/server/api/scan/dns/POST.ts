import type { Request, Response } from "express";
import { promises as dns } from "dns";
import https from "https";
import { z } from "zod";
import { validateBody } from "../../../middleware/security.js";
import { getOrSet } from "../../../lib/cache/cache-manager.js";

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

/**
 * DNS Scanner API
 * Looks up A, AAAA, MX, TXT, NS, and CNAME records
 * Also checks A record age to determine if site needs redesign
 */

interface DNSHistoryResult {
  aRecordAge?: number; // Age in years
  aRecordLastChanged?: string; // ISO date string
  estimatedAge?: boolean; // True if age is estimated
  needsRedesign?: boolean; // True if A record is 7+ years old
}

interface CertificateTransparencyEntry {
  name_value?: string;
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapResponse {
  events?: RdapEvent[];
}

interface DNSScanResult {
  domain: string;
  records: {
    A: string[];
    AAAA: string[];
    MX: dns.MxRecord[];
    TXT: string[];
    NS: string[];
    CNAME: string[];
  };
  subdomains: string[];
  subdomainCount: number;
  errors: Record<string, string>;
  aRecordAge: DNSHistoryResult | null;
}

const COMMON_SUBDOMAIN_LABELS = [
  "www",
  "api",
  "mail",
  "cdn",
  "dev",
  "staging",
  "admin",
  "app",
  "beta",
  "blog",
  "shop",
  "support",
  "portal",
  "docs",
  "m",
  "status",
];

function normalizeDiscoveredHost(
  host: string,
  apexDomain: string,
): string | null {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return null;

  const withoutWildcard = normalized.startsWith("*.")
    ? normalized.slice(2)
    : normalized;

  if (withoutWildcard === apexDomain) return null;
  if (!withoutWildcard.endsWith(`.${apexDomain}`)) return null;

  return withoutWildcard;
}

async function discoverCommonSubdomains(domain: string): Promise<string[]> {
  const checks = await Promise.all(
    COMMON_SUBDOMAIN_LABELS.map(async (label) => {
      const hostname = `${label}.${domain}`;

      const [aResult, aaaaResult, cnameResult] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
        dns.resolveCname(hostname),
      ]);

      const hasAnyRecord =
        (aResult.status === "fulfilled" && aResult.value.length > 0) ||
        (aaaaResult.status === "fulfilled" && aaaaResult.value.length > 0) ||
        (cnameResult.status === "fulfilled" && cnameResult.value.length > 0);

      return hasAnyRecord ? hostname : null;
    }),
  );

  return checks.filter((host): host is string => Boolean(host));
}

function fetchCertificateTransparencySubdomains(
  domain: string,
): Promise<string[]> {
  return new Promise((resolve) => {
    const options = {
      hostname: "crt.sh",
      path: `/?q=%25.${domain}&output=json`,
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "HostingInfoDNSScanner/1.0",
      },
    };

    const request = https.request(options, (response) => {
      let raw = "";

      response.on("data", (chunk) => {
        raw += chunk;
      });

      response.on("end", () => {
        try {
          if (response.statusCode !== 200 || !raw.trim()) {
            resolve([]);
            return;
          }

          const parsed = JSON.parse(raw) as unknown;
          if (!Array.isArray(parsed)) {
            resolve([]);
            return;
          }

          const hosts = new Set<string>();

          for (const item of parsed as CertificateTransparencyEntry[]) {
            const nameValue = item.name_value;
            if (typeof nameValue !== "string") continue;

            const candidates = nameValue.split(/\r?\n/g);
            for (const candidate of candidates) {
              const normalized = normalizeDiscoveredHost(candidate, domain);
              if (normalized) {
                hosts.add(normalized);
                if (hosts.size >= 500) {
                  break;
                }
              }
            }

            if (hosts.size >= 500) {
              break;
            }
          }

          resolve(Array.from(hosts));
        } catch (error) {
          console.error(
            "[DNS Scan] Failed to parse Certificate Transparency response:",
            error,
          );
          resolve([]);
        }
      });
    });

    request.on("error", (error) => {
      console.error(
        "[DNS Scan] Certificate Transparency request failed:",
        error,
      );
      resolve([]);
    });

    request.setTimeout(6000, () => {
      request.destroy();
      resolve([]);
    });

    request.end();
  });
}

/**
 * Check A record age using DNS history
 * Uses multiple methods to determine record age
 */
async function checkARecordAge(
  domain: string,
  _currentIP: string,
): Promise<DNSHistoryResult> {
  const result: DNSHistoryResult = {};

  try {
    // Method 1: Try SecurityTrails API (if API key is available)
    const securityTrailsKey = process.env.SECURITYTRAILS_API_KEY;
    if (securityTrailsKey) {
      try {
        const historyData = await fetchSecurityTrailsHistory(
          domain,
          securityTrailsKey,
        );
        if (historyData) {
          return historyData;
        }
      } catch {
        console.log(
          "[DNS Age] SecurityTrails API failed, trying fallback methods",
        );
      }
    }

    // Method 2: Use domain WHOIS data to estimate
    // If we can't get exact DNS history, we'll estimate based on domain age
    const whoisAge = await estimateFromWhois(domain);
    if (whoisAge) {
      result.aRecordAge = whoisAge;
      result.estimatedAge = true;
      result.needsRedesign = whoisAge >= 7;
      result.aRecordLastChanged = new Date(
        Date.now() - whoisAge * 365 * 24 * 60 * 60 * 1000,
      ).toISOString();
      console.log(`[DNS Age] Estimated age from WHOIS: ${whoisAge} years`);
      return result;
    }

    // Method 3: Conservative estimate - if domain resolves, assume it's been there a while
    // We'll mark as unknown but suggest redesign if other factors indicate old site
    console.log(
      "[DNS Age] Could not determine exact age, will use other indicators",
    );
    return result;
  } catch (error) {
    console.error("[DNS Age] Error checking A record age:", error);
    return result;
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "An internal error occurred";
}

function classifyDnsErrorType(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("eai_again") ||
    normalized.includes("servfail")
  ) {
    return "timeout";
  }
  if (
    normalized.includes("enotfound") ||
    normalized.includes("nxdomain") ||
    normalized.includes("dns")
  ) {
    return "dns-resolution";
  }
  if (
    normalized.includes("500") ||
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504")
  ) {
    return "upstream";
  }
  return "runtime";
}

function buildDnsFailureResult(
  domain: string,
  error: unknown,
): DNSScanResult & {
  _module: {
    name: string;
    status: string;
    errorType: string;
    message: string;
    timestamp: string;
  };
} {
  const message = toErrorMessage(error);
  return {
    domain: domain.trim().toLowerCase(),
    records: {
      A: [],
      AAAA: [],
      MX: [],
      TXT: [],
      NS: [],
      CNAME: [],
    },
    subdomains: [],
    subdomainCount: 0,
    errors: {
      module: message,
    },
    aRecordAge: null,
    _module: {
      name: "dns",
      status: "failed",
      errorType: classifyDnsErrorType(message),
      message,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Fetch DNS history from SecurityTrails API
 */
function fetchSecurityTrailsHistory(
  domain: string,
  apiKey: string,
): Promise<DNSHistoryResult | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.securitytrails.com",
      path: `/v1/history/${domain}/dns/a`,
      method: "GET",
      headers: {
        APIKEY: apiKey,
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            if (parsed.records && parsed.records.length > 0) {
              // Get the oldest record
              const oldestRecord = parsed.records[parsed.records.length - 1];
              const firstSeen = new Date(oldestRecord.first_seen);
              const ageInYears =
                (Date.now() - firstSeen.getTime()) /
                (1000 * 60 * 60 * 24 * 365);

              resolve({
                aRecordAge: Math.floor(ageInYears * 10) / 10, // Round to 1 decimal
                aRecordLastChanged:
                  oldestRecord.last_seen || oldestRecord.first_seen,
                estimatedAge: false,
                needsRedesign: ageInYears >= 7,
              });
              return;
            }
          }
          resolve(null);
        } catch (error) {
          console.error("[DNS Age] SecurityTrails parse error:", error);
          resolve(null);
        }
      });
    });

    req.on("error", (error) => {
      console.error("[DNS Age] SecurityTrails request error:", error);
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Estimate DNS age from WHOIS data
 * This is a rough estimate - assumes DNS hasn't changed since domain creation
 */
function estimateFromWhois(domain: string): Promise<number | null> {
  return new Promise((resolve) => {
    // Use WHOIS lookup via rdap.org (free, no API key needed)
    const options = {
      hostname: "rdap.org",
      path: `/domain/${domain}`,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data) as RdapResponse;

            // Look for creation date in events
            const registrationEvent = parsed.events?.find(
              (e: RdapEvent) => e.eventAction === "registration",
            );

            if (registrationEvent?.eventDate) {
              const creationDate = new Date(registrationEvent.eventDate);
              const ageInYears =
                (Date.now() - creationDate.getTime()) /
                (1000 * 60 * 60 * 24 * 365);
              resolve(Math.floor(ageInYears * 10) / 10); // Round to 1 decimal
              return;
            }
          }
          resolve(null);
        } catch (error) {
          console.error("[DNS Age] WHOIS parse error:", error);
          resolve(null);
        }
      });
    });

    req.on("error", (error) => {
      console.error("[DNS Age] WHOIS request error:", error);
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Perform DNS scan (extracted for caching)
 */
async function performDNSScan(domain: string): Promise<DNSScanResult> {
  const normalizedDomain = domain.trim().toLowerCase();
  console.log(`[DNS Scan] Starting scan for: ${normalizedDomain}`);

  const result: DNSScanResult = {
    domain: normalizedDomain,
    records: {
      A: [],
      AAAA: [],
      MX: [],
      TXT: [],
      NS: [],
      CNAME: [],
    },
    subdomains: [] as string[],
    subdomainCount: 0,
    errors: {},
    aRecordAge: null, // Will be populated if we can determine it
  };

  // A Records (IPv4)
  try {
    const aRecords = await dns.resolve4(normalizedDomain);
    result.records.A = aRecords;
    console.log(`[DNS Scan] Found ${aRecords.length} A records`);

    // Check A record age if we have at least one A record
    if (aRecords.length > 0) {
      console.log(`[DNS Scan] Checking A record age for IP: ${aRecords[0]}`);
      const ageData = await checkARecordAge(normalizedDomain, aRecords[0]);
      result.aRecordAge = ageData;

      if (ageData.needsRedesign) {
        console.log(
          `[DNS Scan] ⚠️  A record is ${ageData.aRecordAge}+ years old - REDESIGN RECOMMENDED`,
        );
      }
    }
  } catch {
    result.errors.A = "An internal error occurred";
    console.log(`[DNS Scan] A records error: ${result.errors.A}`);
  }

  // AAAA Records (IPv6)
  try {
    const aaaaRecords = await dns.resolve6(normalizedDomain);
    result.records.AAAA = aaaaRecords;
    console.log(`[DNS Scan] Found ${aaaaRecords.length} AAAA records`);
  } catch {
    result.errors.AAAA = "An internal error occurred";
    console.log(`[DNS Scan] AAAA records error: ${result.errors.AAAA}`);
  }

  // MX Records
  try {
    const mxRecords = await dns.resolveMx(normalizedDomain);
    result.records.MX = mxRecords;
    console.log(`[DNS Scan] Found ${mxRecords.length} MX records`);
  } catch {
    result.errors.MX = "An internal error occurred";
    console.log(`[DNS Scan] MX records error: ${result.errors.MX}`);
  }

  // TXT Records
  try {
    const txtRecords = await dns.resolveTxt(normalizedDomain);
    result.records.TXT = txtRecords.map((record) => record.join(""));
    console.log(`[DNS Scan] Found ${txtRecords.length} TXT records`);
  } catch {
    result.errors.TXT = "An internal error occurred";
    console.log(`[DNS Scan] TXT records error: ${result.errors.TXT}`);
  }

  // NS Records
  try {
    const nsRecords = await dns.resolveNs(normalizedDomain);
    result.records.NS = nsRecords;
    console.log(`[DNS Scan] Found ${nsRecords.length} NS records`);
  } catch {
    result.errors.NS = "An internal error occurred";
    console.log(`[DNS Scan] NS records error: ${result.errors.NS}`);
  }

  // CNAME Records
  try {
    const cnameRecords = await dns.resolveCname(normalizedDomain);
    result.records.CNAME = cnameRecords;
    console.log(`[DNS Scan] Found ${cnameRecords.length} CNAME records`);
  } catch {
    // CNAME not found is normal for root domains
    result.errors.CNAME = "An internal error occurred";
    console.log(`[DNS Scan] No CNAME record (this is normal for root domains)`);
  }

  // Subdomain discovery
  try {
    const [commonSubdomains, ctSubdomains] = await Promise.all([
      discoverCommonSubdomains(normalizedDomain),
      fetchCertificateTransparencySubdomains(normalizedDomain),
    ]);

    const discovered = Array.from(
      new Set([...commonSubdomains, ...ctSubdomains]),
    ).sort();
    result.subdomains = discovered;
    result.subdomainCount = discovered.length;
    console.log(`[DNS Scan] Discovered ${discovered.length} subdomains`);
  } catch {
    result.errors.subdomains = "An internal error occurred";
    result.subdomains = [];
    result.subdomainCount = 0;
    console.log(
      `[DNS Scan] Subdomain discovery error: ${result.errors.subdomains}`,
    );
  }

  console.log(`[DNS Scan] Complete for: ${normalizedDomain}`);
  return result;
}

async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;
    // Validation handled by middleware

    // Use cache-aside pattern: check cache first, fetch if miss
    const result = await getOrSet("dns", domain, async () => {
      return await performDNSScan(domain);
    });

    // Add cache metadata to response
    const response = {
      ...result,
      _cache: {
        cached: true, // If we got here, data came from cache or was just cached
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  } catch (error) {
    const domain =
      typeof req.body?.domain === "string" ? req.body.domain : "unknown";
    const fallback = buildDnsFailureResult(domain, error);
    console.error("[DNS Scan] Error (degraded response):", fallback._module);
    return res.json(fallback);
  }
}

// Export with validation middleware
export default [validateBody(localDomainSchema), handler];
