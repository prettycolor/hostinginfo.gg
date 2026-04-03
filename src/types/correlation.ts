/**
 * Correlation Types for Intelligence Analysis
 * 
 * Defines data structures for cross-referencing multiple intelligence sources
 * to identify relationships, patterns, and connections between domains.
 */

/**
 * Type of correlation relationship
 */
export type CorrelationType = 
  | 'hosting'        // Same hosting provider/IP
  | 'ownership'      // Same registrar/owner
  | 'technology'     // Same tech stack
  | 'infrastructure' // Same DNS/network setup
  | 'security';      // Similar security posture

/**
 * Confidence level for correlation
 */
export type CorrelationConfidence = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Source of intelligence data
 */
export type IntelligenceSource = 'dns' | 'ip' | 'whois' | 'technology' | 'urlscan';

/**
 * Individual correlation finding
 */
export interface Correlation {
  id: string;
  type: CorrelationType;
  sourceA: IntelligenceSource;
  sourceB: IntelligenceSource;
  confidence: number; // 0-100
  confidenceLevel: CorrelationConfidence;
  description: string;
  evidence: CorrelationEvidence[];
  createdAt: Date;
}

/**
 * Evidence supporting a correlation
 */
export interface CorrelationEvidence {
  source: IntelligenceSource;
  field: string;
  value: string | number | boolean;
  matchType: 'exact' | 'partial' | 'pattern';
}

/**
 * Hosting correlation details
 */
export interface HostingCorrelation {
  ipAddress: string;
  hostingProvider: string;
  asn: number;
  asnOrg: string;
  location: {
    country: string;
    city: string;
  };
  sharedWith?: string[]; // Other domains on same IP
}

/**
 * Ownership correlation details
 */
export interface OwnershipCorrelation {
  registrar: string;
  registrant?: string;
  registrantOrg?: string;
  nameservers: string[];
  registrationDate?: Date;
  expiryDate?: Date;
}

/**
 * Technology correlation details
 */
export interface TechnologyCorrelation {
  cms?: string;
  framework?: string;
  server?: string;
  cdn?: string;
  analytics?: string[];
  commonTechnologies: string[];
}

/**
 * Infrastructure correlation details
 */
export interface InfrastructureCorrelation {
  dnsProvider?: string;
  nameservers: string[];
  mailProvider?: string;
  mxRecords: string[];
  dnssecEnabled: boolean;
  ipv6Enabled: boolean;
}

/**
 * Security correlation details
 */
export interface SecurityCorrelation {
  sslProvider?: string;
  sslIssuer?: string;
  securityHeaders: string[];
  wafDetected: boolean;
  securityScore?: number;
  threats: string[];
}

/**
 * Complete correlation analysis result
 */
export interface CorrelationAnalysis {
  domain: string;
  analyzedAt: Date;
  correlations: Correlation[];
  hosting?: HostingCorrelation;
  ownership?: OwnershipCorrelation;
  technology?: TechnologyCorrelation;
  infrastructure?: InfrastructureCorrelation;
  security?: SecurityCorrelation;
  summary: CorrelationSummary;
}

/**
 * Summary of correlation findings
 */
export interface CorrelationSummary {
  totalCorrelations: number;
  highConfidenceCount: number;
  correlationsByType: Record<CorrelationType, number>;
  keyFindings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Correlation pattern (for detecting common configurations)
 */
export interface CorrelationPattern {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  confidence: number;
  implications: string[];
}
