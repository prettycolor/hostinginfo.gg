/**
 * Google Safe Browsing API Integration
 *
 * Checks URLs for malware, phishing, unwanted software, and social engineering threats
 * Uses Google Safe Browsing API v4
 */

import { getSecret } from "#secrets";

interface ThreatMatch {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  threat: {
    url: string;
  };
  threatEntryMetadata?: {
    entries: Array<{
      key: string;
      value: string;
    }>;
  };
  cacheDuration: string;
}

interface SafeBrowsingResponse {
  matches?: ThreatMatch[];
}

export interface SafeBrowsingResult {
  safe: boolean;
  threats: Array<{
    type: string;
    platform: string;
    description: string;
  }>;
  checked: boolean;
  error?: string;
}

/**
 * Check a URL against Google Safe Browsing API
 */
export async function checkUrlSafety(url: string): Promise<SafeBrowsingResult> {
  try {
    const apiKey =
      process.env.GOOGLE_SAFE_BROWSING_API_KEY ||
      getSecret("GOOGLE_SAFE_BROWSING_API_KEY");

    if (!apiKey) {
      return {
        safe: true,
        threats: [],
        checked: false,
        error: "API key not configured",
      };
    }

    // Normalize URL
    const normalizedUrl = normalizeUrl(url);

    // Make API request
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client: {
            clientId: "hostinginfo",
            clientVersion: "1.0.0",
          },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [
              { url: normalizedUrl },
              { url: `http://${normalizedUrl}` },
              { url: `https://${normalizedUrl}` },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Safe Browsing API error: ${response.status}`);
    }

    const data: SafeBrowsingResponse = await response.json();

    // Process results
    if (!data.matches || data.matches.length === 0) {
      return {
        safe: true,
        threats: [],
        checked: true,
      };
    }

    // Map threat types to descriptions
    const threats = data.matches.map((match) => ({
      type: match.threatType,
      platform: match.platformType,
      description: getThreatDescription(match.threatType),
    }));

    return {
      safe: false,
      threats,
      checked: true,
    };
  } catch (error) {
    console.error("Safe Browsing check failed:", error);
    return {
      safe: true, // Fail open - don't block sites if API fails
      threats: [],
      checked: false,
      error: "An internal error occurred",
    };
  }
}

/**
 * Check multiple URLs in batch
 */
export async function checkMultipleUrls(
  urls: string[],
): Promise<Map<string, SafeBrowsingResult>> {
  const results = new Map<string, SafeBrowsingResult>();

  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((url) => checkUrlSafety(url)),
    );

    batch.forEach((url, index) => {
      results.set(url, batchResults[index]);
    });

    // Rate limiting: wait 200ms between batches
    if (i + batchSize < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Normalize URL for Safe Browsing API
 */
function normalizeUrl(url: string): string {
  // Remove protocol
  let normalized = url.replace(/^https?:\/\//, "");

  // Remove www.
  normalized = normalized.replace(/^www\./, "");

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");

  // Remove port if default
  normalized = normalized.replace(/:80$/, "").replace(/:443$/, "");

  return normalized;
}

/**
 * Get human-readable threat description
 */
function getThreatDescription(threatType: string): string {
  const descriptions: Record<string, string> = {
    MALWARE: "Malware - Site contains or distributes malicious software",
    SOCIAL_ENGINEERING:
      "Phishing - Site attempts to trick users into sharing personal information",
    UNWANTED_SOFTWARE:
      "Unwanted Software - Site contains software that may harm user experience",
    POTENTIALLY_HARMFUL_APPLICATION:
      "Potentially Harmful - Site may contain applications that could harm devices",
  };

  return descriptions[threatType] || `Unknown threat: ${threatType}`;
}

/**
 * Calculate security score impact from Safe Browsing results
 */
export function calculateSafeBrowsingScore(result: SafeBrowsingResult): {
  score: number;
  deduction: number;
  severity: "critical" | "high" | "medium" | "low" | "none";
} {
  if (!result.checked) {
    // API not configured or failed - neutral score
    return {
      score: 0,
      deduction: 0,
      severity: "none",
    };
  }

  if (result.safe) {
    // No threats found - perfect score
    return {
      score: 100,
      deduction: 0,
      severity: "none",
    };
  }

  // Threats found - calculate severity
  const hasMalware = result.threats.some((t) => t.type === "MALWARE");
  const hasPhishing = result.threats.some(
    (t) => t.type === "SOCIAL_ENGINEERING",
  );
  const hasUnwanted = result.threats.some(
    (t) => t.type === "UNWANTED_SOFTWARE",
  );
  const hasPHA = result.threats.some(
    (t) => t.type === "POTENTIALLY_HARMFUL_APPLICATION",
  );

  if (hasMalware || hasPhishing) {
    // Critical threats - major deduction
    return {
      score: 0,
      deduction: 100,
      severity: "critical",
    };
  }

  if (hasUnwanted) {
    // High severity - significant deduction
    return {
      score: 20,
      deduction: 80,
      severity: "high",
    };
  }

  if (hasPHA) {
    // Medium severity - moderate deduction
    return {
      score: 50,
      deduction: 50,
      severity: "medium",
    };
  }

  // Unknown threat type - conservative deduction
  return {
    score: 30,
    deduction: 70,
    severity: "high",
  };
}

/**
 * Get recommendations based on Safe Browsing results
 */
export function getSafeBrowsingRecommendations(
  result: SafeBrowsingResult,
): string[] {
  if (!result.checked) {
    return [];
  }

  if (result.safe) {
    return ["✅ No security threats detected by Google Safe Browsing"];
  }

  const recommendations: string[] = [
    "🚨 CRITICAL: Site flagged by Google Safe Browsing",
  ];

  result.threats.forEach((threat) => {
    recommendations.push(`⚠️ ${threat.description}`);
  });

  recommendations.push(
    "🔧 Immediate Actions Required:",
    "1. Scan your website files for malicious code",
    "2. Check all plugins/themes for vulnerabilities",
    "3. Review user-uploaded content",
    "4. Change all passwords and access credentials",
    "5. Request a review from Google after cleanup: https://search.google.com/search-console",
  );

  return recommendations;
}
