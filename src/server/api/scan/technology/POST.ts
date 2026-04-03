import type { Request, Response } from "express";
import { getOrSet } from "../../../lib/cache/cache-manager.js";
import { normalizeHostingProviderLabel } from "../../../lib/hosting-provider-canonical.js";
import { detectWebsiteBuilderType } from "../../../lib/intelligence/website-builder-detection.js";
import {
  deriveWordPressCertainty,
  detectWordPressFromHtml,
  inferWordPressFromHeaders,
  probeWordPressEndpoints,
} from "../../../lib/intelligence/wordpress-detection.js";
import {
  extractPluginNamesFromHtml,
  extractPluginNamesFromWpJsonPayload,
} from "../../../lib/intelligence/wordpress-plugin-detection.js";

const TECHNOLOGY_CACHE_SUFFIX = "builder-detection-v3";

interface AdditionalTechnologySignal {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

function toNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isWordPressComDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase();
  return (
    normalized === "wordpress.com" || normalized.endsWith(".wordpress.com")
  );
}

function parseVersionParts(version: string): [number, number, number] | null {
  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) return null;
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  if (!aParts || !bParts) return 0;

  if (aParts[0] !== bParts[0]) return aParts[0] - bParts[0];
  if (aParts[1] !== bParts[1]) return aParts[1] - bParts[1];
  return aParts[2] - bParts[2];
}

function pickBestWordPressVersion(
  currentVersion: string | null,
  candidateVersion: string | null,
  source: string,
  signals?: Map<string, Set<string>>,
): string | null {
  if (!candidateVersion) return currentVersion;
  const parsed = parseVersionParts(candidateVersion);
  if (!parsed) return currentVersion;

  // Reject obviously invalid major versions for WordPress core.
  if (parsed[0] < 2 || parsed[0] > 10) return currentVersion;
  if (signals) {
    const existing = signals.get(candidateVersion) ?? new Set<string>();
    existing.add(source);
    signals.set(candidateVersion, existing);
  }

  if (!currentVersion) {
    console.log(
      `[Technology Scan] WordPress version from ${source}: ${candidateVersion}`,
    );
    return candidateVersion;
  }

  if (compareVersions(candidateVersion, currentVersion) > 0) {
    console.log(
      `[Technology Scan] Upgraded WordPress version via ${source}: ${currentVersion} -> ${candidateVersion}`,
    );
    return candidateVersion;
  }

  return currentVersion;
}

function getWordPressVersionMetadata(
  selectedVersion: string | null,
  signals: Map<string, Set<string>>,
) {
  const candidates = Array.from(signals.entries())
    .map(([version, sources]) => ({ version, sources: Array.from(sources) }))
    .sort((a, b) => compareVersions(b.version, a.version));

  const selectedSources = selectedVersion
    ? Array.from(signals.get(selectedVersion) ?? [])
    : [];
  const signalCount = selectedSources.length;
  const conflicted = candidates.length > 1;

  let reliability: "high" | "medium" | "low" | "unknown" = "unknown";
  if (selectedVersion) {
    if (conflicted) reliability = "low";
    else if (signalCount >= 3) reliability = "high";
    else if (signalCount === 2) reliability = "medium";
    else reliability = "low";
  }

  const confidence =
    reliability === "high"
      ? 85
      : reliability === "medium"
        ? 70
        : reliability === "low"
          ? 45
          : 0;

  return {
    selectedSources,
    signalCount,
    conflicted,
    reliability,
    confidence,
    candidates,
    isUncertain: !selectedVersion || conflicted || reliability === "low",
  };
}

function extractAdditionalTechnologies(
  html: string,
  headers: Headers,
): AdditionalTechnologySignal[] {
  const detected = new Map<string, AdditionalTechnologySignal>();

  const push = (tech: AdditionalTechnologySignal) => {
    const versionKey = tech.version?.trim().toLowerCase() || "";
    const key = `${tech.name.trim().toLowerCase()}|${tech.category.trim().toLowerCase()}|${versionKey}`;
    const existing = detected.get(key);
    if (!existing || existing.confidence < tech.confidence) {
      detected.set(key, tech);
    }
  };

  const serverHeader = headers.get("server")?.toLowerCase() || "";
  const xPoweredBy = headers.get("x-powered-by") || "";
  const setCookieHeader = headers.get("set-cookie")?.toLowerCase() || "";

  if (headers.get("cf-ray") || serverHeader.includes("cloudflare")) {
    push({
      name: "Cloudflare",
      category: "CDN",
      confidence: 96,
    });
  }
  if (headers.get("x-amz-cf-id")) {
    push({
      name: "Amazon CloudFront",
      category: "CDN",
      confidence: 94,
    });
  }
  if (headers.get("x-fastly-request-id")) {
    push({
      name: "Fastly",
      category: "CDN",
      confidence: 94,
    });
  }
  if (
    headers.get("x-akamai-transformed") ||
    headers.get("x-akamai-request-id")
  ) {
    push({
      name: "Akamai",
      category: "CDN",
      confidence: 92,
    });
  }

  if (xPoweredBy) {
    const match = xPoweredBy.match(/^([^/]+)\/?([\d.]+)?/i);
    if (match?.[1]) {
      push({
        name: match[1].trim(),
        category: "Runtime",
        version: match[2],
        confidence: 85,
      });
    }
  }

  const aspNetVersionHeader = headers.get("x-aspnet-version");
  const aspNetMvcHeader = headers.get("x-aspnetmvc-version");
  const hasAspNetCookie = setCookieHeader.includes("asp.net_sessionid");
  const hasAspNetHtmlSignals =
    /__viewstate|__eventvalidation|webresource\.axd|scriptresource\.axd/i.test(
      html,
    );
  const hasAspNetSignals =
    xPoweredBy.toLowerCase().includes("asp.net") ||
    Boolean(aspNetVersionHeader) ||
    Boolean(aspNetMvcHeader) ||
    hasAspNetCookie ||
    hasAspNetHtmlSignals;
  if (hasAspNetSignals) {
    push({
      name: "ASP.NET",
      category: "Framework",
      version: aspNetVersionHeader || undefined,
      confidence:
        aspNetVersionHeader || aspNetMvcHeader
          ? 90
          : hasAspNetCookie || hasAspNetHtmlSignals
            ? 82
            : 78,
    });
  }

  if (serverHeader.includes("apache")) {
    push({ name: "Apache", category: "Server", confidence: 82 });
  }
  if (serverHeader.includes("nginx")) {
    push({ name: "Nginx", category: "Server", confidence: 82 });
  }
  if (serverHeader.includes("litespeed")) {
    push({ name: "LiteSpeed", category: "Server", confidence: 82 });
  }
  if (serverHeader.includes("microsoft-iis")) {
    push({ name: "Microsoft IIS", category: "Server", confidence: 82 });
  }

  const civicPlusSignalPatterns = [
    /government websites by\s*civicplus/i,
    /connect\.civicplus\.com\/referral/i,
    /platform\.civicplus\.com/i,
    /cp-civicplus/i,
    /civicplusuniversity/i,
  ];
  const civicPlusMatches = civicPlusSignalPatterns.filter((pattern) =>
    pattern.test(html),
  ).length;
  if (civicPlusMatches > 0 || serverHeader.includes("civicplus")) {
    push({
      name: "CivicPlus",
      category: "Website Platform",
      confidence: Math.min(97, 80 + civicPlusMatches * 5),
    });
  }

  const generatorRegex =
    /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/gi;
  for (const match of html.matchAll(generatorRegex)) {
    const content = (match[1] || "").trim();
    const lower = content.toLowerCase();
    if (!content) continue;

    if (lower.includes("vbulletin")) {
      const version = content.match(/vbulletin\s*([\d.]+)/i)?.[1];
      push({
        name: "vBulletin",
        category: "Forum",
        version,
        confidence: 96,
      });
    }
    if (lower.includes("xenforo")) {
      const version = content.match(/xenforo\s*([\d.]+)/i)?.[1];
      push({
        name: "XenForo",
        category: "Forum",
        version,
        confidence: 95,
      });
    }
    if (lower.includes("wordpress")) {
      const version = content.match(/wordpress\s*([\d.]+)/i)?.[1];
      push({
        name: "WordPress",
        category: "CMS",
        version,
        confidence: 90,
      });
    }
    if (lower.includes("drupal")) {
      const version = content.match(/drupal\s*([\d.]+)/i)?.[1];
      push({
        name: "Drupal",
        category: "CMS",
        version,
        confidence: 92,
      });
    }
    if (lower.includes("joomla")) {
      const version = content.match(/joomla!?[\s-]*([\d.]+)/i)?.[1];
      push({
        name: "Joomla",
        category: "CMS",
        version,
        confidence: 92,
      });
    }
    if (lower.includes("ghost")) {
      const version = content.match(/ghost\s*([\d.]+)/i)?.[1];
      push({
        name: "Ghost",
        category: "CMS",
        version,
        confidence: 90,
      });
    }
    if (lower.includes("shopify")) {
      push({
        name: "Shopify",
        category: "Ecommerce",
        confidence: 92,
      });
    }
    if (lower.includes("wix")) {
      push({
        name: "Wix",
        category: "Website Builder",
        confidence: 92,
      });
    }
    if (lower.includes("squarespace")) {
      push({
        name: "Squarespace",
        category: "Website Builder",
        confidence: 92,
      });
    }
  }

  if (/wp-content|wp-includes|wp-json/i.test(html)) {
    push({
      name: "WordPress",
      category: "CMS",
      confidence: 80,
    });
  }
  if (/\/js\/xf\/|xenforo/i.test(html)) {
    push({
      name: "XenForo",
      category: "Forum",
      confidence: 80,
    });
  }
  if (/phpbb/i.test(html)) {
    push({
      name: "phpBB",
      category: "Forum",
      confidence: 80,
    });
  }
  if (/discourse/i.test(html)) {
    push({
      name: "Discourse",
      category: "Forum",
      confidence: 80,
    });
  }
  if (
    /google-analytics\.com\/analytics\.js|googletagmanager\.com\/gtag\/js/i.test(
      html,
    )
  ) {
    push({
      name: "Google Analytics",
      category: "Analytics",
      confidence: 78,
    });
  }
  if (/googletagmanager\.com\/gtm\.js/i.test(html)) {
    push({
      name: "Google Tag Manager",
      category: "Analytics",
      confidence: 78,
    });
  }
  if (
    /jquery(?:-[\d.]+)?(?:\.min)?\.js|window\.jQuery|\$\(document\)/i.test(html)
  ) {
    push({
      name: "jQuery",
      category: "JavaScript Library",
      confidence: 72,
    });
  }
  if (/bootstrap(?:\.min)?\.(?:js|css)/i.test(html)) {
    push({
      name: "Bootstrap",
      category: "UI Framework",
      confidence: 72,
    });
  }
  if (
    /react(-dom)?(?:\.production)?(?:\.min)?\.js|data-reactroot|__react/i.test(
      html,
    )
  ) {
    push({
      name: "React",
      category: "Framework",
      confidence: 72,
    });
  }
  if (/vue(?:\.runtime)?(?:\.min)?\.js|data-v-[a-z0-9]/i.test(html)) {
    push({
      name: "Vue.js",
      category: "Framework",
      confidence: 72,
    });
  }
  if (/_next\/static|__NEXT_DATA__/i.test(html)) {
    push({
      name: "Next.js",
      category: "Framework",
      confidence: 84,
    });
  }
  if (/_nuxt\/|__NUXT__/i.test(html)) {
    push({
      name: "Nuxt.js",
      category: "Framework",
      confidence: 84,
    });
  }

  return Array.from(detected.values()).sort(
    (a, b) => b.confidence - a.confidence,
  );
}

async function detectAdditionalWordPressSignals(
  domain: string,
  currentVersion: string | null,
  signals: Map<string, Set<string>>,
): Promise<string | null> {
  let bestVersion = currentVersion;

  try {
    const [feedResponse, atomResponse, loginResponse] =
      await Promise.allSettled([
        fetch(`https://${domain}/feed/`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3000),
        }),
        fetch(`https://${domain}/feed/atom/`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3000),
        }),
        fetch(`https://${domain}/wp-login.php`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3000),
        }),
      ]);

    if (feedResponse.status === "fulfilled" && feedResponse.value.ok) {
      const feedText = await feedResponse.value.text();
      const feedMatch = feedText.match(
        /<generator>https:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/i,
      );
      bestVersion = pickBestWordPressVersion(
        bestVersion,
        feedMatch?.[1] || null,
        "RSS feed",
        signals,
      );
    }

    if (atomResponse.status === "fulfilled" && atomResponse.value.ok) {
      const atomText = await atomResponse.value.text();
      const atomVersionAttr = atomText.match(
        /<generator[^>]*version="([\d.]+)"/i,
      );
      const atomTagVersion = atomText.match(
        /<generator[^>]*uri="https:\/\/wordpress\.org\/"[^>]*>([\d.]+)<\/generator>/i,
      );
      bestVersion = pickBestWordPressVersion(
        bestVersion,
        atomVersionAttr?.[1] || atomTagVersion?.[1] || null,
        "Atom feed",
        signals,
      );
    }

    if (loginResponse.status === "fulfilled" && loginResponse.value.ok) {
      const loginHtml = await loginResponse.value.text();
      const loginVersionMatch = loginHtml.match(
        /wp-admin\/(?:load-styles\.php[^"'>]*|css\/login(?:\.min)?\.css)\?[^"'>]*ver=([\d.]+)/i,
      );
      bestVersion = pickBestWordPressVersion(
        bestVersion,
        loginVersionMatch?.[1] || null,
        "wp-login core assets",
        signals,
      );
    }
  } catch {
    console.log(
      "[Technology Scan] Additional WordPress signal checks failed:",
      "An internal error occurred",
    );
  }

  return bestVersion;
}

/**
 * Technology Scanner API
 * Detects WordPress, PHP, server type, and hosting provider
 */
async function performTechnologyScan(domain: string) {
  console.log(`[Technology Scan] Starting scan for: ${domain}`);

  // Fetch the website to detect technologies
  const url = `https://${domain}`;
  let wordpressDetected = false;
  let wordpressVersion: string | null = null;
  let serverType = "unknown";
  let phpVersion: string | null = null;
  let isWebsiteBuilder = false;
  let builderType: string | null = null;
  let managedHosting: string | null = null;
  let hostingType: "managed" | "cpanel" | "unknown" = "unknown";
  let detectedPlugins: string[] = [];
  let additionalTechnologies: AdditionalTechnologySignal[] = [];
  let isWooCommerce = false;
  const wordpressVersionSignals = new Map<string, Set<string>>();
  let wpJsonPluginScanAttempted = false;
  let wordpressDetectionScore = 0;
  let wordpressStrongSignalCount = 0;
  const wordpressDetectionSignals = new Set<string>();
  let wordpressVisibility: "full" | "limited" = "full";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HostingInfo/1.0)",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const headers = response.headers;
    const htmlLower = html.toLowerCase();
    additionalTechnologies = extractAdditionalTechnologies(html, headers);
    const homepageStatus = response.status;
    if (homepageStatus === 401 || homepageStatus === 403) {
      wordpressVisibility = "limited";
    }

    // Get server header early for website builder detection
    const serverHeader = headers.get("server")?.toLowerCase();
    const setCookieHeader = headers.get("set-cookie")?.toLowerCase() || "";

    const hasAspNetRuntimeSignals =
      Boolean(headers.get("x-aspnet-version")) ||
      Boolean(headers.get("x-aspnetmvc-version")) ||
      Boolean(headers.get("x-powered-by")?.toLowerCase().includes("asp.net")) ||
      setCookieHeader.includes("asp.net_sessionid") ||
      /__viewstate|__eventvalidation|webresource\.axd|scriptresource\.axd/i.test(
        html,
      );
    if (hasAspNetRuntimeSignals && serverType === "unknown") {
      serverType = "iis";
      hostingType = "cpanel";
      console.log(
        "[Technology Scan] ASP.NET runtime signals detected via headers/cookies/html",
      );
    }

    // PRIORITY 1: Check for WordPress and plugins FIRST (before website builders)
    // This prevents false positives where WP sites get misidentified as builders
    const htmlWordPressDetection = detectWordPressFromHtml(html);
    wordpressDetectionScore += htmlWordPressDetection.score;
    wordpressStrongSignalCount += htmlWordPressDetection.strongSignalCount;
    for (const signal of htmlWordPressDetection.matchedSignals) {
      wordpressDetectionSignals.add(signal);
    }
    const isWordPress = htmlWordPressDetection.detected;

    const headerWordPressDetection = inferWordPressFromHeaders({
      linkHeader: headers.get("link"),
      pingbackHeader: headers.get("x-pingback"),
      redirectByHeader: headers.get("x-redirect-by"),
    });
    wordpressDetectionScore += headerWordPressDetection.score;
    wordpressStrongSignalCount += headerWordPressDetection.strongSignalCount;
    for (const signal of headerWordPressDetection.matchedSignals) {
      wordpressDetectionSignals.add(signal);
    }
    if (!wordpressDetected && headerWordPressDetection.detected) {
      wordpressDetected = true;
      if (serverType === "unknown") {
        serverType = "wordpress";
      }
      console.log(
        `[Technology Scan] WordPress inferred from headers: ${headerWordPressDetection.matchedSignals.join(", ")}`,
      );
    }

    if (isWordPress) {
      wordpressDetected = true;
      if (htmlWordPressDetection.matchedSignals.length > 0) {
        console.log(
          `[Technology Scan] WordPress HTML signals: ${htmlWordPressDetection.matchedSignals.join(", ")}`,
        );
      }

      // Try to extract WordPress version from meta generator
      const versionMatch = html.match(/WordPress\s+([\d.]+)/i);
      if (versionMatch) {
        wordpressVersion = pickBestWordPressVersion(
          wordpressVersion,
          versionMatch[1],
          "meta tag",
          wordpressVersionSignals,
        );
      }

      // Advanced WordPress version detection (if meta tag is hidden)
      if (!wordpressVersion) {
        // Method 1: Check RSS feed (most reliable)
        try {
          const feedResponse = await fetch(`https://${domain}/feed/`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(3000), // 3 second timeout
          });
          if (feedResponse.ok) {
            const feedText = await feedResponse.text();
            const feedMatch = feedText.match(
              /<generator>https:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/i,
            );
            if (feedMatch) {
              wordpressVersion = pickBestWordPressVersion(
                wordpressVersion,
                feedMatch[1],
                "RSS feed",
                wordpressVersionSignals,
              );
            }
          }
        } catch (e) {
          console.log(
            "[Technology Scan] RSS feed check failed:",
            e instanceof Error ? e.message : "unknown error",
          );
        }

        // Method 2: Check CSS/JS file versions (if RSS failed)
        if (!wordpressVersion) {
          // Look for wp-embed.min.js specifically (more reliable than jquery)
          const wpEmbedMatch = html.match(
            /wp-includes\/js\/wp-embed\.min\.js\?ver=([\d.]+)/i,
          );
          if (wpEmbedMatch) {
            const version = wpEmbedMatch[1];
            // Validate it's a real WordPress version (X.Y or X.Y.Z format)
            // AND in the 4.0-10.0 range (wp-embed was added in WP 4.4)
            if (
              /^\d+\.\d+(\.\d+)?$/.test(version) &&
              parseFloat(version) >= 4.0 &&
              parseFloat(version) <= 10.0
            ) {
              wordpressVersion = pickBestWordPressVersion(
                wordpressVersion,
                version,
                "wp-embed.js",
                wordpressVersionSignals,
              );
            }
          }
        }

        // Method 3: Try wp-json API (least reliable, often disabled)
        if (!wordpressVersion) {
          try {
            wpJsonPluginScanAttempted = true;
            const apiResponse = await fetch(`https://${domain}/wp-json/`, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(3000), // 3 second timeout
            });
            if (apiResponse.ok) {
              const apiPayload = await apiResponse.json();
              const namespacePlugins =
                extractPluginNamesFromWpJsonPayload(apiPayload);
              for (const pluginName of namespacePlugins) {
                if (!detectedPlugins.includes(pluginName)) {
                  detectedPlugins.push(pluginName);
                }
              }
              if (namespacePlugins.length > 0) {
                console.log(
                  `[Technology Scan] WordPress plugins inferred from WP REST namespaces: ${namespacePlugins.join(", ")}`,
                );
              }
              // Some sites expose version in namespaces or custom fields
              // But most don't for security reasons
              console.log(
                "[Technology Scan] wp-json API accessible but version not exposed",
              );
            }
          } catch (e) {
            console.log(
              "[Technology Scan] wp-json API check failed:",
              e instanceof Error ? e.message : "unknown error",
            );
          }
        }
      }

      // Detect WordPress plugins
      // WooCommerce (e-commerce plugin)
      if (
        htmlLower.includes("woocommerce") ||
        htmlLower.includes("wc-") ||
        htmlLower.includes("/woocommerce/") ||
        htmlLower.includes('class="woocommerce') ||
        html.match(/wp-content\/plugins\/woocommerce/i)
      ) {
        detectedPlugins.push("WooCommerce");
        isWooCommerce = true;
      }

      // Elementor (page builder)
      if (
        htmlLower.includes("elementor") ||
        htmlLower.includes("elementor-element") ||
        html.match(/wp-content\/plugins\/elementor/i)
      ) {
        detectedPlugins.push("Elementor");
      }

      // Yoast SEO
      if (
        htmlLower.includes("yoast") ||
        htmlLower.includes("yoast seo") ||
        html.match(/wp-content\/plugins\/wordpress-seo/i)
      ) {
        detectedPlugins.push("Yoast SEO");
      }

      // Contact Form 7
      if (
        htmlLower.includes("wpcf7") ||
        html.match(/wp-content\/plugins\/contact-form-7/i)
      ) {
        detectedPlugins.push("Contact Form 7");
      }

      // Jetpack
      if (
        htmlLower.includes("jetpack") ||
        html.match(/wp-content\/plugins\/jetpack/i)
      ) {
        detectedPlugins.push("Jetpack");
      }

      // WPBakery Page Builder
      if (
        htmlLower.includes("wpb_") ||
        htmlLower.includes("vc_") ||
        html.match(/wp-content\/plugins\/js_composer/i)
      ) {
        detectedPlugins.push("WPBakery Page Builder");
      }

      // Divi Builder
      if (
        htmlLower.includes("et_pb_") ||
        htmlLower.includes("divi-") ||
        html.match(/wp-content\/themes\/Divi/i)
      ) {
        detectedPlugins.push("Divi Builder");
      }

      // Gravity Forms
      if (
        htmlLower.includes("gform") ||
        html.match(/wp-content\/plugins\/gravityforms/i)
      ) {
        detectedPlugins.push("Gravity Forms");
      }

      // Advanced Custom Fields (ACF)
      if (
        htmlLower.includes("acf-") ||
        html.match(/wp-content\/plugins\/advanced-custom-fields/i)
      ) {
        detectedPlugins.push("Advanced Custom Fields");
      }

      // Slider Revolution
      if (
        htmlLower.includes("revslider") ||
        html.match(/wp-content\/plugins\/revslider/i)
      ) {
        detectedPlugins.push("Slider Revolution");
      }

      // Wordfence Security
      if (
        htmlLower.includes("wordfence") ||
        html.match(/wp-content\/plugins\/wordfence/i)
      ) {
        detectedPlugins.push("Wordfence Security");
      }

      // All in One SEO
      if (
        htmlLower.includes("aioseo") ||
        html.match(/wp-content\/plugins\/all-in-one-seo-pack/i)
      ) {
        detectedPlugins.push("All in One SEO");
      }

      // WP Rocket (caching)
      if (
        htmlLower.includes("wp-rocket") ||
        html.match(/wp-content\/plugins\/wp-rocket/i)
      ) {
        detectedPlugins.push("WP Rocket");
      }

      // MonsterInsights (Google Analytics)
      if (
        htmlLower.includes("monsterinsights") ||
        html.match(/wp-content\/plugins\/google-analytics-for-wordpress/i)
      ) {
        detectedPlugins.push("MonsterInsights");
      }

      // Rank Math SEO
      if (
        htmlLower.includes("rank-math") ||
        html.match(/wp-content\/plugins\/seo-by-rank-math/i)
      ) {
        detectedPlugins.push("Rank Math SEO");
      }

      // WP Super Cache
      if (
        htmlLower.includes("wp-super-cache") ||
        html.match(/wp-content\/plugins\/wp-super-cache/i)
      ) {
        detectedPlugins.push("WP Super Cache");
      }

      // Smush (image optimization)
      if (
        htmlLower.includes("wp-smush") ||
        html.match(/wp-content\/plugins\/wp-smushit/i)
      ) {
        detectedPlugins.push("Smush");
      }

      // UpdraftPlus (backup)
      if (
        htmlLower.includes("updraft") ||
        html.match(/wp-content\/plugins\/updraftplus/i)
      ) {
        detectedPlugins.push("UpdraftPlus");
      }

      // WP Forms
      if (
        htmlLower.includes("wpforms") ||
        html.match(/wp-content\/plugins\/wpforms/i)
      ) {
        detectedPlugins.push("WPForms");
      }

      // Easy Digital Downloads
      if (
        htmlLower.includes("edd-") ||
        html.match(/wp-content\/plugins\/easy-digital-downloads/i)
      ) {
        detectedPlugins.push("Easy Digital Downloads");
      }

      // MemberPress
      if (
        htmlLower.includes("mepr-") ||
        html.match(/wp-content\/plugins\/memberpress/i)
      ) {
        detectedPlugins.push("MemberPress");
      }

      // LearnDash
      if (
        htmlLower.includes("learndash") ||
        html.match(/wp-content\/plugins\/sfwd-lms/i)
      ) {
        detectedPlugins.push("LearnDash");
      }

      // Generic plugin slug extraction from asset URLs (BuiltWith-style path analysis).
      const htmlInferredPlugins = extractPluginNamesFromHtml(html);
      for (const pluginName of htmlInferredPlugins) {
        if (!detectedPlugins.includes(pluginName)) {
          detectedPlugins.push(pluginName);
        }
      }

      // If we still have a thin plugin set, probe wp-json namespaces for additional plugin signals.
      if (!wpJsonPluginScanAttempted && detectedPlugins.length < 8) {
        try {
          wpJsonPluginScanAttempted = true;
          const wpJsonResponse = await fetch(`https://${domain}/wp-json/`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(3000),
          });
          if (wpJsonResponse.ok) {
            const wpJsonPayload = await wpJsonResponse.json();
            const namespacePlugins =
              extractPluginNamesFromWpJsonPayload(wpJsonPayload);
            for (const pluginName of namespacePlugins) {
              if (!detectedPlugins.includes(pluginName)) {
                detectedPlugins.push(pluginName);
              }
            }
            if (namespacePlugins.length > 0) {
              console.log(
                `[Technology Scan] WordPress plugins added from wp-json probe: ${namespacePlugins.join(", ")}`,
              );
            }
          }
        } catch (wpJsonProbeError) {
          console.log(
            "[Technology Scan] wp-json plugin enrichment failed:",
            wpJsonProbeError instanceof Error
              ? wpJsonProbeError.message
              : "unknown error",
          );
        }
      }

      detectedPlugins = Array.from(new Set(detectedPlugins));

      console.log(
        `[Technology Scan] WordPress detected with plugins: ${detectedPlugins.join(", ") || "none"}`,
      );

      // Set initial server type for WordPress sites
      // This will be overridden later if managed hosting is detected
      if (serverType === "unknown") {
        if (isWooCommerce) {
          serverType = "wordpress-woocommerce";
        } else {
          serverType = "wordpress";
        }
      }
    }

    // Fallback probes help identify WordPress even when the homepage HTML is blocked/limited.
    if (!wordpressDetected) {
      try {
        const endpointProbe = await probeWordPressEndpoints(domain);
        wordpressDetectionScore += endpointProbe.score;
        wordpressStrongSignalCount += endpointProbe.strongSignalCount;
        for (const signal of endpointProbe.matchedSignals) {
          wordpressDetectionSignals.add(signal);
        }
        if (endpointProbe.detected) {
          wordpressDetected = true;
          wordpressVersion = pickBestWordPressVersion(
            wordpressVersion,
            endpointProbe.version,
            "endpoint probe",
            wordpressVersionSignals,
          );
          if (serverType === "unknown") {
            serverType = "wordpress";
          }
          console.log(
            `[Technology Scan] WordPress inferred from endpoint probes: ${endpointProbe.matchedSignals.join(", ")}`,
          );
        }
      } catch (probeError) {
        console.log(
          "[Technology Scan] WordPress endpoint probes failed:",
          probeError instanceof Error ? probeError.message : "unknown error",
        );
      }
    }

    const builderDetection = detectWebsiteBuilderType(
      html,
      domain,
      serverHeader,
    );
    const applyWordPressComBuilderOverride =
      wordpressDetected &&
      isWordPressComDomain(domain) &&
      builderDetection.builderType === "WordPress.com";

    // PRIORITY 2: Check for website builders (only if NOT WordPress),
    // except WordPress.com which is both WordPress and managed builder.
    if (
      (!wordpressDetected || applyWordPressComBuilderOverride) &&
      builderDetection.isWebsiteBuilder
    ) {
      isWebsiteBuilder = true;
      builderType = builderDetection.builderType;
      serverType = "website-builder";

      if (builderDetection.builderType) {
        console.log(
          `[Technology Scan] Website builder detected: ${builderDetection.builderType} (${builderDetection.matchedSignals.join(", ")})`,
        );
      }

      if (applyWordPressComBuilderOverride) {
        console.log(
          "[Technology Scan] Applied WordPress.com dual-classification (WordPress + managed builder)",
        );
      }
    }
    if (!isWebsiteBuilder) {
      // Detect managed WordPress hosting by headers
      // Check for managed WordPress hosting signatures
      const allHeaders: Record<string, string> = {};
      headers.forEach((value, key) => {
        allHeaders[key.toLowerCase()] = value.toLowerCase();
      });

      // GoDaddy Managed WordPress
      if (
        allHeaders["x-gateway-cache-key"] ||
        allHeaders["x-gateway-cache-status"] ||
        allHeaders["x-gateway-request-id"]
      ) {
        managedHosting = "GoDaddy Managed WordPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
        console.log(
          "[Technology Scan] Detected GoDaddy Managed WordPress via x-gateway headers",
        );
      }
      // WP Engine
      else if (
        allHeaders["x-powered-by"]?.includes("wp engine") ||
        allHeaders["wpe-backend"]
      ) {
        managedHosting = "WP Engine";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Kinsta
      else if (allHeaders["x-kinsta-cache"]) {
        managedHosting = "Kinsta";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Flywheel
      else if (
        allHeaders["x-fw-hash"] ||
        allHeaders["x-fw-serve"] ||
        allHeaders["x-fw-type"]
      ) {
        managedHosting = "Flywheel";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Pressable
      else if (allHeaders["x-pressable-cache"]) {
        managedHosting = "Pressable";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // SiteGround - ONLY mark as managed if on GoGeek/Cloud (has x-sg-id)
      // Regular shared hosting has x-sg-cache but is still cPanel
      else if (allHeaders["x-sg-id"] && allHeaders["x-sg-cache"]) {
        managedHosting = "SiteGround Managed";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Bluehost - Cache header alone doesn't mean managed WordPress
      // Only their WP Pro plans are truly managed
      else if (
        allHeaders["x-bluehost-cache"] &&
        allHeaders["x-bluehost-managed"]
      ) {
        managedHosting = "Bluehost Managed WordPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Pagely
      else if (allHeaders["x-pagely-cache"]) {
        managedHosting = "Pagely";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Cloudways
      else if (allHeaders["x-breeze"]) {
        managedHosting = "Cloudways";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // WordPress.com VIP
      else if (
        allHeaders["x-vip"] ||
        allHeaders["x-automattic"] ||
        serverHeader?.includes("automattic")
      ) {
        managedHosting = "WordPress.com VIP";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Pantheon
      else if (
        allHeaders["x-pantheon-styx-hostname"] ||
        allHeaders["x-pantheon-endpoint"] ||
        allHeaders["x-styx-req-id"]
      ) {
        managedHosting = "Pantheon";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Platform.sh
      else if (
        allHeaders["x-platform-cluster"] ||
        allHeaders["x-platform-router"] ||
        allHeaders["x-platform-cache"]
      ) {
        managedHosting = "Platform.sh";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // AWS Lightsail WordPress
      else if (
        allHeaders["x-lightsail-endpoint"] ||
        (allHeaders["x-amz-cf-id"] &&
          allHeaders["x-cache"]?.includes("bitnami"))
      ) {
        managedHosting = "AWS Lightsail WordPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // Hostinger - Most plans are shared cPanel, not managed WordPress
      // Only mark as managed if has specific managed WordPress indicators
      else if (allHeaders["x-hostinger-managed-wp"]) {
        managedHosting = "Hostinger Managed WordPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // DreamHost - DreamPress is managed, regular hosting is cPanel
      else if (
        allHeaders["x-dreampress"] ||
        allHeaders["x-dh-cache"]?.includes("dreampress")
      ) {
        managedHosting = "DreamHost DreamPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }
      // A2 Hosting - Turbo plans are optimized but still cPanel
      // Only mark as managed if explicitly managed WordPress
      else if (allHeaders["x-a2-managed-wp"]) {
        managedHosting = "A2 Managed WordPress";
        hostingType = "managed";
        serverType = "managed-wordpress";
      }

      // CRITICAL: Managed hosting detection requires BOTH headers AND verification
      // Many shared hosting providers use similar headers, so we need to be strict

      // If not managed hosting, detect traditional server type
      if (!managedHosting && serverHeader) {
        if (serverHeader.includes("apache")) {
          serverType = "apache";
          hostingType = "cpanel";
        } else if (serverHeader.includes("nginx")) {
          serverType = "nginx";
          hostingType = "cpanel";
        } else if (serverHeader.includes("litespeed")) {
          serverType = "litespeed";
          hostingType = "cpanel";
        } else if (serverHeader.includes("microsoft-iis")) {
          serverType = "iis";
          hostingType = "cpanel";
        }
      }

      // Detect shared hosting providers (cPanel) even if not managed WordPress
      // This helps identify the provider while correctly marking as cPanel
      if (!managedHosting && hostingType === "cpanel") {
        // SiteGround shared hosting (has cache but not managed)
        if (allHeaders["x-sg-cache"] && !allHeaders["x-sg-id"]) {
          // Provider detected but it's shared cPanel, not managed
          console.log(
            "[Technology Scan] Detected SiteGround shared hosting (cPanel)",
          );
        }
        // Bluehost shared hosting
        else if (
          allHeaders["x-bluehost-cache"] &&
          !allHeaders["x-bluehost-managed"]
        ) {
          console.log(
            "[Technology Scan] Detected Bluehost shared hosting (cPanel)",
          );
        }
        // Hostinger shared hosting
        else if (
          allHeaders["x-hostinger-cache"] ||
          serverHeader?.includes("hostinger")
        ) {
          console.log(
            "[Technology Scan] Detected Hostinger shared hosting (cPanel)",
          );
        }
        // DreamHost shared hosting
        else if (
          (allHeaders["x-dh-cache"] || serverHeader?.includes("dreamhost")) &&
          !allHeaders["x-dreampress"]
        ) {
          console.log(
            "[Technology Scan] Detected DreamHost shared hosting (cPanel)",
          );
        }
        // A2 Hosting shared/turbo
        else if (
          allHeaders["x-turbo-charged-by"]?.includes("a2") ||
          allHeaders["x-a2-cache"]
        ) {
          console.log(
            "[Technology Scan] Detected A2 Hosting shared/turbo (cPanel)",
          );
        }
      }

      // Detect PHP version from headers
      const phpHeader = headers.get("x-powered-by")?.toLowerCase();
      if (phpHeader && phpHeader.includes("php")) {
        const phpMatch = phpHeader.match(/php\/([\d.]+)/i);
        if (phpMatch) {
          phpVersion = phpMatch[1];
        }
      }

      // Alternative: Check for PHP in HTML (some sites expose version)
      if (!phpVersion) {
        const phpHtmlMatch = html.match(/PHP\/([\d.]+)/i);
        if (phpHtmlMatch) {
          phpVersion = phpHtmlMatch[1];
        }
      }

      // Alternative: Check Server header for PHP info
      if (!phpVersion && serverHeader) {
        const phpServerMatch = serverHeader.match(/php\/([\d.]+)/i);
        if (phpServerMatch) {
          phpVersion = phpServerMatch[1];
        }
      }

      // Final pass: query additional public endpoints and keep the strongest version signal.
      if (wordpressDetected) {
        wordpressVersion = await detectAdditionalWordPressSignals(
          domain,
          wordpressVersion,
          wordpressVersionSignals,
        );
      }
    }
  } catch (error) {
    console.error("[Technology Scan] Fetch error:", error);
    // Continue with defaults if fetch fails
  }

  // Control Panel Logic:
  // Recommend migration to Managed WordPress if:
  // 1. WordPress is detected on Apache/Nginx/LiteSpeed (cPanel/traditional hosting indicator)
  // 2. WordPress version is modern enough (>= 5.0) AND PHP is modern enough (>= 7.4)
  // 3. Site would benefit from managed platform (better performance, fewer breaks, automatic updates)
  // 4. NOT a website builder (builders are already managed platforms)

  let controlPanelRecommendation:
    | "cpanel"
    | "managed-upgrade"
    | "needs-updates"
    | "paid-support"
    | "unknown" = "unknown";
  let controlPanelReason = "No specific control panel recommendation";
  let controlPanelConfidence = 0;
  const migrationBenefits: string[] = [];
  let needsPaidSupport = false;

  // Skip recommendations for website builders (they're already managed)
  if (isWebsiteBuilder) {
    controlPanelRecommendation = "unknown";
    controlPanelReason =
      "Website builder platform - fully managed and maintained";
    controlPanelConfidence = 0;
  }
  // Skip recommendations for managed WordPress hosting (already optimized)
  else if (hostingType === "managed") {
    controlPanelRecommendation = "unknown";
    controlPanelReason = `Already on ${managedHosting} - fully managed WordPress hosting with automatic updates and optimization`;
    controlPanelConfidence = 0;
  }
  // Check for WordPress on traditional hosting (Apache, Nginx, LiteSpeed)
  else if (
    wordpressDetected &&
    (serverType === "apache" ||
      serverType === "nginx" ||
      serverType === "litespeed")
  ) {
    // Parse WordPress version (major.minor format)
    const wpVersionNum = wordpressVersion
      ? parseFloat(wordpressVersion.split(".").slice(0, 2).join("."))
      : 0;
    const phpVersionNum = phpVersion
      ? parseFloat(phpVersion.split(".").slice(0, 2).join("."))
      : 0;

    // HOSTINGINFO MANAGED WORDPRESS MIGRATION STANDARDS:
    // WordPress >= 6.6 = meets HostingInfo standards for migration
    // PHP >= 7.4 = meets HostingInfo standards for migration
    const meetsWPStandard = wpVersionNum >= 6.6;
    const meetsPHPStandard = phpVersionNum >= 7.4;

    // NEEDS UPDATES BEFORE MIGRATION:
    // WordPress 5.0-6.5 = needs update to 6.6+
    // PHP 7.0-7.3 = needs update to 7.4+
    const needsWPUpdate =
      wpVersionNum > 0 && wpVersionNum >= 5.0 && wpVersionNum < 6.6;
    const needsPHPUpdate =
      phpVersionNum > 0 && phpVersionNum >= 7.0 && phpVersionNum < 7.4;

    // TOO OLD TO MIGRATE (NEEDS PAID SUPPORT):
    // WordPress < 5.0 = too old (needs paid support first)
    // PHP < 7.0 = too old (needs paid support first)
    const isTooOldWP = wpVersionNum > 0 && wpVersionNum < 5.0;
    const isTooOldPHP = phpVersionNum > 0 && phpVersionNum < 7.0;

    if (isTooOldWP || isTooOldPHP) {
      // Site is too outdated for easy migration - recommend paid support
      controlPanelRecommendation = "paid-support";
      controlPanelReason =
        "Site requires significant updates before migration - professional assistance recommended";
      controlPanelConfidence = 95;
      needsPaidSupport = true;
      migrationBenefits.push("Update to modern WordPress and PHP versions");
      migrationBenefits.push("Security patches and vulnerability fixes");
      migrationBenefits.push("Prepare site for Managed WordPress migration");
    } else if (meetsWPStandard && meetsPHPStandard) {
      // ✅ PERFECT CANDIDATE: Meets HostingInfo standards (WP >= 6.6, PHP >= 7.4)
      // These sites can migrate easily and will benefit greatly
      controlPanelRecommendation = "managed-upgrade";
      controlPanelReason = `WordPress site on ${serverType} detected - Perfect candidate for Managed WordPress! Meets all migration standards (WP ${wordpressVersion}, PHP ${phpVersion}).`;
      controlPanelConfidence = 95;

      // Build migration benefits list
      migrationBenefits.push("🚀 3x faster performance with built-in caching");
      migrationBenefits.push("🔄 Automatic WordPress core updates");
      migrationBenefits.push("🛡️ Enhanced security and malware scanning");
      migrationBenefits.push("💾 Automatic daily backups");
      migrationBenefits.push("⚡ Global CDN included");
      migrationBenefits.push("📈 99.9% uptime guarantee");
      migrationBenefits.push("🎯 Expert WordPress support 24/7");
      migrationBenefits.push("🔧 Fewer control panel issues and breaks");
    } else if (needsWPUpdate || needsPHPUpdate) {
      // ⚠️ NEEDS UPDATES: Close to standards but needs minor updates
      // Don't recommend migration yet - they need to update first
      controlPanelRecommendation = "needs-updates";
      controlPanelReason = `WordPress site needs updates before migration to Managed WordPress. Required: WP 6.6+ and PHP 7.4+`;
      controlPanelConfidence = 85;

      // Build update requirements list
      if (needsWPUpdate) {
        migrationBenefits.push(
          `⬆️ Update WordPress to v6.6+ (currently v${wordpressVersion})`,
        );
      }
      if (needsPHPUpdate) {
        migrationBenefits.push(
          `⬆️ Update PHP to v7.4+ (currently v${phpVersion})`,
        );
      }
      migrationBenefits.push("Then migrate to Managed WordPress for:");
      migrationBenefits.push("🚀 3x faster performance");
      migrationBenefits.push("🔄 Automatic updates");
      migrationBenefits.push("🛡️ Enhanced security");
      migrationBenefits.push("🔧 Fewer control panel issues");
    } else {
      // Unknown versions - can't determine eligibility
      controlPanelRecommendation = "unknown";
      controlPanelReason = `WordPress site on ${serverType} detected - Unable to determine migration eligibility (version info unavailable)`;
      controlPanelConfidence = 50;
    }
  }

  const wpVersionMeta = getWordPressVersionMetadata(
    wordpressVersion,
    wordpressVersionSignals,
  );
  const wordpressDetectionSignalList = Array.from(wordpressDetectionSignals);
  const wordpressCertainty = deriveWordPressCertainty({
    detected: wordpressDetected,
    score: wordpressDetectionScore,
    strongSignalCount: wordpressStrongSignalCount,
    signalCount: wordpressDetectionSignalList.length,
    visibilityBlocked: wordpressVisibility === "limited",
  });
  const wordpressDetectionConfidence =
    wordpressCertainty === "confirmed"
      ? 92
      : wordpressCertainty === "likely"
        ? 78
        : 0;
  const wordpressMethods = wordpressDetected
    ? Array.from(
        new Set<string>([
          ...wordpressDetectionSignalList,
          ...wpVersionMeta.selectedSources,
        ]),
      )
    : [];

  const normalizedBuilderType = toNonEmptyString(builderType);
  const normalizedManagedHosting = toNonEmptyString(managedHosting);

  const result = {
    wordpress: {
      detected: wordpressDetected,
      version: wordpressDetected ? wordpressVersion : null,
      confidence: wordpressDetected
        ? Math.max(wordpressDetectionConfidence, wpVersionMeta.confidence)
        : 0,
      methods: wordpressMethods,
      certainty: wordpressCertainty,
      detectionScore: wordpressDetectionScore,
      detectionSignalCount: wordpressDetectionSignalList.length,
      detectionSignals: wordpressDetectionSignalList,
      detectionVisibility: wordpressVisibility,
      versionReliability: wordpressDetected
        ? wpVersionMeta.reliability
        : "unknown",
      versionConflicted: wordpressDetected ? wpVersionMeta.conflicted : false,
      versionSignalCount: wordpressDetected ? wpVersionMeta.signalCount : 0,
      versionCandidates: wordpressDetected ? wpVersionMeta.candidates : [],
      versionEstimated: wordpressDetected,
      versionUncertain: wordpressDetected ? wpVersionMeta.isUncertain : true,
      pluginCount: detectedPlugins.length,
      plugins: detectedPlugins.length > 0 ? detectedPlugins : undefined,
      isWooCommerce: isWooCommerce,
    },
    php: {
      detected: phpVersion !== null,
      version: phpVersion,
      confidence: phpVersion ? 70 : 0,
      methods: phpVersion ? ["x-powered-by"] : [],
    },
    server: {
      type: serverType,
      confidence: serverType !== "unknown" ? 90 : 0,
      methods: serverType !== "unknown" ? ["server-header"] : [],
      isWebsiteBuilder: isWebsiteBuilder,
      builderType: normalizedBuilderType,
    },
    hosting: {
      provider: normalizedManagedHosting || normalizedBuilderType || "Unknown",
      type: hostingType,
      isManagedWordPress: hostingType === "managed",
      confidence: normalizedManagedHosting || normalizedBuilderType ? 95 : 0,
      methods: normalizedManagedHosting
        ? ["x-headers"]
        : normalizedBuilderType
          ? ["html-signature"]
          : [],
    },
    controlPanel: {
      recommendation: controlPanelRecommendation,
      reason: controlPanelReason,
      confidence: controlPanelConfidence,
      migrationBenefits:
        migrationBenefits.length > 0 ? migrationBenefits : undefined,
      needsPaidSupport: needsPaidSupport,
    },
    technologies: additionalTechnologies,
  };

  console.log(`[Technology Scan] Complete for: ${domain}`);
  return result;
}

type TechnologyScanResult = Awaited<ReturnType<typeof performTechnologyScan>>;

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Use cache-aside pattern
    const cachedResult = await getOrSet(
      "technology",
      domain,
      async () => {
        return await performTechnologyScan(domain);
      },
      TECHNOLOGY_CACHE_SUFFIX,
    );
    const result = normalizeLegacyBuilderLabels(cachedResult);

    // Detect what needs retry
    const retryFields = detectRetryNeeds(result);

    // Add cache metadata and retry metadata
    const response = {
      ...result,
      _cache: {
        cached: true,
        timestamp: new Date().toISOString(),
      },
      ...(retryFields.length > 0 && {
        _retry: {
          needed: true,
          retryId: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fields: retryFields,
          estimatedTime: calculateEstimatedTime(retryFields),
          priority: calculatePriority(retryFields),
        },
      }),
    };

    if (retryFields.length > 0) {
      console.log(`[Technology Scan] Retry needed for ${domain}:`, retryFields);
    }

    return res.json(response);
  } catch (error) {
    console.error("[Technology Scan] Error:", error);
    return res.status(500).json({
      error: "Technology scan failed",
      message: "An internal error occurred",
    });
  }
}

function normalizeLegacyBuilderLabels(
  result: TechnologyScanResult,
): TechnologyScanResult {
  const normalized = {
    ...result,
    server: result.server ? { ...result.server } : result.server,
    hosting: result.hosting ? { ...result.hosting } : result.hosting,
  };

  if (normalized.server?.builderType === "HostingInfo Website Builder") {
    normalized.server.builderType = "GoDaddy Website Builder";
  }

  if (normalized.hosting?.provider === "HostingInfo Website Builder") {
    normalized.hosting.provider = "GoDaddy Website Builder";
  }

  if (normalized.hosting?.provider === "HostingInfo Managed WordPress") {
    normalized.hosting.provider = "GoDaddy Managed WordPress";
  }

  if (
    typeof normalized.server?.builderType === "string" &&
    normalized.server.builderType.trim().length === 0
  ) {
    normalized.server.builderType = null;
  }

  if (
    typeof normalized.hosting?.provider === "string" &&
    normalized.hosting.provider.trim().length === 0
  ) {
    normalized.hosting.provider = "Unknown";
  }

  if (normalized.hosting?.provider) {
    normalized.hosting.provider =
      normalizeHostingProviderLabel(normalized.hosting.provider) || "Unknown";
  }

  return normalized;
}

/**
 * Detect which fields need retry
 */
function detectRetryNeeds(result: TechnologyScanResult): string[] {
  const needs: string[] = [];

  // WordPress detected but no version
  if (result.wordpress?.detected && !result.wordpress?.version) {
    needs.push("wordpress.version");
  }

  // PHP detected but no version
  if (result.php?.detected && !result.php?.version) {
    needs.push("php.version");
  }

  // Intentionally skip automatic server.version retries.
  // Most hosts suppress server version headers, which caused noisy retry traffic
  // without improving results.

  return needs;
}

/**
 * Calculate estimated time for retry
 */
function calculateEstimatedTime(fields: string[]): number {
  let time = 0;

  if (fields.includes("wordpress.version")) time += 10; // 5s delay + 5s retry
  if (fields.includes("php.version")) time += 6; // 3s delay + 3s retry
  if (fields.includes("server.version")) time += 4; // 2s delay + 2s retry

  return time;
}

/**
 * Calculate priority for retry
 */
function calculatePriority(fields: string[]): "high" | "medium" | "low" {
  if (fields.includes("wordpress.version") || fields.includes("php.version")) {
    return "high"; // Critical for migration decisions
  }
  if (fields.includes("server.version")) {
    return "medium"; // Nice to have
  }
  return "low";
}
