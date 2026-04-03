export interface RegistrarInferenceInput {
  authoritativeRegistrar: string | null;
  authoritativeUrl: string | null;
  nameServers: string[];
}

export interface RegistrarInferenceResult {
  friendlyRegistrar: string | null;
  friendlyRegistrarUrl: string | null;
  confidence: number;
  method:
    | "authoritative-match"
    | "authoritative-url"
    | "authoritative-plus-nameserver"
    | "nameserver-only"
    | "none";
  reason: string;
}

interface RegistrarProfile {
  friendly: string;
  url: string;
  rawPatterns: string[];
  urlPatterns: string[];
  nameserverPatterns: string[];
}

const REGISTRAR_PROFILES: RegistrarProfile[] = [
  {
    friendly: "GoDaddy",
    url: "https://www.godaddy.com",
    rawPatterns: [
      "godaddy",
      "wild west domains",
      "domains by proxy",
      "godaddy.com, llc",
    ],
    urlPatterns: ["godaddy.com", "secureserver.net"],
    nameserverPatterns: ["domaincontrol.com", "secureserver.net", "godaddydns.com"],
  },
  {
    friendly: "Namecheap",
    url: "https://www.namecheap.com",
    rawPatterns: ["namecheap", "registrar-servers"],
    urlPatterns: ["namecheap.com"],
    nameserverPatterns: ["registrar-servers.com", "dnsowl.com"],
  },
  {
    friendly: "Cloudflare",
    url: "https://www.cloudflare.com",
    rawPatterns: ["cloudflare"],
    urlPatterns: ["cloudflare.com"],
    nameserverPatterns: ["ns.cloudflare.com"],
  },
  {
    friendly: "Squarespace",
    url: "https://www.squarespace.com",
    rawPatterns: ["squarespace"],
    urlPatterns: ["squarespace.com"],
    nameserverPatterns: ["squarespacedns.com"],
  },
  {
    friendly: "Google Domains",
    url: "https://domains.google",
    rawPatterns: ["google", "google domains"],
    urlPatterns: ["domains.google", "google.com"],
    nameserverPatterns: ["googledomains.com"],
  },
  {
    friendly: "Hover",
    url: "https://www.hover.com",
    rawPatterns: ["hover", "tucows"],
    urlPatterns: ["hover.com", "tucows.com"],
    nameserverPatterns: ["hover.com"],
  },
  {
    friendly: "IONOS",
    url: "https://www.ionos.com",
    rawPatterns: ["ionos", "1&1", "1and1"],
    urlPatterns: ["ionos.com", "1and1.com"],
    nameserverPatterns: ["ui-dns", "1and1"],
  },
];

const SPECIAL_RESELLER_RULES = [
  {
    rawPatterns: ["1api"],
    nameserverPatterns: ["domaincontrol.com", "secureserver.net", "godaddydns.com"],
    friendlyRegistrar: "GoDaddy",
    friendlyRegistrarUrl: "https://www.godaddy.com",
    confidence: 92,
    reason:
      "Authoritative registrar is a reseller platform (1API) and nameservers match GoDaddy infrastructure.",
  },
];

function normalizeText(value: string | null): string {
  if (!value) return "";
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractHost(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function matchesAnyPattern(text: string, patterns: string[]): boolean {
  if (!text) return false;
  return patterns.some((pattern) => text.includes(pattern));
}

export function inferFriendlyRegistrar(
  input: RegistrarInferenceInput,
): RegistrarInferenceResult {
  const rawRegistrar = normalizeText(input.authoritativeRegistrar);
  const rawUrlHost = extractHost(input.authoritativeUrl);
  const nameserverText = input.nameServers.join(" ").toLowerCase();

  for (const rule of SPECIAL_RESELLER_RULES) {
    if (
      matchesAnyPattern(rawRegistrar, rule.rawPatterns) &&
      matchesAnyPattern(nameserverText, rule.nameserverPatterns)
    ) {
      return {
        friendlyRegistrar: rule.friendlyRegistrar,
        friendlyRegistrarUrl: rule.friendlyRegistrarUrl,
        confidence: rule.confidence,
        method: "authoritative-plus-nameserver",
        reason: rule.reason,
      };
    }
  }

  for (const profile of REGISTRAR_PROFILES) {
    if (matchesAnyPattern(rawRegistrar, profile.rawPatterns)) {
      return {
        friendlyRegistrar: profile.friendly,
        friendlyRegistrarUrl: profile.url,
        confidence: 98,
        method: "authoritative-match",
        reason: "Authoritative WHOIS registrar matches known brand signature.",
      };
    }
  }

  for (const profile of REGISTRAR_PROFILES) {
    if (matchesAnyPattern(rawUrlHost, profile.urlPatterns)) {
      return {
        friendlyRegistrar: profile.friendly,
        friendlyRegistrarUrl: profile.url,
        confidence: 95,
        method: "authoritative-url",
        reason: "Authoritative WHOIS registrar URL matches known brand domain.",
      };
    }
  }

  if (!rawRegistrar) {
    for (const profile of REGISTRAR_PROFILES) {
      if (matchesAnyPattern(nameserverText, profile.nameserverPatterns)) {
        return {
          friendlyRegistrar: profile.friendly,
          friendlyRegistrarUrl: profile.url,
          confidence: 86,
          method: "nameserver-only",
          reason:
            "No authoritative registrar was returned; nameserver infrastructure strongly suggests provider.",
        };
      }
    }
  }

  return {
    friendlyRegistrar: null,
    friendlyRegistrarUrl: null,
    confidence: 0,
    method: "none",
    reason: "No high-confidence friendly registrar inference available.",
  };
}
