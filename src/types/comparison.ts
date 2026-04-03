/**
 * Domain Comparison Type Definitions
 * 
 * Defines interfaces for comparing multiple domains side-by-side across
 * DNS, hosting, technology, security, and performance dimensions.
 */

/**
 * Comparison request
 */
export interface ComparisonRequest {
  domains: string[]; // 2-5 domains to compare
  categories?: ComparisonCategory[]; // Optional: specific categories to compare
}

/**
 * Comparison categories
 */
export type ComparisonCategory = 'dns' | 'hosting' | 'technology' | 'security' | 'performance';

/**
 * DNS comparison data for a single domain
 */
export interface DnsComparisonData {
  domain: string;
  aRecords: string[];
  aaaaRecords: string[];
  mxRecords: Array<{ priority: number; value: string }>;
  txtRecords: string[];
  nsRecords: string[];
  cnameRecord?: string;
  ttl: number;
  dnssecEnabled: boolean;
  recordCount: number;
}

/**
 * DNS comparison result
 */
export interface DnsComparison {
  category: 'dns';
  domains: DnsComparisonData[];
  insights: {
    sharedNameservers: string[];
    sharedIPs: string[];
    ttlVariance: number;
    dnssecAdoption: number; // Percentage
    commonRecordTypes: string[];
  };
  similarities: Array<{
    domain1: string;
    domain2: string;
    score: number; // 0-100
    sharedElements: string[];
  }>;
}

/**
 * Hosting comparison data for a single domain
 */
export interface HostingComparisonData {
  domain: string;
  ipAddress: string;
  ipv6Address?: string;
  provider: string;
  asn: string;
  asnOrg: string;
  country: string;
  city: string;
  datacenterLocation?: string;
  hostingType: 'shared' | 'vps' | 'dedicated' | 'cloud' | 'unknown';
  reverseIp?: string;
}

/**
 * Hosting comparison result
 */
export interface HostingComparison {
  category: 'hosting';
  domains: HostingComparisonData[];
  insights: {
    sharedProviders: string[];
    sharedASNs: string[];
    geographicDistribution: Array<{ country: string; count: number }>;
    hostingTypeDistribution: Record<string, number>;
    ipv6Adoption: number; // Percentage
  };
  similarities: Array<{
    domain1: string;
    domain2: string;
    score: number; // 0-100
    sharedElements: string[];
  }>;
}

/**
 * Technology comparison data for a single domain
 */
export interface TechnologyComparisonData {
  domain: string;
  webServer: string;
  frameworks: string[];
  cms?: string;
  programmingLanguages: string[];
  jsLibraries: string[];
  analytics: string[];
  cdns: string[];
  securityTools: string[];
  totalTechnologies: number;
}

/**
 * Technology comparison result
 */
export interface TechnologyComparison {
  category: 'technology';
  domains: TechnologyComparisonData[];
  insights: {
    commonTechnologies: Array<{ name: string; count: number }>;
    uniqueTechnologies: Array<{ domain: string; technologies: string[] }>;
    frameworkDistribution: Record<string, number>;
    cmsDistribution: Record<string, number>;
    modernStackAdoption: number; // Percentage using modern frameworks
  };
  similarities: Array<{
    domain1: string;
    domain2: string;
    score: number; // 0-100
    sharedTechnologies: string[];
  }>;
}

/**
 * Security comparison data for a single domain
 */
export interface SecurityComparisonData {
  domain: string;
  httpsEnabled: boolean;
  sslGrade?: string;
  certificateIssuer?: string;
  certificateExpiry?: string;
  tlsVersion: string;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
  };
  vulnerabilities: number;
  securityScore: number; // 0-100
}

/**
 * Security comparison result
 */
export interface SecurityComparison {
  category: 'security';
  domains: SecurityComparisonData[];
  insights: {
    httpsAdoption: number; // Percentage
    averageSecurityScore: number;
    commonVulnerabilities: string[];
    securityHeaderAdoption: Record<string, number>; // Percentage per header
    certificateIssuers: Array<{ issuer: string; count: number }>;
  };
  similarities: Array<{
    domain1: string;
    domain2: string;
    score: number; // 0-100
    sharedCharacteristics: string[];
  }>;
}

/**
 * Performance comparison data for a single domain
 */
export interface PerformanceComparisonData {
  domain: string;
  performanceScore: number; // 0-100
  loadTime: number; // milliseconds
  timeToFirstByte: number; // milliseconds
  firstContentfulPaint: number; // milliseconds
  largestContentfulPaint: number; // milliseconds
  cumulativeLayoutShift: number;
  totalPageSize: number; // bytes
  requestCount: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Performance comparison result
 */
export interface PerformanceComparison {
  category: 'performance';
  domains: PerformanceComparisonData[];
  insights: {
    fastestDomain: string;
    slowestDomain: string;
    averageLoadTime: number;
    averagePerformanceScore: number;
    gradeDistribution: Record<string, number>;
    performanceLeader: string; // Domain with best overall performance
  };
  rankings: Array<{
    domain: string;
    rank: number;
    score: number;
  }>;
}

/**
 * Overall similarity between two domains
 */
export interface DomainSimilarity {
  domain1: string;
  domain2: string;
  overallScore: number; // 0-100
  categoryScores: {
    dns?: number;
    hosting?: number;
    technology?: number;
    security?: number;
    performance?: number;
  };
  relationship: 'identical' | 'very_similar' | 'similar' | 'somewhat_similar' | 'different';
  sharedCharacteristics: string[];
  keyDifferences: string[];
}

/**
 * Complete comparison result
 */
export interface ComparisonResult {
  domains: string[];
  comparedAt: string;
  categories: ComparisonCategory[];
  dnsComparison?: DnsComparison;
  hostingComparison?: HostingComparison;
  technologyComparison?: TechnologyComparison;
  securityComparison?: SecurityComparison;
  performanceComparison?: PerformanceComparison;
  similarities: DomainSimilarity[];
  summary: ComparisonSummary;
}

/**
 * Comparison summary
 */
export interface ComparisonSummary {
  totalDomains: number;
  categoriesCompared: number;
  mostSimilarPair: {
    domain1: string;
    domain2: string;
    score: number;
  };
  leastSimilarPair: {
    domain1: string;
    domain2: string;
    score: number;
  };
  keyFindings: string[];
  competitiveInsights: string[];
  recommendations: Array<{
    domain: string;
    recommendation: string;
    reason: string;
  }>;
}
