/**
 * Access Checks Module
 * Fast "can Google read it?" checks
 */

import { SEO_CHECKLIST_CONFIG } from "./config.js";
import type { AccessCheckResult, TechnologyInfo } from "./types.js";
import { extractPageBasics } from "./page-basics.js";

/**
 * Run access checks on target URL
 */
export async function runAccessChecks(url: string): Promise<AccessCheckResult> {
  const issues: string[] = [];
  let accessible = true;

  // Check homepage status
  const { statusCode, html, headers } = await fetchHomepage(url);
  const homepageStatusCode = statusCode;

  if (!statusCode || statusCode >= 400) {
    accessible = false;
    issues.push(`Homepage returns error status: ${statusCode || "unknown"}`);
  }

  const basics = await extractPageBasics(url, html, headers);
  const noindexSources: string[] = [];
  const hasMetaNoindex = basics.metaRobotsTagDirectives.includes("noindex");
  const hasHeaderNoindex = basics.xRobotsTagDirectives.includes("noindex");
  const hasNoindex = hasMetaNoindex || hasHeaderNoindex;
  if (hasMetaNoindex) {
    noindexSources.push("meta_robots");
  }
  if (hasHeaderNoindex) {
    noindexSources.push("x_robots_tag");
  }

  if (hasNoindex) {
    accessible = false;
    issues.push("Homepage has noindex directive");
  }

  // Check robots.txt
  const robotsTxtBlocked = await checkRobotsTxt(url);
  if (robotsTxtBlocked) {
    accessible = false;
    issues.push("robots.txt blocks access to site");
  }

  // Check for redirect loop (handled in normalization, but double-check)
  const redirectLoop = false; // This is checked in normalize-target

  // Check if content is empty
  const contentEmpty = checkContentEmpty(html);
  if (contentEmpty) {
    accessible = false;
    issues.push("Homepage content appears empty or JS-only");
  }

  // Detect technology (website builders, WordPress, etc.)
  const technology = detectTechnology(html);

  return {
    accessible,
    homepageStatusCode,
    hasNoindex,
    noindexSources,
    robotsTxtBlocked,
    redirectLoop,
    contentEmpty,
    issues,
    technology,
  };
}

/**
 * Fetch homepage HTML
 */
async function fetchHomepage(
  url: string,
): Promise<{ statusCode: number | null; html: string; headers: Headers }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
      headers: {
        "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
      },
    });

    const html = await response.text();
    return { statusCode: response.status, html, headers: response.headers };
  } catch (error) {
    console.error("Error fetching homepage:", error);
    return { statusCode: null, html: "", headers: new Headers() };
  }
}

/**
 * Check robots.txt for broad blocks
 */
async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", url).href;
    const response = await fetch(robotsUrl, {
      method: "GET",
      signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
      headers: {
        "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
      },
    });

    if (!response.ok) {
      return false; // No robots.txt = not blocked
    }

    const robotsTxt = await response.text();
    return parseRobotsTxt(robotsTxt);
  } catch (error) {
    console.error("Error fetching robots.txt:", error);
    return false;
  }
}

/**
 * Parse robots.txt for broad blocks
 */
function parseRobotsTxt(robotsTxt: string): boolean {
  const lines = robotsTxt.split("\n");
  let inGooglebotSection = false;
  let inAllSection = false;

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();

    // Check User-agent
    if (trimmed.startsWith("user-agent:")) {
      const agent = trimmed.substring(11).trim();
      inGooglebotSection = agent === "googlebot" || agent === "*";
      inAllSection = agent === "*";
    }

    // Check Disallow
    if (
      (inGooglebotSection || inAllSection) &&
      trimmed.startsWith("disallow:")
    ) {
      const path = trimmed.substring(9).trim();
      // Broad block: Disallow: /
      if (path === "/") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if content is empty or JS-only
 */
function checkContentEmpty(html: string): boolean {
  if (!html) return true;

  // Remove script tags
  const withoutScripts = html.replace(/<script[^>]*>.*?<\/script>/gis, "");

  // Remove style tags
  const withoutStyles = withoutScripts.replace(
    /<style[^>]*>.*?<\/style>/gis,
    "",
  );

  // Remove HTML tags
  const textContent = withoutStyles.replace(/<[^>]+>/g, "").trim();

  // Check if remaining text is too short
  return textContent.length < 100;
}

/**
 * Detect technology (website builders, WordPress, etc.)
 */
function detectTechnology(html: string): TechnologyInfo {
  const htmlLower = html.toLowerCase();

  // Website builder detection patterns
  // NOTE: WordPress (including WordPress.com) is NOT included here because it has a full backend (PHP/MySQL)
  // and is SEO-friendly. Only drag-and-drop builders without real backends are flagged.
  const websiteBuilders = [
    {
      name: "GoDaddy Website Builder",
      patterns: [
        "_w.configdomain",
        "_w.customerlocale",
        "wsb-",
        "godaddy website builder",
        "godaddy website builder",
        "starfield technologies",
        "godaddysites.com",
        "godaddysites.com",
      ],
    },
    {
      name: "Wix",
      patterns: ["wix.com", "wixstatic.com", "wix-code", "_wix", "wixsite.com"],
    },
    {
      name: "Squarespace",
      patterns: ["squarespace.com", "sqsp.com", "squarespace-cdn"],
    },
    {
      name: "Shopify",
      patterns: [
        "cdn.shopify.com",
        "shopify.theme",
        "shopify.com/s/files",
        "shopify-section",
        "myshopify.com",
      ],
    },
    { name: "Webflow", patterns: ["webflow.com", "webflow.io", "data-wf-"] },
    { name: "Weebly", patterns: ["weebly.com", "weeblycloud.com"] },
    { name: "Duda", patterns: ["dmcdn.net", "duda.co", "dudaone.com"] },
    { name: "Site123", patterns: ["site123.com", "site123.me"] },
    { name: "Jimdo", patterns: ["jimdo.com", "jimdosite.com"] },
    { name: "Strikingly", patterns: ["strikingly.com", "strikinglycdn"] },
    { name: "Carrd", patterns: ["carrd.co"] },
    { name: "Elementor Cloud", patterns: ["elementor.cloud"] },
    {
      name: "BigCommerce",
      patterns: ["bigcommerce.com", "cdn.bcapp", "mybigcommerce.com"],
    },
  ];

  let isWebsiteBuilder = false;
  let platform: string | null = null;

  for (const builder of websiteBuilders) {
    for (const pattern of builder.patterns) {
      if (htmlLower.includes(pattern)) {
        isWebsiteBuilder = true;
        platform = builder.name;
        break;
      }
    }
    if (isWebsiteBuilder) break;
  }

  // WordPress detection (both self-hosted and WordPress.com)
  // WordPress has a full PHP/MySQL backend and is SEO-friendly
  let hasWordPress = false;
  let wordPressVersion: string | null = null;

  if (
    htmlLower.includes("wp-content") ||
    htmlLower.includes("wp-includes") ||
    htmlLower.includes("wordpress") ||
    htmlLower.includes("wordpress.com") ||
    htmlLower.includes("wp.com")
  ) {
    hasWordPress = true;

    // Try to extract WordPress version
    const versionMatch = html.match(/wordpress\s+([0-9.]+)/i);
    if (versionMatch) {
      wordPressVersion = versionMatch[1];
    }
  }

  // PHP version detection (from meta tags or headers)
  let phpVersion: string | null = null;
  const phpMatch = html.match(/php[\s/]([0-9.]+)/i);
  if (phpMatch) {
    phpVersion = phpMatch[1];
  }

  // Server type detection
  let serverType: string | null = null;
  if (isWebsiteBuilder) {
    serverType = "Website Builder";
  } else if (hasWordPress) {
    serverType = "WordPress";
  }

  return {
    isWebsiteBuilder,
    platform,
    serverType,
    hasWordPress,
    wordPressVersion,
    phpVersion,
  };
}
