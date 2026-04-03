/**
 * Infrastructure Attribution Engine
 * 
 * Provides:
 * - Hosting provider detection
 * - CDN identification (Cloudflare, Akamai, Fastly, etc.)
 * - Shared infrastructure analysis
 * - IP address clustering
 * - Provider reputation scoring
 */

import { db } from '../../db/client.js';
import { ipIntelligence, dnsRecords } from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export interface InfrastructureAttribution {
  domain: string;
  hostingProvider: HostingProvider | null;
  cdnProvider: CDNProvider | null;
  sharedInfrastructure: SharedInfrastructure;
  ipAddresses: IPAddressInfo[];
  nameservers: NameserverInfo[];
  confidence: number; // 0-100
  detectionMethods: string[];
}

export interface HostingProvider {
  name: string;
  type: 'cloud' | 'shared' | 'vps' | 'dedicated' | 'managed' | 'unknown';
  confidence: number;
  evidence: string[];
  reputation: number; // 0-100
  features: string[];
}

export interface CDNProvider {
  name: string;
  confidence: number;
  evidence: string[];
  pops: string[]; // Points of presence
}

export interface SharedInfrastructure {
  isShared: boolean;
  sharedWith: number; // Number of other domains
  ipClusters: {
    ipAddress: string;
    domainCount: number;
    organization: string | null;
  }[];
}

export interface IPAddressInfo {
  ipAddress: string;
  type: 'A' | 'AAAA';
  country: string | null;
  organization: string | null;
  asn: string | null;
  isHosting: boolean;
  isProxy: boolean;
  isCDN: boolean;
}

export interface NameserverInfo {
  nameserver: string;
  provider: string | null;
  confidence: number;
}

export interface ProviderAnalysis {
  providerName: string;
  domainCount: number;
  domains: string[];
  ipRanges: string[];
  reputation: number;
  marketShare: number; // Percentage
  features: string[];
}

/**
 * Known hosting providers with their ASN and IP patterns
 */
const KNOWN_PROVIDERS = {
  'Amazon Web Services': {
    asns: [16509, 14618],
    patterns: ['amazonaws.com', 'aws'],
    type: 'cloud' as const,
    reputation: 95,
    features: ['Auto-scaling', 'Load balancing', 'CDN (CloudFront)', 'DDoS protection'],
  },
  'Google Cloud': {
    asns: [15169, 396982],
    patterns: ['googleusercontent.com', 'google', 'gcp'],
    type: 'cloud' as const,
    reputation: 95,
    features: ['Global load balancing', 'CDN', 'DDoS protection', 'Auto-scaling'],
  },
  'Microsoft Azure': {
    asns: [8075],
    patterns: ['azure', 'microsoft'],
    type: 'cloud' as const,
    reputation: 93,
    features: ['CDN', 'Load balancing', 'DDoS protection', 'Auto-scaling'],
  },
  'Cloudflare': {
    asns: [13335],
    patterns: ['cloudflare'],
    type: 'managed' as const,
    reputation: 98,
    features: ['CDN', 'DDoS protection', 'WAF', 'DNS', 'SSL'],
  },
  'DigitalOcean': {
    asns: [14061],
    patterns: ['digitalocean'],
    type: 'vps' as const,
    reputation: 88,
    features: ['SSD storage', 'Load balancing', 'Managed databases'],
  },
  'Linode': {
    asns: [63949],
    patterns: ['linode'],
    type: 'vps' as const,
    reputation: 87,
    features: ['SSD storage', 'Load balancing', 'Managed Kubernetes'],
  },
  'Vultr': {
    asns: [20473],
    patterns: ['vultr'],
    type: 'vps' as const,
    reputation: 85,
    features: ['SSD storage', 'DDoS protection', 'Load balancing'],
  },
  'OVH': {
    asns: [16276],
    patterns: ['ovh'],
    type: 'dedicated' as const,
    reputation: 82,
    features: ['DDoS protection', 'Private networking', 'Bare metal'],
  },
  'Hetzner': {
    asns: [24940],
    patterns: ['hetzner'],
    type: 'dedicated' as const,
    reputation: 84,
    features: ['Dedicated servers', 'Cloud', 'Storage boxes'],
  },
  'GoDaddy': {
    asns: [26496],
    patterns: ['godaddy', 'secureserver'],
    type: 'shared' as const,
    reputation: 75,
    features: ['Shared hosting', 'WordPress hosting', 'Email hosting'],
  },
  'Bluehost': {
    asns: [46606],
    patterns: ['bluehost'],
    type: 'shared' as const,
    reputation: 72,
    features: ['Shared hosting', 'WordPress hosting', 'Email'],
  },
  'HostGator': {
    asns: [46606],
    patterns: ['hostgator'],
    type: 'shared' as const,
    reputation: 70,
    features: ['Shared hosting', 'WordPress hosting', 'Email'],
  },
};

/**
 * Known CDN providers
 */
const KNOWN_CDNS = {
  'Cloudflare': {
    asns: [13335],
    patterns: ['cloudflare'],
    nameservers: ['cloudflare.com'],
  },
  'Akamai': {
    asns: [20940, 16625],
    patterns: ['akamai'],
    nameservers: ['akamai.net', 'akam.net'],
  },
  'Fastly': {
    asns: [54113],
    patterns: ['fastly'],
    nameservers: ['fastly.net'],
  },
  'Amazon CloudFront': {
    asns: [16509],
    patterns: ['cloudfront', 'amazonaws'],
    nameservers: ['awsdns'],
  },
  'Google Cloud CDN': {
    asns: [15169],
    patterns: ['google', 'gcp'],
    nameservers: ['googledomains.com'],
  },
  'Microsoft Azure CDN': {
    asns: [8075],
    patterns: ['azure', 'azureedge'],
    nameservers: ['azure-dns'],
  },
};

/**
 * Detect infrastructure attribution for a domain
 */
export async function detectInfrastructure(
  domain: string
): Promise<InfrastructureAttribution | null> {
  try {
    const detectionMethods: string[] = [];
    let totalConfidence = 0;
    let confidenceFactors = 0;

    // Get IP addresses
    const dnsA = await db
      .select()
      .from(dnsRecords)
      .where(
        and(
          eq(dnsRecords.domain, domain),
          inArray(dnsRecords.recordType, ['A', 'AAAA'])
        )
      );

    if (dnsA.length === 0) {
      return null;
    }

    // Get IP intelligence
    const ipAddresses: IPAddressInfo[] = [];
    for (const record of dnsA) {
      if (!record.value) continue;

      const ipInfo = await db
        .select()
        .from(ipIntelligence)
        .where(eq(ipIntelligence.ipAddress, record.value))
        .limit(1);

      if (ipInfo.length > 0) {
        const ip = ipInfo[0];
        ipAddresses.push({
          ipAddress: record.value,
          type: record.recordType as 'A' | 'AAAA',
          country: ip.country,
          organization: ip.organization,
          asn: ip.asn,
          isHosting: ip.isHosting || false,
          isProxy: ip.isProxy || false,
          isCDN: false, // Will be determined
        });
      }
    }

    // Detect hosting provider
    const hostingProvider = await detectHostingProvider(ipAddresses);
    if (hostingProvider) {
      detectionMethods.push('ASN lookup', 'Organization matching');
      totalConfidence += hostingProvider.confidence;
      confidenceFactors++;
    }

    // Detect CDN
    const cdnProvider = await detectCDN(domain, ipAddresses);
    if (cdnProvider) {
      detectionMethods.push('CDN detection');
      totalConfidence += cdnProvider.confidence;
      confidenceFactors++;
      
      // Mark IPs as CDN
      ipAddresses.forEach(ip => {
        if (cdnProvider.name && ip.organization?.toLowerCase().includes(cdnProvider.name.toLowerCase())) {
          ip.isCDN = true;
        }
      });
    }

    // Analyze shared infrastructure
    const sharedInfrastructure = await analyzeSharedInfrastructure(ipAddresses);
    detectionMethods.push('Shared hosting analysis');

    // Get nameservers
    const nameservers = await getNameserverInfo(domain);
    if (nameservers.length > 0) {
      detectionMethods.push('Nameserver analysis');
      const nsConfidence = nameservers.reduce((sum, ns) => sum + ns.confidence, 0) / nameservers.length;
      totalConfidence += nsConfidence;
      confidenceFactors++;
    }

    const overallConfidence = confidenceFactors > 0 ? Math.round(totalConfidence / confidenceFactors) : 0;

    return {
      domain,
      hostingProvider,
      cdnProvider,
      sharedInfrastructure,
      ipAddresses,
      nameservers,
      confidence: overallConfidence,
      detectionMethods: [...new Set(detectionMethods)],
    };
  } catch (error) {
    console.error('[Infrastructure Attribution] Error:', error);
    return null;
  }
}

/**
 * Detect hosting provider from IP information
 */
async function detectHostingProvider(
  ipAddresses: IPAddressInfo[]
): Promise<HostingProvider | null> {
  if (ipAddresses.length === 0) return null;

  const evidence: string[] = [];
  let bestMatch: { name: string; confidence: number; provider: typeof KNOWN_PROVIDERS[keyof typeof KNOWN_PROVIDERS] } | null = null;

  for (const ip of ipAddresses) {
    // Check ASN
    if (ip.asn) {
      const normalizedAsn = ip.asn.toUpperCase().replace(/^AS/, '');
      const asnNumber = Number(normalizedAsn);
      if (!Number.isFinite(asnNumber)) {
        continue;
      }
      for (const [name, provider] of Object.entries(KNOWN_PROVIDERS)) {
        if (provider.asns.includes(asnNumber)) {
          evidence.push(`ASN ${asnNumber} belongs to ${name}`);
          if (!bestMatch || provider.reputation > bestMatch.provider.reputation) {
            bestMatch = { name, confidence: 95, provider };
          }
        }
      }
    }

    // Check organization name
    if (ip.organization) {
      const orgLower = ip.organization.toLowerCase();
      for (const [name, provider] of Object.entries(KNOWN_PROVIDERS)) {
        if (provider.patterns.some(pattern => orgLower.includes(pattern))) {
          evidence.push(`Organization "${ip.organization}" matches ${name}`);
          if (!bestMatch || provider.reputation > bestMatch.provider.reputation) {
            bestMatch = { name, confidence: 85, provider };
          }
        }
      }
    }

    // Check if hosting flag is set
    if (ip.isHosting) {
      evidence.push(`IP ${ip.ipAddress} flagged as hosting`);
    }
  }

  if (!bestMatch) {
    // Generic hosting detection
    const hasHostingFlag = ipAddresses.some(ip => ip.isHosting);
    if (hasHostingFlag) {
      return {
        name: 'Unknown Hosting Provider',
        type: 'unknown',
        confidence: 50,
        evidence: ['IP flagged as hosting infrastructure'],
        reputation: 50,
        features: [],
      };
    }
    return null;
  }

  return {
    name: bestMatch.name,
    type: bestMatch.provider.type,
    confidence: bestMatch.confidence,
    evidence,
    reputation: bestMatch.provider.reputation,
    features: bestMatch.provider.features,
  };
}

/**
 * Detect CDN provider
 */
async function detectCDN(
  domain: string,
  ipAddresses: IPAddressInfo[]
): Promise<CDNProvider | null> {
  const evidence: string[] = [];
  let bestMatch: { name: string; confidence: number } | null = null;

  // Check IP ASNs
  for (const ip of ipAddresses) {
    if (ip.asn) {
      const normalizedAsn = ip.asn.toUpperCase().replace(/^AS/, '');
      const asnNumber = Number(normalizedAsn);
      if (!Number.isFinite(asnNumber)) {
        continue;
      }
      for (const [name, cdn] of Object.entries(KNOWN_CDNS)) {
        if (cdn.asns.includes(asnNumber)) {
          evidence.push(`ASN ${asnNumber} belongs to ${name} CDN`);
          if (!bestMatch) {
            bestMatch = { name, confidence: 95 };
          }
        }
      }
    }

    // Check organization
    if (ip.organization) {
      const orgLower = ip.organization.toLowerCase();
      for (const [name, cdn] of Object.entries(KNOWN_CDNS)) {
        if (cdn.patterns.some(pattern => orgLower.includes(pattern))) {
          evidence.push(`Organization "${ip.organization}" matches ${name}`);
          if (!bestMatch) {
            bestMatch = { name, confidence: 85 };
          }
        }
      }
    }
  }

  // Check nameservers
  const nsRecords = await db
    .select()
    .from(dnsRecords)
    .where(
      and(
        eq(dnsRecords.domain, domain),
        eq(dnsRecords.recordType, 'NS')
      )
    );

  for (const ns of nsRecords) {
    if (!ns.value) continue;
    const nsLower = ns.value.toLowerCase();
    
    for (const [name, cdn] of Object.entries(KNOWN_CDNS)) {
      if (cdn.nameservers.some(pattern => nsLower.includes(pattern))) {
        evidence.push(`Nameserver "${ns.value}" indicates ${name}`);
        if (!bestMatch) {
          bestMatch = { name, confidence: 90 };
        }
      }
    }
  }

  if (!bestMatch) return null;

  return {
    name: bestMatch.name,
    confidence: bestMatch.confidence,
    evidence,
    pops: [], // Would need additional data
  };
}

/**
 * Analyze shared infrastructure
 */
async function analyzeSharedInfrastructure(
  ipAddresses: IPAddressInfo[]
): Promise<SharedInfrastructure> {
  const ipClusters: SharedInfrastructure['ipClusters'] = [];
  let totalShared = 0;

  for (const ip of ipAddresses) {
    // Count domains on same IP
    const domainsOnIP = await db
      .select({ domain: dnsRecords.domain })
      .from(dnsRecords)
      .where(
        and(
          eq(dnsRecords.recordType, 'A'),
          eq(dnsRecords.value, ip.ipAddress)
        )
      );

    const uniqueDomains = new Set(domainsOnIP.map(d => d.domain).filter(Boolean));
    const domainCount = uniqueDomains.size;

    if (domainCount > 1) {
      totalShared += domainCount - 1; // Exclude current domain
      ipClusters.push({
        ipAddress: ip.ipAddress,
        domainCount,
        organization: ip.organization,
      });
    }
  }

  return {
    isShared: ipClusters.length > 0,
    sharedWith: totalShared,
    ipClusters,
  };
}

/**
 * Get nameserver information
 */
async function getNameserverInfo(domain: string): Promise<NameserverInfo[]> {
  const nsRecords = await db
    .select()
    .from(dnsRecords)
    .where(
      and(
        eq(dnsRecords.domain, domain),
        eq(dnsRecords.recordType, 'NS')
      )
    );

  return nsRecords
    .filter(ns => ns.value)
    .map(ns => {
      const nsLower = ns.value!.toLowerCase();
      let provider: string | null = null;
      let confidence = 50;

      // Check against known providers
      for (const [name, cdn] of Object.entries(KNOWN_CDNS)) {
        if (cdn.nameservers.some(pattern => nsLower.includes(pattern))) {
          provider = name;
          confidence = 90;
          break;
        }
      }

      // Check against hosting providers
      if (!provider) {
        for (const [name, hosting] of Object.entries(KNOWN_PROVIDERS)) {
          if (hosting.patterns.some(pattern => nsLower.includes(pattern))) {
            provider = name;
            confidence = 80;
            break;
          }
        }
      }

      return {
        nameserver: ns.value!,
        provider,
        confidence,
      };
    });
}

/**
 * Analyze all domains using a specific provider
 */
export async function analyzeProvider(
  providerName: string
): Promise<ProviderAnalysis | null> {
  try {
    const provider = KNOWN_PROVIDERS[providerName as keyof typeof KNOWN_PROVIDERS];
    if (!provider) {
      return null;
    }

    // Find all IPs belonging to this provider
    const providerAsns = provider.asns.flatMap((asn) => [String(asn), `AS${asn}`]);
    const ips = await db
      .select()
      .from(ipIntelligence)
      .where(
        inArray(ipIntelligence.asn, providerAsns)
      );

    const ipAddresses = ips.map(ip => ip.ipAddress).filter(Boolean) as string[];

    // Find domains using these IPs
    const domains = await db
      .select({ domain: dnsRecords.domain })
      .from(dnsRecords)
      .where(
        and(
          eq(dnsRecords.recordType, 'A'),
          inArray(dnsRecords.value, ipAddresses)
        )
      );

    const uniqueDomains = [...new Set(domains.map(d => d.domain).filter(Boolean))] as string[];

    // Calculate market share (would need total domain count)
    const marketShare = 0; // Placeholder

    return {
      providerName,
      domainCount: uniqueDomains.length,
      domains: uniqueDomains.slice(0, 100), // Limit to 100
      ipRanges: ipAddresses.slice(0, 50), // Limit to 50
      reputation: provider.reputation,
      marketShare,
      features: provider.features,
    };
  } catch (error) {
    console.error('[Provider Analysis] Error:', error);
    return null;
  }
}

/**
 * Find all domains on a shared IP
 */
export async function findDomainsOnIP(
  ipAddress: string
): Promise<string[]> {
  try {
    const domains = await db
      .select({ domain: dnsRecords.domain })
      .from(dnsRecords)
      .where(
        and(
          eq(dnsRecords.recordType, 'A'),
          eq(dnsRecords.value, ipAddress)
        )
      );

    return [...new Set(domains.map(d => d.domain).filter(Boolean))] as string[];
  } catch (error) {
    console.error('[Find Domains on IP] Error:', error);
    return [];
  }
}
