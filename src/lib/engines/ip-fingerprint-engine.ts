/**
 * ENGINE B: IP FINGERPRINTING & SERVICE DETECTION
 *
 * Advanced IP scanning engine that:
 * - Port scanning (common hosting ports: 80, 443, 21, 22, 25, 3306, etc.)
 * - Service banner grabbing (HTTP, SSH, FTP, SMTP)
 * - HTTP header analysis (Server, X-Powered-By, Via, X-AspNet-Version)
 * - SSL/TLS certificate inspection (issuer, subject, SANs)
 * - Response time analysis (latency patterns)
 * - Geolocation lookup (IP to country/city/ASN)
 * - Reverse DNS lookup
 * - ASN/BGP information
 * - Stores results in ip_fingerprints table
 */

import net from "net";
import https from "https";
import http from "http";
import { reverse } from "dns";
import type { PeerCertificate, TLSSocket } from "tls";
import { db } from "../../server/db/client.js";
import { ipFingerprints } from "../../server/db/schema.js";
import { eq } from "drizzle-orm";

// Common hosting-related ports
const COMMON_PORTS = [
  80, // HTTP
  443, // HTTPS
  21, // FTP
  22, // SSH
  25, // SMTP
  53, // DNS
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  8080, // HTTP Alt
  8443, // HTTPS Alt
];

interface PortScanResult {
  port: number;
  isOpen: boolean;
  service: string | null;
  banner: string | null;
  responseTime: number;
}

interface HTTPHeaders {
  server?: string;
  xPoweredBy?: string;
  via?: string;
  xAspNetVersion?: string;
  setCookie?: string[];
  [key: string]: string | string[] | undefined;
}

interface SSLCertificate {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  subjectAltNames: string[];
  fingerprint: string;
}

interface IPFingerprint {
  ipAddress: string;
  openPorts: number[];
  services: { [port: number]: string };
  httpHeaders: HTTPHeaders | null;
  sslCertificate: SSLCertificate | null;
  reverseDns: string | null;
  asn: string | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
  avgResponseTime: number;
  confidenceScore: number;
}

interface StoredIPFingerprint extends Record<string, unknown> {
  openPorts: number[];
  services: Record<string, string>;
  httpHeaders: HTTPHeaders | null;
  sslCertificate: SSLCertificate | null;
}

function isFulfilledPortResult(
  result: PromiseSettledResult<PortScanResult>,
): result is PromiseFulfilledResult<PortScanResult> {
  return result.status === "fulfilled";
}

/**
 * Scan a single port on an IP address
 */
async function scanPort(
  ip: string,
  port: number,
  timeout: number = 3000,
): Promise<PortScanResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let banner: string | null = null;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      // Try to grab banner
      socket.on("data", (data) => {
        banner = data.toString().trim();
        socket.destroy();
      });

      // Send a probe to trigger banner
      socket.write("\r\n");

      // Wait a bit for banner, then close
      setTimeout(() => {
        socket.destroy();
      }, 500);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        port,
        isOpen: false,
        service: null,
        banner: null,
        responseTime: timeout,
      });
    });

    socket.on("error", () => {
      resolve({
        port,
        isOpen: false,
        service: null,
        banner: null,
        responseTime: Date.now() - startTime,
      });
    });

    socket.on("close", () => {
      const responseTime = Date.now() - startTime;
      const service = identifyService(port, banner);

      resolve({
        port,
        isOpen: true,
        service,
        banner,
        responseTime,
      });
    });

    socket.connect(port, ip);
  });
}

/**
 * Identify service based on port and banner
 */
function identifyService(port: number, banner: string | null): string | null {
  // Port-based identification
  const portServices: { [key: number]: string } = {
    21: "FTP",
    22: "SSH",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    443: "HTTPS",
    3306: "MySQL",
    5432: "PostgreSQL",
    6379: "Redis",
    8080: "HTTP",
    8443: "HTTPS",
  };

  // Banner-based identification (more accurate)
  if (banner) {
    if (banner.includes("SSH")) return "SSH";
    if (banner.includes("FTP")) return "FTP";
    if (banner.includes("SMTP")) return "SMTP";
    if (banner.includes("MySQL")) return "MySQL";
    if (banner.includes("PostgreSQL")) return "PostgreSQL";
    if (banner.includes("Redis")) return "Redis";
  }

  return portServices[port] || null;
}

/**
 * Scan all common ports on an IP
 */
export async function scanPorts(ip: string): Promise<PortScanResult[]> {
  const results = await Promise.allSettled(
    COMMON_PORTS.map((port) => scanPort(ip, port)),
  );

  return results
    .filter(isFulfilledPortResult)
    .map((result) => result.value)
    .filter((result) => result.isOpen);
}

/**
 * Grab HTTP headers from an IP
 */
export async function grabHTTPHeaders(
  ip: string,
  port: number = 80,
): Promise<HTTPHeaders | null> {
  return new Promise((resolve) => {
    const protocol = port === 443 ? https : http;
    const options = {
      hostname: ip,
      port,
      path: "/",
      method: "HEAD",
      timeout: 5000,
      rejectUnauthorized: false, // Allow self-signed certs
    };

    const req = protocol.request(options, (res) => {
      const headers: HTTPHeaders = {
        server: Array.isArray(res.headers["server"])
          ? res.headers["server"][0]
          : res.headers["server"],
        xPoweredBy: Array.isArray(res.headers["x-powered-by"])
          ? res.headers["x-powered-by"][0]
          : res.headers["x-powered-by"],
        via: Array.isArray(res.headers["via"])
          ? res.headers["via"][0]
          : res.headers["via"],
        xAspNetVersion: Array.isArray(res.headers["x-aspnet-version"])
          ? res.headers["x-aspnet-version"][0]
          : res.headers["x-aspnet-version"],
        setCookie: Array.isArray(res.headers["set-cookie"])
          ? res.headers["set-cookie"]
          : res.headers["set-cookie"]
            ? [res.headers["set-cookie"]]
            : undefined,
      };

      resolve(headers);
    });

    req.on("error", () => {
      resolve(null);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Get SSL certificate information
 */
export async function getSSLCertificate(
  ip: string,
): Promise<SSLCertificate | null> {
  return new Promise((resolve) => {
    const options = {
      host: ip,
      port: 443,
      method: "GET",
      rejectUnauthorized: false,
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      const cert = (res.socket as TLSSocket).getPeerCertificate();
      const peerCertificate = cert as PeerCertificate;

      if (!peerCertificate || Object.keys(peerCertificate).length === 0) {
        resolve(null);
        return;
      }

      const certificate: SSLCertificate = {
        issuer:
          peerCertificate.issuer?.O || peerCertificate.issuer?.CN || "Unknown",
        subject: peerCertificate.subject?.CN || "Unknown",
        validFrom: peerCertificate.valid_from || "",
        validTo: peerCertificate.valid_to || "",
        subjectAltNames:
          peerCertificate.subjectaltname
            ?.split(", ")
            .map((s: string) => s.replace("DNS:", "")) || [],
        fingerprint: peerCertificate.fingerprint || "",
      };

      resolve(certificate);
    });

    req.on("error", () => {
      resolve(null);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Reverse DNS lookup
 */
export async function reverseDNSLookup(ip: string): Promise<string | null> {
  return new Promise((resolve) => {
    reverse(ip, (err: NodeJS.ErrnoException | null, hostnames: string[]) => {
      if (err || !hostnames || hostnames.length === 0) {
        resolve(null);
      } else {
        resolve(hostnames[0]);
      }
    });
  });
}

/**
 * Get geolocation and ASN information for an IP
 * Uses ip-api.com (free, no key required, 45 req/min limit)
 */
export async function getIPGeolocation(ip: string): Promise<{
  country: string | null;
  city: string | null;
  asn: string | null;
  asnOrg: string | null;
}> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city,as,asname`,
    );
    const data = await response.json();

    if (data.status === "success") {
      return {
        country: data.country || null,
        city: data.city || null,
        asn: data.as?.split(" ")[0] || null, // Extract ASN number
        asnOrg: data.asname || null,
      };
    }
  } catch (error) {
    console.error("Geolocation lookup failed:", error);
  }

  return {
    country: null,
    city: null,
    asn: null,
    asnOrg: null,
  };
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidenceScore(fingerprint: Partial<IPFingerprint>): number {
  let score = 0;

  if (fingerprint.openPorts && fingerprint.openPorts.length > 0) score += 20;
  if (fingerprint.services && Object.keys(fingerprint.services).length > 0)
    score += 20;
  if (fingerprint.httpHeaders) score += 15;
  if (fingerprint.sslCertificate) score += 15;
  if (fingerprint.reverseDns) score += 10;
  if (fingerprint.asn) score += 10;
  if (fingerprint.country) score += 10;

  return Math.min(score, 100);
}

/**
 * Main IP fingerprinting function
 */
export async function fingerprintIP(ip: string): Promise<IPFingerprint> {
  // Scan ports
  const portResults = await scanPorts(ip);
  const openPorts = portResults.map((r) => r.port);
  const services: { [port: number]: string } = {};
  portResults.forEach((r) => {
    if (r.service) services[r.port] = r.service;
  });

  // Calculate average response time
  const avgResponseTime =
    portResults.reduce((sum, r) => sum + r.responseTime, 0) /
      portResults.length || 0;

  // Grab HTTP headers (if port 80 or 443 is open)
  let httpHeaders: HTTPHeaders | null = null;
  if (openPorts.includes(80)) {
    httpHeaders = await grabHTTPHeaders(ip, 80);
  } else if (openPorts.includes(443)) {
    httpHeaders = await grabHTTPHeaders(ip, 443);
  }

  // Get SSL certificate (if port 443 is open)
  let sslCertificate: SSLCertificate | null = null;
  if (openPorts.includes(443)) {
    sslCertificate = await getSSLCertificate(ip);
  }

  // Reverse DNS lookup
  const reverseDns = await reverseDNSLookup(ip);

  // Geolocation and ASN
  const geoData = await getIPGeolocation(ip);

  const fingerprint: IPFingerprint = {
    ipAddress: ip,
    openPorts,
    services,
    httpHeaders,
    sslCertificate,
    reverseDns,
    asn: geoData.asn,
    asnOrg: geoData.asnOrg,
    country: geoData.country,
    city: geoData.city,
    avgResponseTime,
    confidenceScore: 0,
  };

  fingerprint.confidenceScore = calculateConfidenceScore(fingerprint);

  return fingerprint;
}

/**
 * Store IP fingerprint in database
 */
export async function storeIPFingerprint(
  fingerprint: IPFingerprint,
): Promise<void> {
  try {
    // Check if fingerprint already exists
    const existing = await db
      .select()
      .from(ipFingerprints)
      .where(eq(ipFingerprints.ipAddress, fingerprint.ipAddress))
      .limit(1);

    if (existing.length > 0) {
      // Update existing fingerprint
      await db
        .update(ipFingerprints)
        .set({
          openPorts: JSON.stringify(fingerprint.openPorts),
          serviceBanners: JSON.stringify(fingerprint.services),
          httpResponses: fingerprint.httpHeaders
            ? JSON.stringify(fingerprint.httpHeaders)
            : null,
          tlsCertData: fingerprint.sslCertificate
            ? JSON.stringify(fingerprint.sslCertificate)
            : null,
          asn: fingerprint.asn,
          asnOrg: fingerprint.asnOrg,
          country: fingerprint.country,
          city: fingerprint.city,
          scanDuration: Math.round(fingerprint.avgResponseTime),
          scanConfidence: fingerprint.confidenceScore,
          lastScanned: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ipFingerprints.id, existing[0].id));
    } else {
      // Insert new fingerprint
      await db.insert(ipFingerprints).values({
        ipAddress: fingerprint.ipAddress,
        openPorts: JSON.stringify(fingerprint.openPorts),
        serviceBanners: JSON.stringify(fingerprint.services),
        httpResponses: fingerprint.httpHeaders
          ? JSON.stringify(fingerprint.httpHeaders)
          : null,
        tlsCertData: fingerprint.sslCertificate
          ? JSON.stringify(fingerprint.sslCertificate)
          : null,
        asn: fingerprint.asn,
        asnOrg: fingerprint.asnOrg,
        country: fingerprint.country,
        city: fingerprint.city,
        scanDuration: Math.round(fingerprint.avgResponseTime),
        scanConfidence: fingerprint.confidenceScore,
        lastScanned: new Date(),
      });
    }
  } catch (error) {
    console.error(
      `Error storing IP fingerprint for ${fingerprint.ipAddress}:`,
      error,
    );
  }
}

/**
 * Get stored IP fingerprint from database
 */
export async function getIPFingerprint(
  ip: string,
): Promise<StoredIPFingerprint | null> {
  try {
    const results = await db
      .select()
      .from(ipFingerprints)
      .where(eq(ipFingerprints.ipAddress, ip))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];

    // Parse JSON fields
    return {
      ...record,
      openPorts: record.openPorts
        ? (JSON.parse(record.openPorts as string) as number[])
        : [],
      services: record.serviceBanners
        ? (JSON.parse(record.serviceBanners as string) as Record<
            string,
            string
          >)
        : ({} as Record<string, string>),
      httpHeaders: record.httpResponses
        ? (JSON.parse(record.httpResponses as string) as HTTPHeaders)
        : null,
      sslCertificate: record.tlsCertData
        ? (JSON.parse(record.tlsCertData as string) as SSLCertificate)
        : null,
    };
  } catch (error) {
    console.error(`Error fetching IP fingerprint for ${ip}:`, error);
    return null;
  }
}
