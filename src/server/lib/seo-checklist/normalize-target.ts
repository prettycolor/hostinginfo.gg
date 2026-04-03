/**
 * Target Normalization Module
 * Normalizes input domain/URL and resolves final URL with redirect chain
 */

import { SEO_CHECKLIST_CONFIG } from "./config.js";
import type { NormalizedTarget } from "./types.js";
import { assertPublicDomain } from "../ssrf-protection.js";

/**
 * Normalize target domain/URL
 */
export async function normalizeTarget(
  input: string,
): Promise<NormalizedTarget> {
  // Remove whitespace
  let url = input.trim();

  // Add protocol if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Parse URL to get host
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;

  // SSRF protection: ensure domain doesn't resolve to internal IP
  await assertPublicDomain(host);

  // Follow redirects and capture chain
  const { finalUrl, redirectChain } = await followRedirects(url);

  return {
    host,
    inputUrl: input,
    finalUrl,
    redirectChain,
  };
}

/**
 * Follow redirects and capture chain
 */
async function followRedirects(
  url: string,
  maxDepth: number = SEO_CHECKLIST_CONFIG.max_redirect_depth,
): Promise<{ finalUrl: string; redirectChain: string[] }> {
  const redirectChain: string[] = [url];
  let currentUrl = url;
  let depth = 0;

  while (depth < maxDepth) {
    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(SEO_CHECKLIST_CONFIG.fetch_timeout_ms),
        headers: {
          "User-Agent": SEO_CHECKLIST_CONFIG.user_agent,
        },
      });

      // Check if redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          break;
        }

        // Resolve relative URLs
        const nextUrl = new URL(location, currentUrl).href;

        // Check for redirect loop
        if (redirectChain.includes(nextUrl)) {
          break;
        }

        redirectChain.push(nextUrl);
        currentUrl = nextUrl;
        depth++;
      } else {
        // No more redirects
        break;
      }
    } catch (error) {
      console.error("Error following redirects:", error);
      break;
    }
  }

  return {
    finalUrl: currentUrl,
    redirectChain,
  };
}

/**
 * Check if URL has redirect loop
 */
export function hasRedirectLoop(redirectChain: string[]): boolean {
  const uniqueUrls = new Set(redirectChain);
  return uniqueUrls.size < redirectChain.length;
}
