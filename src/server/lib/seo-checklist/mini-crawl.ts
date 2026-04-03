/**
 * Mini Crawl Module
 * Fast sampling of site structure
 */

import { SEO_CHECKLIST_CONFIG } from "./config.js";
import type { MiniCrawlResult, SampledPage } from "./types.js";
import { extractPageBasics } from "./page-basics.js";

interface SitemapCheckResult {
  sitemapFound: boolean;
  sitemapUrls: string[];
  sitemapPageSeeds: string[];
}

/**
 * Run mini crawl to sample pages
 */
export async function miniCrawl(
  url: string,
  maxPages: number = SEO_CHECKLIST_CONFIG.max_pages_to_sample,
): Promise<MiniCrawlResult> {
  const sampledPages: SampledPage[] = [];
  const visitedUrls = new Set<string>();
  const urlsToVisit: string[] = [url];
  const discoveredInternalLinks = new Set<string>();

  const { sitemapFound, sitemapUrls, sitemapPageSeeds } =
    await checkSitemaps(url);
  for (const seed of sitemapPageSeeds) {
    discoveredInternalLinks.add(seed);
    if (!urlsToVisit.includes(seed)) {
      urlsToVisit.push(seed);
    }
  }

  let maxSampleCap = maxPages;
  const adaptiveMax = Math.max(
    maxPages,
    SEO_CHECKLIST_CONFIG.max_pages_to_sample_adaptive,
  );
  const adaptiveEnabled = maxPages < adaptiveMax;

  let firstPassFetchTotalMs = 0;
  let firstPassErrorCount = 0;

  while (urlsToVisit.length > 0 && sampledPages.length < maxSampleCap) {
    const currentUrl = urlsToVisit.shift()!;

    if (visitedUrls.has(currentUrl)) {
      continue;
    }

    visitedUrls.add(currentUrl);

    const result = await fetchAndParsePage(currentUrl);
    if (!result) {
      continue;
    }

    sampledPages.push(result.page);

    if (
      sampledPages.length <=
      SEO_CHECKLIST_CONFIG.adaptive_crawl.evaluate_after_pages
    ) {
      firstPassFetchTotalMs += result.page.fetchTimeMs;
      if (result.page.statusCode === 0 || result.page.statusCode >= 500) {
        firstPassErrorCount += 1;
      }
    }

    for (const link of result.internalLinks) {
      discoveredInternalLinks.add(link);
      if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
        urlsToVisit.push(link);
      }
    }

    if (
      adaptiveEnabled &&
      maxSampleCap < adaptiveMax &&
      sampledPages.length ===
        SEO_CHECKLIST_CONFIG.adaptive_crawl.evaluate_after_pages &&
      urlsToVisit.length > 0
    ) {
      const avgFetchTimeMs = firstPassFetchTotalMs / sampledPages.length;
      const errorRate = firstPassErrorCount / sampledPages.length;
      if (
        avgFetchTimeMs <=
          SEO_CHECKLIST_CONFIG.adaptive_crawl.max_avg_fetch_time_ms &&
        errorRate <= SEO_CHECKLIST_CONFIG.adaptive_crawl.max_error_rate
      ) {
        maxSampleCap = adaptiveMax;
      }
    }
  }

  return {
    pages: sampledPages,
    sitemapFound,
    sitemapUrls,
    totalLinksFound: discoveredInternalLinks.size,
  };
}

/**
 * Check for sitemaps and parse internal seeds.
 */
async function checkSitemaps(url: string): Promise<SitemapCheckResult> {
  const sitemapUrls = new Set<string>();
  const sitemapPageSeeds = new Set<string>();
  const baseUrl = new URL(url);

  // Check robots.txt for sitemap entries.
  try {
    const robotsUrl = new URL("/robots.txt", url).href;
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
      headers: {
        "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
      },
    });

    if (response.ok) {
      const robotsTxt = await response.text();
      const sitemapMatches = robotsTxt.matchAll(/Sitemap:\s*(.+)/gi);
      for (const match of sitemapMatches) {
        try {
          sitemapUrls.add(new URL(match[1].trim(), baseUrl).href);
        } catch {
          // Invalid sitemap URL in robots.txt; skip.
        }
      }
    }
  } catch (error) {
    console.error("Error checking robots.txt for sitemap:", error);
  }

  // Check common sitemap URLs.
  for (const sitemapPath of SEO_CHECKLIST_CONFIG.sitemap_urls) {
    try {
      const sitemapUrl = new URL(sitemapPath, url).href;
      const response = await fetch(sitemapUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
        headers: {
          "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
        },
      });

      if (response.ok) {
        sitemapUrls.add(sitemapUrl);
      }
    } catch {
      // Sitemap candidate unavailable; continue.
    }
  }

  const sitemapQueue = Array.from(sitemapUrls);
  const visitedSitemapUrls = new Set<string>();

  while (
    sitemapQueue.length > 0 &&
    sitemapPageSeeds.size < SEO_CHECKLIST_CONFIG.sitemap_seed_limit
  ) {
    const sitemapUrl = sitemapQueue.shift()!;
    if (visitedSitemapUrls.has(sitemapUrl)) {
      continue;
    }
    visitedSitemapUrls.add(sitemapUrl);

    try {
      const response = await fetch(sitemapUrl, {
        method: "GET",
        signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
        headers: {
          "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
        },
      });

      if (!response.ok) {
        continue;
      }

      const body = await response.text();
      const contentType = (
        response.headers.get("content-type") ?? ""
      ).toLowerCase();

      if (
        contentType.includes("xml") ||
        isLikelyXmlSitemap(sitemapUrl) ||
        body.includes("<urlset") ||
        body.includes("<sitemapindex")
      ) {
        const discovered = extractUrlsFromXmlSitemap(body, baseUrl.hostname);
        for (const discoveredUrl of discovered) {
          if (
            sitemapPageSeeds.size >= SEO_CHECKLIST_CONFIG.sitemap_seed_limit
          ) {
            break;
          }
          if (isLikelyXmlSitemap(discoveredUrl)) {
            if (!visitedSitemapUrls.has(discoveredUrl)) {
              sitemapUrls.add(discoveredUrl);
              sitemapQueue.push(discoveredUrl);
            }
            continue;
          }
          sitemapPageSeeds.add(discoveredUrl);
        }
        continue;
      }

      if (
        contentType.includes("html") ||
        sitemapUrl.toLowerCase().endsWith(".html")
      ) {
        const links = extractInternalLinks(sitemapUrl, body);
        for (const link of links) {
          if (
            sitemapPageSeeds.size >= SEO_CHECKLIST_CONFIG.sitemap_seed_limit
          ) {
            break;
          }
          sitemapPageSeeds.add(link);
        }
      }
    } catch {
      // Ignore individual sitemap parsing failures.
    }
  }

  return {
    sitemapFound: sitemapUrls.size > 0,
    sitemapUrls: Array.from(sitemapUrls),
    sitemapPageSeeds: Array.from(sitemapPageSeeds),
  };
}

function isLikelyXmlSitemap(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return (
      pathname.endsWith(".xml") ||
      pathname.endsWith(".xml.gz") ||
      /^\/sitemap([_-].+)?\.xml$/.test(pathname) ||
      /^\/sitemap(_index|-index)?$/.test(pathname)
    );
  } catch {
    const normalized = url.toLowerCase();
    return normalized.endsWith(".xml") || normalized.endsWith(".xml.gz");
  }
}

function extractUrlsFromXmlSitemap(xml: string, host: string): string[] {
  const urls: string[] = [];
  const matches = xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi);
  for (const match of matches) {
    try {
      const discovered = new URL(match[1].trim());
      if (discovered.hostname !== host) {
        continue;
      }
      if (discovered.protocol !== "http:" && discovered.protocol !== "https:") {
        continue;
      }
      discovered.hash = "";
      urls.push(discovered.href);
    } catch {
      // Invalid loc entry, ignore.
    }
  }
  return [...new Set(urls)];
}

/**
 * Fetch and parse a single page
 */
async function fetchAndParsePage(
  url: string,
): Promise<{ page: SampledPage; internalLinks: string[] } | null> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
      headers: {
        "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
      },
    });

    const fetchTimeMs = Date.now() - startTime;
    const html = await response.text();

    const basics = await extractPageBasics(url, html, response.headers);

    return {
      page: {
        url,
        statusCode: response.status,
        fetchTimeMs,
        ...basics,
      },
      internalLinks:
        response.status === 200 ? extractInternalLinks(url, html) : [],
    };
  } catch (error) {
    console.error(`Error fetching page ${url}:`, error);
    return {
      page: {
        url,
        statusCode: 0,
        fetchTimeMs: Date.now() - startTime,
        pageTitle: null,
        metaDescription: null,
        h1Present: false,
        h1Text: null,
        structuredData: [],
        socialTags: {},
        canonicalUrl: null,
        htmlLang: null,
        headingCounts: {
          h1: 0,
          h2: 0,
          h3: 0,
          h4: 0,
          h5: 0,
          h6: 0,
        },
        imageAlt: {
          totalImages: 0,
          imagesWithAlt: 0,
          imagesMissingAlt: 0,
          coveragePercent: 100,
        },
        analyticsSignals: {
          gtagDetected: false,
          gtmDetected: false,
        },
        metaRobotsTagDirectives: [],
        xRobotsTagDirectives: [],
      },
      internalLinks: [],
    };
  }
}

/**
 * Extract internal links from HTML
 */
function extractInternalLinks(baseUrl: string, html: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
  const matches = html.matchAll(linkRegex);

  const baseUrlObj = new URL(baseUrl);

  for (const match of matches) {
    try {
      const href = match[1].trim();
      if (!href || href.startsWith("#")) {
        continue;
      }

      if (/^(mailto:|tel:|javascript:)/i.test(href)) {
        continue;
      }

      const absoluteUrl = new URL(href, baseUrl).href;
      const linkUrlObj = new URL(absoluteUrl);
      if (linkUrlObj.protocol !== "http:" && linkUrlObj.protocol !== "https:") {
        continue;
      }

      if (linkUrlObj.hostname === baseUrlObj.hostname) {
        linkUrlObj.hash = "";
        links.push(linkUrlObj.href);
      }
    } catch {
      // Invalid URL; skip.
    }
  }

  return [...new Set(links)];
}
