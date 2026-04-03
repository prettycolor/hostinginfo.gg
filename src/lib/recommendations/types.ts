/**
 * Dynamic Recommendations System - Type Definitions
 *
 * Design Principles:
 * - Concise, scannable recommendations
 * - Clear priority levels
 * - Actionable steps
 * - Context-aware (website builder filtering)
 */

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type RecommendationCategory =
  | "Security"
  | "Performance"
  | "Email"
  | "SEO"
  | "Infrastructure"
  | "Technology";

export type RecommendationDifficulty = "easy" | "medium" | "hard";

export type ResourceType = "documentation" | "tutorial" | "tool" | "article";

/**
 * Main Recommendation Interface
 *
 * Keep recommendations concise:
 * - Title: 5-8 words max
 * - Issue: 1-2 sentences
 * - Impact: 1 sentence
 * - Recommendation: 1 sentence
 * - Action steps: 3-5 steps max
 */
export interface Recommendation {
  id: string; // Unique identifier (e.g., 'ssl-expiring-001')
  priority: RecommendationPriority; // Critical, High, Medium, Low
  category: RecommendationCategory; // Security, Performance, etc.

  // Core content (keep concise!)
  title: string; // Short title (e.g., "SSL Certificate Expiring Soon")
  issue: string; // What's wrong (1-2 sentences)
  impact: string; // Why it matters (1 sentence)
  recommendation: string; // What to do (1 sentence)

  // Detailed guidance
  actionSteps: ActionStep[]; // 3-5 steps max

  // Metadata
  estimatedTime?: string; // e.g., "15 minutes", "1 hour"
  difficulty?: RecommendationDifficulty;
  resources?: Resource[]; // Links to guides, docs

  // Context
  affectedArea?: string; // e.g., "Homepage", "All pages", "Email system"
  detectedValue?: string | number; // Current value (e.g., "LCP: 4.2s", "10 days")
  targetValue?: string | number; // Target value (e.g., "< 2.5s", "90+ days")

  // Filtering
  tags?: string[]; // For search/filter (e.g., ['ssl', 'urgent'])
  skipForWebsiteBuilders?: boolean; // Hide for managed platforms
}

/**
 * Action Step - Individual step in recommendation
 */
export interface ActionStep {
  step: number; // Step number (1, 2, 3...)
  description: string; // What to do (1 sentence)
  code?: string; // Optional code snippet
  link?: string; // Optional documentation link
  linkText?: string; // Link display text
}

/**
 * Resource - External documentation/tools
 */
export interface Resource {
  title: string; // Resource title
  url: string; // Resource URL
  type: ResourceType; // documentation, tutorial, tool, article
}

/**
 * Comprehensive Scan Data - Input to recommendation engine
 */
export interface ComprehensiveScanData {
  technology?: TechnologyResult;
  security?: SecurityResult;
  ssl?: SSLResult;
  email?: EmailResult;
  performance?: PerformanceResult;
  dns?: DNSResult;
  hosting?: HostingResult;
}

/**
 * Technology Detection Result
 */
export interface TechnologyResult {
  isWebsiteBuilder?: boolean; // Is this a managed platform?
  builderType?: string; // Wix, Shopify, Squarespace, etc.
  platform?: string; // WordPress, Drupal, Joomla, etc.
  cms?: string;
  version?: string;
  phpVersion?: string;
  frameworks?: string[];
  libraries?: string[];

  // WordPress-specific detection
  wordpress?: {
    detected: boolean;
    version?: string;
  };
  isWordPress?: boolean; // Is this WordPress?
  wordPressType?: "managed" | "self-hosted" | "unknown"; // Hosting type
  wordPressHost?: string; // WordPress.com, WP Engine, Kinsta, etc.

  // PHP detection
  php?: {
    detected: boolean;
    version?: string;
  };

  // Server environment
  server?: {
    type?: "apache" | "nginx" | "iis" | "litespeed" | "unknown";
    isWebsiteBuilder?: boolean;
    builderType?: string | null;
  };
  serverType?: "apache" | "nginx" | "iis" | "litespeed" | "unknown";
  controlPanel?: {
    recommendation?:
      | "cpanel"
      | "managed-upgrade"
      | "needs-updates"
      | "paid-support"
      | "unknown";
    reason?: string;
    confidence?: number;
    migrationBenefits?: string[];
    needsPaidSupport?: boolean;
  };

  // Hosting detection
  hosting?: {
    provider?: string;
    isManagedWordPress?: boolean;
    type?: string;
  };

  // Language detection
  primaryLanguage?:
    | "php"
    | "javascript"
    | "python"
    | "ruby"
    | "asp.net"
    | "unknown";
  isStaticSite?: boolean; // Static HTML/CSS/JS only
}

/**
 * Security Scan Result
 */
export interface SecurityResult {
  securityScore?: number; // 0-100
  score?: number; // Alias for securityScore
  grade?: string; // A+, A, B, C, D, F
  hasWAF?: boolean; // Legacy field
  wafProvider?: string; // Legacy field
  waf?: {
    // New WAF detection structure
    detected: boolean;
    provider: string | null;
    confidence: number;
    evidence: string[];
  };
  ddos?: {
    // DDoS protection detection
    protected: boolean;
    provider: string | null;
    method: "waf" | "dedicated" | "none";
  };
  headers?: Record<string, string>; // Security headers
  missingHeaders?: string[]; // Missing security headers
  vulnerabilities?: string[];
}

/**
 * SSL Certificate Result
 */
export interface SSLResult {
  hasSSL?: boolean;
  valid?: boolean;
  expired?: boolean;
  expiringSoon?: boolean;
  daysRemaining?: number; // Days until expiration
  daysUntilExpiry?: number; // Alias for daysRemaining
  validFrom?: string;
  validTo?: string;
  issuer?: string;
  grade?: string;
}

/**
 * Email Security Result
 */
export interface EmailResult {
  spf?: {
    configured: boolean;
    record?: string;
  };
  dmarc?: {
    configured: boolean;
    record?: string;
    policy?: string;
  };
  dkim?: {
    configured: boolean;
    selectors?: string[];
  };
  mx?: Array<{
    host: string;
    priority: number;
  }>;
  providers?: string[];
}

/**
 * Performance Result
 */
export interface PerformanceResult {
  score?: number; // PageSpeed score (0-100)
  metrics?: {
    lcp?: number; // Largest Contentful Paint (seconds)
    fid?: number; // First Input Delay (milliseconds)
    cls?: number; // Cumulative Layout Shift
    fcp?: number; // First Contentful Paint (seconds)
    ttfb?: number; // Time to First Byte (milliseconds)
  };
  opportunities?: Array<{
    title: string;
    description: string;
    savings?: number;
  }>;
}

/**
 * DNS Result
 */
export interface DNSResult {
  nameservers?: string[];
  records?: Record<string, unknown>;
}

/**
 * Hosting Result
 */
export interface HostingResult {
  provider?: string;
  serverLocation?: string;
  ipAddress?: string;
}

/**
 * Recommendation Generation Options
 */
export interface RecommendationOptions {
  includeCategories?: RecommendationCategory[]; // Only generate these categories
  excludeCategories?: RecommendationCategory[]; // Skip these categories
  minPriority?: RecommendationPriority; // Only show this priority and above
  maxRecommendations?: number; // Limit total recommendations
  groupSecurityHeaders?: boolean; // Group security headers into 1 recommendation
}

/**
 * Recommendation Summary Stats
 */
export interface RecommendationSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<RecommendationCategory, number>;
}
