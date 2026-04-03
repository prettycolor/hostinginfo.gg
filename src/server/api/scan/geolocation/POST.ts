import type { Request, Response } from "express";
import { promises as dns } from "dns";
import * as http from "http";
import { getOrSet } from "../../../lib/cache/cache-manager.js";

interface DistanceSummary {
  closest: { city: string; distance: number } | null;
  cities: Record<string, number>;
}

interface GeolocationLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
}

interface GeolocationLookupSuccess {
  location: GeolocationLocation;
  isp: string;
  organization: string;
  asn: string;
  asnName: string;
  distances: DistanceSummary;
}

interface GeolocationLookupFailure {
  error: string;
  location: null;
}

type GeolocationLookupResult =
  | GeolocationLookupSuccess
  | GeolocationLookupFailure;

interface GeolocationApiResponse {
  status?: string;
  message?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
}

/**
 * Geolocation Scanner API
 * Determines server location from IP address using free IP geolocation API
 */
async function performGeolocationScan(domain: string) {
  console.log(`[Geolocation Scan] Starting scan for: ${domain}`);

  // Get IP address from domain
  let ipAddress: string | null = null;
  try {
    const addresses = await dns.resolve4(domain);
    ipAddress = addresses[0];
  } catch (error) {
    console.log(`[Geolocation Scan] Failed to resolve ${domain}:`, error);
    return {
      error: "Unable to resolve domain to IP",
      ip: null,
      ipAddress: null,
      location: null,
    };
  }

  // Get geolocation data from free API (ip-api.com - 45 requests/minute free)
  const geoData = await getGeolocation(ipAddress);

  console.log(`[Geolocation Scan] Complete for: ${domain}`);
  return {
    ip: ipAddress, // Add 'ip' field for consistency
    ipAddress, // Keep for backwards compatibility
    ...geoData,
  };
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Use cache-aside pattern
    const result = await getOrSet("geolocation", domain, async () => {
      return await performGeolocationScan(domain);
    });

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
    console.error("[Geolocation Scan] Error:", error);
    return res.status(500).json({
      error: "Geolocation scan failed",
      message: "An internal error occurred",
    });
  }
}

function getGeolocation(ip: string): Promise<GeolocationLookupResult> {
  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname`;

    http
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as GeolocationApiResponse;

            if (parsed.status === "fail") {
              resolve({
                error: parsed.message || "Geolocation lookup failed",
                location: null,
              });
              return;
            }

            if (
              typeof parsed.lat !== "number" ||
              typeof parsed.lon !== "number"
            ) {
              resolve({
                error: "Geolocation response missing coordinates",
                location: null,
              });
              return;
            }

            // Calculate approximate distance from common US locations (for US-centric tool)
            const distances = calculateDistances(parsed.lat, parsed.lon);

            resolve({
              location: {
                country: parsed.country || "",
                countryCode: parsed.countryCode || "",
                region: parsed.regionName || "",
                city: parsed.city || "",
                zip: parsed.zip || "",
                coordinates: {
                  latitude: parsed.lat,
                  longitude: parsed.lon,
                },
                timezone: parsed.timezone || "",
              },
              isp: parsed.isp || "",
              organization: parsed.org || "",
              asn: parsed.as || "",
              asnName: parsed.asname || "",
              distances,
            });
          } catch {
            resolve({
              error: "Failed to parse geolocation data",
              location: null,
            });
          }
        });
      })
      .on("error", () => {
        resolve({
          error: "Geolocation API request failed",
          location: null,
        });
      });
  });
}

function calculateDistances(lat: number, lon: number): DistanceSummary {
  // Major US cities coordinates
  const cities = {
    "New York": { lat: 40.7128, lon: -74.006 },
    "Los Angeles": { lat: 34.0522, lon: -118.2437 },
    Chicago: { lat: 41.8781, lon: -87.6298 },
    Houston: { lat: 29.7604, lon: -95.3698 },
    Phoenix: { lat: 33.4484, lon: -112.074 },
    Miami: { lat: 25.7617, lon: -80.1918 },
  };

  const distances: Record<string, number> = {};
  let closest: { city: string; distance: number } | null = null;

  for (const [city, coords] of Object.entries(cities)) {
    const distance = haversineDistance(lat, lon, coords.lat, coords.lon);
    distances[city] = Math.round(distance);

    if (!closest || distance < closest.distance) {
      closest = { city, distance: Math.round(distance) };
    }
  }

  return {
    closest,
    cities: distances,
  };
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
