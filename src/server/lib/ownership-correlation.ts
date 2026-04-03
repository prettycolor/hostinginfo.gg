/**
 * Domain Ownership Correlation Engine
 *
 * Identifies relationships between domains based on shared ownership indicators:
 * - Registrant email addresses
 * - Registrant names/organizations
 * - Nameservers
 * - IP addresses
 * - Registrars
 * - Contact information patterns
 *
 * Use cases:
 * - Identify domain portfolios
 * - Detect related domains for security analysis
 * - Find domains owned by same entity
 * - Discover infrastructure relationships
 */

import { db } from "../db/client.js";
import { whoisRecords, dnsRecords } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export interface OwnershipIndicator {
  type: "email" | "name" | "organization" | "nameserver" | "ip" | "registrar";
  value: string;
  confidence: number; // 0-100
  lastSeen: Date;
  domainCount: number;
}

export interface DomainRelationship {
  domain1: string;
  domain2: string;
  relationshipType:
    | "email"
    | "nameserver"
    | "ip"
    | "organization"
    | "registrar"
    | "multi";
  sharedIndicators: OwnershipIndicator[];
  confidenceScore: number; // 0-100
  strength: "strong" | "moderate" | "weak";
}

export interface OwnershipCluster {
  clusterId: string;
  domains: string[];
  primaryIndicator: OwnershipIndicator;
  secondaryIndicators: OwnershipIndicator[];
  clusterSize: number;
  confidenceScore: number;
  createdAt: Date;
}

export interface OwnershipGraph {
  centerDomain: string;
  relatedDomains: {
    domain: string;
    relationship: DomainRelationship;
    distance: number; // degrees of separation
  }[];
  totalRelated: number;
  clusters: OwnershipCluster[];
}

export interface PortfolioAnalysis {
  totalDomains: number;
  uniqueEmails: number;
  uniqueOrganizations: number;
  uniqueNameservers: number;
  uniqueIPs: number;
  clusters: OwnershipCluster[];
  strongRelationships: number;
  moderateRelationships: number;
  weakRelationships: number;
}

/**
 * Find domains by registrant email
 */
export async function findDomainsByEmail(email: string): Promise<string[]> {
  const normalizedEmail = email.toLowerCase().trim();

  const results = await db
    .select({ domain: whoisRecords.domain })
    .from(whoisRecords)
    .where(sql`LOWER(${whoisRecords.registrantEmail}) = ${normalizedEmail}`)
    .orderBy(whoisRecords.domain);

  return results.map((r) => r.domain);
}

/**
 * Find domains by registrant name
 */
export async function findDomainsByName(name: string): Promise<string[]> {
  const normalizedName = name.toLowerCase().trim();

  const results = await db
    .select({ domain: whoisRecords.domain })
    .from(whoisRecords)
    .where(sql`LOWER(${whoisRecords.registrantName}) = ${normalizedName}`)
    .orderBy(whoisRecords.domain);

  return results.map((r) => r.domain);
}

/**
 * Find domains by organization
 */
export async function findDomainsByOrganization(
  organization: string,
): Promise<string[]> {
  const normalizedOrg = organization.toLowerCase().trim();

  const results = await db
    .select({ domain: whoisRecords.domain })
    .from(whoisRecords)
    .where(
      sql`LOWER(${whoisRecords.registrantOrganization}) = ${normalizedOrg}`,
    )
    .orderBy(whoisRecords.domain);

  return results.map((r) => r.domain);
}

/**
 * Find domains by nameserver
 */
export async function findDomainsByNameserver(
  nameserver: string,
): Promise<string[]> {
  const normalizedNS = nameserver.toLowerCase().trim();

  // Query WHOIS records where nameservers JSON array contains the nameserver
  const results = await db
    .select({ domain: whoisRecords.domain })
    .from(whoisRecords)
    .where(
      sql`JSON_CONTAINS(${whoisRecords.nameservers}, JSON_QUOTE(${normalizedNS}))`,
    )
    .orderBy(whoisRecords.domain);

  return results.map((r) => r.domain);
}

/**
 * Find domains by IP address
 */
export async function findDomainsByIP(ipAddress: string): Promise<string[]> {
  // Get all DNS A records for this IP
  const results = await db
    .select({ domain: dnsRecords.domain })
    .from(dnsRecords)
    .where(and(eq(dnsRecords.recordType, "A"), eq(dnsRecords.value, ipAddress)))
    .orderBy(dnsRecords.domain);

  // Remove duplicates
  const uniqueDomains = [...new Set(results.map((r) => r.domain))];
  return uniqueDomains;
}

/**
 * Find domains by registrar
 */
export async function findDomainsByRegistrar(
  registrar: string,
): Promise<string[]> {
  const normalizedRegistrar = registrar.toLowerCase().trim();

  const results = await db
    .select({ domain: whoisRecords.domain })
    .from(whoisRecords)
    .where(
      sql`LOWER(${whoisRecords.registrar}) LIKE ${`%${normalizedRegistrar}%`}`,
    )
    .orderBy(whoisRecords.domain);

  return results.map((r) => r.domain);
}

/**
 * Get ownership indicators for a domain
 */
export async function getOwnershipIndicators(
  domain: string,
): Promise<OwnershipIndicator[]> {
  const indicators: OwnershipIndicator[] = [];

  // Get WHOIS data
  const whoisData = await db
    .select()
    .from(whoisRecords)
    .where(eq(whoisRecords.domain, domain))
    .limit(1);

  if (whoisData.length === 0) {
    return indicators;
  }

  const whois = whoisData[0];

  // Email indicator
  if (whois.registrantEmail) {
    const emailDomains = await findDomainsByEmail(whois.registrantEmail);
    indicators.push({
      type: "email",
      value: whois.registrantEmail,
      confidence: 95, // Email is a strong indicator
      lastSeen: whois.scannedAt || new Date(),
      domainCount: emailDomains.length,
    });
  }

  // Name indicator
  if (whois.registrantName) {
    const nameDomains = await findDomainsByName(whois.registrantName);
    indicators.push({
      type: "name",
      value: whois.registrantName,
      confidence: 80, // Name is moderately strong
      lastSeen: whois.scannedAt || new Date(),
      domainCount: nameDomains.length,
    });
  }

  // Organization indicator
  if (whois.registrantOrganization) {
    const orgDomains = await findDomainsByOrganization(
      whois.registrantOrganization,
    );
    indicators.push({
      type: "organization",
      value: whois.registrantOrganization,
      confidence: 90, // Organization is a strong indicator
      lastSeen: whois.scannedAt || new Date(),
      domainCount: orgDomains.length,
    });
  }

  // Nameserver indicators
  if (whois.nameservers && Array.isArray(whois.nameservers)) {
    for (const ns of whois.nameservers) {
      const nsDomains = await findDomainsByNameserver(ns);
      indicators.push({
        type: "nameserver",
        value: ns,
        confidence: 70, // Nameservers are moderate indicators
        lastSeen: whois.scannedAt || new Date(),
        domainCount: nsDomains.length,
      });
    }
  }

  // Registrar indicator
  if (whois.registrar) {
    const registrarDomains = await findDomainsByRegistrar(whois.registrar);
    indicators.push({
      type: "registrar",
      value: whois.registrar,
      confidence: 30, // Registrar is a weak indicator (many domains share registrars)
      lastSeen: whois.scannedAt || new Date(),
      domainCount: registrarDomains.length,
    });
  }

  // Get IP addresses from DNS
  const dnsData = await db
    .select()
    .from(dnsRecords)
    .where(and(eq(dnsRecords.domain, domain), eq(dnsRecords.recordType, "A")));

  for (const record of dnsData) {
    const ipDomains = await findDomainsByIP(record.value);
    indicators.push({
      type: "ip",
      value: record.value,
      confidence: 60, // IP is a moderate indicator
      lastSeen: record.scannedAt || new Date(),
      domainCount: ipDomains.length,
    });
  }

  return indicators;
}

/**
 * Find related domains based on ownership indicators
 */
export async function findRelatedDomains(
  domain: string,
  minConfidence: number = 50,
): Promise<DomainRelationship[]> {
  const indicators = await getOwnershipIndicators(domain);
  const relationships: DomainRelationship[] = [];
  const seenDomains = new Set<string>([domain]);

  for (const indicator of indicators) {
    if (indicator.confidence < minConfidence) continue;

    let relatedDomains: string[] = [];

    switch (indicator.type) {
      case "email":
        relatedDomains = await findDomainsByEmail(indicator.value);
        break;
      case "name":
        relatedDomains = await findDomainsByName(indicator.value);
        break;
      case "organization":
        relatedDomains = await findDomainsByOrganization(indicator.value);
        break;
      case "nameserver":
        relatedDomains = await findDomainsByNameserver(indicator.value);
        break;
      case "ip":
        relatedDomains = await findDomainsByIP(indicator.value);
        break;
      case "registrar":
        relatedDomains = await findDomainsByRegistrar(indicator.value);
        break;
    }

    for (const relatedDomain of relatedDomains) {
      if (seenDomains.has(relatedDomain)) continue;
      seenDomains.add(relatedDomain);

      // Get indicators for related domain to find shared ones
      const relatedIndicators = await getOwnershipIndicators(relatedDomain);
      const sharedIndicators = indicators.filter((ind1) =>
        relatedIndicators.some(
          (ind2) => ind1.type === ind2.type && ind1.value === ind2.value,
        ),
      );

      // Calculate confidence score based on shared indicators
      const confidenceScore = Math.min(
        100,
        sharedIndicators.reduce((sum, ind) => sum + ind.confidence, 0) /
          sharedIndicators.length,
      );

      // Determine relationship strength
      let strength: "strong" | "moderate" | "weak";
      if (confidenceScore >= 80) strength = "strong";
      else if (confidenceScore >= 60) strength = "moderate";
      else strength = "weak";

      // Determine relationship type
      let relationshipType: DomainRelationship["relationshipType"];
      if (sharedIndicators.length > 1) {
        relationshipType = "multi";
      } else {
        const firstType = sharedIndicators[0]?.type;
        relationshipType =
          (firstType === "name" ? "organization" : firstType) || "registrar";
      }

      relationships.push({
        domain1: domain,
        domain2: relatedDomain,
        relationshipType,
        sharedIndicators,
        confidenceScore,
        strength,
      });
    }
  }

  // Sort by confidence score (highest first)
  relationships.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return relationships;
}

/**
 * Create ownership clusters based on shared indicators
 */
export async function createOwnershipClusters(
  domains: string[],
  minClusterSize: number = 2,
): Promise<OwnershipCluster[]> {
  const clusters: OwnershipCluster[] = [];
  const processedDomains = new Set<string>();

  // Group by email
  const emailGroups = new Map<string, string[]>();
  const orgGroups = new Map<string, string[]>();
  const nsGroups = new Map<string, string[]>();

  for (const domain of domains) {
    if (processedDomains.has(domain)) continue;

    const indicators = await getOwnershipIndicators(domain);

    for (const indicator of indicators) {
      if (indicator.type === "email" && indicator.confidence >= 80) {
        const group = emailGroups.get(indicator.value) || [];
        group.push(domain);
        emailGroups.set(indicator.value, group);
      } else if (
        indicator.type === "organization" &&
        indicator.confidence >= 80
      ) {
        const group = orgGroups.get(indicator.value) || [];
        group.push(domain);
        orgGroups.set(indicator.value, group);
      } else if (
        indicator.type === "nameserver" &&
        indicator.confidence >= 60
      ) {
        const group = nsGroups.get(indicator.value) || [];
        group.push(domain);
        nsGroups.set(indicator.value, group);
      }
    }
  }

  // Create clusters from email groups
  for (const [email, clusterDomains] of emailGroups.entries()) {
    if (clusterDomains.length < minClusterSize) continue;

    clusters.push({
      clusterId: `email-${Buffer.from(email).toString("base64").substring(0, 16)}`,
      domains: clusterDomains,
      primaryIndicator: {
        type: "email",
        value: email,
        confidence: 95,
        lastSeen: new Date(),
        domainCount: clusterDomains.length,
      },
      secondaryIndicators: [],
      clusterSize: clusterDomains.length,
      confidenceScore: 95,
      createdAt: new Date(),
    });

    clusterDomains.forEach((d) => processedDomains.add(d));
  }

  // Create clusters from organization groups
  for (const [org, clusterDomains] of orgGroups.entries()) {
    if (clusterDomains.length < minClusterSize) continue;

    // Skip if already in email cluster
    const newDomains = clusterDomains.filter((d) => !processedDomains.has(d));
    if (newDomains.length < minClusterSize) continue;

    clusters.push({
      clusterId: `org-${Buffer.from(org).toString("base64").substring(0, 16)}`,
      domains: newDomains,
      primaryIndicator: {
        type: "organization",
        value: org,
        confidence: 90,
        lastSeen: new Date(),
        domainCount: newDomains.length,
      },
      secondaryIndicators: [],
      clusterSize: newDomains.length,
      confidenceScore: 90,
      createdAt: new Date(),
    });

    newDomains.forEach((d) => processedDomains.add(d));
  }

  // Create clusters from nameserver groups
  for (const [ns, clusterDomains] of nsGroups.entries()) {
    if (clusterDomains.length < minClusterSize) continue;

    // Skip if already in email/org cluster
    const newDomains = clusterDomains.filter((d) => !processedDomains.has(d));
    if (newDomains.length < minClusterSize) continue;

    clusters.push({
      clusterId: `ns-${Buffer.from(ns).toString("base64").substring(0, 16)}`,
      domains: newDomains,
      primaryIndicator: {
        type: "nameserver",
        value: ns,
        confidence: 70,
        lastSeen: new Date(),
        domainCount: newDomains.length,
      },
      secondaryIndicators: [],
      clusterSize: newDomains.length,
      confidenceScore: 70,
      createdAt: new Date(),
    });

    newDomains.forEach((d) => processedDomains.add(d));
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.clusterSize - a.clusterSize);

  return clusters;
}

/**
 * Build ownership graph for a domain
 */
export async function buildOwnershipGraph(
  domain: string,
  maxDepth: number = 2,
  minConfidence: number = 60,
): Promise<OwnershipGraph> {
  const relatedDomains: OwnershipGraph["relatedDomains"] = [];
  const seenDomains = new Set<string>([domain]);
  const queue: { domain: string; distance: number }[] = [
    { domain, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance >= maxDepth) continue;

    const relationships = await findRelatedDomains(
      current.domain,
      minConfidence,
    );

    for (const relationship of relationships) {
      const nextDomain = relationship.domain2;

      if (seenDomains.has(nextDomain)) continue;
      seenDomains.add(nextDomain);

      relatedDomains.push({
        domain: nextDomain,
        relationship,
        distance: current.distance + 1,
      });

      // Add to queue for next level
      if (current.distance + 1 < maxDepth) {
        queue.push({ domain: nextDomain, distance: current.distance + 1 });
      }
    }
  }

  // Create clusters from all related domains
  const allDomains = [domain, ...relatedDomains.map((r) => r.domain)];
  const clusters = await createOwnershipClusters(allDomains);

  return {
    centerDomain: domain,
    relatedDomains,
    totalRelated: relatedDomains.length,
    clusters,
  };
}

/**
 * Analyze domain portfolio ownership patterns
 */
export async function analyzePortfolio(
  domains?: string[],
): Promise<PortfolioAnalysis> {
  // If no domains provided, get all domains from WHOIS records
  let portfolioDomains: string[];

  if (domains && domains.length > 0) {
    portfolioDomains = domains;
  } else {
    const allDomains = await db
      .select({ domain: whoisRecords.domain })
      .from(whoisRecords)
      .orderBy(whoisRecords.domain);
    portfolioDomains = allDomains.map((r) => r.domain);
  }

  // Collect all unique indicators
  const uniqueEmails = new Set<string>();
  const uniqueOrgs = new Set<string>();
  const uniqueNameservers = new Set<string>();
  const uniqueIPs = new Set<string>();

  for (const domain of portfolioDomains) {
    const indicators = await getOwnershipIndicators(domain);

    for (const indicator of indicators) {
      switch (indicator.type) {
        case "email":
          uniqueEmails.add(indicator.value);
          break;
        case "organization":
          uniqueOrgs.add(indicator.value);
          break;
        case "nameserver":
          uniqueNameservers.add(indicator.value);
          break;
        case "ip":
          uniqueIPs.add(indicator.value);
          break;
      }
    }
  }

  // Create clusters
  const clusters = await createOwnershipClusters(portfolioDomains);

  // Count relationship strengths
  let strongRelationships = 0;
  let moderateRelationships = 0;
  let weakRelationships = 0;

  for (const domain of portfolioDomains.slice(0, 10)) {
    // Sample first 10 for performance
    const relationships = await findRelatedDomains(domain, 50);
    for (const rel of relationships) {
      if (rel.strength === "strong") strongRelationships++;
      else if (rel.strength === "moderate") moderateRelationships++;
      else weakRelationships++;
    }
  }

  return {
    totalDomains: portfolioDomains.length,
    uniqueEmails: uniqueEmails.size,
    uniqueOrganizations: uniqueOrgs.size,
    uniqueNameservers: uniqueNameservers.size,
    uniqueIPs: uniqueIPs.size,
    clusters,
    strongRelationships,
    moderateRelationships,
    weakRelationships,
  };
}
