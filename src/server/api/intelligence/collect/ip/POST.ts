import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { ipIntelligence } from "../../../../db/schema.js";
import { getSecret } from "#secrets";
import dns from "dns/promises";

interface IPCollectionRequest {
  domain: string;
}

interface IPInfoResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string; // "latitude,longitude"
  org?: string; // "AS15169 Google LLC"
  postal?: string;
  timezone?: string;
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  company?: {
    name: string;
    domain: string;
    type: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
  };
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  };
}

/**
 * POST /api/intelligence/collect/ip
 *
 * Collects IP intelligence data for a domain and stores in ip_intelligence table.
 *
 * Uses IPinfo.io API (requires IPINFO_API_KEY secret).
 * Free tier: 50,000 requests/month
 *
 * Request body:
 * {
 *   "domain": "example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "example.com",
 *   "ipAddresses": ["93.184.216.34"],
 *   "recordsCollected": 1
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body as IPCollectionRequest;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Normalize domain
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .split("/")[0];

    console.log(
      `[IP Intelligence] Starting IP lookup for: ${normalizedDomain}`,
    );

    // Step 1: Resolve domain to IP addresses
    const ipAddresses: string[] = [];

    try {
      const ipv4Addresses = await dns.resolve4(normalizedDomain);
      ipAddresses.push(...ipv4Addresses);
      console.log(
        `[IP Intelligence] Found ${ipv4Addresses.length} IPv4 addresses`,
      );
    } catch {
      console.log(`[IP Intelligence] No IPv4 addresses found`);
    }

    try {
      const ipv6Addresses = await dns.resolve6(normalizedDomain);
      ipAddresses.push(...ipv6Addresses);
      console.log(
        `[IP Intelligence] Found ${ipv6Addresses.length} IPv6 addresses`,
      );
    } catch {
      console.log(`[IP Intelligence] No IPv6 addresses found`);
    }

    if (ipAddresses.length === 0) {
      return res.status(404).json({
        error: "No IP addresses found for domain",
        domain: normalizedDomain,
      });
    }

    // Step 2: Get IP intelligence data
    const apiKey = getSecret("IPINFO_API_KEY");

    if (!apiKey) {
      console.warn(
        "[IP Intelligence] IPINFO_API_KEY not configured - storing basic IP data only",
      );

      // Store basic IP data without intelligence
      const scannedAt = new Date();
      const insertedRecords = [];

      for (const ip of ipAddresses) {
        try {
          await db.insert(ipIntelligence).values({
            domain: normalizedDomain,
            ipAddress: ip,
            ipVersion: ip.includes(":") ? 6 : 4,
            scannedAt,
          });
          insertedRecords.push({ ip, status: "stored_basic" });
        } catch (error) {
          console.error(`[IP Intelligence] Failed to insert IP ${ip}:`, error);
        }
      }

      return res.json({
        success: true,
        domain: normalizedDomain,
        ipAddresses,
        recordsCollected: insertedRecords.length,
        warning:
          "IPINFO_API_KEY not configured - stored basic IP data only. Add API key for full intelligence.",
        records: insertedRecords,
      });
    }

    // Step 3: Fetch intelligence for each IP
    const scannedAt = new Date();
    const insertedRecords = [];

    for (const ip of ipAddresses) {
      try {
        console.log(`[IP Intelligence] Fetching data for IP: ${ip}`);

        const response = await fetch(`https://ipinfo.io/${ip}?token=${apiKey}`);

        if (!response.ok) {
          console.error(
            `[IP Intelligence] IPinfo API error for ${ip}: ${response.status}`,
          );
          continue;
        }

        const data = (await response.json()) as IPInfoResponse;

        // Parse location ("latitude,longitude")
        let latitude: number | null = null;
        let longitude: number | null = null;
        if (data.loc) {
          const [lat, lon] = data.loc.split(",");
          latitude = parseFloat(lat);
          longitude = parseFloat(lon);
        }

        // Parse ASN from org ("AS15169 Google LLC")
        let asn: string | null = null;
        let asnOrganization: string | null = null;
        if (data.org) {
          const asnMatch = data.org.match(/^(AS\d+)\s+(.+)$/);
          if (asnMatch) {
            asn = asnMatch[1];
            asnOrganization = asnMatch[2];
          }
        }

        // Use detailed ASN data if available
        if (data.asn) {
          asn = data.asn.asn;
          asnOrganization = data.asn.name;
        }

        // Determine country name (IPinfo returns 2-letter code)
        const countryName = data.country ? getCountryName(data.country) : null;

        // Insert into database
        await db.insert(ipIntelligence).values({
          domain: normalizedDomain,
          ipAddress: ip,
          ipVersion: ip.includes(":") ? 6 : 4,
          country: data.country || null,
          countryName,
          region: data.region || null,
          city: data.city || null,
          latitude: latitude !== null ? latitude.toString() : null,
          longitude: longitude !== null ? longitude.toString() : null,
          timezone: data.timezone || null,
          asn,
          asnOrganization,
          isp: data.company?.name || asnOrganization || null,
          organization: data.company?.name || null,
          isProxy: data.privacy?.proxy || false,
          isVpn: data.privacy?.vpn || false,
          isTor: data.privacy?.tor || false,
          isHosting: data.privacy?.hosting || false,
          threatLevel: determineThreatLevel(data),
          scannedAt,
        });

        insertedRecords.push({
          ip,
          country: data.country,
          city: data.city,
          asn,
          organization: asnOrganization,
          isHosting: data.privacy?.hosting || false,
        });

        console.log(`[IP Intelligence] Stored intelligence for ${ip}`);
      } catch (error) {
        console.error(`[IP Intelligence] Failed to process IP ${ip}:`, error);
      }
    }

    return res.json({
      success: true,
      domain: normalizedDomain,
      ipAddresses,
      recordsCollected: insertedRecords.length,
      records: insertedRecords,
      timestamp: scannedAt.toISOString(),
    });
  } catch (error) {
    console.error("[IP Intelligence] Error:", error);
    return res.status(500).json({
      error: "IP intelligence collection failed",
      message: "An internal error occurred",
    });
  }
}

/**
 * Determine threat level based on IP intelligence data
 */
function determineThreatLevel(data: IPInfoResponse): string | null {
  if (!data.privacy) return null;

  if (data.privacy.tor) return "high";
  if (data.privacy.proxy || data.privacy.vpn) return "medium";
  if (data.privacy.hosting) return "low";

  return null;
}

/**
 * Convert 2-letter country code to full name
 * (Simplified - in production, use a proper country code library)
 */
function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    JP: "Japan",
    CN: "China",
    IN: "India",
    BR: "Brazil",
    RU: "Russia",
    NL: "Netherlands",
    SG: "Singapore",
    IE: "Ireland",
    ES: "Spain",
    IT: "Italy",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
  };

  return countries[code] || code;
}
