/**
 * DNS Intelligence Module
 *
 * Provides comprehensive DNS analysis with:
 * - Multi-record type resolution (A, AAAA, MX, TXT, NS, CNAME, SOA)
 * - Historical tracking of DNS changes
 * - Confidence scoring for DNS data
 *
 * Part of Phase 1: Core Intelligence Engine
 */

import { db } from "../../db/client.js";
import { dnsRecords, dnsHistory } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { calculateConfidence, createSignal } from "../confidence-scorer.js";
import dns from "dns";
import { promisify } from "util";

// Promisify DNS functions
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveNs = promisify(dns.resolveNs);
const resolveCname = promisify(dns.resolveCname);
const resolveSoa = promisify(dns.resolveSoa);

export interface DNSRecordSet {
  A: string[];
  AAAA: string[];
  MX: Array<{ exchange: string; priority: number }>;
  TXT: string[];
  NS: string[];
  CNAME: string[];
  SOA: {
    nsname: string;
    hostmaster: string;
    serial: number;
    refresh: number;
    retry: number;
    expire: number;
    minttl: number;
  } | null;
}

export interface DNSIntelligence {
  domain: string;
  records: DNSRecordSet;
  confidence: number;
  lastChecked: Date;
  hasChanges: boolean;
  changesSince?: Date;
  evidence: {
    source: string;
    timestamp: Date;
    data: DNSRecordSet;
  }[];
}

type DnsRecordRow = typeof dnsRecords.$inferSelect;

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRecordSet(rows: DnsRecordRow[]): DNSRecordSet {
  const normalized: DNSRecordSet = {
    A: [],
    AAAA: [],
    MX: [],
    TXT: [],
    NS: [],
    CNAME: [],
    SOA: null,
  };

  for (const row of rows) {
    if (!row.value) continue;

    if (row.recordType === "A") normalized.A.push(row.value);
    if (row.recordType === "AAAA") normalized.AAAA.push(row.value);
    if (row.recordType === "MX") {
      normalized.MX.push({
        exchange: row.value,
        priority: row.priority ?? 10,
      });
    }
    if (row.recordType === "TXT") normalized.TXT.push(row.value);
    if (row.recordType === "NS") normalized.NS.push(row.value);
    if (row.recordType === "CNAME") normalized.CNAME.push(row.value);
    if (row.recordType === "SOA") {
      try {
        const parsed = JSON.parse(row.value);
        if (parsed && typeof parsed === "object") {
          normalized.SOA = parsed as DNSRecordSet["SOA"];
        }
      } catch {
        // Ignore invalid SOA JSON payload.
      }
    }
  }

  const mxMap = new Map<string, { exchange: string; priority: number }>();
  for (const mx of normalized.MX) {
    mxMap.set(`${mx.priority}:${mx.exchange}`, mx);
  }

  return {
    ...normalized,
    A: dedupe(normalized.A).sort(),
    AAAA: dedupe(normalized.AAAA).sort(),
    TXT: dedupe(normalized.TXT).sort(),
    NS: dedupe(normalized.NS).sort(),
    CNAME: dedupe(normalized.CNAME).sort(),
    MX: Array.from(mxMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.exchange.localeCompare(b.exchange);
    }),
  };
}

function flattenRecordSet(
  domain: string,
  records: DNSRecordSet,
  scannedAt: Date,
): Array<typeof dnsRecords.$inferInsert> {
  const rows: Array<typeof dnsRecords.$inferInsert> = [];

  records.A.forEach((value) =>
    rows.push({ domain, recordType: "A", value, scannedAt }),
  );
  records.AAAA.forEach((value) =>
    rows.push({ domain, recordType: "AAAA", value, scannedAt }),
  );
  records.MX.forEach((mx) =>
    rows.push({
      domain,
      recordType: "MX",
      value: mx.exchange,
      priority: mx.priority,
      scannedAt,
    }),
  );
  records.TXT.forEach((value) =>
    rows.push({ domain, recordType: "TXT", value, scannedAt }),
  );
  records.NS.forEach((value) =>
    rows.push({ domain, recordType: "NS", value, scannedAt }),
  );
  records.CNAME.forEach((value) =>
    rows.push({ domain, recordType: "CNAME", value, scannedAt }),
  );
  if (records.SOA) {
    rows.push({
      domain,
      recordType: "SOA",
      value: JSON.stringify(records.SOA),
      scannedAt,
    });
  }

  return rows;
}

function recordSetSignature(records: DNSRecordSet): string {
  return JSON.stringify(records);
}

function latestSnapshot(rows: DnsRecordRow[]): DnsRecordRow[] {
  if (rows.length === 0) return [];
  const latest = rows[0].scannedAt.getTime();
  return rows.filter((r) => r.scannedAt.getTime() === latest);
}

/**
 * Resolve all DNS records for a domain
 */
export async function resolveDNSRecords(domain: string): Promise<DNSRecordSet> {
  const records: DNSRecordSet = {
    A: [],
    AAAA: [],
    MX: [],
    TXT: [],
    NS: [],
    CNAME: [],
    SOA: null,
  };

  try {
    try {
      records.A = await resolve4(domain);
    } catch {
      // Ignore missing A records.
    }

    try {
      records.AAAA = await resolve6(domain);
    } catch {
      // Ignore missing AAAA records.
    }

    try {
      records.MX = await resolveMx(domain);
    } catch {
      // Ignore missing MX records.
    }

    try {
      const txtRecords = await resolveTxt(domain);
      records.TXT = txtRecords.map((record) => record.join(""));
    } catch {
      // Ignore missing TXT records.
    }

    try {
      records.NS = await resolveNs(domain);
    } catch {
      // Ignore missing NS records.
    }

    try {
      records.CNAME = await resolveCname(domain);
    } catch {
      // Ignore missing CNAME records.
    }

    try {
      records.SOA = await resolveSoa(domain);
    } catch {
      // Ignore missing SOA records.
    }
  } catch (error) {
    console.error(`DNS resolution error for ${domain}:`, error);
  }

  return normalizeRecordSet(
    flattenRecordSet(domain, records, new Date()).map((row) => ({
      id: 0,
      domain: row.domain,
      recordType: row.recordType,
      value: row.value,
      ttl: row.ttl ?? null,
      priority: row.priority ?? null,
      scannedAt: row.scannedAt ?? new Date(),
      createdAt: null,
    })),
  );
}

/**
 * Get DNS intelligence with historical tracking
 */
export async function getDNSIntelligence(
  domain: string,
  _userId?: number,
): Promise<DNSIntelligence> {
  const currentRecords = await resolveDNSRecords(domain);

  const historicalRows = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.domain, domain))
    .orderBy(desc(dnsRecords.scannedAt))
    .limit(500);

  const previousSnapshotRows = latestSnapshot(historicalRows);
  const previousRecordSet = normalizeRecordSet(previousSnapshotRows);

  const hasChanges =
    previousSnapshotRows.length > 0 &&
    recordSetSignature(currentRecords) !==
      recordSetSignature(previousRecordSet);
  const changesSince =
    hasChanges && previousSnapshotRows[0]
      ? previousSnapshotRows[0].scannedAt
      : undefined;

  const now = new Date();
  const confidence = calculateConfidence([
    createSignal(
      "dns",
      currentRecords.A.length > 0 ? "a_present" : "a_missing",
      30,
      "dns_resolver",
      now,
    ),
    createSignal(
      "dns",
      currentRecords.MX.length > 0 ? "mx_present" : "mx_missing",
      20,
      "dns_resolver",
      now,
    ),
    createSignal(
      "dns",
      currentRecords.NS.length > 0 ? "ns_present" : "ns_missing",
      20,
      "dns_resolver",
      now,
    ),
    createSignal(
      "dns",
      currentRecords.TXT.length > 0 ? "txt_present" : "txt_missing",
      15,
      "dns_resolver",
      now,
    ),
    createSignal(
      "dns",
      currentRecords.SOA ? "soa_present" : "soa_missing",
      15,
      "dns_resolver",
      now,
    ),
  ]).score;

  const currentRows = flattenRecordSet(domain, currentRecords, now);
  if (currentRows.length > 0) {
    await db.insert(dnsRecords).values(currentRows);
  }

  if (hasChanges && previousSnapshotRows.length > 0) {
    const previousRows = flattenRecordSet(
      domain,
      previousRecordSet,
      previousSnapshotRows[0].scannedAt,
    );
    const previousKeys = new Set(
      previousRows.map((r) => `${r.recordType}|${r.priority ?? ""}|${r.value}`),
    );
    const currentKeys = new Set(
      currentRows.map((r) => `${r.recordType}|${r.priority ?? ""}|${r.value}`),
    );

    const added = currentRows.filter(
      (r) =>
        !previousKeys.has(`${r.recordType}|${r.priority ?? ""}|${r.value}`),
    );
    const removed = previousRows.filter(
      (r) => !currentKeys.has(`${r.recordType}|${r.priority ?? ""}|${r.value}`),
    );

    const historyRows: Array<typeof dnsHistory.$inferInsert> = [
      ...added.map((row) => ({
        domain,
        subdomain: null,
        recordType: row.recordType,
        recordValue: row.value,
        ttl: row.ttl ?? null,
        firstSeen: now,
        lastSeen: now,
        seenCount: 1,
        resolver: "system",
        isAuthoritative: false,
        confidenceScore: confidence,
        previousValue: null,
        changedAt: now,
      })),
      ...removed.map((row) => ({
        domain,
        subdomain: null,
        recordType: row.recordType,
        recordValue: row.value,
        ttl: row.ttl ?? null,
        firstSeen: previousSnapshotRows[0].scannedAt,
        lastSeen: now,
        seenCount: 1,
        resolver: "system",
        isAuthoritative: false,
        confidenceScore: confidence,
        previousValue: row.value,
        changedAt: now,
      })),
    ];

    if (historyRows.length > 0) {
      await db.insert(dnsHistory).values(historyRows);
    }
  }

  return {
    domain,
    records: currentRecords,
    confidence,
    lastChecked: now,
    hasChanges,
    changesSince,
    evidence: [
      {
        source: "dns_resolver",
        timestamp: now,
        data: currentRecords,
      },
    ],
  };
}

/**
 * Get DNS change history for a domain
 */
export async function getDNSHistory(domain: string, limit: number = 10) {
  const history = await db
    .select()
    .from(dnsHistory)
    .where(eq(dnsHistory.domain, domain))
    .orderBy(desc(dnsHistory.changedAt))
    .limit(limit);

  return history;
}

/**
 * Analyze DNS configuration for issues
 */
export function analyzeDNSConfiguration(records: DNSRecordSet): {
  issues: string[];
  warnings: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (records.A.length === 0 && records.AAAA.length === 0) {
    issues.push("No A or AAAA records found - domain may not be accessible");
  }

  if (records.MX.length === 0) {
    warnings.push("No MX records found - email delivery may not work");
  }

  if (records.NS.length === 0) {
    issues.push("No NS records found - DNS delegation issue");
  }

  if (records.A.length === 1) {
    recommendations.push(
      "Consider adding redundant A records for high availability",
    );
  }

  const hasSPF = records.TXT.some((txt) =>
    txt.toLowerCase().includes("v=spf1"),
  );
  if (!hasSPF && records.MX.length > 0) {
    recommendations.push("Add SPF record to prevent email spoofing");
  }

  const hasDMARC = records.TXT.some((txt) =>
    txt.toLowerCase().includes("v=dmarc1"),
  );
  if (!hasDMARC && records.MX.length > 0) {
    recommendations.push("Add DMARC record for email authentication");
  }

  if (records.AAAA.length === 0 && records.A.length > 0) {
    recommendations.push(
      "Consider adding IPv6 (AAAA) records for future compatibility",
    );
  }

  return { issues, warnings, recommendations };
}
