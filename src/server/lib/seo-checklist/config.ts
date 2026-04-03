/**
 * SEO Checklist Configuration
 * Default thresholds and settings for SEO readiness scans
 */

export const SEO_CHECKLIST_CONFIG = {
  // Mobile speed thresholds
  mobile_speed: {
    ready: 70,
    fix_first: 40,
    not_ready: 0, // Only if access blocked
  },

  // Desktop speed thresholds
  desktop_speed: {
    ready: 80,
    fix_first: 50,
  },

  // Access checks
  access: {
    noindex_forces_not_ready: true,
    robots_block_forces_not_ready: true,
    homepage_error_forces_not_ready: true,
    redirect_loop_forces_not_ready: true,
  },

  // Mini crawl settings
  max_pages_to_sample: 10,
  max_pages_to_sample_adaptive: 25,
  max_redirect_depth: 10,
  sitemap_seed_limit: 40,
  adaptive_crawl: {
    evaluate_after_pages: 10,
    max_avg_fetch_time_ms: 2500,
    max_error_rate: 0.2,
  },

  // Timeouts (milliseconds)
  fetch_timeout_ms: 10000,
  total_scan_timeout_ms: 120000,
  module_timeout_ms: 30000,

  // Caching
  cache_ttl_hours: 24,

  // Rate limiting
  max_scans_per_user_per_hour: 10,

  // Scoring weights (must sum to 100)
  category_weights: {
    access: 30,
    mobile_speed: 25,
    page_basics: 20,
    site_health: 15,
    tracking: 10,
  },

  // Score cap for critical issues
  critical_issue_score_cap: 39,

  // Page basics thresholds
  page_basics: {
    min_title_length: 10,
    max_title_length: 60,
    min_description_length: 50,
    max_description_length: 160,
    require_h1: true,
  },
  page_basics_score_weights: {
    title: 25,
    description: 20,
    h1: 20,
    image_alt: 15,
    canonical: 10,
    language: 10,
  },
  site_health_score_weights: {
    broken_pages: 35,
    slow_pages: 25,
    sitemap: 15,
    redirect_chain: 10,
    ssl: 15,
  },
  tracking_score_weights: {
    structured: 35,
    social: 30,
    homepage_core_social: 20,
    analytics: 15,
  },
  ssl_expiry_warning_days: 30,
  redirect_chain: {
    good_max_hops: 1,
    needs_work_max_hops: 3,
  },

  // Common sitemap URLs to check
  sitemap_urls: [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap1.xml",
    "/wp-sitemap.xml",
    "/sitemap.html",
  ],

  // User agent for crawling
  user_agent:
    "HostingInfo SEO Checker/1.0 (compatible; Googlebot/2.1; +https://hostinginfo.gg)",
};

export type SEOChecklistConfig = typeof SEO_CHECKLIST_CONFIG;
