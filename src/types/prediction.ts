/**
 * Predictive Analytics Type Definitions
 *
 * Defines interfaces for predicting future issues and risks based on
 * historical intelligence data.
 */

/**
 * Prediction confidence levels
 */
export type PredictionConfidence = "low" | "medium" | "high" | "very_high";

/**
 * Prediction categories
 */
export type PredictionCategory =
  | "expiry"
  | "dns"
  | "technology"
  | "security"
  | "performance";

/**
 * Prediction severity/priority
 */
export type PredictionSeverity = "low" | "medium" | "high" | "critical";

/**
 * Base prediction interface
 */
export interface Prediction {
  id: string;
  category: PredictionCategory;
  severity: PredictionSeverity;
  confidence: PredictionConfidence;
  title: string;
  description: string;
  predictedDate?: string; // When the issue is expected to occur
  daysUntil?: number; // Days until predicted event
  probability: number; // 0-100
  impact: string;
  recommendation: string;
  preventionSteps: string[];
  createdAt: string;
}

/**
 * Domain/SSL expiry predictions
 */
export interface ExpiryPrediction extends Prediction {
  category: "expiry";
  details: {
    expiryType: "domain" | "ssl" | "both";
    currentExpiryDate?: string;
    daysRemaining?: number;
    autoRenewEnabled?: boolean;
    registrar?: string;
    lastRenewalDate?: string;
    renewalHistory?: Array<{
      date: string;
      daysBeforeExpiry: number;
    }>;
  };
}

/**
 * DNS issue predictions
 */
export interface DnsPrediction extends Prediction {
  category: "dns";
  details: {
    issueType: "propagation" | "configuration" | "nameserver" | "record_change";
    affectedRecords?: string[];
    currentConfiguration?: unknown;
    recommendedConfiguration?: unknown;
    changeHistory?: Array<{
      date: string;
      changeType: string;
      records: string[];
    }>;
  };
}

/**
 * Technology obsolescence predictions
 */
export interface TechnologyPrediction extends Prediction {
  category: "technology";
  details: {
    obsoleteItems: Array<{
      name: string;
      version?: string;
      eolDate?: string; // End-of-life date
      daysUntilEol?: number;
      replacementOptions?: string[];
    }>;
    securityRisks?: string[];
    performanceImpact?: string;
    migrationComplexity?: "low" | "medium" | "high";
  };
}

/**
 * Security vulnerability predictions
 */
export interface SecurityPrediction extends Prediction {
  category: "security";
  details: {
    vulnerabilityType: "ssl" | "software" | "configuration" | "exposure";
    cveIds?: string[]; // Common Vulnerabilities and Exposures
    affectedComponents?: string[];
    exploitProbability?: number; // 0-100
    patchAvailable?: boolean;
    patchUrl?: string;
    workarounds?: string[];
  };
}

/**
 * Performance degradation predictions
 */
export interface PerformancePrediction extends Prediction {
  category: "performance";
  details: {
    metric: "speed" | "uptime" | "response_time" | "availability";
    currentValue?: number;
    predictedValue?: number;
    trend: "improving" | "stable" | "degrading";
    trendData?: Array<{
      date: string;
      value: number;
    }>;
    causes?: string[];
  };
}

/**
 * Complete predictive analysis result
 */
export interface PredictiveAnalysis {
  domain: string;
  analyzedAt: string;
  predictions: Prediction[];
  summary: PredictionSummary;
  expiryPredictions: ExpiryPrediction[];
  dnsPredictions: DnsPrediction[];
  technologyPredictions: TechnologyPrediction[];
  securityPredictions: SecurityPrediction[];
  performancePredictions: PerformancePrediction[];
}

/**
 * Summary of predictive analysis
 */
export interface PredictionSummary {
  totalPredictions: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  predictionsByCategory: {
    expiry: number;
    dns: number;
    technology: number;
    security: number;
    performance: number;
  };
  nearTermPredictions: Prediction[]; // Within 30 days
  highConfidencePredictions: Prediction[];
  overallRisk: "low" | "medium" | "high" | "critical";
  recommendedActions: Array<{
    priority: "immediate" | "soon" | "planned";
    action: string;
    reason: string;
  }>;
}
