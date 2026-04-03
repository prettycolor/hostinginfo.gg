/**
 * Anomaly Detection Type Definitions
 * 
 * Defines interfaces for detecting unusual patterns in domain intelligence data.
 * Supports DNS, IP, WHOIS, technology, and security anomaly detection.
 */

/**
 * Anomaly severity levels
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly categories
 */
export type AnomalyCategory = 'dns' | 'ip' | 'whois' | 'technology' | 'security';

/**
 * Base anomaly interface
 */
export interface Anomaly {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  title: string;
  description: string;
  detectedAt: string;
  confidence: number; // 0-100
  evidence: AnomalyEvidence[];
  recommendation?: string;
  impact?: string;
}

/**
 * Evidence supporting an anomaly detection
 */
export interface AnomalyEvidence {
  type: string;
  value: string | number | boolean;
  expected?: string | number | boolean;
  source: string;
  timestamp?: string;
}

/**
 * DNS anomalies
 */
export interface DnsAnomaly extends Anomaly {
  category: 'dns';
  details: {
    recordType?: string;
    recordValue?: string;
    expectedValue?: string;
    changeDetected?: boolean;
    missingRecords?: string[];
    suspiciousRecords?: string[];
    ttlAnomaly?: boolean;
    propagationIssue?: boolean;
  };
}

/**
 * IP/Hosting anomalies
 */
export interface IpAnomaly extends Anomaly {
  category: 'ip';
  details: {
    ipAddress?: string;
    previousIp?: string;
    locationChange?: boolean;
    providerChange?: boolean;
    suspiciousLocation?: boolean;
    blacklisted?: boolean;
    sharedHosting?: boolean;
    unusualPorts?: number[];
  };
}

/**
 * WHOIS/Ownership anomalies
 */
export interface WhoisAnomaly extends Anomaly {
  category: 'whois';
  details: {
    registrarChange?: boolean;
    contactChange?: boolean;
    expiryWarning?: boolean;
    daysUntilExpiry?: number;
    privacyEnabled?: boolean;
    recentTransfer?: boolean;
    suspiciousRegistrar?: boolean;
    nameserverChange?: boolean;
  };
}

/**
 * Technology stack anomalies
 */
export interface TechnologyAnomaly extends Anomaly {
  category: 'technology';
  details: {
    outdatedTechnology?: string[];
    vulnerableSoftware?: string[];
    missingSecurityHeaders?: string[];
    suspiciousScripts?: string[];
    unusualFrameworks?: string[];
    versionMismatch?: boolean;
    eolSoftware?: string[]; // End-of-life software
  };
}

/**
 * Security anomalies
 */
export interface SecurityAnomaly extends Anomaly {
  category: 'security';
  details: {
    sslIssues?: string[];
    certificateExpiry?: boolean;
    daysUntilCertExpiry?: number;
    weakCiphers?: string[];
    missingSecurityFeatures?: string[];
    suspiciousRedirects?: string[];
    malwareDetected?: boolean;
    phishingIndicators?: string[];
    unusualTraffic?: boolean;
  };
}

/**
 * Complete anomaly analysis result
 */
export interface AnomalyAnalysis {
  domain: string;
  analyzedAt: string;
  anomalies: Anomaly[];
  summary: AnomalySummary;
  dnsAnomalies: DnsAnomaly[];
  ipAnomalies: IpAnomaly[];
  whoisAnomalies: WhoisAnomaly[];
  technologyAnomalies: TechnologyAnomaly[];
  securityAnomalies: SecurityAnomaly[];
}

/**
 * Summary of anomaly analysis
 */
export interface AnomalySummary {
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  anomaliesByCategory: {
    dns: number;
    ip: number;
    whois: number;
    technology: number;
    security: number;
  };
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  topAnomalies: Anomaly[];
  requiresImmediateAction: boolean;
  actionItems: string[];
}
