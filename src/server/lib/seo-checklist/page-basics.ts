/**
 * Page Basics Extraction Module
 * Extract SEO basics from HTML
 */

import { JSDOM } from "jsdom";
import { SEO_CHECKLIST_CONFIG } from "./config.js";
import type {
  AnalyticsSignals,
  HeadingCounts,
  ImageAltStats,
} from "./types.js";

interface PageBasics {
  pageTitle: string | null;
  metaDescription: string | null;
  h1Present: boolean;
  h1Text: string | null;
  structuredData: unknown[];
  socialTags: Record<string, string>;
  canonicalUrl: string | null;
  htmlLang: string | null;
  headingCounts: HeadingCounts;
  imageAlt: ImageAltStats;
  analyticsSignals: AnalyticsSignals;
  metaRobotsTagDirectives: string[];
  xRobotsTagDirectives: string[];
}

/**
 * Extract page basics from HTML
 */
export async function extractPageBasics(
  _url: string,
  html: string,
  headers?: Headers,
): Promise<PageBasics> {
  const document = parseDocument(html);

  return {
    pageTitle: extractTitle(html, document),
    metaDescription: extractMetaDescription(html, document),
    h1Present: hasH1(html, document),
    h1Text: extractH1Text(html, document),
    structuredData: extractStructuredData(html, document),
    socialTags: extractSocialTags(html, document),
    canonicalUrl: extractCanonicalUrl(html, document),
    htmlLang: extractHtmlLang(html, document),
    headingCounts: extractHeadingCounts(html, document),
    imageAlt: extractImageAltStats(html, document),
    analyticsSignals: extractAnalyticsSignals(html, document),
    metaRobotsTagDirectives: extractMetaRobotsTagDirectives(html, document),
    xRobotsTagDirectives: extractXRobotsTagDirectives(headers),
  };
}

function parseDocument(html: string): Document | null {
  if (!html.trim()) {
    return null;
  }

  try {
    return new JSDOM(html).window.document;
  } catch {
    return null;
  }
}

/**
 * Extract page title
 */
function extractTitle(html: string, document: Document | null): string | null {
  const domTitle = document?.querySelector("title")?.textContent?.trim();
  if (domTitle) {
    return domTitle;
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Extract meta description
 */
function extractMetaDescription(
  html: string,
  document: Document | null,
): string | null {
  if (document) {
    const metaElements = Array.from(document.querySelectorAll("meta"));
    for (const meta of metaElements) {
      const name = meta.getAttribute("name")?.trim().toLowerCase();
      if (name === "description") {
        const content = meta.getAttribute("content")?.trim();
        if (content) {
          return content;
        }
      }
    }
  }

  const metaMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  return metaMatch ? metaMatch[1].trim() : null;
}

/**
 * Check if H1 is present
 */
function hasH1(html: string, document: Document | null): boolean {
  if (document) {
    return document.querySelector("h1") !== null;
  }

  return /<h1[^>]*>/i.test(html);
}

/**
 * Extract H1 text
 */
function extractH1Text(html: string, document: Document | null): string | null {
  const domText = document?.querySelector("h1")?.textContent?.trim();
  if (domText) {
    return domText;
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return h1Match ? h1Match[1].trim() : null;
}

/**
 * Extract structured data (JSON-LD)
 */
function extractStructuredData(
  html: string,
  document: Document | null,
): unknown[] {
  const structuredData: unknown[] = [];

  if (document) {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    for (const script of scripts) {
      const payload = script.textContent?.trim();
      if (!payload) {
        continue;
      }
      try {
        structuredData.push(JSON.parse(payload));
      } catch {
        // Invalid JSON-LD payload; skip.
      }
    }
    return structuredData;
  }

  const scriptRegex =
    /<script\s+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi;
  const matches = html.matchAll(scriptRegex);

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      structuredData.push(data);
    } catch {
      // Invalid JSON, skip.
    }
  }

  return structuredData;
}

/**
 * Extract social preview tags (Open Graph, Twitter)
 */
function extractSocialTags(
  html: string,
  document: Document | null,
): Record<string, string> {
  const tags: Record<string, string> = {};

  if (document) {
    const metaElements = Array.from(document.querySelectorAll("meta"));
    for (const meta of metaElements) {
      const property = meta.getAttribute("property")?.trim().toLowerCase();
      const name = meta.getAttribute("name")?.trim().toLowerCase();
      const content = meta.getAttribute("content")?.trim();

      if (!content) {
        continue;
      }

      if (property?.startsWith("og:")) {
        tags[property] = content;
      } else if (name?.startsWith("twitter:")) {
        tags[name] = content;
      }
    }
    return tags;
  }

  const ogRegex =
    /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']*)["']/gi;
  const ogMatches = html.matchAll(ogRegex);
  for (const match of ogMatches) {
    tags[`og:${match[1]}`] = match[2];
  }

  const twitterRegex =
    /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']*)["']/gi;
  const twitterMatches = html.matchAll(twitterRegex);
  for (const match of twitterMatches) {
    tags[`twitter:${match[1]}`] = match[2];
  }

  return tags;
}

function extractCanonicalUrl(
  html: string,
  document: Document | null,
): string | null {
  if (document) {
    const links = Array.from(document.querySelectorAll("link[href][rel]"));
    for (const link of links) {
      const rel = link
        .getAttribute("rel")
        ?.split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);
      if (!rel) {
        continue;
      }
      if (rel.includes("canonical")) {
        const href = link.getAttribute("href")?.trim();
        if (href) {
          return href;
        }
      }
    }
  }

  const canonicalMatch = html.match(
    /<link\s+[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  );
  return canonicalMatch ? canonicalMatch[1].trim() : null;
}

function extractHtmlLang(
  html: string,
  document: Document | null,
): string | null {
  const lang = document?.documentElement.getAttribute("lang")?.trim();
  if (lang) {
    return lang;
  }

  const langMatch = html.match(/<html[^>]*\slang=["']([^"']+)["'][^>]*>/i);
  return langMatch ? langMatch[1].trim() : null;
}

function extractHeadingCounts(
  html: string,
  document: Document | null,
): HeadingCounts {
  if (document) {
    return {
      h1: document.querySelectorAll("h1").length,
      h2: document.querySelectorAll("h2").length,
      h3: document.querySelectorAll("h3").length,
      h4: document.querySelectorAll("h4").length,
      h5: document.querySelectorAll("h5").length,
      h6: document.querySelectorAll("h6").length,
    };
  }

  const count = (tag: string) =>
    (html.match(new RegExp(`<${tag}\\b`, "gi")) ?? []).length;
  return {
    h1: count("h1"),
    h2: count("h2"),
    h3: count("h3"),
    h4: count("h4"),
    h5: count("h5"),
    h6: count("h6"),
  };
}

function extractImageAltStats(
  html: string,
  document: Document | null,
): ImageAltStats {
  let totalImages = 0;
  let imagesWithAlt = 0;

  if (document) {
    const images = Array.from(document.querySelectorAll("img"));
    totalImages = images.length;
    imagesWithAlt = images.filter((img) => {
      const alt = img.getAttribute("alt");
      return typeof alt === "string" && alt.trim().length > 0;
    }).length;
  } else {
    const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
    totalImages = imageTags.length;
    imagesWithAlt = imageTags.filter((tag) => {
      const altMatch = tag.match(/alt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (!altMatch) {
        return false;
      }
      const value = altMatch[2] ?? altMatch[3] ?? altMatch[4] ?? "";
      return value.trim().length > 0;
    }).length;
  }

  const imagesMissingAlt = Math.max(0, totalImages - imagesWithAlt);
  const coveragePercent =
    totalImages === 0 ? 100 : Math.round((imagesWithAlt / totalImages) * 100);

  return {
    totalImages,
    imagesWithAlt,
    imagesMissingAlt,
    coveragePercent,
  };
}

function extractAnalyticsSignals(
  html: string,
  document: Document | null,
): AnalyticsSignals {
  let gtagDetected = false;
  let gtmDetected = false;

  if (document) {
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const script of scripts) {
      const src = script.getAttribute("src")?.toLowerCase() ?? "";
      const inline = script.textContent?.toLowerCase() ?? "";

      if (src.includes("googletagmanager.com/gtag/js")) {
        gtagDetected = true;
      }
      if (src.includes("googletagmanager.com/gtm.js")) {
        gtmDetected = true;
      }
      if (inline.includes("gtag(") || inline.includes("window.datalayer")) {
        gtagDetected = true;
      }
      if (inline.includes("googletagmanager.com/gtm.js")) {
        gtmDetected = true;
      }
    }

    const iframes = Array.from(document.querySelectorAll("iframe"));
    if (
      iframes.some((iframe) =>
        (iframe.getAttribute("src") ?? "")
          .toLowerCase()
          .includes("googletagmanager.com/ns.html"),
      )
    ) {
      gtmDetected = true;
    }
  } else {
    const normalized = html.toLowerCase();
    gtagDetected =
      normalized.includes("googletagmanager.com/gtag/js") ||
      normalized.includes("gtag(") ||
      normalized.includes("window.datalayer");
    gtmDetected =
      normalized.includes("googletagmanager.com/gtm.js") ||
      normalized.includes("googletagmanager.com/ns.html");
  }

  return { gtagDetected, gtmDetected };
}

function extractMetaRobotsTagDirectives(
  html: string,
  document: Document | null,
): string[] {
  const directives = new Set<string>();

  if (document) {
    const metaElements = Array.from(document.querySelectorAll("meta"));
    for (const meta of metaElements) {
      const name = meta.getAttribute("name")?.trim().toLowerCase();
      const content = meta.getAttribute("content");
      if (!content) {
        continue;
      }

      if (
        name === "robots" ||
        name === "googlebot" ||
        name === "googlebot-news"
      ) {
        for (const directive of parseDirectiveValues(content)) {
          directives.add(directive);
        }
      }
    }
    return Array.from(directives);
  }

  const metaRobotsRegex =
    /<meta\s+name=["'](robots|googlebot|googlebot-news)["']\s+content=["']([^"']*)["']/gi;
  const matches = html.matchAll(metaRobotsRegex);
  for (const match of matches) {
    for (const directive of parseDirectiveValues(match[2])) {
      directives.add(directive);
    }
  }

  return Array.from(directives);
}

function extractXRobotsTagDirectives(headers?: Headers): string[] {
  if (!headers) {
    return [];
  }

  const value = headers.get("x-robots-tag");
  if (!value) {
    return [];
  }

  return parseDirectiveValues(value);
}

function parseDirectiveValues(value: string): string[] {
  return value
    .split(",")
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Validate page title
 */
export function validateTitle(title: string | null): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!title) {
    issues.push("Page title is missing");
    return { valid: false, issues };
  }

  if (title.length < SEO_CHECKLIST_CONFIG.page_basics.min_title_length) {
    issues.push(`Page title is too short (${title.length} characters)`);
  }

  if (title.length > SEO_CHECKLIST_CONFIG.page_basics.max_title_length) {
    issues.push(`Page title is too long (${title.length} characters)`);
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validate meta description
 */
export function validateDescription(description: string | null): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!description) {
    issues.push("Meta description is missing");
    return { valid: false, issues };
  }

  if (
    description.length < SEO_CHECKLIST_CONFIG.page_basics.min_description_length
  ) {
    issues.push(
      `Meta description is too short (${description.length} characters)`,
    );
  }

  if (
    description.length > SEO_CHECKLIST_CONFIG.page_basics.max_description_length
  ) {
    issues.push(
      `Meta description is too long (${description.length} characters)`,
    );
  }

  return { valid: issues.length === 0, issues };
}
