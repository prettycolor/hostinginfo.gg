import type { Request, Response } from "express";
import { promises as dns } from "dns";
import { detectProviderByASN } from "../../../lib/asn-detector.js";
import { getOrSet } from "../../../lib/cache/cache-manager.js";
import {
  getScanPatternProviders,
  normalizeHostingProviderCategory,
  normalizeHostingProviderLabel,
} from "../../../lib/hosting-provider-canonical.js";

export interface ASNResultSummary {
  asn: string | null;
  provider: string | null;
  category: string | null;
  confidence: number;
  description: string | null;
  method: string;
}

interface ProviderDetectionResult {
  provider: string;
  category: string;
  confidence: number;
  methods: string[];
  nameservers: string[];
  asn: string | null;
  asnDetails: {
    asn: string | null;
    description: string | null;
    method: string;
  } | null;
}

/**
 * Hosting Provider Detection API
 * Identifies hosting provider using nameservers, ISP data, and IP patterns
 */
async function performProviderScan(
  domain: string,
  nameservers?: string[],
  isp?: string,
  organization?: string,
  isWebsiteBuilder?: boolean,
  builderType?: string,
  ipAddress?: string,
) {
  console.log(`[Provider Detection] Starting scan for: ${domain}`);

  // Get nameservers if not provided
  let ns = nameservers;
  if (!ns || ns.length === 0) {
    try {
      ns = await dns.resolveNs(domain);
    } catch {
      ns = [];
    }
  }

  // Get IP address if not provided
  let ip = ipAddress;
  if (!ip) {
    try {
      const addresses = await dns.resolve4(domain);
      ip = addresses[0];
    } catch {
      console.warn(`[Provider Detection] Could not resolve IP for ${domain}`);
    }
  }

  // Try ASN detection first (most accurate method)
  let asnResult: ASNResultSummary | null = null;
  if (ip) {
    console.log(`[Provider Detection] Attempting ASN lookup for IP: ${ip}`);
    asnResult = await detectProviderByASN(ip);
    console.log(`[Provider Detection] ASN result:`, asnResult);
  }

  // Combine ASN detection with traditional nameserver detection
  const result = detectProvider(
    ns,
    isp,
    organization,
    isWebsiteBuilder,
    builderType,
    asnResult,
  );

  console.log(`[Provider Detection] Complete for: ${domain}`);
  return result;
}

export default async function handler(req: Request, res: Response) {
  try {
    const {
      domain,
      nameservers,
      isp,
      organization,
      isWebsiteBuilder,
      builderType,
      ipAddress,
    } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Use cache-aside pattern
    const cachedResult = await getOrSet("intelligence", domain, async () => {
      return await performProviderScan(
        domain,
        nameservers,
        isp,
        organization,
        isWebsiteBuilder,
        builderType,
        ipAddress,
      );
    });
    const result = {
      ...cachedResult,
      provider:
        normalizeHostingProviderLabel(cachedResult.provider) || "Unknown",
      category: normalizeHostingProviderCategory(
        cachedResult.category,
        cachedResult.provider,
      ),
    };

    // Add cache metadata
    const response = {
      ...result,
      _cache: {
        cached: true,
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("[Provider Detection] Error:", error);
    return res.status(500).json({
      error: "Provider detection failed",
      message: "An internal error occurred",
    });
  }
}

export function detectProvider(
  nameservers: string[],
  isp?: string,
  organization?: string,
  isWebsiteBuilder?: boolean,
  builderType?: string,
  asnResult?: ASNResultSummary | null,
): ProviderDetectionResult {
  let provider = "Unknown";
  let confidence = 0;
  const methods: string[] = [];
  let category = "Unknown";
  let asn = null;
  const asnProviderCanonical = normalizeHostingProviderLabel(
    asnResult?.provider,
  );

  // Priority 1: ASN Detection (highest confidence)
  if (asnResult && asnResult.provider && asnResult.confidence > 0) {
    provider =
      normalizeHostingProviderLabel(asnResult.provider) || asnResult.provider;
    confidence = asnResult.confidence;
    category = normalizeHostingProviderCategory(asnResult.category, provider);
    asn = asnResult.asn;
    methods.push("asn-lookup");

    console.log(
      `[Provider Detection] ASN match found: ${provider} (confidence: ${confidence}%)`,
    );
  }

  // Convert to lowercase for matching
  const nsString = nameservers.join(" ").toLowerCase();
  const ispString = (isp || "").toLowerCase();
  const orgString = (organization || "").toLowerCase();
  const combined = `${nsString} ${ispString} ${orgString}`;

  const providers = getScanPatternProviders();

  // Priority 2: Nameserver Pattern Matching (if ASN didn't find a match)
  if (provider === "Unknown" || confidence < 80) {
    for (const providerEntry of providers) {
      for (const pattern of providerEntry.scanPatterns) {
        if (combined.includes(pattern)) {
          // Guardrail: nameserver hints like domaincontrol/secureserver often indicate
          // DNS/registrar, not the actual web host origin. Only trust these as full
          // hosting attribution when ASN/IP evidence agrees.
          if (providerEntry.canonicalName === "GoDaddy") {
            const asnConfirmsGoDaddy = asnProviderCanonical === "GoDaddy";
            const matchesNameserverOnly =
              nsString.includes(pattern) &&
              !ispString.includes(pattern) &&
              !orgString.includes(pattern);

            if (!asnConfirmsGoDaddy && matchesNameserverOnly) {
              methods.push("dns-provider-hint");
              continue;
            }
          }

          // Only override ASN result if nameserver match has higher confidence
          const nsConfidence = nsString.includes(pattern)
            ? providerEntry.confidencePolicy.nameserver
            : ispString.includes(pattern)
              ? providerEntry.confidencePolicy.isp
              : providerEntry.confidencePolicy.organization;

          if (nsConfidence > confidence) {
            provider = providerEntry.canonicalName;
            category = normalizeHostingProviderCategory(
              providerEntry.defaultCategory,
              providerEntry.canonicalName,
            );
            confidence = nsConfidence;
            methods.length = 0; // Clear previous methods

            // Determine confidence based on where match was found
            if (nsString.includes(pattern)) {
              methods.push("nameserver-pattern");
            } else if (ispString.includes(pattern)) {
              methods.push("isp-data");
            } else if (orgString.includes(pattern)) {
              methods.push("organization-data");
            }
          }
          break;
        }
      }
      if (confidence >= 95) break; // Stop if we found a high-confidence match
    }
  }

  // Additional detection: Check for common cPanel patterns
  if (provider === "Unknown") {
    if (nsString.includes("cpanel") || nsString.includes("whm")) {
      provider = "cPanel Hosting";
      category = "Shared/cPanel";
      confidence = 60;
      methods.push("cpanel-pattern");
    }
  }

  // Override category for website builders
  // Website builders are managed platforms, not traditional hosting
  if (isWebsiteBuilder && builderType) {
    const canonicalBuilder = normalizeHostingProviderLabel(builderType);
    if (provider === "Unknown" && canonicalBuilder) {
      provider = canonicalBuilder;
    }
    category = "Website Builder";
    methods.push("website-builder-override");

    // If we detected a provider but it's actually a website builder,
    // note that in the provider name
    if (provider !== "Unknown" && !provider.includes("Website Builder")) {
      // Keep the provider name but clarify it's their website builder service
      // e.g., "GoDaddy" stays as "GoDaddy" but category becomes "Website Builder"
    }
  }

  provider = normalizeHostingProviderLabel(provider) || "Unknown";
  category = normalizeHostingProviderCategory(category, provider);

  return {
    provider,
    category,
    confidence,
    methods,
    nameservers,
    asn,
    asnDetails: asnResult
      ? {
          asn: asnResult.asn,
          description: asnResult.description,
          method: asnResult.method,
        }
      : null,
  };
}
