/**
 * ASN Detection Engine
 *
 * Detects hosting providers by looking up Autonomous System Numbers (ASNs)
 * for IP addresses. Every hosting provider has unique ASN(s) that identify
 * their network infrastructure.
 *
 * Confidence: 90-95% for known ASNs
 */

import { execFile } from "child_process";
import { promisify } from "util";
import asnDatabase from "../data/asn-providers.json" with { type: "json" };

const execFileAsync = promisify(execFile);

interface ASNLookupResult {
  asn: string | null;
  provider: string | null;
  category: string | null;
  confidence: number;
  description: string | null;
  method: "asn-lookup" | "whois" | "unknown";
  error?: string;
}

/**
 * Look up ASN for an IP address using whois command
 * Falls back to multiple methods for reliability
 */
async function lookupASN(ipAddress: string): Promise<string | null> {
  try {
    // Method 1: Try whois lookup (most reliable)
    try {
      const { stdout } = await execFileAsync(
        "whois",
        ["-h", "whois.cymru.com", ` -v ${ipAddress}`],
        {
          timeout: 5000,
        },
      );

      // Parse Team Cymru whois response
      // Format: AS | IP | BGP Prefix | CC | Registry | Allocated | AS Name
      const lines = stdout.split("\n");
      for (const line of lines) {
        if (line.includes("|")) {
          const parts = line.split("|").map((p) => p.trim());
          if (parts[0] && parts[0] !== "AS" && !parts[0].includes("Error")) {
            // Remove 'AS' prefix if present
            return parts[0].replace(/^AS/, "");
          }
        }
      }
    } catch {
      console.warn("Team Cymru whois failed, trying alternative method");
    }

    // Method 2: Try standard whois (fallback)
    try {
      const { stdout } = await execFileAsync("whois", [ipAddress], {
        timeout: 5000,
      });

      // Look for ASN patterns in whois output
      const asnPatterns = [
        /OriginAS:\s*AS?(\d+)/i,
        /origin:\s*AS?(\d+)/i,
        /aut-num:\s*AS?(\d+)/i,
        /ASNumber:\s*AS?(\d+)/i,
        /AS(\d{4,6})/,
      ];

      for (const pattern of asnPatterns) {
        const match = stdout.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch {
      console.warn("Standard whois failed");
    }

    return null;
  } catch (error) {
    console.error("ASN lookup failed:", error);
    return null;
  }
}

/**
 * Detect hosting provider from IP address using ASN lookup
 */
export async function detectProviderByASN(
  ipAddress: string,
): Promise<ASNLookupResult> {
  try {
    // Validate IP address format
    if (!ipAddress || !isValidIP(ipAddress)) {
      return {
        asn: null,
        provider: null,
        category: null,
        confidence: 0,
        description: null,
        method: "unknown",
        error: "Invalid IP address",
      };
    }

    // Look up ASN for IP address
    const asn = await lookupASN(ipAddress);

    if (!asn) {
      return {
        asn: null,
        provider: null,
        category: null,
        confidence: 0,
        description: null,
        method: "unknown",
        error: "ASN lookup failed",
      };
    }

    // Check if ASN is in our database
    const asnData =
      asnDatabase.asn_mappings[asn as keyof typeof asnDatabase.asn_mappings];

    if (asnData) {
      return {
        asn,
        provider: asnData.provider,
        category: asnData.category,
        confidence: asnData.confidence,
        description: asnData.description,
        method: "asn-lookup",
      };
    }

    // ASN found but not in our database
    return {
      asn,
      provider: null,
      category: null,
      confidence: 0,
      description: `ASN ${asn} detected but provider unknown`,
      method: "asn-lookup",
      error: "ASN not in database",
    };
  } catch (error) {
    console.error("ASN detection error:", error);
    return {
      asn: null,
      provider: null,
      category: null,
      confidence: 0,
      description: null,
      method: "unknown",
      error: "An internal error occurred",
    };
  }
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get ASN database statistics
 */
export function getASNDatabaseStats() {
  const mappings = asnDatabase.asn_mappings;
  const asns = Object.keys(mappings);

  // Count by category
  const categoryCount: Record<string, number> = {};
  const confidenceCount: Record<number, number> = {};

  for (const asn of asns) {
    const data = mappings[asn as keyof typeof mappings];
    categoryCount[data.category] = (categoryCount[data.category] || 0) + 1;
    confidenceCount[data.confidence] =
      (confidenceCount[data.confidence] || 0) + 1;
  }

  return {
    totalASNs: asns.length,
    categories: categoryCount,
    confidenceLevels: confidenceCount,
    version: asnDatabase.metadata.version,
    lastUpdated: asnDatabase.metadata.last_updated,
  };
}

/**
 * Search for providers by name or category
 */
export function searchProviders(query: string): Array<{
  asn: string;
  provider: string;
  category: string;
  confidence: number;
}> {
  const mappings = asnDatabase.asn_mappings;
  const results: Array<{
    asn: string;
    provider: string;
    category: string;
    confidence: number;
  }> = [];

  const lowerQuery = query.toLowerCase();

  for (const [asn, data] of Object.entries(mappings)) {
    if (
      data.provider.toLowerCase().includes(lowerQuery) ||
      data.category.toLowerCase().includes(lowerQuery) ||
      data.description.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        asn,
        provider: data.provider,
        category: data.category,
        confidence: data.confidence,
      });
    }
  }

  return results;
}
