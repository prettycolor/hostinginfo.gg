/**
 * IP Intelligence Module
 *
 * Provides comprehensive IP analysis with:
 * - Geolocation (country, city, coordinates)
 * - ASN (Autonomous System Number) information
 * - Network analysis (ISP, hosting provider)
 * - Reputation scoring
 * - Historical tracking
 *
 * Part of Phase 1: Core Intelligence Engine
 */

import { db } from "../../db/client.js";
import { ipIntelligence } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { calculateConfidence } from "../confidence-scorer.js";
import { checkRateLimit, incrementRateLimit } from "../rate-limiter.js";

export interface IPGeolocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  asn: number;
  asname: string;
}

export interface IPIntelligence {
  ip: string;
  geolocation: IPGeolocation | null;
  asn: {
    number: number;
    name: string;
    organization: string;
    country: string;
  } | null;
  network: {
    isp: string;
    organization: string;
    isHosting: boolean;
    hostingProvider: string | null;
  } | null;
  reputation: {
    score: number;
    isMalicious: boolean;
    isProxy: boolean;
    isVPN: boolean;
    isTor: boolean;
  };
  confidence: number;
  lastChecked: Date;
  evidence: {
    source: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }[];
}

/**
 * Get IP geolocation using ip-api.com (free tier: 45 requests/minute)
 */
async function getIPGeolocation(ip: string): Promise<IPGeolocation | null> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org,as,asname`,
    );
    const data = await response.json();

    if (data.status === "fail") {
      console.error("IP geolocation failed:", data.message);
      return null;
    }

    // Parse ASN from "as" field (format: "AS15169 Google LLC")
    const asParts = data.as?.split(" ") || [];
    const asn = asParts[0] ? parseInt(asParts[0].replace("AS", "")) : 0;

    return {
      ip,
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: data.timezone || "Unknown",
      isp: data.isp || "Unknown",
      org: data.org || "Unknown",
      as: data.as || "Unknown",
      asn,
      asname: data.asname || "Unknown",
    };
  } catch (error) {
    console.error("IP geolocation error:", error);
    return null;
  }
}

/**
 * Detect if IP belongs to a hosting provider
 */
function detectHostingProvider(
  isp: string,
  org: string,
  asname: string,
): {
  isHosting: boolean;
  provider: string | null;
} {
  const hostingKeywords = [
    "amazon",
    "aws",
    "google cloud",
    "gcp",
    "microsoft azure",
    "azure",
    "digitalocean",
    "linode",
    "vultr",
    "ovh",
    "hetzner",
    "cloudflare",
    "godaddy",
    "bluehost",
    "hostgator",
    "dreamhost",
    "siteground",
    "namecheap",
    "hostinger",
    "a2 hosting",
    "inmotion",
    "liquid web",
    "rackspace",
    "ibm cloud",
    "oracle cloud",
    "alibaba cloud",
    "tencent cloud",
  ];

  const combined = `${isp} ${org} ${asname}`.toLowerCase();

  for (const keyword of hostingKeywords) {
    if (combined.includes(keyword)) {
      return {
        isHosting: true,
        provider: keyword
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      };
    }
  }

  return { isHosting: false, provider: null };
}

/**
 * Calculate IP reputation score (simplified - in production, use external API)
 */
function calculateIPReputation(geolocation: IPGeolocation | null): {
  score: number;
  isMalicious: boolean;
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
} {
  // Simplified reputation scoring
  // In production, integrate with AbuseIPDB, IPQualityScore, or similar

  let score = 100; // Start with perfect score
  let isProxy = false;
  let isVPN = false;
  let isTor = false;

  if (geolocation) {
    // Check for known proxy/VPN providers
    const proxyKeywords = ["proxy", "vpn", "tor", "relay"];
    const combined = `${geolocation.isp} ${geolocation.org}`.toLowerCase();

    for (const keyword of proxyKeywords) {
      if (combined.includes(keyword)) {
        score -= 30;
        if (keyword === "proxy") isProxy = true;
        if (keyword === "vpn") isVPN = true;
        if (keyword === "tor") isTor = true;
      }
    }
  }

  return {
    score: Math.max(0, score),
    isMalicious: score < 30,
    isProxy,
    isVPN,
    isTor,
  };
}

/**
 * Get comprehensive IP intelligence
 */
export async function getIPIntelligence(
  ip: string,
  domain?: string,
): Promise<IPIntelligence> {
  // Check rate limit for IP lookup
  const rateCheck = await checkRateLimit("ipinfo");
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)} seconds`,
    );
  }

  // Get geolocation data
  const geolocation = await getIPGeolocation(ip);
  await incrementRateLimit("ipinfo");

  // Extract ASN information
  const asn = geolocation
    ? {
        number: geolocation.asn,
        name: geolocation.asname,
        organization: geolocation.org,
        country: geolocation.countryCode,
      }
    : null;

  // Detect hosting provider
  const hostingInfo = geolocation
    ? detectHostingProvider(
        geolocation.isp,
        geolocation.org,
        geolocation.asname,
      )
    : { isHosting: false, provider: null };

  const network = geolocation
    ? {
        isp: geolocation.isp,
        organization: geolocation.org,
        isHosting: hostingInfo.isHosting,
        hostingProvider: hostingInfo.provider,
      }
    : null;

  // Calculate reputation
  const reputation = calculateIPReputation(geolocation);

  // Calculate confidence score
  const signals = [
    {
      type: "ip" as const,
      value: geolocation ? "geolocation_available" : "geolocation_missing",
      weight: geolocation ? 90 : 20,
      timestamp: new Date(),
      source: "ip-api.com",
    },
    {
      type: "ip" as const,
      value: asn ? "asn_available" : "asn_missing",
      weight: asn ? 85 : 30,
      timestamp: new Date(),
      source: "ip-api.com",
    },
    {
      type: "ip" as const,
      value: network ? "network_info_available" : "network_info_missing",
      weight: network ? 80 : 30,
      timestamp: new Date(),
      source: "ip-api.com",
    },
  ];

  const confidenceResult = calculateConfidence(signals);
  const confidence = confidenceResult.score;

  let threatLevel: "low" | "medium" | "high" | "critical" = "low";
  if (reputation.isMalicious) {
    threatLevel = "critical";
  } else if (reputation.score < 50) {
    threatLevel = "high";
  } else if (reputation.score < 75) {
    threatLevel = "medium";
  }

  // Store in database
  await db.insert(ipIntelligence).values({
    domain: domain ?? ip,
    ipAddress: ip,
    ipVersion: ip.includes(":") ? 6 : 4,
    country: geolocation?.countryCode || null,
    countryName: geolocation?.country || null,
    region: geolocation?.region || null,
    city: geolocation?.city || null,
    latitude: geolocation ? geolocation.latitude.toString() : null,
    longitude: geolocation ? geolocation.longitude.toString() : null,
    timezone: geolocation?.timezone || null,
    asn: asn ? `AS${asn.number}` : null,
    asnOrganization: asn?.organization || null,
    isp: geolocation?.isp || null,
    organization: geolocation?.org || null,
    isProxy: reputation.isProxy,
    isVpn: reputation.isVPN,
    isTor: reputation.isTor,
    isHosting: hostingInfo.isHosting,
    threatLevel,
    scannedAt: new Date(),
  });

  // Build evidence array
  const evidence = [
    {
      source: "ip-api.com",
      timestamp: new Date(),
      data: geolocation,
    },
  ];

  return {
    ip,
    geolocation,
    asn,
    network,
    reputation,
    confidence,
    lastChecked: new Date(),
    evidence,
  };
}

/**
 * Get IP intelligence history
 */
export async function getIPHistory(ip: string, limit: number = 10) {
  const history = await db
    .select()
    .from(ipIntelligence)
    .where(eq(ipIntelligence.ipAddress, ip))
    .orderBy(desc(ipIntelligence.scannedAt))
    .limit(limit);

  return history;
}

/**
 * Analyze IP for security risks
 */
export function analyzeIPSecurity(intelligence: IPIntelligence): {
  riskLevel: "low" | "medium" | "high" | "critical";
  risks: string[];
  recommendations: string[];
} {
  const risks: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  // Check reputation
  if (intelligence.reputation.isMalicious) {
    risks.push("IP flagged as malicious");
    riskLevel = "critical";
    recommendations.push("Block this IP immediately");
  }

  if (intelligence.reputation.isTor) {
    risks.push("Traffic from Tor exit node");
    if (riskLevel === "low") riskLevel = "high";
    recommendations.push(
      "Consider blocking Tor traffic for sensitive operations",
    );
  }

  if (intelligence.reputation.isVPN || intelligence.reputation.isProxy) {
    risks.push("Traffic from VPN/Proxy");
    if (riskLevel === "low") riskLevel = "medium";
    recommendations.push("Monitor for suspicious activity");
  }

  // Check if hosting provider (could be bot/scraper)
  if (intelligence.network?.isHosting) {
    risks.push(
      `Traffic from hosting provider: ${intelligence.network.hostingProvider}`,
    );
    if (riskLevel === "low") riskLevel = "medium";
    recommendations.push("Verify legitimate traffic vs automated bots");
  }

  // Low reputation score
  if (intelligence.reputation.score < 50 && riskLevel === "low") {
    riskLevel = "medium";
    risks.push("Low reputation score");
  }

  if (risks.length === 0) {
    recommendations.push("No security concerns detected");
  }

  return { riskLevel, risks, recommendations };
}
