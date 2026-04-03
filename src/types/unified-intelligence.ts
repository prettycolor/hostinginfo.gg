/**
 * Unified Intelligence Report Type Definitions
 * 
 * Aggregates correlations, anomalies, predictions, and comparisons into
 * comprehensive intelligence reports with executive summaries.
 */

import type { CorrelationAnalysis } from './correlation.js';
import type { AnomalyAnalysis } from './anomaly.js';
import type { PredictiveAnalysis } from './prediction.js';

/**
 * Intelligence report sections
 */
export type ReportSection = 'correlations' | 'anomalies' | 'predictions' | 'summary';

/**
 * Overall risk assessment
 */
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
  }>;
  mitigationPriority: 'immediate' | 'soon' | 'planned' | 'monitor';
}

/**
 * Actionable insight
 */
export interface ActionableInsight {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'infrastructure' | 'compliance' | 'optimization';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  actionSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  dueDate?: string; // For time-sensitive issues
}

/**
 * Executive summary
 */
export interface ExecutiveSummary {
  domain: string;
  analyzedAt: string;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  riskAssessment: RiskAssessment;
  keyFindings: string[];
  criticalIssues: number;
  highPriorityIssues: number;
  totalIssues: number;
  topRecommendations: string[];
  nextReviewDate: string;
}

/**
 * Intelligence trends
 */
export interface IntelligenceTrends {
  securityTrend: 'improving' | 'stable' | 'degrading';
  performanceTrend: 'improving' | 'stable' | 'degrading';
  reliabilityTrend: 'improving' | 'stable' | 'degrading';
  technologyTrend: 'modern' | 'current' | 'aging' | 'outdated';
  changeFrequency: 'high' | 'medium' | 'low';
  stabilityScore: number; // 0-100
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  dnssecEnabled: boolean;
  httpsEnabled: boolean;
  securityHeadersPresent: boolean;
  privacyPolicyDetected: boolean;
  cookieConsentDetected: boolean;
  gdprCompliant: boolean | null;
  hipaaCompliant: boolean | null;
  pciCompliant: boolean | null;
  complianceScore: number; // 0-100
  gaps: string[];
}

/**
 * Technology health
 */
export interface TechnologyHealth {
  modernFrameworks: boolean;
  outdatedSoftware: number;
  knownVulnerabilities: number;
  securityPatchesAvailable: number;
  eolSoftware: number;
  technologyScore: number; // 0-100
  upgradeRecommendations: Array<{
    software: string;
    currentVersion?: string;
    recommendedVersion: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

/**
 * Infrastructure health
 */
export interface InfrastructureHealth {
  hostingProvider: string;
  hostingType: 'shared' | 'vps' | 'dedicated' | 'cloud' | 'unknown';
  cdnEnabled: boolean;
  loadBalancingDetected: boolean;
  redundancyLevel: 'none' | 'basic' | 'moderate' | 'high';
  geographicDistribution: string[];
  infrastructureScore: number; // 0-100
  scalabilityAssessment: 'poor' | 'fair' | 'good' | 'excellent';
}

/**
 * Security posture
 */
export interface SecurityPosture {
  sslGrade?: string;
  tlsVersion: string;
  certificateExpiry?: string;
  securityHeaders: number; // Count of implemented headers
  vulnerabilities: number;
  exposedServices: number;
  securityScore: number; // 0-100
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  lastSecurityIncident?: string;
}

/**
 * Complete unified intelligence report
 */
export interface UnifiedIntelligenceReport {
  domain: string;
  generatedAt: string;
  reportVersion: string;
  
  // Executive summary
  executiveSummary: ExecutiveSummary;
  
  // Core analysis modules
  correlations: CorrelationAnalysis;
  anomalies: AnomalyAnalysis;
  predictions: PredictiveAnalysis;
  
  // Health assessments
  technologyHealth: TechnologyHealth;
  infrastructureHealth: InfrastructureHealth;
  securityPosture: SecurityPosture;
  complianceStatus: ComplianceStatus;
  
  // Trends and insights
  trends: IntelligenceTrends;
  actionableInsights: ActionableInsight[];
  
  // Metadata
  dataFreshness: {
    dnsData?: string; // Last updated timestamp
    ipData?: string;
    whoisData?: string;
    technologyData?: string;
    securityData?: string;
  };
  
  reportMetadata: {
    generationTime: number; // milliseconds
    dataSourcesUsed: string[];
    confidenceLevel: 'low' | 'medium' | 'high';
    cacheHit: boolean;
  };
}

/**
 * Report cache entry
 */
export interface ReportCacheEntry {
  domain: string;
  report: UnifiedIntelligenceReport;
  cachedAt: string;
  expiresAt: string;
  hitCount: number;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  sections?: ReportSection[]; // Optional: specific sections to include
  includeRawData?: boolean; // Include raw correlation/anomaly/prediction data
  format?: 'json' | 'summary'; // Response format
  useCache?: boolean; // Use cached report if available (default: true)
}
