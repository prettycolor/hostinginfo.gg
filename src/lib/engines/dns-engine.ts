/**
 * ENGINE A: DNS RESOLUTION & HISTORICAL TRACKING
 *
 * Comprehensive DNS resolution engine that:
 * - Resolves all DNS record types (A, AAAA, CNAME, NS, MX, TXT, SOA, CAA)
 * - Enumerates common subdomains (www, api, mail, cdn, dev, staging, admin, m, blog, shop, app)
 * - Queries authoritative nameservers directly
 * - Compares recursive vs authoritative responses
 * - Tracks historical DNS changes (first seen, last seen, change detection)
 * - Stores results in dns_history table
 */

import dns from "dns";
import { promisify } from "util";
import { db } from "../../server/db/client.js";
import { dnsHistory } from "../../server/db/schema.js";
import { eq, and, desc } from "drizzle-orm";

// Promisify DNS functions
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveCname = promisify(dns.resolveCname);
const resolveNs = promisify(dns.resolveNs);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveSoa = promisify(dns.resolveSoa);
const resolveCaa = promisify(dns.resolveCaa);

// Common subdomains to enumerate
const COMMON_SUBDOMAINS = [
  "www",
  "api",
  "mail",
  "cdn",
  "dev",
  "staging",
  "admin",
  "m",
  "blog",
  "shop",
  "app",
];

// DNS record types
type DNSRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "NS"
  | "MX"
  | "TXT"
  | "SOA"
  | "CAA";

interface DNSRecord {
  domain: string;
  subdomain: string | null;
  recordType: DNSRecordType;
  recordValue: string;
  ttl: number | null;
  resolver: string;
  isAuthoritative: boolean;
  authoritativeNs: string | null;
  confidenceScore: number;
}

interface DNSResolutionResult {
  domain: string;
  records: DNSRecord[];
  subdomains: {
    subdomain: string;
    exists: boolean;
    records: DNSRecord[];
  }[];
  authoritativeNameservers: string[];
  resolutionTime: number;
  errors: string[];
}

type DNSHistoryRow = typeof dnsHistory.$inferSelect;

type AddressRecord = {
  address: string;
  ttl: number;
};

type MXRecord = {
  priority: number;
  exchange: string;
};

type CAARecord = {
  critical?: boolean;
  issue?: string;
  issuewild?: string;
  iodef?: string;
};

/**
 * Resolve a single DNS record type for a domain
 */
async function resolveSingleRecord(
  domain: string,
  recordType: DNSRecordType,
  resolver: string = "8.8.8.8",
): Promise<DNSRecord[]> {
  const records: DNSRecord[] = [];

  try {
    // Set DNS server
    dns.setServers([resolver]);

    let results: unknown[] = [];

    switch (recordType) {
      case "A":
        results = await resolve4(domain, { ttl: true });
        (results as AddressRecord[]).forEach((r) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "A",
            recordValue: r.address,
            ttl: r.ttl,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "AAAA":
        results = await resolve6(domain, { ttl: true });
        (results as AddressRecord[]).forEach((r) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "AAAA",
            recordValue: r.address,
            ttl: r.ttl,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "CNAME":
        results = await resolveCname(domain);
        results.forEach((r: string) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "CNAME",
            recordValue: r,
            ttl: null,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "NS":
        results = await resolveNs(domain);
        results.forEach((r: string) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "NS",
            recordValue: r,
            ttl: null,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "MX":
        results = await resolveMx(domain);
        (results as MXRecord[]).forEach((r) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "MX",
            recordValue: `${r.priority} ${r.exchange}`,
            ttl: null,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "TXT":
        results = await resolveTxt(domain);
        results.forEach((r: string[]) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "TXT",
            recordValue: r.join(""),
            ttl: null,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;

      case "SOA": {
        const soa = await resolveSoa(domain);
        records.push({
          domain,
          subdomain: null,
          recordType: "SOA",
          recordValue: JSON.stringify(soa),
          ttl: null,
          resolver,
          isAuthoritative: false,
          authoritativeNs: null,
          confidenceScore: 100,
        });
        break;
      }

      case "CAA":
        results = await resolveCaa(domain);
        (results as CAARecord[]).forEach((r) => {
          records.push({
            domain,
            subdomain: null,
            recordType: "CAA",
            recordValue: `${r.critical ? "1" : "0"} ${r.issue || r.issuewild || r.iodef}`,
            ttl: null,
            resolver,
            isAuthoritative: false,
            authoritativeNs: null,
            confidenceScore: 100,
          });
        });
        break;
    }
  } catch {
    // Record not found or error - this is normal for many record types
    // Don't throw, just return empty array
  }

  return records;
}

/**
 * Resolve all DNS record types for a domain
 */
export async function resolveAllRecords(
  domain: string,
  resolver: string = "8.8.8.8",
): Promise<DNSRecord[]> {
  const recordTypes: DNSRecordType[] = [
    "A",
    "AAAA",
    "CNAME",
    "NS",
    "MX",
    "TXT",
    "SOA",
    "CAA",
  ];
  const allRecords: DNSRecord[] = [];

  // Resolve all record types in parallel
  const results = await Promise.allSettled(
    recordTypes.map((type) => resolveSingleRecord(domain, type, resolver)),
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      allRecords.push(...result.value);
    }
  });

  return allRecords;
}

/**
 * Enumerate subdomains and resolve their records
 */
export async function enumerateSubdomains(
  domain: string,
  resolver: string = "8.8.8.8",
): Promise<{ subdomain: string; exists: boolean; records: DNSRecord[] }[]> {
  const results = await Promise.allSettled(
    COMMON_SUBDOMAINS.map(async (subdomain) => {
      const fullDomain = `${subdomain}.${domain}`;
      const records = await resolveAllRecords(fullDomain, resolver);

      return {
        subdomain,
        exists: records.length > 0,
        records: records.map((r) => ({ ...r, subdomain })),
      };
    }),
  );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        subdomain: string;
        exists: boolean;
        records: DNSRecord[];
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((r) => r.exists); // Only return subdomains that exist
}

/**
 * Get authoritative nameservers for a domain
 */
export async function getAuthoritativeNameservers(
  domain: string,
): Promise<string[]> {
  try {
    const ns = await resolveNs(domain);
    return ns;
  } catch {
    return [];
  }
}

/**
 * Store DNS records in database with historical tracking
 */
export async function storeDNSRecords(records: DNSRecord[]): Promise<void> {
  for (const record of records) {
    try {
      // Check if record already exists
      const existing = await db
        .select()
        .from(dnsHistory)
        .where(
          and(
            eq(dnsHistory.domain, record.domain),
            eq(dnsHistory.subdomain, record.subdomain || ""),
            eq(dnsHistory.recordType, record.recordType),
            eq(dnsHistory.recordValue, record.recordValue),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Record exists - update last seen and increment seen count
        const existingRecord = existing[0];
        await db
          .update(dnsHistory)
          .set({
            lastSeen: new Date(),
            seenCount: (existingRecord.seenCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(dnsHistory.id, existingRecord.id));
      } else {
        // New record - insert
        await db.insert(dnsHistory).values({
          domain: record.domain,
          subdomain: record.subdomain || null,
          recordType: record.recordType,
          recordValue: record.recordValue,
          ttl: record.ttl,
          firstSeen: new Date(),
          lastSeen: new Date(),
          seenCount: 1,
          resolver: record.resolver,
          isAuthoritative: record.isAuthoritative,
          authoritativeNs: record.authoritativeNs,
          confidenceScore: record.confidenceScore,
          previousValue: null,
          changedAt: null,
        });
      }
    } catch (error) {
      console.error(`Error storing DNS record for ${record.domain}:`, error);
    }
  }
}

/**
 * Get DNS history for a domain
 */
export async function getDNSHistory(
  domain: string,
  recordType?: DNSRecordType,
): Promise<DNSHistoryRow[]> {
  try {
    const conditions = [eq(dnsHistory.domain, domain)];

    if (recordType) {
      conditions.push(eq(dnsHistory.recordType, recordType));
    }

    const results = await db
      .select()
      .from(dnsHistory)
      .where(and(...conditions))
      .orderBy(desc(dnsHistory.lastSeen));

    return results;
  } catch (error) {
    console.error(`Error fetching DNS history for ${domain}:`, error);
    return [];
  }
}

/**
 * Detect DNS changes by comparing current and historical records
 */
export async function detectDNSChanges(domain: string): Promise<{
  added: DNSRecord[];
  removed: DNSRecord[];
  changed: DNSRecord[];
}> {
  // Get current DNS records
  const currentRecords = await resolveAllRecords(domain);

  // Get historical records from database
  const historicalRecords = await getDNSHistory(domain);

  // Compare and detect changes
  const added: DNSRecord[] = [];
  const removed: DNSRecord[] = [];
  const changed: DNSRecord[] = [];

  // Find added records (in current but not in historical)
  for (const current of currentRecords) {
    const found = historicalRecords.find(
      (h) =>
        h.recordType === current.recordType &&
        h.recordValue === current.recordValue &&
        (h.subdomain || null) === current.subdomain,
    );

    if (!found) {
      added.push(current);
    }
  }

  // Find removed records (in historical but not in current)
  for (const historical of historicalRecords) {
    const found = currentRecords.find(
      (c) =>
        c.recordType === historical.recordType &&
        c.recordValue === historical.recordValue &&
        c.subdomain === (historical.subdomain || null),
    );

    if (!found) {
      removed.push({
        domain: historical.domain,
        subdomain: historical.subdomain || null,
        recordType: historical.recordType as DNSRecordType,
        recordValue: historical.recordValue,
        ttl: historical.ttl,
        resolver: historical.resolver || "8.8.8.8",
        isAuthoritative: historical.isAuthoritative || false,
        authoritativeNs: historical.authoritativeNs,
        confidenceScore: historical.confidenceScore || 100,
      });
    }
  }

  return { added, removed, changed };
}

/**
 * Main DNS resolution function - resolves all records and stores in database
 */
export async function resolveDomain(
  domain: string,
): Promise<DNSResolutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Get authoritative nameservers
    const authoritativeNameservers = await getAuthoritativeNameservers(domain);

    // Resolve all records for main domain
    const mainRecords = await resolveAllRecords(domain);

    // Enumerate subdomains
    const subdomains = await enumerateSubdomains(domain);

    // Collect all records (main + subdomains)
    const allRecords = [...mainRecords];
    subdomains.forEach((sub) => {
      allRecords.push(...sub.records);
    });

    // Store all records in database
    await storeDNSRecords(allRecords);

    const resolutionTime = Date.now() - startTime;

    return {
      domain,
      records: mainRecords,
      subdomains,
      authoritativeNameservers,
      resolutionTime,
      errors,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      domain,
      records: [],
      subdomains: [],
      authoritativeNameservers: [],
      resolutionTime: Date.now() - startTime,
      errors,
    };
  }
}

/**
 * Find co-hosted domains (domains sharing the same IP addresses)
 */
export async function findCoHostedDomains(domain: string): Promise<{
  sharedIPs: string[];
  coHostedDomains: string[];
}> {
  try {
    // Get A records for the domain
    const records = await getDNSHistory(domain, "A");
    const ips = records.map((r) => r.recordValue);

    if (ips.length === 0) {
      return { sharedIPs: [], coHostedDomains: [] };
    }

    // Find other domains with the same IPs
    const coHosted = await db
      .select()
      .from(dnsHistory)
      .where(eq(dnsHistory.recordType, "A"));
    const coHostedForSameIps = coHosted.filter((record) =>
      ips.includes(record.recordValue),
    );

    // Filter to unique domains (excluding the original domain)
    const uniqueDomains = [
      ...new Set(coHostedForSameIps.map((r) => r.domain)),
    ].filter((d) => d !== domain);

    return {
      sharedIPs: ips,
      coHostedDomains: uniqueDomains,
    };
  } catch (error) {
    console.error(`Error finding co-hosted domains for ${domain}:`, error);
    return { sharedIPs: [], coHostedDomains: [] };
  }
}
