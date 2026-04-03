import type { IncomingHttpHeaders } from "http";
import { promises as dns } from "dns";
import { isIP } from "node:net";
import { getOrSet } from "./cache/cache-manager.js";

type FirewallEvidenceType = "header" | "cidr" | "asn" | "server-signature";
type FirewallRangeRole = "waf-edge" | "edge-host" | "host-hint";
type FirewallAssertion = "corroborative" | "host-hint";

interface FirewallRangeEntry {
  provider: string;
  cidr: string;
  role: FirewallRangeRole;
  assertion: FirewallAssertion;
  source: string;
  versionToken: string;
}

export interface FirewallEvidenceDetail {
  type: FirewallEvidenceType;
  provider: string;
  signal: string;
  confidence: number;
  corroboratesWaf: boolean;
  matchedIp?: string;
  cidr?: string;
  source?: string;
  role?: FirewallRangeRole;
}

export interface FirewallHistorySummary {
  sampleSize: number;
  detectionRate: number;
  managedEdgeRate: number;
  lastDetectedAt: string | null;
}

export interface EnhancedWafDetectionResult {
  detected: boolean;
  provider: string | null;
  confidence: number;
  evidence: string[];
  hostProvider?: string | null;
  evidenceDetails?: FirewallEvidenceDetail[];
  corroborated?: boolean;
  historySummary?: FirewallHistorySummary;
  sourceVersion?: string | null;
  ipCandidates?: string[];
}

export interface FirewallFeedSnapshot {
  fetchedAt: string;
  sourceVersion: string;
  ranges: FirewallRangeEntry[];
  errors: string[];
}

const FEED_CACHE_DOMAIN = "__firewall_feeds__";
const FEED_CACHE_SUFFIX = "official-feed-v1";
const FEED_CACHE_TTL_SECONDS = 6 * 60 * 60;

const WAF_PROVIDER_KEYWORDS = [
  "cloudflare",
  "sucuri",
  "wordfence",
  "modsecurity",
  "aws waf",
  "akamai",
  "imperva",
  "barracuda",
  "f5",
  "fortinet",
  "godaddy edge security",
];

const headerSignatureRules: Array<{
  provider: string;
  signatures: string[];
  confidence: number;
}> = [
  {
    provider: "Cloudflare",
    signatures: ["cf-ray", "cf-cache-status", "__cfduid", "cf-request-id"],
    confidence: 92,
  },
  {
    provider: "Sucuri",
    signatures: ["x-sucuri-id", "x-sucuri-cache"],
    confidence: 90,
  },
  {
    provider: "Wordfence",
    signatures: ["wordfence"],
    confidence: 85,
  },
  {
    provider: "ModSecurity",
    signatures: ["mod_security", "modsecurity"],
    confidence: 88,
  },
  {
    provider: "AWS WAF",
    signatures: ["x-amzn-requestid"],
    confidence: 88,
  },
  {
    provider: "Akamai",
    signatures: ["akamai", "x-akamai"],
    confidence: 86,
  },
  {
    provider: "Imperva",
    signatures: ["incap_ses", "visid_incap", "x-cdn"],
    confidence: 86,
  },
  {
    provider: "Barracuda",
    signatures: ["barra_counter_session"],
    confidence: 82,
  },
  {
    provider: "F5 BIG-IP",
    signatures: ["bigip", "f5"],
    confidence: 82,
  },
  {
    provider: "Fortinet",
    signatures: ["fortigate"],
    confidence: 82,
  },
];

const parsedCidrMemo = new Map<string, ParsedCidr | null>();

interface ParsedCidr {
  version: 4 | 6;
  prefix: number;
  network: bigint;
}

function normalizeIp(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;

  if (value.startsWith("[") && value.includes("]")) {
    value = value.slice(1, value.indexOf("]"));
  }

  const zoneSeparator = value.indexOf("%");
  if (zoneSeparator > -1) {
    value = value.slice(0, zoneSeparator);
  }

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(value)) {
    value = value.split(":")[0];
  }

  if (value.startsWith("::ffff:")) {
    const mapped = value.slice("::ffff:".length);
    if (isIP(mapped) === 4) {
      return mapped;
    }
  }

  return isIP(value) ? value : null;
}

function parseIPv4ToBigInt(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8n) + BigInt(octet);
  }
  return value;
}

function parseIPv6ToBigInt(ip: string): bigint | null {
  let normalized = ip.toLowerCase();
  if (normalized.includes("%")) {
    normalized = normalized.split("%")[0];
  }

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon === -1) return null;
    const v4Part = normalized.slice(lastColon + 1);
    const v4BigInt = parseIPv4ToBigInt(v4Part);
    if (v4BigInt === null) return null;
    const high = Number((v4BigInt >> 16n) & 0xffffn).toString(16);
    const low = Number(v4BigInt & 0xffffn).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }

  const doubleColonIndex = normalized.indexOf("::");
  let groups: string[] = [];

  if (doubleColonIndex >= 0) {
    if (normalized.indexOf("::", doubleColonIndex + 2) >= 0) {
      return null;
    }
    const [left, right] = normalized.split("::");
    const leftGroups = left ? left.split(":").filter(Boolean) : [];
    const rightGroups = right ? right.split(":").filter(Boolean) : [];
    const missing = 8 - (leftGroups.length + rightGroups.length);
    if (missing < 0) return null;
    groups = [...leftGroups, ...new Array(missing).fill("0"), ...rightGroups];
  } else {
    groups = normalized.split(":");
    if (groups.length !== 8) return null;
  }

  if (groups.length !== 8) return null;

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    value = (value << 16n) + BigInt(parseInt(group, 16));
  }
  return value;
}

function parseIpToBigInt(ip: string): { version: 4 | 6; value: bigint } | null {
  const normalized = normalizeIp(ip);
  if (!normalized) return null;
  const version = isIP(normalized);
  if (version === 4) {
    const value = parseIPv4ToBigInt(normalized);
    if (value === null) return null;
    return { version: 4, value };
  }
  if (version === 6) {
    const value = parseIPv6ToBigInt(normalized);
    if (value === null) return null;
    return { version: 6, value };
  }
  return null;
}

function parseCidr(cidr: string): ParsedCidr | null {
  const cached = parsedCidrMemo.get(cidr);
  if (cached !== undefined) {
    return cached;
  }

  const [ipPartRaw, prefixRaw] = cidr.split("/");
  if (!ipPartRaw || !prefixRaw) {
    parsedCidrMemo.set(cidr, null);
    return null;
  }

  const parsedIp = parseIpToBigInt(ipPartRaw);
  if (!parsedIp) {
    parsedCidrMemo.set(cidr, null);
    return null;
  }

  const bits = parsedIp.version === 4 ? 32 : 128;
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) {
    parsedCidrMemo.set(cidr, null);
    return null;
  }

  const shift = BigInt(bits - prefix);
  const network =
    shift === 0n ? parsedIp.value : (parsedIp.value >> shift) << shift;

  const parsed: ParsedCidr = { version: parsedIp.version, prefix, network };
  parsedCidrMemo.set(cidr, parsed);
  return parsed;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const parsedIp = parseIpToBigInt(ip);
  const parsedCidr = parseCidr(cidr);
  if (!parsedIp || !parsedCidr || parsedIp.version !== parsedCidr.version) {
    return false;
  }

  const bits = parsedIp.version === 4 ? 32 : 128;
  const shift = BigInt(bits - parsedCidr.prefix);
  const maskedIp =
    shift === 0n ? parsedIp.value : (parsedIp.value >> shift) << shift;
  return maskedIp === parsedCidr.network;
}

function dedupeRanges(entries: FirewallRangeEntry[]): FirewallRangeEntry[] {
  const seen = new Set<string>();
  const deduped: FirewallRangeEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.provider}|${entry.cidr}|${entry.role}|${entry.assertion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseCloudflareRanges(
  ipv4Text: string,
  ipv6Text: string,
): { ranges: FirewallRangeEntry[]; versionToken: string } {
  const v4Ranges = ipv4Text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const v6Ranges = ipv6Text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ranges: FirewallRangeEntry[] = [...v4Ranges, ...v6Ranges].map(
    (cidr) => ({
      provider: "Cloudflare",
      cidr,
      role: "waf-edge",
      assertion: "corroborative",
      source: "https://www.cloudflare.com/ips-v4,ips-v6",
      versionToken: `v4:${v4Ranges.length}-v6:${v6Ranges.length}`,
    }),
  );

  return {
    ranges,
    versionToken: `v4:${v4Ranges.length}-v6:${v6Ranges.length}`,
  };
}

export function parseAwsIpRanges(payload: {
  syncToken?: string;
  prefixes?: Array<{ ip_prefix?: string; service?: string }>;
  ipv6_prefixes?: Array<{ ipv6_prefix?: string; service?: string }>;
}): { ranges: FirewallRangeEntry[]; versionToken: string } {
  const relevantServices = new Set([
    "CLOUDFRONT",
    "CLOUDFRONT_ORIGIN_FACING",
    "GLOBALACCELERATOR",
  ]);

  const ranges: FirewallRangeEntry[] = [];

  for (const prefix of payload.prefixes ?? []) {
    if (!prefix.ip_prefix || !relevantServices.has(prefix.service ?? "")) {
      continue;
    }
    ranges.push({
      provider: "AWS CloudFront",
      cidr: prefix.ip_prefix,
      role: "edge-host",
      assertion: "corroborative",
      source: "https://ip-ranges.amazonaws.com/ip-ranges.json",
      versionToken: payload.syncToken ?? "unknown",
    });
  }

  for (const prefix of payload.ipv6_prefixes ?? []) {
    if (!prefix.ipv6_prefix || !relevantServices.has(prefix.service ?? "")) {
      continue;
    }
    ranges.push({
      provider: "AWS CloudFront",
      cidr: prefix.ipv6_prefix,
      role: "edge-host",
      assertion: "corroborative",
      source: "https://ip-ranges.amazonaws.com/ip-ranges.json",
      versionToken: payload.syncToken ?? "unknown",
    });
  }

  return {
    ranges,
    versionToken: payload.syncToken ?? "unknown",
  };
}

export function parseFastlyPublicIpList(payload: {
  addresses?: string[];
  ipv6_addresses?: string[];
}): { ranges: FirewallRangeEntry[]; versionToken: string } {
  const ranges: FirewallRangeEntry[] = [
    ...(payload.addresses ?? []),
    ...(payload.ipv6_addresses ?? []),
  ].map((cidr) => ({
    provider: "Fastly",
    cidr,
    role: "edge-host",
    assertion: "corroborative",
    source: "https://api.fastly.com/public-ip-list",
    versionToken: `v4:${payload.addresses?.length ?? 0}-v6:${payload.ipv6_addresses?.length ?? 0}`,
  }));

  return {
    ranges,
    versionToken: `v4:${payload.addresses?.length ?? 0}-v6:${payload.ipv6_addresses?.length ?? 0}`,
  };
}

export function parseGoogleCloudRanges(payload: {
  syncToken?: string;
  prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
}): { ranges: FirewallRangeEntry[]; versionToken: string } {
  const ranges: FirewallRangeEntry[] = [];
  for (const entry of payload.prefixes ?? []) {
    if (entry.ipv4Prefix) {
      ranges.push({
        provider: "Google Edge",
        cidr: entry.ipv4Prefix,
        role: "host-hint",
        assertion: "host-hint",
        source: "https://www.gstatic.com/ipranges/cloud.json",
        versionToken: payload.syncToken ?? "unknown",
      });
    }
    if (entry.ipv6Prefix) {
      ranges.push({
        provider: "Google Edge",
        cidr: entry.ipv6Prefix,
        role: "host-hint",
        assertion: "host-hint",
        source: "https://www.gstatic.com/ipranges/cloud.json",
        versionToken: payload.syncToken ?? "unknown",
      });
    }
  }

  return {
    ranges,
    versionToken: payload.syncToken ?? "unknown",
  };
}

export function parseAzureServiceTags(payload: {
  changeNumber?: string | number;
  values?: Array<{
    name?: string;
    properties?: { addressPrefixes?: string[] };
  }>;
}): { ranges: FirewallRangeEntry[]; versionToken: string } {
  const ranges: FirewallRangeEntry[] = [];
  for (const value of payload.values ?? []) {
    const name = value.name ?? "";
    if (!name.startsWith("AzureFrontDoor.")) {
      continue;
    }
    for (const cidr of value.properties?.addressPrefixes ?? []) {
      ranges.push({
        provider: "Azure Front Door",
        cidr,
        role: "host-hint",
        assertion: "host-hint",
        source:
          "https://www.microsoft.com/en-us/download/details.aspx?id=56519",
        versionToken: String(payload.changeNumber ?? "unknown"),
      });
    }
  }

  return {
    ranges,
    versionToken: String(payload.changeNumber ?? "unknown"),
  };
}

async function resolveAzureServiceTagsUrl(): Promise<string | null> {
  const page = await fetchText(
    "https://www.microsoft.com/en-us/download/details.aspx?id=56519",
    12000,
  );
  const match = page.match(
    /https:\/\/download\.microsoft\.com\/download\/[^"' ]+ServiceTags_Public_[0-9]+\.json/i,
  );
  return match ? match[0] : null;
}

async function fetchFirewallFeedSnapshotUncached(): Promise<FirewallFeedSnapshot> {
  const ranges: FirewallRangeEntry[] = [];
  const errors: string[] = [];
  const versionParts: string[] = [];

  const feedTasks = await Promise.allSettled([
    (async () => {
      const [v4, v6] = await Promise.all([
        fetchText("https://www.cloudflare.com/ips-v4"),
        fetchText("https://www.cloudflare.com/ips-v6"),
      ]);
      const parsed = parseCloudflareRanges(v4, v6);
      ranges.push(...parsed.ranges);
      versionParts.push(`cloudflare:${parsed.versionToken}`);
    })(),
    (async () => {
      const awsPayload = await fetchJson<{
        syncToken?: string;
        prefixes?: Array<{ ip_prefix?: string; service?: string }>;
        ipv6_prefixes?: Array<{ ipv6_prefix?: string; service?: string }>;
      }>("https://ip-ranges.amazonaws.com/ip-ranges.json");
      const parsed = parseAwsIpRanges(awsPayload);
      ranges.push(...parsed.ranges);
      versionParts.push(`aws:${parsed.versionToken}`);
    })(),
    (async () => {
      const fastlyPayload = await fetchJson<{
        addresses?: string[];
        ipv6_addresses?: string[];
      }>("https://api.fastly.com/public-ip-list");
      const parsed = parseFastlyPublicIpList(fastlyPayload);
      ranges.push(...parsed.ranges);
      versionParts.push(`fastly:${parsed.versionToken}`);
    })(),
    (async () => {
      const googlePayload = await fetchJson<{
        syncToken?: string;
        prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
      }>("https://www.gstatic.com/ipranges/cloud.json");
      const parsed = parseGoogleCloudRanges(googlePayload);
      ranges.push(...parsed.ranges);
      versionParts.push(`google:${parsed.versionToken}`);
    })(),
    (async () => {
      const azureUrl = await resolveAzureServiceTagsUrl();
      if (!azureUrl) {
        throw new Error("Could not locate Azure Service Tags JSON URL");
      }
      const azurePayload = await fetchJson<{
        changeNumber?: string | number;
        values?: Array<{
          name?: string;
          properties?: { addressPrefixes?: string[] };
        }>;
      }>(azureUrl, 15000);
      const parsed = parseAzureServiceTags(azurePayload);
      ranges.push(...parsed.ranges);
      versionParts.push(`azure:${parsed.versionToken}`);
    })(),
  ]);

  for (const task of feedTasks) {
    if (task.status === "rejected") {
      errors.push(
        task.reason instanceof Error
          ? task.reason.message
          : "Unknown feed error",
      );
    }
  }

  const dedupedRanges = dedupeRanges(ranges);
  return {
    fetchedAt: new Date().toISOString(),
    sourceVersion: versionParts.length > 0 ? versionParts.join("|") : "unknown",
    ranges: dedupedRanges,
    errors,
  };
}

export async function getFirewallFeedSnapshot(): Promise<FirewallFeedSnapshot> {
  try {
    return await getOrSet<FirewallFeedSnapshot>(
      "intelligence",
      FEED_CACHE_DOMAIN,
      () => fetchFirewallFeedSnapshotUncached(),
      FEED_CACHE_SUFFIX,
      FEED_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    console.warn("[Firewall Intelligence] Feed fetch failed:", error);
    return {
      fetchedAt: new Date().toISOString(),
      sourceVersion: "unavailable",
      ranges: [],
      errors: ["Failed to load external firewall feed snapshot"],
    };
  }
}

function providerRoot(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized.includes("cloudflare")) return "cloudflare";
  if (normalized.includes("sucuri")) return "sucuri";
  if (normalized.includes("wordfence")) return "wordfence";
  if (normalized.includes("modsecurity")) return "modsecurity";
  if (normalized.includes("aws") || normalized.includes("cloudfront")) {
    return "aws";
  }
  if (normalized.includes("akamai")) return "akamai";
  if (normalized.includes("imperva") || normalized.includes("incapsula")) {
    return "imperva";
  }
  if (normalized.includes("barracuda")) return "barracuda";
  if (normalized.includes("f5")) return "f5";
  if (normalized.includes("fortinet")) return "fortinet";
  if (normalized.includes("godaddy")) return "godaddy";
  if (normalized.includes("fastly")) return "fastly";
  if (normalized.includes("google")) return "google";
  if (normalized.includes("azure")) return "azure";
  return normalized;
}

function isKnownWafProvider(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return WAF_PROVIDER_KEYWORDS.some((provider) =>
    normalized.includes(provider),
  );
}

function detectHeaderEvidence(
  headers: IncomingHttpHeaders,
): FirewallEvidenceDetail[] {
  const details: FirewallEvidenceDetail[] = [];
  const headerString = JSON.stringify(headers).toLowerCase();
  const serverHeader = (
    normalizeHeaderValue(headers["server"]) || ""
  ).toLowerCase();
  const xSiteId = normalizeHeaderValue(headers["x-siteid"]);
  const xVersion = normalizeHeaderValue(headers["x-version"]);

  for (const rule of headerSignatureRules) {
    for (const signature of rule.signatures) {
      if (!headerString.includes(signature.toLowerCase())) continue;
      details.push({
        type: "header",
        provider: rule.provider,
        signal: `${signature} header detected`,
        confidence: rule.confidence,
        corroboratesWaf: true,
      });
      break;
    }
  }

  if (serverHeader.includes("cloudflare")) {
    details.push({
      type: "server-signature",
      provider: "Cloudflare",
      signal: "Cloudflare in server header",
      confidence: 90,
      corroboratesWaf: true,
    });
  }
  if (serverHeader.includes("sucuri")) {
    details.push({
      type: "server-signature",
      provider: "Sucuri",
      signal: "Sucuri in server header",
      confidence: 88,
      corroboratesWaf: true,
    });
  }
  if (serverHeader.includes("akamai")) {
    details.push({
      type: "server-signature",
      provider: "Akamai",
      signal: "Akamai in server header",
      confidence: 84,
      corroboratesWaf: true,
    });
  }
  if (serverHeader.includes("fastly")) {
    details.push({
      type: "server-signature",
      provider: "Fastly",
      signal: "Fastly in server header",
      confidence: 78,
      corroboratesWaf: false,
    });
  }

  if (
    (serverHeader.includes("dps/") || serverHeader.includes("secureserver")) &&
    (Boolean(xSiteId) || Boolean(xVersion))
  ) {
    details.push({
      type: "server-signature",
      provider: "GoDaddy Edge Security",
      signal: "GoDaddy managed edge headers detected (DPS/X-SiteId)",
      confidence: 82,
      corroboratesWaf: true,
    });
  }

  return details;
}

function normalizeHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value.join("; ");
  return typeof value === "string" ? value : null;
}

function pickStrongestHeaderWafSignal(
  signals: FirewallEvidenceDetail[],
): FirewallEvidenceDetail | null {
  let strongest: FirewallEvidenceDetail | null = null;
  for (const signal of signals) {
    if (!isKnownWafProvider(signal.provider)) continue;
    if (!strongest || signal.confidence > strongest.confidence) {
      strongest = signal;
    }
  }
  return strongest;
}

function scoreRangeRole(role: FirewallRangeRole): number {
  if (role === "waf-edge") return 60;
  if (role === "edge-host") return 45;
  return 25;
}

function buildCidrEvidence(
  candidates: string[],
  ranges: FirewallRangeEntry[],
): FirewallEvidenceDetail[] {
  const details: FirewallEvidenceDetail[] = [];
  for (const candidate of candidates) {
    for (const range of ranges) {
      if (!isIpInCidr(candidate, range.cidr)) continue;
      details.push({
        type: "cidr",
        provider: range.provider,
        signal: `IP ${candidate} matches ${range.provider} range ${range.cidr}`,
        confidence: scoreRangeRole(range.role),
        corroboratesWaf: range.assertion === "corroborative",
        matchedIp: candidate,
        cidr: range.cidr,
        source: range.source,
        role: range.role,
      });
    }
  }
  return details;
}

function summarizeEvidence(
  details: FirewallEvidenceDetail[],
  maxItems = 12,
): string[] {
  const messages: string[] = [];
  for (const detail of details.slice(0, maxItems)) {
    messages.push(detail.signal);
  }
  return messages;
}

function pickStrongestHostProvider(
  cidrSignals: FirewallEvidenceDetail[],
  headerSignals: FirewallEvidenceDetail[],
): { provider: string | null; confidence: number } {
  const scores = new Map<string, number>();
  for (const signal of cidrSignals) {
    const next = (scores.get(signal.provider) ?? 0) + signal.confidence;
    scores.set(signal.provider, next);
  }
  let bestProvider: string | null = null;
  let bestScore = 0;
  for (const [provider, score] of scores.entries()) {
    if (score > bestScore) {
      bestProvider = provider;
      bestScore = score;
    }
  }

  if (!bestProvider && headerSignals.length > 0) {
    const sorted = [...headerSignals].sort(
      (a, b) => b.confidence - a.confidence,
    );
    bestProvider = sorted[0]?.provider ?? null;
    bestScore = sorted[0]?.confidence ?? 0;
  }

  return {
    provider: bestProvider,
    confidence: bestScore,
  };
}

function hasCorroboratingProviderSignal(
  provider: string,
  headerSignals: FirewallEvidenceDetail[],
): boolean {
  const targetRoot = providerRoot(provider);
  return headerSignals.some(
    (signal) =>
      providerRoot(signal.provider) === targetRoot && signal.corroboratesWaf,
  );
}

function evaluateFirewallEvidence(
  headerSignals: FirewallEvidenceDetail[],
  cidrSignals: FirewallEvidenceDetail[],
  sourceVersion: string | null,
  ipCandidates: string[],
): EnhancedWafDetectionResult {
  const strongestHeaderWaf = pickStrongestHeaderWafSignal(headerSignals);
  const strongestHost = pickStrongestHostProvider(cidrSignals, headerSignals);
  const allSignals = [...headerSignals, ...cidrSignals].sort(
    (a, b) => b.confidence - a.confidence,
  );

  let detected = false;
  let provider: string | null = null;
  let confidence = 0;
  let corroborated = false;

  if (strongestHeaderWaf) {
    detected = true;
    provider = strongestHeaderWaf.provider;
    confidence = strongestHeaderWaf.confidence;
    corroborated = cidrSignals.some(
      (signal) =>
        providerRoot(signal.provider) ===
          providerRoot(strongestHeaderWaf.provider) && signal.corroboratesWaf,
    );
    if (corroborated) {
      confidence = Math.min(98, confidence + 6);
    }
  } else {
    const corroboratedCidrSignal = cidrSignals.find(
      (signal) =>
        signal.role === "waf-edge" &&
        signal.corroboratesWaf &&
        hasCorroboratingProviderSignal(signal.provider, headerSignals),
    );
    if (corroboratedCidrSignal) {
      detected = true;
      provider = corroboratedCidrSignal.provider;
      corroborated = true;
      confidence = Math.max(82, corroboratedCidrSignal.confidence + 22);
    }
  }

  if (!detected) {
    confidence = strongestHost.confidence
      ? Math.min(85, Math.max(40, strongestHost.confidence))
      : 0;
  }

  return {
    detected,
    provider,
    confidence,
    evidence: summarizeEvidence(allSignals),
    hostProvider: strongestHost.provider,
    evidenceDetails: allSignals.slice(0, 30),
    corroborated,
    sourceVersion,
    ipCandidates,
  };
}

export async function collectIpCandidates(
  domain: string,
  remoteAddress?: string | null,
): Promise<string[]> {
  const candidates = new Set<string>();
  const normalizedRemote = normalizeIp(remoteAddress);
  if (normalizedRemote) {
    candidates.add(normalizedRemote);
  }

  const [aRecords, aaaaRecords] = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain),
  ]);

  if (aRecords.status === "fulfilled") {
    for (const ip of aRecords.value) {
      const normalized = normalizeIp(ip);
      if (normalized) {
        candidates.add(normalized);
      }
    }
  }
  if (aaaaRecords.status === "fulfilled") {
    for (const ip of aaaaRecords.value) {
      const normalized = normalizeIp(ip);
      if (normalized) {
        candidates.add(normalized);
      }
    }
  }

  return [...candidates];
}

export async function detectFirewallProtection(
  input: {
    headers: IncomingHttpHeaders;
    domain: string;
    ipCandidates?: string[];
  },
  options?: {
    snapshot?: FirewallFeedSnapshot;
  },
): Promise<EnhancedWafDetectionResult> {
  const headerSignals = detectHeaderEvidence(input.headers);
  const normalizedCandidates = (input.ipCandidates ?? [])
    .map((ip) => normalizeIp(ip))
    .filter((ip): ip is string => Boolean(ip));

  const snapshot = options?.snapshot ?? (await getFirewallFeedSnapshot());
  const cidrSignals = buildCidrEvidence(normalizedCandidates, snapshot.ranges);

  return evaluateFirewallEvidence(
    headerSignals,
    cidrSignals,
    snapshot.sourceVersion,
    normalizedCandidates,
  );
}
