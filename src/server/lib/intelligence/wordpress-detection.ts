export interface WordPressHtmlDetectionResult {
  detected: boolean;
  matchedSignals: string[];
  score: number;
  strongSignalCount: number;
}

interface EndpointProbeResponse {
  status: number;
  body?: string;
  location?: string | null;
}

export interface WordPressEndpointProbeInput {
  wpJson?: EndpointProbeResponse;
  xmlRpc?: EndpointProbeResponse;
  wpAdmin?: EndpointProbeResponse;
  wpLogin?: EndpointProbeResponse;
  feed?: EndpointProbeResponse;
  wpSitemap?: EndpointProbeResponse;
}

export interface WordPressEndpointProbeResult {
  detected: boolean;
  matchedSignals: string[];
  score: number;
  strongSignalCount: number;
  version: string | null;
}

export interface WordPressHeaderProbeInput {
  linkHeader?: string | null;
  pingbackHeader?: string | null;
  redirectByHeader?: string | null;
}

export type WordPressDetectionCertainty = "confirmed" | "likely" | "unverified" | "none";

const WORDPRESS_STRONG_HTML_SIGNALS = [
  "wp-content/",
  "wp-includes/",
  "/wp-json/",
  "wp-emoji-release.min.js",
  "wp-admin/admin-ajax.php",
  "<meta name=\"generator\" content=\"wordpress",
];

const WORDPRESS_MEDIUM_HTML_SIGNALS = [
  "xmlrpc.php",
  "wp-block-library",
  "wlwmanifest.xml",
  "https://api.w.org/",
];

const WORDPRESS_WEAK_HTML_SIGNALS = [
  "wordpress",
  "wp.com",
];

const STRONG_SIGNAL_SCORE = 4;
const MEDIUM_SIGNAL_SCORE = 2;

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

function normalizeBody(body: string | undefined): string {
  return (body ?? "").toLowerCase();
}

export function detectWordPressFromHtml(html: string): WordPressHtmlDetectionResult {
  const htmlLower = html.toLowerCase();
  let score = 0;
  let strongSignalCount = 0;
  let mediumSignalCount = 0;
  const matchedSignals: string[] = [];

  for (const signal of WORDPRESS_STRONG_HTML_SIGNALS) {
    if (htmlLower.includes(signal)) {
      score += STRONG_SIGNAL_SCORE;
      strongSignalCount += 1;
      matchedSignals.push(`html:${signal}`);
    }
  }

  for (const signal of WORDPRESS_MEDIUM_HTML_SIGNALS) {
    if (htmlLower.includes(signal)) {
      score += MEDIUM_SIGNAL_SCORE;
      mediumSignalCount += 1;
      matchedSignals.push(`html:${signal}`);
    }
  }

  for (const signal of WORDPRESS_WEAK_HTML_SIGNALS) {
    if (htmlLower.includes(signal)) {
      matchedSignals.push(`html:${signal}`);
    }
  }

  const detected = strongSignalCount > 0 || mediumSignalCount >= 2 || score >= STRONG_SIGNAL_SCORE;

  return {
    detected,
    matchedSignals,
    score,
    strongSignalCount,
  };
}

export function inferWordPressFromHeaders(
  headers: WordPressHeaderProbeInput,
): WordPressEndpointProbeResult {
  let score = 0;
  let strongSignalCount = 0;
  const matchedSignals: string[] = [];

  const linkHeader = (headers.linkHeader ?? "").toLowerCase();
  if (linkHeader.includes("api.w.org")) {
    score += MEDIUM_SIGNAL_SCORE;
    matchedSignals.push("header:link-api.w.org");
  }

  const pingbackHeader = (headers.pingbackHeader ?? "").toLowerCase();
  if (pingbackHeader.includes("xmlrpc.php")) {
    score += MEDIUM_SIGNAL_SCORE;
    matchedSignals.push("header:x-pingback-xmlrpc");
  }

  const redirectByHeader = (headers.redirectByHeader ?? "").toLowerCase();
  if (redirectByHeader.includes("wordpress")) {
    score += STRONG_SIGNAL_SCORE;
    strongSignalCount += 1;
    matchedSignals.push("header:x-redirect-by-wordpress");
  }

  return {
    detected: strongSignalCount > 0 || score >= STRONG_SIGNAL_SCORE,
    matchedSignals,
    score,
    strongSignalCount,
    version: null,
  };
}

export function inferWordPressFromEndpointResponses(
  probes: WordPressEndpointProbeInput,
): WordPressEndpointProbeResult {
  let score = 0;
  let strongSignals = 0;
  const matchedSignals: string[] = [];
  let version: string | null = null;

  const wpJsonBody = normalizeBody(probes.wpJson?.body);
  if (
    probes.wpJson?.status &&
    probes.wpJson.status >= 200 &&
    probes.wpJson.status < 300 &&
    (wpJsonBody.includes("\"wp/v2\"") || wpJsonBody.includes("https://api.w.org/"))
  ) {
    score += STRONG_SIGNAL_SCORE;
    strongSignals += 1;
    matchedSignals.push("probe:wp-json");
  }

  const xmlRpcBody = normalizeBody(probes.xmlRpc?.body);
  if (
    probes.xmlRpc?.status &&
    (probes.xmlRpc.status === 405 || probes.xmlRpc.status === 200) &&
    xmlRpcBody.includes("xml-rpc server accepts post requests only")
  ) {
    score += STRONG_SIGNAL_SCORE;
    strongSignals += 1;
    matchedSignals.push("probe:xmlrpc");
  }

  const feedBody = normalizeBody(probes.feed?.body);
  const feedVersionMatch = feedBody.match(
    /<generator>https:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/i,
  );
  if (feedVersionMatch) {
    score += STRONG_SIGNAL_SCORE;
    strongSignals += 1;
    matchedSignals.push("probe:feed-generator");
    version = feedVersionMatch[1] ?? null;
  }

  const wpSitemapBody = normalizeBody(probes.wpSitemap?.body);
  if (probes.wpSitemap?.status === 200) {
    if (wpSitemapBody.includes("wp-sitemap")) {
      score += STRONG_SIGNAL_SCORE;
      strongSignals += 1;
      matchedSignals.push("probe:wp-sitemap");
    } else if (wpSitemapBody.includes("<sitemapindex") || wpSitemapBody.includes("<urlset")) {
      score += MEDIUM_SIGNAL_SCORE;
      matchedSignals.push("probe:sitemap-xml");
    }
  }

  const adminLocation = (probes.wpAdmin?.location ?? "").toLowerCase();
  if (
    probes.wpAdmin?.status &&
    REDIRECT_STATUS_CODES.has(probes.wpAdmin.status) &&
    adminLocation.includes("wp-login.php")
  ) {
    score += MEDIUM_SIGNAL_SCORE;
    matchedSignals.push("probe:wp-admin-redirect");
  }

  const wpLoginBody = normalizeBody(probes.wpLogin?.body);
  if (
    probes.wpLogin?.status === 200 &&
    (wpLoginBody.includes("id=\"loginform\"") ||
      wpLoginBody.includes("name=\"log\"") ||
      wpLoginBody.includes("wp-submit"))
  ) {
    score += MEDIUM_SIGNAL_SCORE;
    matchedSignals.push("probe:wp-login-form");
  }

  return {
    detected: strongSignals > 0 || score >= STRONG_SIGNAL_SCORE,
    matchedSignals,
    score,
    strongSignalCount: strongSignals,
    version,
  };
}

export function deriveWordPressCertainty(params: {
  detected: boolean;
  score: number;
  strongSignalCount: number;
  signalCount: number;
  visibilityBlocked: boolean;
}): WordPressDetectionCertainty {
  const { detected, score, strongSignalCount, signalCount, visibilityBlocked } = params;

  if (detected) {
    if (strongSignalCount >= 2 || score >= 8) return "confirmed";
    return "likely";
  }

  if (visibilityBlocked || signalCount > 0) {
    return "unverified";
  }

  return "none";
}

export async function probeWordPressEndpoints(
  domain: string,
): Promise<WordPressEndpointProbeResult> {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
  const baseHeaders = { "User-Agent": userAgent };

  const settled = await Promise.allSettled([
    fetch(`https://${domain}/wp-json/`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(3000),
    }),
    fetch(`https://${domain}/xmlrpc.php`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(3000),
    }),
    fetch(`https://${domain}/wp-admin/`, {
      headers: baseHeaders,
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    }),
    fetch(`https://${domain}/wp-login.php`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(3000),
    }),
    fetch(`https://${domain}/feed/`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(3000),
    }),
    fetch(`https://${domain}/wp-sitemap.xml`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(3000),
    }),
  ]);

  const probes: WordPressEndpointProbeInput = {};

  if (settled[0]?.status === "fulfilled") {
    const response = settled[0].value;
    probes.wpJson = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  if (settled[1]?.status === "fulfilled") {
    const response = settled[1].value;
    probes.xmlRpc = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  if (settled[2]?.status === "fulfilled") {
    const response = settled[2].value;
    probes.wpAdmin = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  if (settled[3]?.status === "fulfilled") {
    const response = settled[3].value;
    probes.wpLogin = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  if (settled[4]?.status === "fulfilled") {
    const response = settled[4].value;
    probes.feed = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  if (settled[5]?.status === "fulfilled") {
    const response = settled[5].value;
    probes.wpSitemap = {
      status: response.status,
      body: await response.text(),
      location: response.headers.get("location"),
    };
  }

  return inferWordPressFromEndpointResponses(probes);
}
