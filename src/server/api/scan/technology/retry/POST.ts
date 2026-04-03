import type { Request, Response } from "express";
import { getOrSet } from "../../../../lib/cache/cache-manager.js";

const RETRYABLE_FIELDS = new Set([
  "wordpress.version",
  "php.version",
  "server.version",
]);

interface RetryResults {
  wordpress?: { version: string };
  php?: { version: string };
  server?: { version: string };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeDomain(rawDomain: string): string {
  return rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

/**
 * Progressive Retry Endpoint
 *
 * Purpose: Retry specific detection methods with longer timeouts
 * Triggered: Automatically by frontend when initial scan has missing data
 * Returns: Only the fields that were retried (partial update)
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain, retryFields, retryId } = req.body;

    // Validation
    if (
      typeof domain !== "string" ||
      !domain.trim() ||
      !retryFields ||
      !Array.isArray(retryFields)
    ) {
      return res.status(400).json({
        error: "Missing required fields: domain, retryFields",
      });
    }

    const cleanDomain = normalizeDomain(domain);
    const allowedRetryFields = [...new Set(retryFields)].filter(
      (field): field is string =>
        typeof field === "string" && RETRYABLE_FIELDS.has(field),
    );

    if (!cleanDomain || allowedRetryFields.length === 0) {
      return res.status(400).json({
        error: "Invalid retry payload",
      });
    }

    console.log(`[Retry] Starting background retry for ${cleanDomain}`);
    console.log(`[Retry] Fields to retry: ${allowedRetryFields.join(", ")}`);

    const suffix = `retry:${allowedRetryFields.sort().join("|")}`;
    const cachedRetry = await getOrSet(
      "technology",
      cleanDomain,
      async () => {
        // Execute retries
        const results = await executeRetries(cleanDomain, allowedRetryFields);
        return results;
      },
      suffix,
      14400, // 4 hours (longer than initial scan)
    );

    console.log(`[Retry] Completed for ${cleanDomain}`);

    return res.json({
      success: true,
      retryId,
      results: cachedRetry,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Retry] Error:", error);
    return res.status(500).json({
      error: "Retry failed",
      message: "An internal error occurred",
    });
  }
}

/**
 * Execute retry logic for specific fields
 */
async function executeRetries(
  domain: string,
  retryFields: string[],
): Promise<RetryResults> {
  const results: RetryResults = {};

  // Retry WordPress version
  if (retryFields.includes("wordpress.version")) {
    console.log(`[Retry] Attempting WordPress version for ${domain}`);
    const wpVersion = await retryWordPressVersion(domain);
    if (wpVersion) {
      results.wordpress = { version: wpVersion };
      console.log(`[Retry] WordPress version found: ${wpVersion}`);
    } else {
      console.log(`[Retry] WordPress version still unavailable`);
    }
  }

  // Retry PHP version
  if (retryFields.includes("php.version")) {
    console.log(`[Retry] Attempting PHP version for ${domain}`);
    const phpVersion = await retryPHPVersion(domain);
    if (phpVersion) {
      results.php = { version: phpVersion };
      console.log(`[Retry] PHP version found: ${phpVersion}`);
    } else {
      console.log(`[Retry] PHP version still unavailable`);
    }
  }

  // Retry server version
  if (retryFields.includes("server.version")) {
    console.log(`[Retry] Attempting server version for ${domain}`);
    const serverVersion = await retryServerVersion(domain);
    if (serverVersion) {
      results.server = { version: serverVersion };
      console.log(`[Retry] Server version found: ${serverVersion}`);
    } else {
      console.log(`[Retry] Server version still unavailable`);
    }
  }

  return results;
}

/**
 * Retry WordPress version detection with longer timeout
 *
 * Methods tried (in order):
 * 1. RSS feed (/feed/) - 8 second timeout
 * 2. Atom feed (/feed/atom/) - 8 second timeout
 * 3. wp-json API (/wp-json/) - 8 second timeout
 * 4. wp-embed.js file - 8 second timeout
 */
async function retryWordPressVersion(domain: string): Promise<string | null> {
  // Wait 5 seconds before retry (let server catch up)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Method 1: RSS Feed (most reliable)
  try {
    console.log(`[Retry] Trying RSS feed for ${domain}`);
    const rssResponse = await fetch(`https://${domain}/feed/`, {
      signal: AbortSignal.timeout(8000), // 8s timeout (vs 3s initial)
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (rssResponse.ok) {
      const rssText = await rssResponse.text();
      const versionMatch = rssText.match(/<generator>.*WordPress\s+([0-9.]+)/i);

      if (versionMatch && versionMatch[1]) {
        console.log(`[Retry] RSS feed success: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] RSS feed failed: ${getErrorMessage(error)}`);
  }

  // Method 2: Atom Feed (alternative)
  try {
    console.log(`[Retry] Trying Atom feed for ${domain}`);
    const atomResponse = await fetch(`https://${domain}/feed/atom/`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
        Accept: "application/atom+xml, application/xml, text/xml",
      },
    });

    if (atomResponse.ok) {
      const atomText = await atomResponse.text();
      const versionMatch = atomText.match(
        /<generator.*?>.*WordPress\s+([0-9.]+)/i,
      );

      if (versionMatch && versionMatch[1]) {
        console.log(`[Retry] Atom feed success: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] Atom feed failed: ${getErrorMessage(error)}`);
  }

  // Method 3: wp-json API
  try {
    console.log(`[Retry] Trying wp-json API for ${domain}`);
    const apiResponse = await fetch(`https://${domain}/wp-json/`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();

      // Check for version in various locations
      const version =
        (apiData?.namespaces?.includes("wp/v2") && apiData?.version) ||
        apiData?.generator?.match(/WordPress\/([0-9.]+)/)?.[1] ||
        null;

      if (version) {
        console.log(`[Retry] wp-json API success: ${version}`);
        return version;
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] wp-json API failed: ${getErrorMessage(error)}`);
  }

  // Method 4: wp-embed.js file
  try {
    console.log(`[Retry] Trying wp-embed.js for ${domain}`);
    const htmlResponse = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const embedMatch = html.match(/wp-embed\.min\.js\?ver=([0-9.]+)/i);

      if (embedMatch && embedMatch[1]) {
        console.log(`[Retry] wp-embed.js success: ${embedMatch[1]}`);
        return embedMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] wp-embed.js failed: ${getErrorMessage(error)}`);
  }

  console.log(`[Retry] All WordPress version methods exhausted for ${domain}`);
  return null;
}

/**
 * Retry PHP version detection with longer timeout
 *
 * Methods tried (in order):
 * 1. X-Powered-By header - 8 second timeout
 * 2. wp-json API response headers - 8 second timeout
 * 3. Server header parsing - 8 second timeout
 */
async function retryPHPVersion(domain: string): Promise<string | null> {
  // Wait 3 seconds before retry
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Method 1: X-Powered-By header (most common)
  try {
    console.log(`[Retry] Trying X-Powered-By header for ${domain}`);
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    const poweredBy = response.headers.get("x-powered-by");
    if (poweredBy && poweredBy.includes("PHP")) {
      const versionMatch = poweredBy.match(/PHP\/([0-9.]+)/);
      if (versionMatch && versionMatch[1]) {
        console.log(`[Retry] X-Powered-By success: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] X-Powered-By failed: ${getErrorMessage(error)}`);
  }

  // Method 2: wp-json API headers
  try {
    console.log(`[Retry] Trying wp-json headers for ${domain}`);
    const apiResponse = await fetch(`https://${domain}/wp-json/`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    const poweredBy = apiResponse.headers.get("x-powered-by");
    if (poweredBy && poweredBy.includes("PHP")) {
      const versionMatch = poweredBy.match(/PHP\/([0-9.]+)/);
      if (versionMatch && versionMatch[1]) {
        console.log(`[Retry] wp-json headers success: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] wp-json headers failed: ${getErrorMessage(error)}`);
  }

  // Method 3: Server header parsing (rare)
  try {
    console.log(`[Retry] Trying Server header for ${domain}`);
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    const server = response.headers.get("server");
    if (server && server.includes("PHP")) {
      const versionMatch = server.match(/PHP\/([0-9.]+)/);
      if (versionMatch && versionMatch[1]) {
        console.log(`[Retry] Server header success: ${versionMatch[1]}`);
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] Server header failed: ${getErrorMessage(error)}`);
  }

  console.log(`[Retry] All PHP version methods exhausted for ${domain}`);
  return null;
}

/**
 * Retry server version detection with longer timeout
 *
 * Methods tried (in order):
 * 1. Server header - 8 second timeout
 * 2. X-Powered-By header - 8 second timeout
 * 3. Via header - 8 second timeout
 */
async function retryServerVersion(domain: string): Promise<string | null> {
  // Wait 2 seconds before retry
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    console.log(`[Retry] Trying server headers for ${domain}`);
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "HostingInfo/1.0 (Domain Analysis)",
      },
    });

    // Method 1: Server header
    const server = response.headers.get("server");
    if (server) {
      // Apache/2.4.41 (Ubuntu)
      const apacheMatch = server.match(/Apache\/([0-9.]+)/);
      if (apacheMatch) {
        console.log(`[Retry] Apache version: ${apacheMatch[1]}`);
        return apacheMatch[1];
      }

      // nginx/1.18.0
      const nginxMatch = server.match(/nginx\/([0-9.]+)/);
      if (nginxMatch) {
        console.log(`[Retry] Nginx version: ${nginxMatch[1]}`);
        return nginxMatch[1];
      }

      // LiteSpeed/5.4.12
      const litespeedMatch = server.match(/LiteSpeed\/([0-9.]+)/);
      if (litespeedMatch) {
        console.log(`[Retry] LiteSpeed version: ${litespeedMatch[1]}`);
        return litespeedMatch[1];
      }
    }

    // Method 2: X-Powered-By (sometimes has server info)
    const poweredBy = response.headers.get("x-powered-by");
    if (poweredBy) {
      const versionMatch = poweredBy.match(/([0-9.]+)/);
      if (versionMatch) {
        console.log(
          `[Retry] Server version from X-Powered-By: ${versionMatch[1]}`,
        );
        return versionMatch[1];
      }
    }
  } catch (error: unknown) {
    console.log(`[Retry] Server version failed: ${getErrorMessage(error)}`);
  }

  console.log(`[Retry] Server version unavailable for ${domain}`);
  return null;
}
