export interface CanonicalProviderSignals {
  asnAliases: string[];
  nameserverHints: string[];
  headerHints: string[];
  builderHints: string[];
}

export interface CanonicalProviderConfidencePolicy {
  asn: number;
  nameserver: number;
  isp: number;
  organization: number;
}

export interface CanonicalHostingProviderEntry {
  canonicalName: string;
  liveDashboard: boolean;
  defaultCategory: string;
  aliases: string[];
  scanPatterns: string[];
  signals: CanonicalProviderSignals;
  confidencePolicy: CanonicalProviderConfidencePolicy;
}

const DEFAULT_CONFIDENCE_POLICY: CanonicalProviderConfidencePolicy = {
  asn: 95,
  nameserver: 95,
  isp: 80,
  organization: 70,
};

const CANONICAL_HOSTING_PROVIDERS: CanonicalHostingProviderEntry[] = [
  {
    canonicalName: "GoDaddy",
    liveDashboard: true,
    defaultCategory: "Shared/cPanel",
    aliases: [
      "hostingtool",
      "go daddy",
      "godaddy managed wordpress",
      "godaddy website builder",
      "hostingtool managed wordpress",
      "hostingtool website builder",
      "hostingtool hosting",
    ],
    scanPatterns: ["hostingtool", "domaincontrol", "secureserver", "godaddy"],
    signals: {
      asnAliases: ["hostingtool", "godaddy"],
      nameserverHints: ["domaincontrol", "secureserver"],
      headerHints: ["x-gateway-cache", "x-siteid"],
      builderHints: ["godaddy website builder", "hostingtool website builder"],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Bluehost",
    liveDashboard: true,
    defaultCategory: "Shared/cPanel",
    aliases: ["bluehost managed wordpress", "hostmonster"],
    scanPatterns: ["bluehost", "hostmonster"],
    signals: {
      asnAliases: ["bluehost"],
      nameserverHints: ["bluehost", "hostmonster"],
      headerHints: ["x-bluehost-cache", "x-bluehost-managed"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "HostGator",
    liveDashboard: true,
    defaultCategory: "Shared/cPanel",
    aliases: [],
    scanPatterns: ["hostgator", "gator"],
    signals: {
      asnAliases: ["hostgator"],
      nameserverHints: ["hostgator"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Unified Layer (Bluehost/HostGator)",
    liveDashboard: false,
    defaultCategory: "Shared/cPanel",
    aliases: ["unified layer", "bluehost/hostgator", "bluehost hostgator"],
    scanPatterns: [],
    signals: {
      asnAliases: ["unified layer"],
      nameserverHints: [],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "SiteGround",
    liveDashboard: true,
    defaultCategory: "Managed WordPress",
    aliases: ["siteground managed"],
    scanPatterns: ["siteground"],
    signals: {
      asnAliases: ["siteground"],
      nameserverHints: ["siteground"],
      headerHints: ["x-sg-id", "x-sg-cache"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "WP Engine",
    liveDashboard: true,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["wpengine", "wpenginepowered", "wp engine"],
    signals: {
      asnAliases: ["wp engine", "wpengine"],
      nameserverHints: ["wpengine", "wpenginepowered"],
      headerHints: ["wpe-backend", "x-powered-by: wp engine"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Kinsta",
    liveDashboard: true,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["kinsta"],
    signals: {
      asnAliases: ["kinsta"],
      nameserverHints: ["kinsta"],
      headerHints: ["x-kinsta-cache"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Cloudflare",
    liveDashboard: true,
    defaultCategory: "CDN/DNS",
    aliases: [],
    scanPatterns: ["cloudflare"],
    signals: {
      asnAliases: ["cloudflare"],
      nameserverHints: ["cloudflare"],
      headerHints: ["cf-ray", "cf-cache-status", "cf-request-id"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "AWS",
    liveDashboard: true,
    defaultCategory: "Cloud/VPS",
    aliases: [
      "amazon web services",
      "amazon web services aws",
      "amazon web services (aws)",
      "aws lightsail wordpress",
      "cloudfront",
      "amazon cloudfront",
    ],
    scanPatterns: ["amazonaws", "aws", "amazon", "lightsail", "cloudfront"],
    signals: {
      asnAliases: ["amazon web services", "aws"],
      nameserverHints: ["awsdns"],
      headerHints: ["x-amz", "x-cache"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Google Cloud",
    liveDashboard: true,
    defaultCategory: "Cloud/VPS",
    aliases: [
      "google cloud platform",
      "google cloud platform gcp",
      "google cloud platform (gcp)",
      "gcp",
      "google cloud cdn",
    ],
    scanPatterns: ["googledomains", "google cloud", "gcp", "googleusercontent"],
    signals: {
      asnAliases: ["google cloud platform", "google cloud", "gcp"],
      nameserverHints: ["googledomains", "google"],
      headerHints: ["x-goog"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "DigitalOcean",
    liveDashboard: true,
    defaultCategory: "Cloud/VPS",
    aliases: [],
    scanPatterns: ["digitalocean"],
    signals: {
      asnAliases: ["digitalocean"],
      nameserverHints: ["digitalocean"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Vercel",
    liveDashboard: true,
    defaultCategory: "Cloud/VPS",
    aliases: [],
    scanPatterns: ["vercel", "vercel-dns"],
    signals: {
      asnAliases: ["vercel"],
      nameserverHints: ["vercel-dns"],
      headerHints: ["x-vercel", "server: vercel"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Netlify",
    liveDashboard: true,
    defaultCategory: "Cloud/VPS",
    aliases: [],
    scanPatterns: ["netlify", "netlifydns", "nsone"],
    signals: {
      asnAliases: ["netlify"],
      nameserverHints: ["nsone", "netlify"],
      headerHints: ["x-nf-request-id", "server: netlify"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Flywheel",
    liveDashboard: false,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["flywheel", "getflywheel"],
    signals: {
      asnAliases: ["flywheel"],
      nameserverHints: ["flywheel"],
      headerHints: ["x-fw-hash", "x-fw-serve", "x-fw-type"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Linode",
    liveDashboard: false,
    defaultCategory: "Cloud/VPS",
    aliases: [],
    scanPatterns: ["linode"],
    signals: {
      asnAliases: ["linode"],
      nameserverHints: ["linode"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Vultr",
    liveDashboard: false,
    defaultCategory: "Cloud/VPS",
    aliases: [],
    scanPatterns: ["vultr", "choopa"],
    signals: {
      asnAliases: ["vultr"],
      nameserverHints: ["vultr"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Namecheap",
    liveDashboard: false,
    defaultCategory: "Shared/cPanel",
    aliases: [],
    scanPatterns: ["namecheap", "registrar-servers"],
    signals: {
      asnAliases: ["namecheap"],
      nameserverHints: ["registrar-servers"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "DreamHost",
    liveDashboard: false,
    defaultCategory: "Shared/cPanel",
    aliases: ["dreamhost dreampress"],
    scanPatterns: ["dreamhost", "dreampress"],
    signals: {
      asnAliases: ["dreamhost"],
      nameserverHints: ["dreamhost"],
      headerHints: ["x-dh-cache", "x-dreampress"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "A2 Hosting",
    liveDashboard: false,
    defaultCategory: "Shared/cPanel",
    aliases: ["a2 managed wordpress", "a2 managed wp"],
    scanPatterns: ["a2hosting"],
    signals: {
      asnAliases: ["a2 hosting", "a2hosting"],
      nameserverHints: ["a2hosting"],
      headerHints: ["x-a2-managed-wp", "x-a2-cache", "x-turbo-charged-by"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "InMotion",
    liveDashboard: false,
    defaultCategory: "Shared/VPS",
    aliases: ["inmotion hosting", "inmotionhosting"],
    scanPatterns: ["inmotionhosting", "inmotion"],
    signals: {
      asnAliases: ["inmotion", "inmotionhosting"],
      nameserverHints: ["inmotionhosting"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Hostinger",
    liveDashboard: false,
    defaultCategory: "Shared/cPanel",
    aliases: ["hostinger managed wordpress"],
    scanPatterns: ["hostinger"],
    signals: {
      asnAliases: ["hostinger"],
      nameserverHints: ["hostinger"],
      headerHints: ["x-hostinger-cache", "x-hostinger-managed-wp"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Liquid Web",
    liveDashboard: false,
    defaultCategory: "Managed/VPS",
    aliases: [],
    scanPatterns: ["liquidweb"],
    signals: {
      asnAliases: ["liquid web", "liquidweb"],
      nameserverHints: ["liquidweb"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Media Temple",
    liveDashboard: false,
    defaultCategory: "Managed/Cloud",
    aliases: [],
    scanPatterns: ["mediatemple", "media temple"],
    signals: {
      asnAliases: ["media temple", "mediatemple"],
      nameserverHints: ["mediatemple"],
      headerHints: [],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Pantheon",
    liveDashboard: false,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["pantheon", "pantheonsite"],
    signals: {
      asnAliases: ["pantheon"],
      nameserverHints: ["pantheon"],
      headerHints: ["x-pantheon", "x-styx-req-id"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Pagely",
    liveDashboard: false,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["pagely"],
    signals: {
      asnAliases: ["pagely"],
      nameserverHints: ["pagely"],
      headerHints: ["x-pagely-cache"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Pressable",
    liveDashboard: false,
    defaultCategory: "Managed WordPress",
    aliases: [],
    scanPatterns: ["pressable"],
    signals: {
      asnAliases: ["pressable"],
      nameserverHints: ["pressable"],
      headerHints: ["x-pressable-cache"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Cloudways",
    liveDashboard: false,
    defaultCategory: "Managed/VPS",
    aliases: [],
    scanPatterns: ["cloudways"],
    signals: {
      asnAliases: ["cloudways"],
      nameserverHints: [],
      headerHints: ["x-breeze"],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "Platform.sh",
    liveDashboard: false,
    defaultCategory: "Managed/Cloud",
    aliases: [],
    scanPatterns: ["platform.sh", "platformsh"],
    signals: {
      asnAliases: ["platform.sh", "platformsh"],
      nameserverHints: [],
      headerHints: [
        "x-platform-cluster",
        "x-platform-router",
        "x-platform-cache",
      ],
      builderHints: [],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
  {
    canonicalName: "WordPress.com",
    liveDashboard: false,
    defaultCategory: "Managed WordPress",
    aliases: ["wordpress.com vip", "wordpress com vip"],
    scanPatterns: ["wordpress.com", "automattic", "wp.com"],
    signals: {
      asnAliases: ["automattic", "wordpress.com"],
      nameserverHints: ["wordpress.com"],
      headerHints: ["x-vip", "x-automattic"],
      builderHints: ["wordpress.com"],
    },
    confidencePolicy: DEFAULT_CONFIDENCE_POLICY,
  },
];

const LIVE_DASHBOARD_PROVIDERS = CANONICAL_HOSTING_PROVIDERS.filter(
  (provider) => provider.liveDashboard,
).map((provider) => provider.canonicalName);

function normalizeProviderLookupValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/hostingtool/g, "godaddy")
    .replace(/\(gcp\)/g, "gcp")
    .replace(/\(aws\)/g, "aws")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const aliasLookup = new Map<string, CanonicalHostingProviderEntry>();

for (const provider of CANONICAL_HOSTING_PROVIDERS) {
  const candidates = new Set<string>([
    provider.canonicalName,
    ...provider.aliases,
    ...provider.scanPatterns,
    ...provider.signals.asnAliases,
    ...provider.signals.builderHints,
  ]);

  for (const candidate of candidates) {
    const key = normalizeProviderLookupValue(candidate);
    if (key) {
      aliasLookup.set(key, provider);
    }
  }
}

export function getCanonicalHostingProviderCatalog(): CanonicalHostingProviderEntry[] {
  return CANONICAL_HOSTING_PROVIDERS.map((entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    scanPatterns: [...entry.scanPatterns],
    signals: {
      asnAliases: [...entry.signals.asnAliases],
      nameserverHints: [...entry.signals.nameserverHints],
      headerHints: [...entry.signals.headerHints],
      builderHints: [...entry.signals.builderHints],
    },
    confidencePolicy: { ...entry.confidencePolicy },
  }));
}

export function getLiveDashboardCanonicalProviders(): string[] {
  return [...LIVE_DASHBOARD_PROVIDERS];
}

export function normalizeHostingProviderLabel(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "unknown") return null;

  const key = normalizeProviderLookupValue(trimmed);
  if (!key) return null;

  const matched = aliasLookup.get(key);
  if (matched) {
    return matched.canonicalName;
  }

  // Soft matching for labels that include a canonical alias inside a larger string.
  for (const [aliasKey, provider] of aliasLookup.entries()) {
    if (key.includes(aliasKey) || aliasKey.includes(key)) {
      return provider.canonicalName;
    }
  }

  return trimmed.replace(/hostingtool/gi, "GoDaddy");
}

export function resolvePreferredHostingProvider(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = normalizeHostingProviderLabel(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function normalizeHostingProviderCategory(
  value: string | null | undefined,
  providerName?: string | null,
): string {
  const canonicalProvider = normalizeHostingProviderLabel(providerName);
  if (canonicalProvider) {
    const provider = CANONICAL_HOSTING_PROVIDERS.find(
      (entry) => entry.canonicalName === canonicalProvider,
    );
    if (provider) {
      return provider.defaultCategory;
    }
  }

  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized.includes("cdn")) return "CDN/DNS";
  if (normalized.includes("cloud")) return "Cloud/VPS";
  if (normalized.includes("shared")) return "Shared/cPanel";
  if (normalized.includes("managed")) return "Managed WordPress";
  if (normalized.includes("website builder")) return "Website Builder";
  return value || "Unknown";
}

export function inferCanonicalProviderType(
  providerName: string | null | undefined,
  explicitCategory?: string | null,
): "cloud" | "shared" | "dedicated" | "unknown" {
  const category = normalizeHostingProviderCategory(
    explicitCategory,
    providerName,
  );
  const normalizedCategory = category.toLowerCase();

  if (
    normalizedCategory.includes("cloud") ||
    normalizedCategory.includes("cdn")
  ) {
    return "cloud";
  }
  if (normalizedCategory.includes("shared")) {
    return "shared";
  }
  if (normalizedCategory.includes("dedicated")) {
    return "dedicated";
  }
  if (normalizedCategory.includes("managed")) {
    return "dedicated";
  }

  const normalizedProvider = normalizeProviderLookupValue(providerName || "");
  if (!normalizedProvider) return "unknown";
  if (
    normalizedProvider.includes("aws") ||
    normalizedProvider.includes("google cloud") ||
    normalizedProvider.includes("azure") ||
    normalizedProvider.includes("digitalocean") ||
    normalizedProvider.includes("cloudflare") ||
    normalizedProvider.includes("vercel") ||
    normalizedProvider.includes("netlify")
  ) {
    return "cloud";
  }
  if (
    normalizedProvider.includes("godaddy") ||
    normalizedProvider.includes("bluehost") ||
    normalizedProvider.includes("hostgator") ||
    normalizedProvider.includes("hostinger")
  ) {
    return "shared";
  }
  return "unknown";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

export function getHostingProviderCandidatesFromScanData(
  scanData: Record<string, unknown>,
): string[] {
  const hosting = asRecord(scanData.hosting);
  const provider = asRecord(scanData.provider);
  const providerData = asRecord(scanData.providerData);
  const technologyData = asRecord(scanData.technologyData);
  const technologyHosting = asRecord(technologyData.hosting);
  const technologyServer = asRecord(technologyData.server);
  const infrastructure = asRecord(scanData.infrastructure);

  const candidates: Array<string | null> = [
    toStringValue(scanData.hostingProvider),
    toStringValue(hosting.provider),
    toStringValue(provider.provider),
    toStringValue(provider.name),
    toStringValue(providerData.provider),
    toStringValue(technologyHosting.provider),
    toStringValue(technologyServer.builderType),
    toStringValue(infrastructure.hostingProvider),
  ];

  return Array.from(
    new Set(
      candidates
        .map((value) => (value ? value.trim() : null))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function extractCanonicalHostingProviderFromScanData(
  scanData: Record<string, unknown>,
): string | null {
  const candidates = getHostingProviderCandidatesFromScanData(scanData);
  for (const candidate of candidates) {
    const normalized = normalizeHostingProviderLabel(candidate);
    if (normalized) return normalized;
  }
  return null;
}

export function getCanonicalProviderByName(
  providerName: string | null | undefined,
): CanonicalHostingProviderEntry | null {
  const normalized = normalizeHostingProviderLabel(providerName);
  if (!normalized) return null;
  return (
    CANONICAL_HOSTING_PROVIDERS.find(
      (entry) => entry.canonicalName === normalized,
    ) || null
  );
}

export function getScanPatternProviders(): CanonicalHostingProviderEntry[] {
  return CANONICAL_HOSTING_PROVIDERS.filter(
    (provider) => provider.scanPatterns.length > 0,
  );
}
