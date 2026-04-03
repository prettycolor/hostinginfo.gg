/**
 * Domain Ownership Correlation Engine
 *
 * Provides:
 * - Link domains by registrant email
 * - Group domains by organization
 * - Correlate by nameservers
 * - Identify shared IP addresses
 * - Build ownership graphs
 * - Detect domain portfolios
 */

import { db } from "../../db/client.js";
import { whoisRecords, dnsRecords, ipIntelligence } from "../../db/schema.js";
import { eq, like, and } from "drizzle-orm";

export interface DomainCluster {
  correlationType: "email" | "organization" | "nameserver" | "ip_address";
  correlationValue: string;
  domains: string[];
  domainCount: number;
  confidence: number; // 0-100
  metadata?: Record<string, unknown>;
}

export interface OwnershipGraph {
  centerDomain: string;
  clusters: DomainCluster[];
  totalRelatedDomains: number;
  relationships: {
    domain1: string;
    domain2: string;
    relationshipType: string;
    strength: number; // 0-100
  }[];
}

export interface PortfolioAnalysis {
  ownerEmail?: string;
  organization?: string;
  domainCount: number;
  domains: {
    domain: string;
    registrar: string | null;
    expirationDate: Date | null;
    nameservers: string[];
  }[];
  registrars: Record<string, number>;
  expirationTimeline: {
    expiringSoon: number; // < 90 days
    expiringMedium: number; // 90-180 days
    expiringLater: number; // > 180 days
  };
  recommendations: string[];
}

/**
 * Find domains by registrant email
 */
export async function findDomainsByEmail(
  email: string,
): Promise<DomainCluster> {
  try {
    const records = await db
      .select({
        domain: whoisRecords.domain,
        registrar: whoisRecords.registrar,
        expirationDate: whoisRecords.expiryDate,
      })
      .from(whoisRecords)
      .where(eq(whoisRecords.registrantEmail, email));

    const domains = records.map((r) => r.domain).filter(Boolean) as string[];

    return {
      correlationType: "email",
      correlationValue: email,
      domains,
      domainCount: domains.length,
      confidence: 95, // High confidence for email matches
      metadata: {
        registrars: records.map((r) => r.registrar).filter(Boolean),
      },
    };
  } catch (error) {
    console.error("[Ownership Correlation] Error finding by email:", error);
    return {
      correlationType: "email",
      correlationValue: email,
      domains: [],
      domainCount: 0,
      confidence: 0,
    };
  }
}

/**
 * Find domains by organization
 */
export async function findDomainsByOrganization(
  organization: string,
): Promise<DomainCluster> {
  try {
    // Use LIKE for partial matches
    const records = await db
      .select({
        domain: whoisRecords.domain,
        registrar: whoisRecords.registrar,
      })
      .from(whoisRecords)
      .where(like(whoisRecords.registrantName, `%${organization}%`));

    const domains = records.map((r) => r.domain).filter(Boolean) as string[];

    return {
      correlationType: "organization",
      correlationValue: organization,
      domains,
      domainCount: domains.length,
      confidence: 80, // Medium-high confidence for org matches
      metadata: {
        registrars: records.map((r) => r.registrar).filter(Boolean),
      },
    };
  } catch (error) {
    console.error("[Ownership Correlation] Error finding by org:", error);
    return {
      correlationType: "organization",
      correlationValue: organization,
      domains: [],
      domainCount: 0,
      confidence: 0,
    };
  }
}

/**
 * Find domains by nameserver
 */
export async function findDomainsByNameserver(
  nameserver: string,
): Promise<DomainCluster> {
  try {
    // Query WHOIS records where nameservers JSON contains the nameserver
    const records = await db
      .select({
        domain: whoisRecords.domain,
        nameservers: whoisRecords.nameservers,
      })
      .from(whoisRecords);

    // Filter in memory (MySQL JSON querying is complex)
    const matchingRecords = records.filter((r) => {
      if (!r.nameservers) return false;

      try {
        const ns = Array.isArray(r.nameservers)
          ? r.nameservers
          : JSON.parse(String(r.nameservers));

        return ns.some((n: string) =>
          n.toLowerCase().includes(nameserver.toLowerCase()),
        );
      } catch {
        return false;
      }
    });

    const domains = matchingRecords
      .map((r) => r.domain)
      .filter(Boolean) as string[];

    return {
      correlationType: "nameserver",
      correlationValue: nameserver,
      domains,
      domainCount: domains.length,
      confidence: 85, // High confidence for nameserver matches
      metadata: {
        nameserver,
      },
    };
  } catch (error) {
    console.error(
      "[Ownership Correlation] Error finding by nameserver:",
      error,
    );
    return {
      correlationType: "nameserver",
      correlationValue: nameserver,
      domains: [],
      domainCount: 0,
      confidence: 0,
    };
  }
}

/**
 * Find domains by shared IP address
 */
export async function findDomainsByIP(
  ipAddress: string,
): Promise<DomainCluster> {
  try {
    // Find all DNS A records with this IP
    const records = await db
      .select({
        domain: dnsRecords.domain,
      })
      .from(dnsRecords)
      .where(
        and(eq(dnsRecords.recordType, "A"), eq(dnsRecords.value, ipAddress)),
      );

    const domains = [
      ...new Set(records.map((r) => r.domain).filter(Boolean)),
    ] as string[];

    // Get IP intelligence for metadata
    const ipInfo = await db
      .select()
      .from(ipIntelligence)
      .where(eq(ipIntelligence.ipAddress, ipAddress))
      .limit(1);

    return {
      correlationType: "ip_address",
      correlationValue: ipAddress,
      domains,
      domainCount: domains.length,
      confidence: 70, // Medium confidence (shared hosting is common)
      metadata: ipInfo[0]
        ? {
            country: ipInfo[0].country,
            organization: ipInfo[0].organization,
            isHosting: ipInfo[0].isHosting,
          }
        : undefined,
    };
  } catch (error) {
    console.error("[Ownership Correlation] Error finding by IP:", error);
    return {
      correlationType: "ip_address",
      correlationValue: ipAddress,
      domains: [],
      domainCount: 0,
      confidence: 0,
    };
  }
}

/**
 * Build ownership graph for a domain
 */
export async function buildOwnershipGraph(
  domain: string,
): Promise<OwnershipGraph | null> {
  try {
    // Get domain's WHOIS record
    const whoisRecord = await db
      .select()
      .from(whoisRecords)
      .where(eq(whoisRecords.domain, domain))
      .limit(1);

    if (whoisRecord.length === 0) {
      return null;
    }

    const record = whoisRecord[0];
    const clusters: DomainCluster[] = [];
    const relationships: OwnershipGraph["relationships"] = [];

    // Find by email
    if (record.registrantEmail) {
      const emailCluster = await findDomainsByEmail(record.registrantEmail);
      if (emailCluster.domainCount > 1) {
        clusters.push(emailCluster);

        // Add relationships
        emailCluster.domains.forEach((d) => {
          if (d !== domain) {
            relationships.push({
              domain1: domain,
              domain2: d,
              relationshipType: "same_email",
              strength: 95,
            });
          }
        });
      }
    }

    // Find by organization
    if (record.registrantName) {
      const orgCluster = await findDomainsByOrganization(record.registrantName);
      if (orgCluster.domainCount > 1) {
        clusters.push(orgCluster);

        orgCluster.domains.forEach((d) => {
          if (d !== domain && !relationships.find((r) => r.domain2 === d)) {
            relationships.push({
              domain1: domain,
              domain2: d,
              relationshipType: "same_organization",
              strength: 80,
            });
          }
        });
      }
    }

    // Find by nameservers
    if (record.nameservers) {
      const ns = Array.isArray(record.nameservers)
        ? record.nameservers
        : JSON.parse(String(record.nameservers));

      if (ns.length > 0) {
        const nsCluster = await findDomainsByNameserver(ns[0]);
        if (nsCluster.domainCount > 1) {
          clusters.push(nsCluster);

          nsCluster.domains.forEach((d) => {
            if (d !== domain && !relationships.find((r) => r.domain2 === d)) {
              relationships.push({
                domain1: domain,
                domain2: d,
                relationshipType: "same_nameserver",
                strength: 85,
              });
            }
          });
        }
      }
    }

    // Find by IP
    const dnsA = await db
      .select()
      .from(dnsRecords)
      .where(and(eq(dnsRecords.domain, domain), eq(dnsRecords.recordType, "A")))
      .limit(1);

    if (dnsA.length > 0 && dnsA[0].value) {
      const ipCluster = await findDomainsByIP(dnsA[0].value);
      if (ipCluster.domainCount > 1) {
        clusters.push(ipCluster);

        ipCluster.domains.forEach((d) => {
          if (d !== domain && !relationships.find((r) => r.domain2 === d)) {
            relationships.push({
              domain1: domain,
              domain2: d,
              relationshipType: "same_ip",
              strength: 70,
            });
          }
        });
      }
    }

    const allRelatedDomains = new Set<string>();
    clusters.forEach((c) => c.domains.forEach((d) => allRelatedDomains.add(d)));
    allRelatedDomains.delete(domain); // Remove center domain

    return {
      centerDomain: domain,
      clusters,
      totalRelatedDomains: allRelatedDomains.size,
      relationships,
    };
  } catch (error) {
    console.error("[Ownership Correlation] Error building graph:", error);
    return null;
  }
}

/**
 * Analyze domain portfolio for an owner
 */
export async function analyzePortfolio(
  email?: string,
  organization?: string,
): Promise<PortfolioAnalysis | null> {
  try {
    if (!email && !organization) {
      return null;
    }

    let records;
    if (email) {
      records = await db
        .select()
        .from(whoisRecords)
        .where(eq(whoisRecords.registrantEmail, email));
    } else if (organization) {
      records = await db
        .select()
        .from(whoisRecords)
        .where(like(whoisRecords.registrantName, `%${organization}%`));
    }

    if (!records || records.length === 0) {
      return null;
    }

    const domains = records.map((r) => ({
      domain: r.domain || "",
      registrar: r.registrar,
      expirationDate: r.expiryDate,
      nameservers: Array.isArray(r.nameservers)
        ? r.nameservers
        : r.nameservers
          ? JSON.parse(String(r.nameservers))
          : [],
    }));

    // Count registrars
    const registrars: Record<string, number> = {};
    records.forEach((r) => {
      if (r.registrar) {
        registrars[r.registrar] = (registrars[r.registrar] || 0) + 1;
      }
    });

    // Analyze expiration timeline
    const now = new Date();
    const timeline = {
      expiringSoon: 0,
      expiringMedium: 0,
      expiringLater: 0,
    };

    records.forEach((r) => {
      if (r.expiryDate) {
        const daysUntilExpiry = Math.floor(
          (r.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilExpiry < 90) timeline.expiringSoon++;
        else if (daysUntilExpiry < 180) timeline.expiringMedium++;
        else timeline.expiringLater++;
      }
    });

    // Generate recommendations
    const recommendations: string[] = [];

    if (timeline.expiringSoon > 0) {
      recommendations.push(
        `⚠️ ${timeline.expiringSoon} domain(s) expiring within 90 days - renew soon`,
      );
    }

    if (Object.keys(registrars).length > 3) {
      recommendations.push(
        `💡 Consider consolidating domains to fewer registrars for easier management`,
      );
    }

    const totalDomains = records.length;
    if (totalDomains >= 10) {
      recommendations.push(
        `📊 Large portfolio detected (${totalDomains} domains) - consider bulk management tools`,
      );
    }

    return {
      ownerEmail: email,
      organization,
      domainCount: totalDomains,
      domains,
      registrars,
      expirationTimeline: timeline,
      recommendations,
    };
  } catch (error) {
    console.error("[Ownership Correlation] Error analyzing portfolio:", error);
    return null;
  }
}
