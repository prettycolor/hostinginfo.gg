/**
 * SEO Checklist Type Definitions
 */

export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type Decision = "ready" | "fix_first" | "not_ready";
export type ChecklistItemStatus =
  | "good"
  | "needs_work"
  | "critical"
  | "unknown";

export interface NormalizedTarget {
  host: string;
  inputUrl: string;
  finalUrl: string;
  redirectChain: string[];
}

export interface TechnologyInfo {
  isWebsiteBuilder: boolean;
  platform: string | null;
  serverType: string | null;
  hasWordPress: boolean;
  wordPressVersion: string | null;
  phpVersion: string | null;
}

export interface AccessCheckResult {
  accessible: boolean;
  homepageStatusCode: number | null;
  hasNoindex: boolean;
  noindexSources?: string[];
  robotsTxtBlocked: boolean;
  redirectLoop: boolean;
  contentEmpty: boolean;
  issues: string[];
  technology: TechnologyInfo;
}

export interface HeadingCounts {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
}

export interface ImageAltStats {
  totalImages: number;
  imagesWithAlt: number;
  imagesMissingAlt: number;
  coveragePercent: number;
}

export interface AnalyticsSignals {
  gtagDetected: boolean;
  gtmDetected: boolean;
}

export interface SampledPage {
  url: string;
  statusCode: number;
  fetchTimeMs: number;
  pageTitle: string | null;
  metaDescription: string | null;
  h1Present: boolean;
  h1Text: string | null;
  structuredData: unknown[];
  socialTags: Record<string, string>;
  canonicalUrl?: string | null;
  htmlLang?: string | null;
  headingCounts?: HeadingCounts;
  imageAlt?: ImageAltStats;
  analyticsSignals?: AnalyticsSignals;
  metaRobotsTagDirectives?: string[];
  xRobotsTagDirectives?: string[];
}

export interface MiniCrawlResult {
  pages: SampledPage[];
  sitemapFound: boolean;
  sitemapUrls: string[];
  totalLinksFound: number;
}

export interface LighthouseData {
  mobileScore: number | null;
  desktopScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  failingAudits: string[];
}

export interface SslSignal {
  certificatePresent: boolean;
  validNow: boolean | null;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiry: number | null;
  error: string | null;
}

export interface CategoryScores {
  access: number;
  mobile_speed: number;
  page_basics: number;
  site_health: number;
  tracking: number;
}

export interface ChecklistItemEvidence {
  url: string;
  foundValue: unknown;
  whatThisMeans: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  why: string;
  fix: string | null;
  evidence: ChecklistItemEvidence | null;
}

export interface ChecklistCategories {
  access: ChecklistItem[];
  mobile_speed: ChecklistItem[];
  page_basics: ChecklistItem[];
  site_health: ChecklistItem[];
  tracking: ChecklistItem[];
}

export interface ScanSummary {
  headline: string;
  topReasons: string[];
  topFixes: string[];
}

export interface ScanData {
  normalized: NormalizedTarget;
  access: AccessCheckResult;
  crawl: MiniCrawlResult;
  lighthouse: LighthouseData;
  ssl?: SslSignal;
}

export interface ScanResult {
  scanId: string;
  status: ScanStatus;
  createdAt: Date;
  completedAt: Date | null;
  target: NormalizedTarget;
  decision: Decision | null;
  summary: ScanSummary | null;
  score: {
    total: number;
    categories: CategoryScores;
  } | null;
  checklist: ChecklistCategories | null;
  evidence: {
    sampledPages: SampledPage[];
    lighthouse: LighthouseData;
    ssl?: SslSignal;
    unsupportedSignals?: string[];
  } | null;
  errors: string[];
}
