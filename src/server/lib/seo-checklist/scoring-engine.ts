/**
 * Scoring Engine Module
 * Compute 0-100 score + category scores
 */

import { SEO_CHECKLIST_CONFIG } from "./config.js";
import type { ScanData, CategoryScores, Decision } from "./types.js";

/**
 * Compute scores
 */
export function computeScores(
  data: ScanData,
  decision: Decision,
): { total: number; categories: CategoryScores } {
  // Compute category scores
  const categories: CategoryScores = {
    access: computeAccessScore(data),
    mobile_speed: computeMobileSpeedScore(data),
    page_basics: computePageBasicsScore(data),
    site_health: computeSiteHealthScore(data),
    tracking: computeTrackingScore(data),
  };

  // Compute weighted total
  const weights = SEO_CHECKLIST_CONFIG.category_weights;
  let total =
    (categories.access * weights.access +
      categories.mobile_speed * weights.mobile_speed +
      categories.page_basics * weights.page_basics +
      categories.site_health * weights.site_health +
      categories.tracking * weights.tracking) /
    100;

  // Cap score if critical issues
  if (decision === "not_ready") {
    total = Math.min(total, SEO_CHECKLIST_CONFIG.critical_issue_score_cap);
  }

  return {
    total: Math.round(total),
    categories,
  };
}

/**
 * Compute access score (0-100)
 */
function computeAccessScore(data: ScanData): number {
  let score = 100;

  if (!data.access.accessible) {
    score = 0;
  } else {
    if (data.access.homepageStatusCode !== 200) {
      score -= 20;
    }
    if (data.access.hasNoindex) {
      score -= 50;
    }
    if (data.access.robotsTxtBlocked) {
      score -= 50;
    }
    if (data.access.contentEmpty) {
      score -= 30;
    }
  }

  return Math.max(0, score);
}

/**
 * Compute mobile speed score (0-100)
 */
function computeMobileSpeedScore(data: ScanData): number {
  const mobileScore = data.lighthouse.mobileScore;
  if (mobileScore === null) {
    return 50; // Unknown, give neutral score
  }
  return mobileScore;
}

/**
 * Compute page basics score (0-100)
 */
function computePageBasicsScore(data: ScanData): number {
  if (data.crawl.pages.length === 0) {
    return 0;
  }

  const pages = data.crawl.pages;
  const titleCoverage =
    pages.filter((p) => Boolean(p.pageTitle) && p.pageTitle.trim().length > 0)
      .length / pages.length;
  const descriptionCoverage =
    pages.filter(
      (p) => Boolean(p.metaDescription) && p.metaDescription.trim().length > 0,
    ).length / pages.length;
  const h1Coverage = pages.filter((p) => p.h1Present).length / pages.length;
  const imageAltCoverage =
    pages.filter(
      (p) =>
        !p.imageAlt ||
        p.imageAlt.totalImages === 0 ||
        p.imageAlt.imagesMissingAlt === 0,
    ).length / pages.length;
  const canonicalCoverage =
    pages.filter(
      (p) => typeof p.canonicalUrl === "string" && p.canonicalUrl.length > 0,
    ).length / pages.length;
  const languageCoverage =
    pages.filter(
      (p) =>
        typeof p.htmlLang === "string" &&
        /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(p.htmlLang.trim()),
    ).length / pages.length;

  const weights = SEO_CHECKLIST_CONFIG.page_basics_score_weights;
  const score =
    titleCoverage * weights.title +
    descriptionCoverage * weights.description +
    h1Coverage * weights.h1 +
    imageAltCoverage * weights.image_alt +
    canonicalCoverage * weights.canonical +
    languageCoverage * weights.language;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute site health score (0-100)
 */
function computeSiteHealthScore(data: ScanData): number {
  if (data.crawl.pages.length === 0) {
    return 0;
  }

  const pages = data.crawl.pages;
  const weights = SEO_CHECKLIST_CONFIG.site_health_score_weights;

  const brokenPagesRatio =
    pages.filter((p) => p.statusCode >= 400).length / pages.length;
  const brokenPagesScore = 100 - brokenPagesRatio * 100;

  const slowPagesRatio =
    pages.filter((p) => p.fetchTimeMs > 3000).length / pages.length;
  const slowPagesScore = 100 - slowPagesRatio * 100;

  const sitemapScore = data.crawl.sitemapFound ? 100 : 0;

  const redirectHops = Math.max(0, data.normalized.redirectChain.length - 1);
  const redirectScore =
    redirectHops <= SEO_CHECKLIST_CONFIG.redirect_chain.good_max_hops
      ? 100
      : redirectHops <= SEO_CHECKLIST_CONFIG.redirect_chain.needs_work_max_hops
        ? 60
        : 20;

  const ssl = data.ssl;
  let sslScore = 50;
  if (ssl) {
    if (ssl.validNow === true) {
      const daysUntilExpiry = ssl.daysUntilExpiry ?? 0;
      if (daysUntilExpiry > SEO_CHECKLIST_CONFIG.ssl_expiry_warning_days) {
        sslScore = 100;
      } else if (daysUntilExpiry > 14) {
        sslScore = 75;
      } else {
        sslScore = 60;
      }
    } else if (ssl.validNow === false) {
      sslScore = 0;
    }
  }

  const score =
    (brokenPagesScore * weights.broken_pages +
      slowPagesScore * weights.slow_pages +
      sitemapScore * weights.sitemap +
      redirectScore * weights.redirect_chain +
      sslScore * weights.ssl) /
    100;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute tracking score (0-100)
 */
function computeTrackingScore(_data: ScanData): number {
  const pages = _data.crawl.pages;
  if (pages.length === 0) {
    return 50;
  }

  const structuredCoverage =
    pages.filter((page) => page.structuredData.length > 0).length /
    pages.length;

  const socialCoverage =
    pages.filter((page) =>
      Object.keys(page.socialTags).some(
        (key) => key.startsWith("og:") || key.startsWith("twitter:"),
      ),
    ).length / pages.length;

  const analyticsCoverage =
    pages.filter(
      (page) =>
        page.analyticsSignals?.gtagDetected === true ||
        page.analyticsSignals?.gtmDetected === true,
    ).length / pages.length;

  const homepage = pages[0];
  const homepageTags = homepage?.socialTags ?? {};
  const hasHomepageCoreSocial =
    typeof homepageTags["og:title"] === "string" &&
    homepageTags["og:title"].trim().length > 0 &&
    typeof homepageTags["og:description"] === "string" &&
    homepageTags["og:description"].trim().length > 0 &&
    typeof homepageTags["twitter:card"] === "string" &&
    homepageTags["twitter:card"].trim().length > 0;
  const homepageCoreSocial = hasHomepageCoreSocial ? 1 : 0;
  const weights = SEO_CHECKLIST_CONFIG.tracking_score_weights;

  return Math.round(
    structuredCoverage * weights.structured +
      socialCoverage * weights.social +
      homepageCoreSocial * weights.homepage_core_social +
      analyticsCoverage * weights.analytics,
  );
}
