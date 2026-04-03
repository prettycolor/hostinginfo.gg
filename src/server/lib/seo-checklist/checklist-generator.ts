/**
 * Checklist Generator Module
 * Generate checklist items with plain-English phrasing
 */

import type {
  ScanData,
  ChecklistCategories,
  ChecklistItem,
  ChecklistItemStatus,
} from "./types.js";
import { SEO_CHECKLIST_CONFIG } from "./config.js";
import { validateTitle, validateDescription } from "./page-basics.js";

/**
 * Generate checklist
 */
export function generateChecklist(data: ScanData): ChecklistCategories {
  return {
    access: generateAccessChecklist(data),
    mobile_speed: generateMobileSpeedChecklist(data),
    page_basics: generatePageBasicsChecklist(data),
    site_health: generateSiteHealthChecklist(data),
    tracking: generateTrackingChecklist(data),
  };
}

/**
 * Generate access checklist items
 */
function generateAccessChecklist(data: ScanData): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Homepage accessible
  items.push({
    id: "homepage_accessible",
    label:
      data.access.homepageStatusCode === 200
        ? "Your homepage loads correctly"
        : "Your homepage is broken",
    status: data.access.homepageStatusCode === 200 ? "good" : "critical",
    why: "Google needs to be able to reach your site to index it",
    fix:
      data.access.homepageStatusCode === 200
        ? null
        : "Fix your homepage to return a successful response (200 OK)",
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: data.access.homepageStatusCode,
      whatThisMeans:
        data.access.homepageStatusCode === 200
          ? "Your homepage returns a successful response"
          : `Your homepage returns error status ${data.access.homepageStatusCode}`,
    },
  });

  // Noindex check
  items.push({
    id: "noindex_check",
    label: data.access.hasNoindex
      ? "Google is told not to index this page"
      : "Your site allows search engine indexing",
    status: data.access.hasNoindex ? "critical" : "good",
    why: "If noindex is present, Google will not show this page in search results",
    fix: data.access.hasNoindex
      ? "Remove the noindex meta tag from your homepage"
      : null,
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: data.access.hasNoindex
        ? {
            detected: true,
            sources: data.access.noindexSources ?? ["unknown"],
          }
        : {
            detected: false,
            sources: [],
          },
      whatThisMeans: data.access.hasNoindex
        ? "This tells search engines not to show this page in results"
        : "Search engines can index this page",
    },
  });

  // Robots.txt check
  items.push({
    id: "robots_txt_check",
    label: data.access.robotsTxtBlocked
      ? "Your robots.txt blocks search engines"
      : "Your robots.txt allows search engines",
    status: data.access.robotsTxtBlocked ? "critical" : "good",
    why: "robots.txt tells search engines which pages they can access",
    fix: data.access.robotsTxtBlocked
      ? "Update your robots.txt to allow Googlebot access"
      : null,
    evidence: {
      url: new URL("/robots.txt", data.normalized.finalUrl).href,
      foundValue: data.access.robotsTxtBlocked ? "Disallow: /" : "Allowed",
      whatThisMeans: data.access.robotsTxtBlocked
        ? "Your robots.txt blocks all search engines from your site"
        : "Search engines can access your site",
    },
  });

  // Content check
  items.push({
    id: "content_check",
    label: data.access.contentEmpty
      ? "Your homepage content appears empty"
      : "Your homepage has readable content",
    status: data.access.contentEmpty ? "critical" : "good",
    why: "Search engines need to see actual content to understand what your page is about",
    fix: data.access.contentEmpty
      ? "Ensure your homepage has readable content for search engines (not just JavaScript)"
      : null,
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: data.access.contentEmpty
        ? "Empty or JS-only"
        : "Content present",
      whatThisMeans: data.access.contentEmpty
        ? "Your page may only show content with JavaScript, which search engines may not see"
        : "Your page has content that search engines can read",
    },
  });

  return items;
}

/**
 * Generate mobile speed checklist items
 */
function generateMobileSpeedChecklist(data: ScanData): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const mobileScore = data.lighthouse.mobileScore;
  const desktopScore = data.lighthouse.desktopScore;

  items.push(
    createSpeedChecklistItem({
      id: "mobile_speed",
      speedType: "mobile",
      score: mobileScore,
      readyThreshold: SEO_CHECKLIST_CONFIG.mobile_speed.ready,
      fixFirstThreshold: SEO_CHECKLIST_CONFIG.mobile_speed.fix_first,
      targetUrl: data.normalized.finalUrl,
    }),
  );

  items.push(
    createSpeedChecklistItem({
      id: "desktop_speed",
      speedType: "desktop",
      score: desktopScore,
      readyThreshold: SEO_CHECKLIST_CONFIG.desktop_speed.ready,
      fixFirstThreshold: SEO_CHECKLIST_CONFIG.desktop_speed.fix_first,
      targetUrl: data.normalized.finalUrl,
    }),
  );

  return items;
}

/**
 * Generate page basics checklist items
 */
function generatePageBasicsChecklist(data: ScanData): ChecklistItem[] {
  const pages = data.crawl.pages;

  const titlePassPages = pages.filter(
    (page) => validateTitle(page.pageTitle).valid,
  );
  const titleFailUrls = pages
    .filter((page) => !validateTitle(page.pageTitle).valid)
    .map((page) => page.url);

  const descriptionPassPages = pages.filter(
    (page) => validateDescription(page.metaDescription).valid,
  );
  const descriptionFailUrls = pages
    .filter((page) => !validateDescription(page.metaDescription).valid)
    .map((page) => page.url);

  const h1PassPages = pages.filter((page) => page.h1Present);
  const h1FailUrls = pages
    .filter((page) => !page.h1Present)
    .map((page) => page.url);

  const imageAltPassPages = pages.filter(
    (page) =>
      !page.imageAlt ||
      page.imageAlt.totalImages === 0 ||
      page.imageAlt.imagesMissingAlt === 0,
  );
  const imageAltFailUrls = pages
    .filter(
      (page) =>
        page.imageAlt !== undefined &&
        page.imageAlt.totalImages > 0 &&
        page.imageAlt.imagesMissingAlt > 0,
    )
    .map((page) => page.url);

  const canonicalPassPages = pages.filter(
    (page) =>
      typeof page.canonicalUrl === "string" && page.canonicalUrl.length > 0,
  );
  const canonicalFailUrls = pages
    .filter(
      (page) =>
        typeof page.canonicalUrl !== "string" || page.canonicalUrl.length === 0,
    )
    .map((page) => page.url);

  const languagePassPages = pages.filter((page) =>
    isValidLanguageTag(page.htmlLang),
  );
  const languageFailUrls = pages
    .filter((page) => !isValidLanguageTag(page.htmlLang))
    .map((page) => page.url);

  return [
    createCoverageChecklistItem({
      id: "page_title_coverage",
      labelPrefix: "Page title coverage",
      why: "Page titles help search engines understand and rank each page",
      fix: "Ensure every page has a unique, descriptive title that meets SEO length guidance",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: titlePassPages.length,
      failingUrls: titleFailUrls,
    }),
    createCoverageChecklistItem({
      id: "meta_description_coverage",
      labelPrefix: "Meta description coverage",
      why: "Meta descriptions improve search snippet quality and click-through rate",
      fix: "Add clear, unique meta descriptions to pages that are missing or poorly formed",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: descriptionPassPages.length,
      failingUrls: descriptionFailUrls,
    }),
    createCoverageChecklistItem({
      id: "h1_coverage",
      labelPrefix: "H1 heading coverage",
      why: "H1 headings communicate page topic and structure to search engines",
      fix: "Add one clear H1 heading to pages missing a main heading",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: h1PassPages.length,
      failingUrls: h1FailUrls,
    }),
    createCoverageChecklistItem({
      id: "image_alt_coverage",
      labelPrefix: "Image alt-text coverage",
      why: "Image alt text helps search engines understand image content and accessibility context",
      fix: "Add descriptive alt text to images missing alt attributes",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: imageAltPassPages.length,
      failingUrls: imageAltFailUrls,
    }),
    createCoverageChecklistItem({
      id: "canonical_coverage",
      labelPrefix: "Canonical tag coverage",
      why: "Canonical tags help search engines understand preferred URLs for indexing",
      fix: "Add rel=canonical tags to pages missing canonical URL declarations",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: canonicalPassPages.length,
      failingUrls: canonicalFailUrls,
    }),
    createCoverageChecklistItem({
      id: "language_tag_coverage",
      labelPrefix: "Language tag coverage",
      why: "A valid html lang attribute helps search engines and assistive technologies interpret page language",
      fix: "Add a valid lang attribute to the html element on pages missing language metadata",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: languagePassPages.length,
      failingUrls: languageFailUrls,
    }),
  ];
}

/**
 * Generate site health checklist items
 */
function generateSiteHealthChecklist(data: ScanData): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (data.crawl.pages.length === 0) {
    return items;
  }

  // Broken pages
  const brokenPages = data.crawl.pages.filter((p) => p.statusCode >= 400);
  items.push({
    id: "broken_pages",
    label:
      brokenPages.length === 0
        ? "No broken pages found"
        : `${brokenPages.length} broken page(s) found`,
    status: brokenPages.length === 0 ? "good" : "needs_work",
    why: "Broken pages create a poor user experience and waste search engine crawl budget",
    fix: brokenPages.length === 0 ? null : "Fix or redirect broken pages",
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: brokenPages.length,
      whatThisMeans:
        brokenPages.length === 0
          ? "All sampled pages are working"
          : `${brokenPages.length} of ${data.crawl.pages.length} sampled pages return errors`,
    },
  });

  // Sitemap
  items.push({
    id: "sitemap",
    label: data.crawl.sitemapFound ? "Sitemap found" : "No sitemap found",
    status: data.crawl.sitemapFound ? "good" : "needs_work",
    why: "Sitemaps help search engines discover all your pages",
    fix: data.crawl.sitemapFound
      ? null
      : "Create and submit a sitemap to search engines",
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: data.crawl.sitemapUrls,
      whatThisMeans: data.crawl.sitemapFound
        ? `Found sitemap(s): ${data.crawl.sitemapUrls.join(", ")}`
        : "No sitemap found in robots.txt or common locations",
    },
  });

  const redirectHops = Math.max(0, data.normalized.redirectChain.length - 1);
  const redirectStatus: ChecklistItemStatus =
    redirectHops <= SEO_CHECKLIST_CONFIG.redirect_chain.good_max_hops
      ? "good"
      : redirectHops <= SEO_CHECKLIST_CONFIG.redirect_chain.needs_work_max_hops
        ? "needs_work"
        : "critical";
  items.push({
    id: "redirect_chain_depth",
    label:
      redirectStatus === "good"
        ? "Redirect chain depth is healthy"
        : redirectStatus === "needs_work"
          ? "Redirect chain depth could be improved"
          : "Redirect chain depth is too long",
    status: redirectStatus,
    why: "Long redirect chains can waste crawl budget and slow down indexing",
    fix:
      redirectStatus === "good"
        ? null
        : "Reduce chained redirects by pointing links directly to the final destination URL",
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: {
        redirectHops,
        redirectChain: data.normalized.redirectChain,
      },
      whatThisMeans: `Detected ${redirectHops} redirect hop(s) from input URL to final URL`,
    },
  });

  // Page speed
  const slowPages = data.crawl.pages.filter((p) => p.fetchTimeMs > 3000);
  items.push({
    id: "page_speed",
    label:
      slowPages.length === 0
        ? "Pages load quickly"
        : `${slowPages.length} slow page(s) found`,
    status: slowPages.length === 0 ? "good" : "needs_work",
    why: "Slow pages hurt user experience and search rankings",
    fix:
      slowPages.length === 0
        ? null
        : "Optimize slow pages (reduce file sizes, enable caching, use CDN)",
    evidence: {
      url: data.normalized.finalUrl,
      foundValue: slowPages.length,
      whatThisMeans:
        slowPages.length === 0
          ? "All sampled pages load in under 3 seconds"
          : `${slowPages.length} of ${data.crawl.pages.length} sampled pages take over 3 seconds to load`,
    },
  });

  const ssl = data.ssl;
  if (!ssl || ssl.validNow === null) {
    items.push({
      id: "ssl_certificate_health",
      label: "SSL certificate health could not be measured",
      status: "unknown",
      why: "Valid SSL certificates improve trust and are expected by modern browsers and search engines",
      fix: "Run another scan to collect SSL certificate details",
      evidence: {
        url: data.normalized.finalUrl,
        foundValue: ssl ?? null,
        whatThisMeans: "SSL certificate data was unavailable for this scan",
      },
    });
  } else {
    const daysUntilExpiry = ssl.daysUntilExpiry ?? 0;
    const sslStatus: ChecklistItemStatus =
      ssl.validNow &&
      daysUntilExpiry > SEO_CHECKLIST_CONFIG.ssl_expiry_warning_days
        ? "good"
        : ssl.validNow
          ? "needs_work"
          : "critical";
    items.push({
      id: "ssl_certificate_health",
      label:
        sslStatus === "good"
          ? "SSL certificate is valid"
          : sslStatus === "needs_work"
            ? "SSL certificate is valid but expiring soon"
            : "SSL certificate is invalid or unavailable",
      status: sslStatus,
      why: "HTTPS and valid certificates are foundational trust and quality signals",
      fix:
        sslStatus === "good"
          ? null
          : "Install or renew your SSL certificate and verify HTTPS serves a valid chain",
      evidence: {
        url: data.normalized.finalUrl,
        foundValue: ssl,
        whatThisMeans: ssl.validNow
          ? `Certificate is currently valid and expires in ${daysUntilExpiry} day(s)`
          : "Certificate could not be validated for this domain",
      },
    });
  }

  // Website builder SEO limitations
  if (data.access.technology.isWebsiteBuilder) {
    items.push({
      id: "website_builder_limitations",
      label: `Your site is built on ${data.access.technology.platform}`,
      status: "needs_work",
      why: "Website builders have SEO limitations compared to custom-built sites with full backend control",
      fix: "Consider migrating to a custom-built site with a full backend for better SEO performance, faster load times, and more control over technical SEO",
      evidence: {
        url: data.normalized.finalUrl,
        foundValue: data.access.technology.platform,
        whatThisMeans: `Website builders like ${data.access.technology.platform} limit your ability to optimize server-side rendering, implement advanced caching strategies, control URL structures, and fine-tune technical SEO. Custom-built sites with dedicated backends typically rank better in Google search results due to faster performance, better crawlability, and more flexible SEO implementations.`,
      },
    });
  }

  return items;
}

/**
 * Generate tracking checklist items
 */
function generateTrackingChecklist(data: ScanData): ChecklistItem[] {
  const pages = data.crawl.pages;
  const homepage = pages[0];

  const structuredDataPassPages = pages.filter(
    (page) => page.structuredData.length > 0,
  );
  const structuredDataFailUrls = pages
    .filter((page) => page.structuredData.length === 0)
    .map((page) => page.url);

  const socialMetadataPassPages = pages.filter((page) =>
    Object.keys(page.socialTags).some(
      (key) => key.startsWith("og:") || key.startsWith("twitter:"),
    ),
  );
  const socialMetadataFailUrls = pages
    .filter(
      (page) =>
        !Object.keys(page.socialTags).some(
          (key) => key.startsWith("og:") || key.startsWith("twitter:"),
        ),
    )
    .map((page) => page.url);

  const analyticsPassPages = pages.filter(
    (page) =>
      page.analyticsSignals?.gtagDetected === true ||
      page.analyticsSignals?.gtmDetected === true,
  );
  const analyticsFailUrls = pages
    .filter(
      (page) =>
        page.analyticsSignals?.gtagDetected !== true &&
        page.analyticsSignals?.gtmDetected !== true,
    )
    .map((page) => page.url);

  const requiredHomepageTags = ["og:title", "og:description", "twitter:card"];
  const homepageTags = homepage?.socialTags ?? {};
  const presentHomepageTags = requiredHomepageTags.filter(
    (tag) =>
      typeof homepageTags[tag] === "string" &&
      homepageTags[tag].trim().length > 0,
  );
  const missingHomepageTags = requiredHomepageTags.filter(
    (tag) => !presentHomepageTags.includes(tag),
  );

  const homepageCoreStatus: ChecklistItemStatus = !homepage
    ? "unknown"
    : missingHomepageTags.length === 0
      ? "good"
      : missingHomepageTags.length === requiredHomepageTags.length
        ? "critical"
        : "needs_work";

  const homepageCoreLabel =
    homepageCoreStatus === "good"
      ? "Homepage core social tags are complete"
      : homepageCoreStatus === "needs_work"
        ? "Homepage core social tags are partially configured"
        : homepageCoreStatus === "critical"
          ? "Homepage core social tags are missing"
          : "Homepage core social tags could not be measured";

  return [
    createCoverageChecklistItem({
      id: "structured_data_coverage",
      labelPrefix: "Structured data coverage",
      why: "Structured data helps search engines understand pages and unlock rich results",
      fix: "Add schema.org structured data to pages without markup",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: structuredDataPassPages.length,
      failingUrls: structuredDataFailUrls,
    }),
    createCoverageChecklistItem({
      id: "social_metadata_coverage",
      labelPrefix: "Social metadata coverage",
      why: "Open Graph and Twitter tags improve how links appear when shared and provide content signals",
      fix: "Add Open Graph or Twitter meta tags to pages without social metadata",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: socialMetadataPassPages.length,
      failingUrls: socialMetadataFailUrls,
    }),
    createCoverageChecklistItem({
      id: "analytics_tag_coverage",
      labelPrefix: "Analytics tag coverage",
      why: "Measurement tags are useful for validating crawlable page templates and monitoring SEO outcomes",
      fix: "Install GA4 or GTM tags on templates missing analytics instrumentation",
      targetUrl: data.normalized.finalUrl,
      total: pages.length,
      passed: analyticsPassPages.length,
      failingUrls: analyticsFailUrls,
    }),
    {
      id: "homepage_core_social_tags",
      label: homepageCoreLabel,
      status: homepageCoreStatus,
      why: "Homepage social tags improve content clarity for crawlers and shared previews",
      fix:
        homepageCoreStatus === "good"
          ? null
          : homepageCoreStatus === "unknown"
            ? "Run another scan to collect homepage social metadata"
            : `Add missing homepage tags: ${missingHomepageTags.join(", ")}`,
      evidence: {
        url: homepage?.url || data.normalized.finalUrl,
        foundValue: {
          requiredTags: requiredHomepageTags,
          presentTags: presentHomepageTags,
          missingTags: missingHomepageTags,
        },
        whatThisMeans: homepage
          ? missingHomepageTags.length === 0
            ? "Homepage includes all required core social tags"
            : `Homepage is missing ${missingHomepageTags.length} required social tag(s)`
          : "No homepage data was available to evaluate core social tags",
      },
    },
    {
      id: "external_signal_availability",
      label: "External authority signals are unavailable in first-party mode",
      status: "unknown",
      why: "Backlinks, authority/trust-flow, and verified index status require third-party link indexes or Search Console access",
      fix: "Connect an external authority provider and Search Console integration when available",
      evidence: {
        url: data.normalized.finalUrl,
        foundValue: {
          unavailableSignals: [
            "backlinks",
            "domain_authority_trust_flow",
            "indexed_by_google",
          ],
          mode: "first_party_only",
        },
        whatThisMeans:
          "These signals are intentionally not estimated to avoid synthetic or misleading output",
      },
    },
  ];
}

function createSpeedChecklistItem({
  id,
  speedType,
  score,
  readyThreshold,
  fixFirstThreshold,
  targetUrl,
}: {
  id: string;
  speedType: "mobile" | "desktop";
  score: number | null;
  readyThreshold: number;
  fixFirstThreshold: number;
  targetUrl: string;
}): ChecklistItem {
  if (score === null) {
    return {
      id,
      label: `${
        speedType === "mobile" ? "Mobile" : "Desktop"
      } speed could not be measured`,
      status: "unknown",
      why: "Page speed influences SEO performance and user experience",
      fix: "Run another scan after confirming performance scan data is available",
      evidence: {
        url: targetUrl,
        foundValue: null,
        whatThisMeans: `No ${speedType} performance score was available for this scan`,
      },
    };
  }

  const status: ChecklistItemStatus =
    score >= readyThreshold
      ? "good"
      : score >= fixFirstThreshold
        ? "needs_work"
        : "critical";

  return {
    id,
    label:
      status === "good"
        ? `${speedType === "mobile" ? "Mobile" : "Desktop"} speed is good`
        : status === "needs_work"
          ? `${speedType === "mobile" ? "Mobile" : "Desktop"} speed could be better`
          : `${speedType === "mobile" ? "Mobile" : "Desktop"} speed is too slow`,
    status,
    why: "Page speed influences SEO performance and user experience",
    fix:
      status === "good"
        ? null
        : `Improve ${speedType} performance (optimize images, reduce JavaScript, enable caching)`,
    evidence: {
      url: targetUrl,
      foundValue: score,
      whatThisMeans: `${speedType === "mobile" ? "Mobile" : "Desktop"} speed score is ${score}/100`,
    },
  };
}

function createCoverageChecklistItem({
  id,
  labelPrefix,
  why,
  fix,
  targetUrl,
  total,
  passed,
  failingUrls,
}: {
  id: string;
  labelPrefix: string;
  why: string;
  fix: string;
  targetUrl: string;
  total: number;
  passed: number;
  failingUrls: string[];
}): ChecklistItem {
  if (total === 0) {
    return {
      id,
      label: `${labelPrefix} could not be measured`,
      status: "unknown",
      why,
      fix: "Run another scan to collect page-level evidence",
      evidence: {
        url: targetUrl,
        foundValue: {
          sampledPages: 0,
          pagesPassing: 0,
          coveragePercent: 0,
          failingUrls: [],
        },
        whatThisMeans:
          "No pages were sampled, so coverage could not be calculated",
      },
    };
  }

  const coveragePercent = Math.round((passed / total) * 100);
  const status = getCoverageStatus(coveragePercent);
  const evidenceFailingUrls = failingUrls.slice(0, 5);

  return {
    id,
    label:
      status === "good"
        ? `${labelPrefix} is strong`
        : status === "needs_work"
          ? `${labelPrefix} needs improvement`
          : `${labelPrefix} is too low`,
    status,
    why,
    fix: status === "good" ? null : fix,
    evidence: {
      url: targetUrl,
      foundValue: {
        sampledPages: total,
        pagesPassing: passed,
        coveragePercent,
        failingUrls: evidenceFailingUrls,
      },
      whatThisMeans:
        status === "good"
          ? `${passed} of ${total} sampled pages pass (${coveragePercent}% coverage)`
          : `${passed} of ${total} sampled pages pass (${coveragePercent}% coverage); showing up to 5 failing URLs`,
    },
  };
}

function getCoverageStatus(coveragePercent: number): ChecklistItemStatus {
  if (coveragePercent >= 90) {
    return "good";
  }
  if (coveragePercent >= 60) {
    return "needs_work";
  }
  return "critical";
}

function isValidLanguageTag(value: string | null | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  // Accept common BCP-47 style tags like en or en-US.
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(normalized);
}
