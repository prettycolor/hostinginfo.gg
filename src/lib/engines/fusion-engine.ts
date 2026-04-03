/**
 * Fusion Engine - Hosting Attribution Intelligence
 *
 * Combines data from DNS, IP Fingerprinting, and Tech Detection engines
 * to accurately determine hosting providers (edge CDN + origin host).
 *
 * @module fusion-engine
 */

import { db } from "@/server/db/client.js";
import { hostingAttribution } from "@/server/db/schema.js";
import { eq } from "drizzle-orm";
import { resolveDomain } from "./dns-engine.js";
import { fingerprintIP } from "./ip-fingerprint-engine.js";
import { detectTechnologies } from "./tech-detection-engine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HostingAttribution {
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number;
  edgeConfidence: number;
  originConfidence: number;
  evidenceWeights: Record<string, number>;
  detectionMethod: string;
  asn: string | null;
  asnOrg: string | null;
  ipAddress: string | null;
  serverType: string | null;
  framework: string | null;
  isCustomCoded: boolean;
  // Raw data for tab components
  dnsData?: Record<string, unknown>;
  ipData?: Record<string, unknown> | null;
  techData?: Record<string, unknown> | null;
}

interface Signal {
  type: string;
  value: string;
  weight: number;
  confidence: number;
}

interface EdgeResult {
  provider: string | null;
  confidence: number;
  signals: Signal[];
}

interface OriginResult {
  host: string | null;
  confidence: number;
  signals: Signal[];
}

interface TechnologyFingerprint {
  name: string;
  category: string;
  confidence?: number;
}

interface DetectionInput {
  dns: {
    CNAME?: string[];
  };
  ip?: {
    httpHeaders?: Record<string, unknown>;
    asn?: string;
    asnOrg?: string;
    services?: Record<string, unknown>;
  } | null;
  tech?: {
    technologies?: TechnologyFingerprint[];
  } | null;
}

// ============================================================================
// PROVIDER KNOWLEDGE BASE
// ============================================================================

const EDGE_PROVIDERS: Record<
  string,
  { cnames: string[]; headers: string[]; asns: string[] }
> = {
  cloudflare: {
    cnames: ["cloudflare.com", "cloudflare.net"],
    headers: ["cf-ray", "cf-cache-status", "cf-request-id"],
    asns: ["AS13335"],
  },
  fastly: {
    cnames: ["fastly.net", "fastlylb.net"],
    headers: ["x-fastly-request-id", "fastly-io-info", "x-served-by"],
    asns: ["AS54113"],
  },
  akamai: {
    cnames: ["akamaiedge.net", "akamaitechnologies.com", "akamai.net"],
    headers: ["x-akamai-request-id", "akamai-origin-hop"],
    asns: ["AS20940", "AS16625"],
  },
  cloudfront: {
    cnames: ["cloudfront.net"],
    headers: ["x-amz-cf-id", "x-amz-cf-pop", "x-cache"],
    asns: ["AS16509"], // AWS
  },
  "bunny-cdn": {
    cnames: ["bunnycdn.com", "b-cdn.net"],
    headers: ["cdn-pullzone", "cdn-requestcountrycode"],
    asns: ["AS200325"],
  },
};

const ORIGIN_HOSTS: Record<string, { asns: string[]; keywords: string[] }> = {
  aws: {
    asns: ["AS16509", "AS14618"],
    keywords: ["amazon", "aws", "ec2", "amazonaws"],
  },
  gcp: {
    asns: ["AS15169", "AS396982"],
    keywords: ["google", "gcp", "cloud.google", "googleusercontent"],
  },
  azure: {
    asns: ["AS8075"],
    keywords: ["microsoft", "azure", "azurewebsites"],
  },
  digitalocean: {
    asns: ["AS14061"],
    keywords: ["digitalocean"],
  },
  linode: {
    asns: ["AS63949"],
    keywords: ["linode", "akamai"],
  },
  vultr: {
    asns: ["AS20473"],
    keywords: ["vultr", "choopa"],
  },
  ovh: {
    asns: ["AS16276"],
    keywords: ["ovh"],
  },
  hetzner: {
    asns: ["AS24940"],
    keywords: ["hetzner"],
  },
  shopify: {
    asns: ["AS54113"], // Uses Fastly
    keywords: ["shopify", "myshopify"],
  },
  "wordpress.com": {
    asns: ["AS2635"], // Automattic
    keywords: ["automattic", "wordpress.com", "wp.com"],
  },
  wix: {
    asns: ["AS58182"],
    keywords: ["wix", "wixsite"],
  },
  squarespace: {
    asns: ["AS54113"], // Uses Fastly
    keywords: ["squarespace", "sqsp.net"],
  },
};

// ============================================================================
// MAIN ATTRIBUTION FUNCTION
// ============================================================================

/**
 * Perform complete hosting attribution for a domain
 */
export async function attributeHosting(
  domain: string,
): Promise<HostingAttribution> {
  console.log(`[Fusion Engine] Starting attribution for: ${domain}`);

  // Gather data from all engines with error handling
  let dnsResult;
  try {
    console.log(`[Fusion Engine] Resolving DNS for: ${domain}`);
    dnsResult = await resolveDomain(domain);
    console.log(
      `[Fusion Engine] DNS resolved: ${dnsResult.records.length} records`,
    );
  } catch (error) {
    console.error(`[Fusion Engine] DNS resolution failed:`, error);
    throw new Error(
      `DNS resolution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const dnsRecords = dnsResult.records;

  // Extract specific record types
  const aRecords = dnsRecords
    .filter((r) => r.recordType === "A")
    .map((r) => r.recordValue);
  const aaaaRecords = dnsRecords
    .filter((r) => r.recordType === "AAAA")
    .map((r) => r.recordValue);
  const cnameRecords = dnsRecords
    .filter((r) => r.recordType === "CNAME")
    .map((r) => r.recordValue);

  const ipAddress = aRecords[0] || aaaaRecords[0] || null;
  console.log(`[Fusion Engine] IP address: ${ipAddress}`);

  // Build DNS data object for detection functions
  const dnsData = {
    A: aRecords,
    AAAA: aaaaRecords,
    CNAME: cnameRecords,
  };

  let ipData = null;
  if (ipAddress) {
    try {
      console.log(`[Fusion Engine] Fingerprinting IP: ${ipAddress}`);
      ipData = await fingerprintIP(ipAddress);
      console.log(`[Fusion Engine] IP fingerprinted: ASN ${ipData?.asn}`);
    } catch (error) {
      console.error(`[Fusion Engine] IP fingerprinting failed:`, error);
      // Continue without IP data - not critical
    }
  }

  let techData;
  try {
    console.log(`[Fusion Engine] Detecting technologies for: ${domain}`);
    techData = await detectTechnologies(domain);
    console.log(
      `[Fusion Engine] Technologies detected: ${techData.technologies.length}`,
    );
  } catch (error) {
    console.error(`[Fusion Engine] Technology detection failed:`, error);
    // Provide empty tech data
    techData = { technologies: [], detectionMethod: "none" };
  }

  // Detect edge provider (CDN/WAF)
  console.log(`[Fusion Engine] Detecting edge provider`);
  const edgeResult = detectEdgeProvider({
    dns: dnsData,
    ip: ipData,
    tech: techData,
  });
  console.log(
    `[Fusion Engine] Edge provider: ${edgeResult.provider || "None"} (confidence: ${edgeResult.confidence})`,
  );

  // Detect origin host
  console.log(`[Fusion Engine] Detecting origin host`);
  const originResult = detectOriginHost({
    dns: dnsData,
    ip: ipData,
    tech: techData,
  });
  console.log(
    `[Fusion Engine] Origin host: ${originResult.host || "Unknown"} (confidence: ${originResult.confidence})`,
  );

  // Calculate overall confidence
  const allSignals = [...edgeResult.signals, ...originResult.signals];
  const confidenceScore = calculateConfidence(allSignals);
  console.log(`[Fusion Engine] Overall confidence: ${confidenceScore}`);

  // Build evidence weights
  const evidenceWeights: Record<string, number> = {};
  allSignals.forEach((signal) => {
    evidenceWeights[signal.type] =
      (evidenceWeights[signal.type] || 0) + signal.weight;
  });

  // Determine server type and framework
  const serverType = ipData?.httpHeaders?.server || null;
  const framework =
    techData.technologies.find(
      (t) => t.category === "Framework" || t.category === "CMS",
    )?.name || null;

  // Check if custom-coded (no major platform detected)
  const platformTechs = [
    "WordPress",
    "Shopify",
    "Wix",
    "Squarespace",
    "Webflow",
  ];
  const isCustomCoded = !techData.technologies.some((t) =>
    platformTechs.includes(t.name),
  );

  const attribution: HostingAttribution = {
    domain,
    edgeProvider: edgeResult.provider,
    originHost: originResult.host,
    confidenceScore,
    edgeConfidence: edgeResult.confidence,
    originConfidence: originResult.confidence,
    evidenceWeights,
    detectionMethod: "fusion",
    asn: ipData?.asn || null,
    asnOrg: ipData?.asnOrg || null,
    ipAddress,
    serverType,
    framework,
    isCustomCoded,
    // Include raw data for tab components
    dnsData: dnsResult,
    ipData: ipData,
    techData: techData,
  };

  // Store in database
  try {
    console.log(`[Fusion Engine] Storing attribution in database`);
    await storeAttribution(attribution);
    console.log(`[Fusion Engine] Attribution stored successfully`);
  } catch (error) {
    console.error(`[Fusion Engine] Failed to store attribution:`, error);
    // Continue - don't fail the whole operation if storage fails
  }

  console.log(`[Fusion Engine] Attribution complete for: ${domain}`);
  return attribution;
}

// ============================================================================
// EDGE PROVIDER DETECTION
// ============================================================================

function detectEdgeProvider(data: DetectionInput): EdgeResult {
  const signals: Signal[] = [];

  // 1. Check CNAME records (40 points)
  if (data.dns.CNAME) {
    for (const cname of data.dns.CNAME) {
      for (const [provider, config] of Object.entries(EDGE_PROVIDERS)) {
        if (config.cnames.some((pattern) => cname.includes(pattern))) {
          signals.push({
            type: "cnameMatch",
            value: `${provider} (${cname})`,
            weight: 40,
            confidence: 95,
          });
        }
      }
    }
  }

  // 2. Check HTTP headers (25 points)
  if (data.ip?.httpHeaders) {
    const headers = data.ip.httpHeaders;
    for (const [provider, config] of Object.entries(EDGE_PROVIDERS)) {
      for (const headerKey of config.headers) {
        if (headers[headerKey]) {
          signals.push({
            type: "httpHeader",
            value: `${provider} (${headerKey})`,
            weight: 25,
            confidence: 90,
          });
        }
      }
    }
  }

  // 3. Check tech signatures (20 points)
  if (data.tech?.technologies) {
    const cdnTechs = data.tech.technologies.filter((t) => t.category === "CDN");
    for (const tech of cdnTechs) {
      signals.push({
        type: "techSignature",
        value: tech.name,
        weight: 20,
        confidence: tech.confidence ?? 70,
      });
    }
  }

  // 4. Check ASN (15 points)
  if (data.ip?.asn) {
    for (const [provider, config] of Object.entries(EDGE_PROVIDERS)) {
      if (config.asns.includes(data.ip.asn)) {
        signals.push({
          type: "asnMatch",
          value: `${provider} (${data.ip.asn})`,
          weight: 15,
          confidence: 85,
        });
      }
    }
  }

  // Determine provider from signals
  const providerCounts: Record<string, number> = {};
  signals.forEach((signal) => {
    const match = signal.value.match(/^([a-z-]+)/i);
    if (match) {
      const provider = match[1].toLowerCase();
      providerCounts[provider] =
        (providerCounts[provider] || 0) + signal.weight;
    }
  });

  const topProvider = Object.entries(providerCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const provider = topProvider ? topProvider[0] : null;
  const confidence = provider ? Math.min(100, topProvider[1]) : 0;

  return { provider, confidence, signals };
}

// ============================================================================
// ORIGIN HOST DETECTION
// ============================================================================

function detectOriginHost(data: DetectionInput): OriginResult {
  const signals: Signal[] = [];

  // 1. Check ASN organization (35 points)
  if (data.ip?.asn) {
    for (const [host, config] of Object.entries(ORIGIN_HOSTS)) {
      if (config.asns.includes(data.ip.asn)) {
        signals.push({
          type: "asnOrg",
          value: `${host} (${data.ip.asn})`,
          weight: 35,
          confidence: 90,
        });
      }
    }
  }

  // 2. Check ASN org name + keywords (25 points)
  if (data.ip?.asnOrg) {
    const asnOrgLower = data.ip.asnOrg.toLowerCase();
    for (const [host, config] of Object.entries(ORIGIN_HOSTS)) {
      if (config.keywords.some((keyword) => asnOrgLower.includes(keyword))) {
        signals.push({
          type: "asnKeyword",
          value: `${host} (${data.ip.asnOrg})`,
          weight: 25,
          confidence: 80,
        });
      }
    }
  }

  // 3. Check service banners (20 points)
  if (data.ip?.services) {
    const banners = Object.values(data.ip.services).join(" ").toLowerCase();
    for (const [host, config] of Object.entries(ORIGIN_HOSTS)) {
      if (config.keywords.some((keyword) => banners.includes(keyword))) {
        signals.push({
          type: "serviceBanner",
          value: `${host} (banner)`,
          weight: 20,
          confidence: 75,
        });
      }
    }
  }

  // 4. Check tech stack (20 points)
  if (data.tech?.technologies) {
    const platformTechs = data.tech.technologies.filter(
      (t) => t.category === "CMS" || t.category === "Platform",
    );
    for (const tech of platformTechs) {
      const techName = tech.name.toLowerCase();
      for (const [host, config] of Object.entries(ORIGIN_HOSTS)) {
        if (config.keywords.some((keyword) => techName.includes(keyword))) {
          signals.push({
            type: "techStack",
            value: `${host} (${tech.name})`,
            weight: 20,
            confidence: tech.confidence ?? 70,
          });
        }
      }
    }
  }

  // Determine host from signals
  const hostCounts: Record<string, number> = {};
  signals.forEach((signal) => {
    const match = signal.value.match(/^([a-z.-]+)/i);
    if (match) {
      const host = match[1].toLowerCase();
      hostCounts[host] = (hostCounts[host] || 0) + signal.weight;
    }
  });

  const topHost = Object.entries(hostCounts).sort((a, b) => b[1] - a[1])[0];
  const host = topHost ? topHost[0] : null;
  const confidence = host ? Math.min(100, topHost[1]) : 0;

  return { host, confidence, signals };
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidence(signals: Signal[]): number {
  if (signals.length === 0) return 0;

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const maxPossible = 100;
  const weightScore = Math.min(100, (totalWeight / maxPossible) * 100);

  // Factor in individual signal confidence
  const avgConfidence =
    signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  // Weighted average: 70% weight score, 30% confidence score
  return Math.round(weightScore * 0.7 + avgConfidence * 0.3);
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store hosting attribution in database
 */
export async function storeAttribution(
  attribution: HostingAttribution,
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(hostingAttribution)
      .where(eq(hostingAttribution.domain, attribution.domain))
      .limit(1);

    const data = {
      domain: attribution.domain,
      edgeProvider: attribution.edgeProvider,
      originHost: attribution.originHost,
      confidenceScore: attribution.confidenceScore,
      edgeConfidence: attribution.edgeConfidence,
      originConfidence: attribution.originConfidence,
      evidenceWeights: JSON.stringify(attribution.evidenceWeights),
      detectionMethod: attribution.detectionMethod,
      asn: attribution.asn,
      asnOrg: attribution.asnOrg,
      ipAddress: attribution.ipAddress,
      serverType: attribution.serverType,
      framework: attribution.framework,
      isCustomCoded: attribution.isCustomCoded,
      lastUpdated: new Date(),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(hostingAttribution)
        .set(data)
        .where(eq(hostingAttribution.id, existing[0].id));
    } else {
      await db.insert(hostingAttribution).values(data);
    }
  } catch (error) {
    console.error(
      `Error storing hosting attribution for ${attribution.domain}:`,
      error,
    );
  }
}

/**
 * Get stored hosting attribution from database
 */
export async function getAttribution(
  domain: string,
): Promise<HostingAttribution | null> {
  try {
    const results = await db
      .select()
      .from(hostingAttribution)
      .where(eq(hostingAttribution.domain, domain))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];

    return {
      domain: record.domain,
      edgeProvider: record.edgeProvider,
      originHost: record.originHost,
      confidenceScore: record.confidenceScore,
      edgeConfidence: record.edgeConfidence || 0,
      originConfidence: record.originConfidence || 0,
      evidenceWeights: record.evidenceWeights
        ? JSON.parse(record.evidenceWeights as string)
        : {},
      detectionMethod: record.detectionMethod || "fusion",
      asn: record.asn,
      asnOrg: record.asnOrg,
      ipAddress: record.ipAddress,
      serverType: record.serverType,
      framework: record.framework,
      isCustomCoded: record.isCustomCoded || false,
    };
  } catch (error) {
    console.error(`Error fetching hosting attribution for ${domain}:`, error);
    return null;
  }
}
