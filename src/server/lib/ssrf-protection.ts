/**
 * SSRF protection validates resolved targets are public IPs.
 */

import dns from "dns/promises";
import net from "node:net";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b, c] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // RFC 1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // RFC 1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224 && a <= 239) return true; // multicast
  if (a >= 240) return true; // reserved

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true; // loopback/unspecified
  if (/^(fc|fd)/.test(normalized)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(normalized)) return true; // link-local fe80::/10
  if (/^ff/.test(normalized)) return true; // multicast
  if (normalized.startsWith("2001:db8")) return true; // documentation range

  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);

  return false;
}

/**
 * True when an address is private/internal/local/reserved.
 */
export function isPrivateIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return false;
}

function normalizeHostname(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`;
    return new URL(withProtocol).hostname;
  } catch {
    return trimmed.replace(/^(https?:\/\/)?(www\.)?/i, "").split("/")[0];
  }
}

/**
 * Resolve a domain and verify all returned IPs are public.
 * Throws if any resolved target is private/internal.
 */
export async function assertPublicDomain(domain: string): Promise<string[]> {
  const hostname = normalizeHostname(domain);
  if (!hostname) return [];

  const literalIpVersion = net.isIP(hostname);
  if (literalIpVersion !== 0) {
    if (isPrivateIP(hostname)) {
      throw new Error(
        `Domain "${hostname}" resolves to a private IP address and cannot be scanned`,
      );
    }
    return [hostname];
  }

  const resolutions = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
  ]);

  const addresses = resolutions
    .filter(
      (result): result is PromiseFulfilledResult<string[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);

  if (addresses.length === 0) {
    // DNS resolution failed; callers can decide how to handle unavailable hosts.
    return [];
  }

  for (const ip of addresses) {
    if (isPrivateIP(ip)) {
      throw new Error(
        `Domain "${hostname}" resolves to a private IP address and cannot be scanned`,
      );
    }
  }

  return addresses;
}
