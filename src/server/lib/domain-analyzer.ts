/**
 * Domain Analyzer
 *
 * Orchestrates all 5 intelligence collection APIs and calculates security scores.
 *
 * Features:
 * - Parallel execution of all collection APIs
 * - Timeout handling (30 seconds per domain)
 * - Error recovery with partial results
 * - Security score calculation
 * - Grade assignment
 * - Issue counting by severity
 */

import { calculateSecurityScore } from "./security-scorer.js";

interface DnsNameServerEntry {
  value?: string;
}

interface DnsCollectionData {
  ns?: DnsNameServerEntry[];
}

interface WhoisCollectionData {
  registrar?: string;
  expirationDate?: string;
}

interface IpCollectionData {
  organization?: string;
}

type TechCollectionData = Record<string, unknown>;
type UrlscanCollectionData = Record<string, unknown>;

interface RawCollectionData {
  dns?: DnsCollectionData | null;
  whois?: WhoisCollectionData | null;
  ip?: IpCollectionData | null;
  tech?: TechCollectionData | null;
  urlscan?: UrlscanCollectionData | null;
}

type CollectionResult =
  | DnsCollectionData
  | WhoisCollectionData
  | IpCollectionData
  | TechCollectionData
  | UrlscanCollectionData
  | null;

export interface AnalysisResult {
  domain: string;
  status: "success" | "failed";
  securityScore?: number;
  grade?: string;
  issueCount?: number;
  issueCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  hostingProvider?: string;
  registrar?: string;
  expiryDays?: number;
  error?: string;
  rawData?: RawCollectionData;
  collectionErrors?: {
    dns?: string;
    whois?: string;
    ip?: string;
    tech?: string;
    urlscan?: string;
  };
}

export interface AnalysisOptions {
  collectDns?: boolean;
  collectWhois?: boolean;
  collectIp?: boolean;
  collectTech?: boolean;
  collectUrlscan?: boolean;
  timeout?: number; // milliseconds
}

const DEFAULT_OPTIONS: AnalysisOptions = {
  collectDns: true,
  collectWhois: true,
  collectIp: true,
  collectTech: true,
  collectUrlscan: false, // Expensive, off by default
  timeout: 30000, // 30 seconds
};

/**
 * Analyze a single domain
 */
export async function analyzeDomain(
  domain: string,
  options: AnalysisOptions = {},
): Promise<AnalysisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedDomain = normalizeDomain(domain);

  console.log(`[DomainAnalyzer] Starting analysis for ${normalizedDomain}`);

  try {
    // Collect intelligence from all enabled sources in parallel
    const collectionPromises: Promise<CollectionResult>[] = [];
    const collectionTypes: Array<keyof RawCollectionData> = [];

    if (opts.collectDns) {
      collectionPromises.push(collectDns(normalizedDomain));
      collectionTypes.push("dns");
    }

    if (opts.collectWhois) {
      collectionPromises.push(collectWhois(normalizedDomain));
      collectionTypes.push("whois");
    }

    if (opts.collectIp) {
      collectionPromises.push(collectIp(normalizedDomain));
      collectionTypes.push("ip");
    }

    if (opts.collectTech) {
      collectionPromises.push(collectTech(normalizedDomain));
      collectionTypes.push("tech");
    }

    if (opts.collectUrlscan) {
      collectionPromises.push(collectUrlscan(normalizedDomain));
      collectionTypes.push("urlscan");
    }

    // Wait for all collections with timeout
    const results = await Promise.race([
      Promise.allSettled(collectionPromises),
      timeoutPromise(opts.timeout!),
    ]);

    if (results === "TIMEOUT") {
      console.error(`[DomainAnalyzer] Timeout analyzing ${normalizedDomain}`);
      return {
        domain: normalizedDomain,
        status: "failed",
        error: `Analysis timeout after ${opts.timeout}ms`,
      };
    }

    // Process results
    const rawData: RawCollectionData = {};
    const collectionErrors: NonNullable<AnalysisResult["collectionErrors"]> =
      {};

    (results as PromiseSettledResult<CollectionResult>[]).forEach(
      (result, index) => {
        const type = collectionTypes[index];
        if (result.status === "fulfilled") {
          rawData[type] = result.value;
        } else {
          collectionErrors[type] =
            result.reason?.message || "Collection failed";
          console.error(
            `[DomainAnalyzer] ${type} collection failed for ${normalizedDomain}:`,
            result.reason,
          );
        }
      },
    );

    // Calculate security score from collected data
    const scoreResult = calculateSecurityScore(rawData);

    // Extract hosting provider and registrar
    const hostingProvider = extractHostingProvider(rawData);
    const registrar = rawData.whois?.registrar || undefined;
    const expiryDays = calculateExpiryDays(rawData.whois?.expirationDate);

    console.log(
      `[DomainAnalyzer] Analysis complete for ${normalizedDomain}: Score ${scoreResult.score}, Grade ${scoreResult.grade}`,
    );

    return {
      domain: normalizedDomain,
      status: "success",
      securityScore: scoreResult.score,
      grade: scoreResult.grade,
      issueCount: scoreResult.issues.length,
      issueCounts: scoreResult.issueCounts,
      hostingProvider,
      registrar,
      expiryDays,
      rawData,
      collectionErrors:
        Object.keys(collectionErrors).length > 0 ? collectionErrors : undefined,
    };
  } catch (error: unknown) {
    console.error(
      `[DomainAnalyzer] Error analyzing ${normalizedDomain}:`,
      error,
    );
    return {
      domain: normalizedDomain,
      status: "failed",
      error: "An internal error occurred",
    };
  }
}

/**
 * Normalize domain (remove protocol, www, trailing slash)
 */
function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();

  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove www
  normalized = normalized.replace(/^www\./, "");

  // Remove trailing slash and path
  normalized = normalized.split("/")[0];

  // Remove port
  normalized = normalized.split(":")[0];

  return normalized;
}

/**
 * Timeout promise helper
 */
function timeoutPromise(ms: number): Promise<"TIMEOUT"> {
  return new Promise((resolve) => setTimeout(() => resolve("TIMEOUT"), ms));
}

/**
 * Collect DNS intelligence
 */
async function collectDns(domain: string): Promise<DnsCollectionData | null> {
  const baseUrl = process.env.VITE_API_BASE_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/intelligence/collect/dns?domain=${encodeURIComponent(domain)}`,
  );

  if (!response.ok) {
    throw new Error(`DNS collection failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return (data.data as DnsCollectionData | null) ?? null;
}

/**
 * Collect WHOIS intelligence
 */
async function collectWhois(
  domain: string,
): Promise<WhoisCollectionData | null> {
  const baseUrl = process.env.VITE_API_BASE_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/intelligence/collect/whois?domain=${encodeURIComponent(domain)}`,
  );

  if (!response.ok) {
    throw new Error(`WHOIS collection failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return (data.data as WhoisCollectionData | null) ?? null;
}

/**
 * Collect IP intelligence
 */
async function collectIp(domain: string): Promise<IpCollectionData | null> {
  const baseUrl = process.env.VITE_API_BASE_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/intelligence/collect/ip?domain=${encodeURIComponent(domain)}`,
  );

  if (!response.ok) {
    throw new Error(`IP collection failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return (data.data as IpCollectionData | null) ?? null;
}

/**
 * Collect technology intelligence
 */
async function collectTech(domain: string): Promise<TechCollectionData | null> {
  const baseUrl = process.env.VITE_API_BASE_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/intelligence/collect/tech?domain=${encodeURIComponent(domain)}`,
  );

  if (!response.ok) {
    throw new Error(`Technology collection failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: unknown };
  return (data.data as TechCollectionData | null) ?? null;
}

/**
 * Collect URLScan intelligence
 */
async function collectUrlscan(
  domain: string,
): Promise<UrlscanCollectionData | null> {
  const baseUrl = process.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Submit scan
  const submitResponse = await fetch(
    `${baseUrl}/api/intelligence/collect/urlscan`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    },
  );

  if (!submitResponse.ok) {
    throw new Error(`URLScan submission failed: ${submitResponse.statusText}`);
  }

  const submitData = (await submitResponse.json()) as { scanId?: unknown };
  const scanId = submitData.scanId;
  if (typeof scanId !== "string" || scanId.length === 0) {
    throw new Error("URLScan submission failed: missing scan ID");
  }

  // Poll for results (max 10 attempts, 3 seconds apart)
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const resultResponse = await fetch(
      `${baseUrl}/api/intelligence/collect/urlscan/${scanId}`,
    );

    if (resultResponse.ok) {
      const resultData = (await resultResponse.json()) as {
        status?: unknown;
        data?: unknown;
      };
      if (resultData.status === "completed") {
        return (resultData.data as UrlscanCollectionData | null) ?? null;
      }
    }
  }

  throw new Error("URLScan timeout - results not available");
}

/**
 * Extract hosting provider from collected data
 */
function extractHostingProvider(
  rawData: RawCollectionData,
): string | undefined {
  // Try IP intelligence first
  if (rawData.ip?.organization) {
    return rawData.ip.organization;
  }

  // Try DNS nameservers
  if (Array.isArray(rawData.dns?.ns) && rawData.dns.ns.length > 0) {
    const ns = rawData.dns.ns[0].value;
    if (typeof ns !== "string") return undefined;

    // Common hosting providers
    if (ns.includes("cloudflare")) return "Cloudflare";
    if (ns.includes("amazonaws")) return "Amazon AWS";
    if (ns.includes("googledomains")) return "Google Cloud";
    if (ns.includes("azure")) return "Microsoft Azure";
    if (ns.includes("domaincontrol") || ns.includes("godaddy")) return "HostingInfo";
    if (ns.includes("namecheap")) return "Namecheap";
    if (ns.includes("bluehost")) return "Bluehost";
    if (ns.includes("hostgator")) return "HostGator";
    if (ns.includes("siteground")) return "SiteGround";
    if (ns.includes("digitalocean")) return "DigitalOcean";
    if (ns.includes("linode")) return "Linode";
    if (ns.includes("vultr")) return "Vultr";
  }

  return undefined;
}

/**
 * Calculate days until domain expiry
 */
function calculateExpiryDays(expirationDate?: string): number | undefined {
  if (!expirationDate) return undefined;

  try {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return undefined;
  }
}

/**
 * Analyze multiple domains in batch
 */
export async function analyzeDomainsBatch(
  domains: string[],
  options: AnalysisOptions = {},
  onProgress?: (completed: number, total: number) => void,
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (let i = 0; i < domains.length; i++) {
    const result = await analyzeDomain(domains[i], options);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, domains.length);
    }
  }

  return results;
}
