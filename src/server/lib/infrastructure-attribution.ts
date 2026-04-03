/**
 * Infrastructure Attribution Engine
 *
 * Identifies and attributes hosting providers, CDN services, cloud platforms,
 * and other infrastructure components based on DNS, IP, and technology data.
 *
 * Features:
 * - Hosting provider detection (GoDaddy, AWS, Azure, GCP, etc.)
 * - CDN identification (Cloudflare, Akamai, Fastly, etc.)
 * - Cloud platform recognition (AWS, Azure, GCP, DigitalOcean, etc.)
 * - Infrastructure fingerprinting
 * - Service provider correlation
 * - Technology stack mapping
 * - Infrastructure change tracking
 * - Provider confidence scoring
 */

import { db } from "../db/client.js";
import {
  dnsRecords,
  ipIntelligence,
  technologyStack,
  urlscanResults,
} from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InfrastructureAttribution {
  domain: string;
  hostingProvider: ProviderAttribution | null;
  cdnProvider: ProviderAttribution | null;
  cloudPlatform: ProviderAttribution | null;
  emailProvider: ProviderAttribution | null;
  dnsProvider: ProviderAttribution | null;
  infrastructureFingerprint: InfrastructureFingerprint;
  technologyMapping: TechnologyMapping;
  changeHistory: InfrastructureChange[];
  confidence: ConfidenceScore;
  lastAnalyzed: Date;
}

export interface ProviderAttribution {
  name: string;
  type: "hosting" | "cdn" | "cloud" | "email" | "dns";
  confidence: number; // 0-100
  evidence: Evidence[];
  detectionMethod: string;
  services: string[];
  region?: string;
  tier?: ProviderTier;
}

export interface Evidence {
  source: "dns" | "ip" | "technology" | "urlscan" | "whois";
  type: string;
  value: string;
  weight: number; // 0-1
  description: string;
}

export interface InfrastructureFingerprint {
  ipAddresses: string[];
  nameservers: string[];
  mailServers: string[];
  asn: string[];
  organizations: string[];
  technologies: string[];
  sslProvider?: string;
  uniqueIdentifiers: Record<string, string>;
}

export interface TechnologyMapping {
  webServer: string[];
  applicationServer: string[];
  database: string[];
  cache: string[];
  loadBalancer: string[];
  monitoring: string[];
  analytics: string[];
  security: string[];
}

export interface InfrastructureChange {
  date: Date;
  changeType: "hosting" | "cdn" | "cloud" | "dns" | "email" | "technology";
  oldValue: string;
  newValue: string;
  confidence: number;
}

export interface ConfidenceScore {
  overall: number; // 0-100
  hosting: number;
  cdn: number;
  cloud: number;
  email: number;
  dns: number;
}

export type ProviderTier =
  | "free"
  | "shared"
  | "vps"
  | "dedicated"
  | "enterprise"
  | "cloud"
  | "cdn"
  | "platform";

// ============================================================================
// PROVIDER DETECTION PATTERNS
// ============================================================================

const HOSTING_PATTERNS = {
  // ========== MAJOR CLOUD PROVIDERS ==========
  godaddy_legacy: {
    nameservers: [
      "ns\\d+\\.domaincontrol\\.com",
      "dns\\d+\\.registrar-servers\\.com",
    ],
    ips: ["160.153.", "184.168.", "50.63.", "68.178.", "72.167.", "97.74."],
    asn: ["AS26496", "AS26384"],
    technologies: [
      "GoDaddy Website Builder",
      "GoDaddy Website Builder",
      "GoDaddy Hosting",
    ],
    tier: "shared",
  },
  aws: {
    nameservers: ["ns-\\d+\\.awsdns-\\d+\\.(com|net|org|co\\.uk)"],
    ips: ["3.", "13.", "18.", "34.", "35.", "52.", "54."],
    asn: ["AS16509", "AS14618"],
    technologies: ["Amazon CloudFront", "AWS", "Amazon S3", "Amazon EC2"],
    tier: "cloud",
  },
  cloudflare: {
    nameservers: ["[a-z]+\\.ns\\.cloudflare\\.com"],
    ips: [
      "104.16.",
      "104.17.",
      "104.18.",
      "104.19.",
      "104.20.",
      "104.21.",
      "104.22.",
      "104.23.",
      "104.24.",
      "104.25.",
      "104.26.",
      "104.27.",
      "104.28.",
      "104.29.",
      "104.30.",
      "104.31.",
      "172.64.",
      "172.65.",
      "172.66.",
      "172.67.",
    ],
    asn: ["AS13335"],
    technologies: ["Cloudflare", "Cloudflare CDN"],
    tier: "cdn",
  },
  azure: {
    nameservers: ["ns\\d+-\\d+\\.azure-dns\\.(com|net|org|info)"],
    ips: ["20.", "40.", "52.", "104."],
    asn: ["AS8075"],
    technologies: ["Microsoft Azure", "Azure CDN"],
    tier: "cloud",
  },
  gcp: {
    nameservers: ["ns-cloud-[a-z]\\d+\\.googledomains\\.com"],
    ips: ["34.", "35."],
    asn: ["AS15169", "AS396982"],
    technologies: ["Google Cloud", "Google Cloud CDN", "Google Cloud Storage"],
    tier: "cloud",
  },
  digitalocean: {
    nameservers: ["ns\\d+\\.digitalocean\\.com"],
    ips: [
      "104.131.",
      "159.89.",
      "165.227.",
      "167.99.",
      "167.172.",
      "178.62.",
      "188.166.",
    ],
    asn: ["AS14061"],
    technologies: ["DigitalOcean"],
    tier: "vps",
  },
  netlify: {
    nameservers: ["dns\\d+\\.p\\d+\\.nsone\\.net"],
    ips: ["75.2."],
    asn: ["AS20940"],
    technologies: ["Netlify"],
    tier: "platform",
  },
  vercel: {
    nameservers: ["ns\\d+\\.vercel-dns\\.com"],
    ips: ["76.76."],
    asn: ["AS13335"],
    technologies: ["Vercel"],
    tier: "platform",
  },
  heroku: {
    nameservers: [],
    ips: ["50.16.", "50.17.", "50.19.", "54.", "23.21.", "23.23."],
    asn: ["AS16509"],
    technologies: ["Heroku"],
    tier: "platform",
  },
  linode: {
    nameservers: ["ns\\d+\\.linode\\.com"],
    ips: [
      "45.33.",
      "45.56.",
      "45.79.",
      "50.116.",
      "66.175.",
      "69.164.",
      "72.14.",
      "96.126.",
      "97.107.",
      "139.162.",
      "172.104.",
      "173.230.",
      "173.255.",
      "176.58.",
      "178.79.",
      "192.155.",
      "198.58.",
      "212.71.",
      "213.168.",
      "213.219.",
    ],
    asn: ["AS63949"],
    technologies: ["Linode"],
    tier: "vps",
  },

  // ========== US SHARED HOSTING ==========
  bluehost: {
    nameservers: ["ns\\d+\\.bluehost\\.com"],
    ips: ["162.241.", "162.144.", "50.87.", "66.147.", "69.89.", "74.220."],
    asn: ["AS46606"],
    technologies: ["Bluehost"],
    tier: "shared",
  },
  hostgator: {
    nameservers: ["ns\\d+\\.hostgator\\.com"],
    ips: ["192.185.", "198.57.", "198.71.", "199.34."],
    asn: ["AS46606"],
    technologies: ["HostGator"],
    tier: "shared",
  },
  dreamhost: {
    nameservers: ["ns\\d+\\.dreamhost\\.com"],
    ips: [
      "64.90.",
      "66.33.",
      "67.205.",
      "69.163.",
      "173.236.",
      "205.196.",
      "208.97.",
    ],
    asn: ["AS26347"],
    technologies: ["DreamHost"],
    tier: "shared",
  },
  siteground: {
    nameservers: ["ns\\d+\\.siteground\\.(net|com)"],
    ips: ["138.68.", "138.201.", "139.59.", "185.93."],
    asn: ["AS51430"],
    technologies: ["SiteGround"],
    tier: "shared",
  },
  hostinger: {
    nameservers: ["ns\\d+\\.hostinger\\.(com|net)"],
    ips: ["176.32.", "176.223."],
    asn: ["AS47583"],
    technologies: ["Hostinger"],
    tier: "shared",
  },
  namecheap: {
    nameservers: ["dns\\d+\\.registrar-servers\\.com"],
    ips: ["198.54.", "198.12."],
    asn: ["AS22612"],
    technologies: ["Namecheap"],
    tier: "shared",
  },
  a2hosting: {
    nameservers: ["ns\\d+\\.a2hosting\\.com"],
    ips: ["66.96.", "67.225.", "69.175.", "173.231."],
    asn: ["AS55293"],
    technologies: ["A2 Hosting"],
    tier: "shared",
  },
  inmotion: {
    nameservers: ["ns\\d+\\.inmotionhosting\\.com"],
    ips: ["170.39.", "198.46.", "209.182."],
    asn: ["AS22611"],
    technologies: ["InMotion Hosting"],
    tier: "shared",
  },
  liquidweb: {
    nameservers: ["ns\\d+\\.liquidweb\\.com"],
    ips: ["67.227.", "69.16.", "72.52.", "209.59."],
    asn: ["AS32244"],
    technologies: ["Liquid Web"],
    tier: "dedicated",
  },
  wpengine: {
    nameservers: ["ns\\d+\\.wpengine\\.com"],
    ips: ["141.193.", "198.143."],
    asn: ["AS53831"],
    technologies: ["WP Engine"],
    tier: "managed",
  },
  kinsta: {
    nameservers: [],
    ips: ["35.186.", "35.197.", "35.203."],
    asn: ["AS15169"],
    technologies: ["Kinsta"],
    tier: "managed",
  },
  flywheel: {
    nameservers: [],
    ips: ["35.184.", "35.188."],
    asn: ["AS15169"],
    technologies: ["Flywheel"],
    tier: "managed",
  },

  // ========== EUROPEAN HOSTING ==========
  ovh: {
    nameservers: ["ns\\d+\\.ovh\\.(net|com)"],
    ips: [
      "51.",
      "54.36.",
      "54.37.",
      "54.38.",
      "137.74.",
      "141.94.",
      "141.95.",
      "145.239.",
      "146.59.",
      "147.135.",
      "151.80.",
      "152.228.",
      "178.32.",
      "188.165.",
      "193.70.",
      "213.186.",
      "213.251.",
    ],
    asn: ["AS16276"],
    technologies: ["OVH"],
    tier: "vps",
  },
  hetzner: {
    nameservers: [
      "ns\\d+\\.first-ns\\.de",
      "robotns\\d+\\.second-ns\\.de",
      "helium\\.ns\\.hetzner\\.de",
      "hydrogen\\.ns\\.hetzner\\.com",
      "oxygen\\.ns\\.hetzner\\.com",
    ],
    ips: [
      "5.9.",
      "46.4.",
      "78.46.",
      "78.47.",
      "88.198.",
      "88.99.",
      "94.130.",
      "95.216.",
      "116.202.",
      "116.203.",
      "135.181.",
      "136.243.",
      "138.201.",
      "142.132.",
      "144.76.",
      "148.251.",
      "157.90.",
      "159.69.",
      "162.55.",
      "168.119.",
      "176.9.",
      "178.63.",
      "188.34.",
      "188.40.",
      "195.201.",
      "213.133.",
      "213.239.",
    ],
    asn: ["AS24940"],
    technologies: ["Hetzner"],
    tier: "vps",
  },
  oneandone: {
    nameservers: ["ns\\d+\\.1and1\\.com", "ns\\d+\\.1und1\\.de"],
    ips: ["74.208.", "217.160."],
    asn: ["AS8560"],
    technologies: ["1&1 IONOS"],
    tier: "shared",
  },
  strato: {
    nameservers: ["ns\\d+\\.strato\\.de"],
    ips: ["81.169.", "85.214."],
    asn: ["AS6724"],
    technologies: ["Strato"],
    tier: "shared",
  },
  scaleway: {
    nameservers: ["ns\\d+\\.online\\.net"],
    ips: [
      "51.15.",
      "51.158.",
      "62.210.",
      "163.172.",
      "195.154.",
      "212.47.",
      "212.83.",
    ],
    asn: ["AS12876"],
    technologies: ["Scaleway"],
    tier: "cloud",
  },
  contabo: {
    nameservers: ["ns\\d+\\.contabo\\.(net|com)"],
    ips: ["173.249.", "207.180."],
    asn: ["AS51167"],
    technologies: ["Contabo"],
    tier: "vps",
  },

  // ========== ASIAN HOSTING ==========
  alibaba: {
    nameservers: ["dns\\d+\\.hichina\\.com", "ns\\d+\\.alidns\\.com"],
    ips: ["47.", "116.", "120.", "121."],
    asn: ["AS37963", "AS45102"],
    technologies: ["Alibaba Cloud"],
    tier: "cloud",
  },
  tencent: {
    nameservers: ["ns\\d+\\.dnspod\\.net"],
    ips: ["43.", "49.", "81.", "119.", "129.", "150.", "152.", "154."],
    asn: ["AS45090", "AS132203"],
    technologies: ["Tencent Cloud"],
    tier: "cloud",
  },
  sakura: {
    nameservers: ["ns\\d+\\.dns\\.ne\\.jp"],
    ips: ["153.120.", "160.16.", "202.181."],
    asn: ["AS7684"],
    technologies: ["Sakura Internet"],
    tier: "vps",
  },
  conoha: {
    nameservers: ["ns\\d+\\.conoha\\.io"],
    ips: ["133.130.", "150.95.", "163.43."],
    asn: ["AS7506"],
    technologies: ["ConoHa"],
    tier: "vps",
  },

  // ========== VPS PROVIDERS ==========
  vultr: {
    nameservers: ["ns\\d+\\.vultr\\.com"],
    ips: [
      "45.32.",
      "45.63.",
      "45.76.",
      "45.77.",
      "66.42.",
      "95.179.",
      "104.156.",
      "108.61.",
      "140.82.",
      "144.202.",
      "149.28.",
      "155.138.",
      "207.148.",
      "207.246.",
    ],
    asn: ["AS20473"],
    technologies: ["Vultr"],
    tier: "vps",
  },
  upcloud: {
    nameservers: ["ns\\d+\\.upcloud\\.host"],
    ips: ["94.237.", "95.85."],
    asn: ["AS202053"],
    technologies: ["UpCloud"],
    tier: "vps",
  },
  kamatera: {
    nameservers: ["ns\\d+\\.kamatera\\.com"],
    ips: ["5.9.", "138.201."],
    asn: ["AS50673"],
    technologies: ["Kamatera"],
    tier: "vps",
  },

  // ========== WEBSITE BUILDERS ==========
  wix: {
    nameservers: ["ns\\d+\\.wixdns\\.net"],
    ips: ["185.230.60.", "185.230.61.", "185.230.62.", "185.230.63."],
    asn: ["AS58182"],
    technologies: ["Wix"],
    tier: "platform",
  },
  squarespace: {
    nameservers: ["ns\\d+\\.squarespace\\.com"],
    ips: ["198.185.159.", "198.49.23."],
    asn: ["AS53831"],
    technologies: ["Squarespace"],
    tier: "platform",
  },
  shopify: {
    nameservers: ["ns\\d+\\.shopify\\.com"],
    ips: ["23.227.38."],
    asn: ["AS13335"],
    technologies: ["Shopify"],
    tier: "platform",
  },
  weebly: {
    nameservers: ["ns\\d+\\.weebly\\.com"],
    ips: ["199.34.228."],
    asn: ["AS46606"],
    technologies: ["Weebly"],
    tier: "platform",
  },
  webflow: {
    nameservers: [],
    ips: ["35.186.", "35.197."],
    asn: ["AS15169"],
    technologies: ["Webflow"],
    tier: "platform",
  },
  wordpress_com: {
    nameservers: ["ns\\d+\\.wordpress\\.com"],
    ips: ["192.0.78.", "192.0.79."],
    asn: ["AS2635"],
    technologies: ["WordPress.com"],
    tier: "platform",
  },
  ghost: {
    nameservers: [],
    ips: ["104.26.", "172.67."],
    asn: ["AS13335"],
    technologies: ["Ghost"],
    tier: "platform",
  },
  carrd: {
    nameservers: [],
    ips: ["185.199.108.", "185.199.109.", "185.199.110.", "185.199.111."],
    asn: ["AS36459"],
    technologies: ["Carrd"],
    tier: "platform",
  },

  // ========== SPECIALIZED HOSTING ==========
  rackspace: {
    nameservers: ["ns\\d+\\.rackspace\\.com"],
    ips: [
      "23.253.",
      "67.192.",
      "69.20.",
      "72.3.",
      "74.205.",
      "96.127.",
      "162.13.",
      "162.209.",
      "162.242.",
      "162.243.",
      "162.244.",
      "162.245.",
      "162.246.",
      "162.247.",
      "162.248.",
      "162.249.",
      "162.250.",
      "162.251.",
      "162.252.",
      "162.253.",
      "162.254.",
      "162.255.",
    ],
    asn: ["AS27357"],
    technologies: ["Rackspace"],
    tier: "dedicated",
  },
  pantheon: {
    nameservers: [],
    ips: ["23.185.0."],
    asn: ["AS53831"],
    technologies: ["Pantheon"],
    tier: "managed",
  },
  acquia: {
    nameservers: [],
    ips: ["54.", "52."],
    asn: ["AS16509"],
    technologies: ["Acquia"],
    tier: "managed",
  },
  platform_sh: {
    nameservers: [],
    ips: ["54.", "52."],
    asn: ["AS16509"],
    technologies: ["Platform.sh"],
    tier: "platform",
  },

  // ========== ADDITIONAL CLOUD ==========
  ibm_cloud: {
    nameservers: ["ns\\d+\\.softlayer\\.com"],
    ips: ["169.", "158.", "159."],
    asn: ["AS36351"],
    technologies: ["IBM Cloud"],
    tier: "cloud",
  },
  oracle_cloud: {
    nameservers: ["ns\\d+\\.oraclecloud\\.com"],
    ips: [
      "129.",
      "130.",
      "132.",
      "134.",
      "138.",
      "140.",
      "144.",
      "147.",
      "150.",
      "152.",
      "156.",
    ],
    asn: ["AS31898"],
    technologies: ["Oracle Cloud"],
    tier: "cloud",
  },
  render: {
    nameservers: [],
    ips: ["216.24.57."],
    asn: ["AS54825"],
    technologies: ["Render"],
    tier: "platform",
  },
  railway: {
    nameservers: [],
    ips: ["35.", "34."],
    asn: ["AS15169"],
    technologies: ["Railway"],
    tier: "platform",
  },
  deta: {
    nameservers: [],
    ips: ["35.", "34."],
    asn: ["AS15169"],
    technologies: ["Deta"],
    tier: "platform",
  },
  cyclic: {
    nameservers: [],
    ips: ["3.", "13.", "18."],
    asn: ["AS16509"],
    technologies: ["Cyclic"],
    tier: "platform",
  },

  // ========== ADDITIONAL US HOSTING ==========
  greengeeks: {
    nameservers: ["ns\\d+\\.greengeeks\\.com"],
    ips: ["198.1.", "198.12."],
    asn: ["AS36352"],
    technologies: ["GreenGeeks"],
    tier: "shared",
  },
  ipage: {
    nameservers: ["ns\\d+\\.ipage\\.com"],
    ips: ["198.57.", "198.71."],
    asn: ["AS46606"],
    technologies: ["iPage"],
    tier: "shared",
  },
  justhost: {
    nameservers: ["ns\\d+\\.justhost\\.com"],
    ips: ["162.241.", "162.144."],
    asn: ["AS46606"],
    technologies: ["JustHost"],
    tier: "shared",
  },
  hostwinds: {
    nameservers: ["ns\\d+\\.hostwinds\\.com"],
    ips: ["104.168.", "108.167."],
    asn: ["AS54290"],
    technologies: ["Hostwinds"],
    tier: "vps",
  },
  interserver: {
    nameservers: ["ns\\d+\\.interserver\\.net"],
    ips: [
      "45.32.",
      "162.210.",
      "162.213.",
      "162.214.",
      "162.215.",
      "162.216.",
      "162.217.",
      "162.218.",
      "162.219.",
      "162.220.",
      "162.221.",
      "162.222.",
      "162.223.",
    ],
    asn: ["AS19318"],
    technologies: ["InterServer"],
    tier: "vps",
  },

  // ========== ADDITIONAL EUROPEAN HOSTING ==========
  aruba: {
    nameservers: ["ns\\d+\\.aruba\\.it"],
    ips: ["62.149.", "89.46.", "94.23.", "151.1."],
    asn: ["AS31034"],
    technologies: ["Aruba"],
    tier: "shared",
  },
  infomaniak: {
    nameservers: ["ns\\d+\\.infomaniak\\.ch"],
    ips: ["83.166.", "84.16.", "185.28.", "185.101."],
    asn: ["AS29222"],
    technologies: ["Infomaniak"],
    tier: "shared",
  },
  netcup: {
    nameservers: ["ns\\d+\\.netcup\\.net"],
    ips: ["46.38.", "185.170."],
    asn: ["AS197540"],
    technologies: ["netcup"],
    tier: "vps",
  },
  ionos: {
    nameservers: ["ns\\d+\\.ionos\\.(com|de)"],
    ips: ["217.160.", "74.208."],
    asn: ["AS8560"],
    technologies: ["IONOS"],
    tier: "shared",
  },

  // ========== ADDITIONAL ASIAN HOSTING ==========
  naver: {
    nameservers: ["ns\\d+\\.ncloud\\.com"],
    ips: ["49.50.", "106.10.", "125.209.", "211.249."],
    asn: ["AS23576"],
    technologies: ["Naver Cloud"],
    tier: "cloud",
  },
  kakao: {
    nameservers: ["ns\\d+\\.kakao\\.com"],
    ips: ["110.76.", "211.231."],
    asn: ["AS38099"],
    technologies: ["Kakao Cloud"],
    tier: "cloud",
  },
  huawei: {
    nameservers: ["ns\\d+\\.huaweicloud\\.com"],
    ips: ["114.", "117.", "119.", "121.", "122."],
    asn: ["AS55990", "AS136907"],
    technologies: ["Huawei Cloud"],
    tier: "cloud",
  },
  baidu: {
    nameservers: ["ns\\d+\\.baidubce\\.com"],
    ips: ["180.76.", "182.61."],
    asn: ["AS55967"],
    technologies: ["Baidu Cloud"],
    tier: "cloud",
  },
};

const CDN_PATTERNS = {
  cloudflare: HOSTING_PATTERNS.cloudflare,
  akamai: {
    nameservers: ["[a-z]+\\.akam\\.net"],
    ips: ["23.", "104."],
    asn: ["AS16625", "AS20940"],
    technologies: ["Akamai"],
    tier: "enterprise",
  },
  fastly: {
    nameservers: [],
    ips: ["151.101."],
    asn: ["AS54113"],
    technologies: ["Fastly"],
    tier: "enterprise",
  },
  cloudfront: {
    nameservers: [],
    ips: [],
    asn: ["AS16509"],
    technologies: ["Amazon CloudFront"],
    tier: "cloud",
  },
  maxcdn: {
    nameservers: [],
    ips: [],
    asn: ["AS30081"],
    technologies: ["MaxCDN", "StackPath"],
    tier: "cdn",
  },
};

const EMAIL_PATTERNS = {
  google: {
    mx: [
      "aspmx\\.l\\.google\\.com",
      "alt\\d+\\.aspmx\\.l\\.google\\.com",
      "aspmx\\d+\\.googlemail\\.com",
    ],
    technologies: ["Google Workspace", "Gmail"],
  },
  microsoft: {
    mx: [
      "[a-z0-9-]+\\.mail\\.protection\\.outlook\\.com",
      "[a-z0-9-]+\\.mx\\.microsoft",
    ],
    technologies: ["Microsoft 365", "Office 365", "Exchange Online"],
  },
  godaddy_legacy: {
    mx: ["smtp\\.secureserver\\.net", "mailstore1\\.secureserver\\.net"],
    technologies: ["GoDaddy Email"],
  },
  protonmail: {
    mx: ["mail\\.protonmail\\.ch", "mailsec\\.protonmail\\.ch"],
    technologies: ["ProtonMail"],
  },
  zoho: {
    mx: [
      "mx\\.zoho\\.(com|eu|in|com\\.au)",
      "mx\\d+\\.zoho\\.(com|eu|in|com\\.au)",
    ],
    technologies: ["Zoho Mail"],
  },
};

// ============================================================================
// MAIN ATTRIBUTION FUNCTION
// ============================================================================

export async function attributeInfrastructure(
  domain: string,
): Promise<InfrastructureAttribution> {
  // Fetch all relevant data
  const [dnsData, ipData, techData, urlscanData] = await Promise.all([
    fetchLatestDnsRecords(domain),
    fetchLatestIpIntelligence(domain),
    fetchLatestTechnologyStack(domain),
    fetchLatestUrlscanResults(domain),
  ]);

  // Build infrastructure fingerprint
  const fingerprint = buildInfrastructureFingerprint(dnsData, ipData, techData);

  // Detect providers
  const hostingProvider = detectHostingProvider(
    fingerprint,
    techData,
    urlscanData,
  );
  const cdnProvider = detectCdnProvider(fingerprint, techData, urlscanData);
  const cloudPlatform = detectCloudPlatform(fingerprint, techData);
  const emailProvider = detectEmailProvider(dnsData);
  const dnsProvider = detectDnsProvider(dnsData);

  // Map technologies to infrastructure components
  const technologyMapping = mapTechnologies(techData);

  // Calculate confidence scores
  const confidence = calculateConfidenceScores({
    hosting: hostingProvider,
    cdn: cdnProvider,
    cloud: cloudPlatform,
    email: emailProvider,
    dns: dnsProvider,
  });

  // Fetch change history (placeholder - would need historical data)
  const changeHistory: InfrastructureChange[] = [];

  return {
    domain,
    hostingProvider,
    cdnProvider,
    cloudPlatform,
    emailProvider,
    dnsProvider,
    infrastructureFingerprint: fingerprint,
    technologyMapping,
    changeHistory,
    confidence,
    lastAnalyzed: new Date(),
  };
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchLatestDnsRecords(domain: string) {
  const records = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.domain, domain))
    .orderBy(desc(dnsRecords.scannedAt))
    .limit(1);

  return records[0] || null;
}

async function fetchLatestIpIntelligence(domain: string) {
  const records = await db
    .select()
    .from(ipIntelligence)
    .where(eq(ipIntelligence.domain, domain))
    .orderBy(desc(ipIntelligence.scannedAt))
    .limit(1);

  return records[0] || null;
}

async function fetchLatestTechnologyStack(domain: string) {
  const records = await db
    .select()
    .from(technologyStack)
    .where(eq(technologyStack.domain, domain))
    .orderBy(desc(technologyStack.scannedAt))
    .limit(1);

  return records[0] || null;
}

async function fetchLatestUrlscanResults(domain: string) {
  const records = await db
    .select()
    .from(urlscanResults)
    .where(eq(urlscanResults.domain, domain))
    .orderBy(desc(urlscanResults.scannedAt))
    .limit(1);

  return records[0] || null;
}

type DnsSnapshot = {
  aRecords?: unknown;
  aaaaRecords?: unknown;
  nsRecords?: unknown;
  mxRecords?: unknown;
};

type IpSnapshot = {
  asn?: unknown;
  org?: unknown;
};

type TechSnapshot = {
  technologies?: unknown;
};

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toStringArray(values: unknown[]): string[] {
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (typeof value === "number") return String(value);
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

// ============================================================================
// INFRASTRUCTURE FINGERPRINTING
// ============================================================================

function buildInfrastructureFingerprint(
  dnsData: DnsSnapshot | null,
  ipData: IpSnapshot | null,
  techData: TechSnapshot | null,
): InfrastructureFingerprint {
  const fingerprint: InfrastructureFingerprint = {
    ipAddresses: [],
    nameservers: [],
    mailServers: [],
    asn: [],
    organizations: [],
    technologies: [],
    uniqueIdentifiers: {},
  };

  // Extract IP addresses
  fingerprint.ipAddresses.push(
    ...toStringArray(parseJsonArray(dnsData?.aRecords)),
  );
  fingerprint.ipAddresses.push(
    ...toStringArray(parseJsonArray(dnsData?.aaaaRecords)),
  );

  // Extract nameservers
  fingerprint.nameservers.push(
    ...toStringArray(parseJsonArray(dnsData?.nsRecords)),
  );

  // Extract mail servers
  const mxRecords = parseJsonArray(dnsData?.mxRecords);
  fingerprint.mailServers.push(
    ...mxRecords
      .map((mx) => {
        if (typeof mx === "string") return mx;
        if (mx && typeof mx === "object") {
          const exchange = (mx as { exchange?: unknown }).exchange;
          if (typeof exchange === "string") return exchange;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value)),
  );

  // Extract ASN and organization
  if (typeof ipData?.asn === "string") {
    fingerprint.asn.push(ipData.asn);
  }
  if (typeof ipData?.org === "string") {
    fingerprint.organizations.push(ipData.org);
  }

  // Extract technologies
  const technologies = parseJsonArray(techData?.technologies);
  fingerprint.technologies.push(
    ...technologies
      .map((technology) => {
        if (typeof technology === "string") return technology;
        if (technology && typeof technology === "object") {
          const name = (technology as { name?: unknown }).name;
          if (typeof name === "string") return name;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value)),
  );

  return fingerprint;
}

// ============================================================================
// PROVIDER DETECTION FUNCTIONS
// ============================================================================

function detectHostingProvider(
  fingerprint: InfrastructureFingerprint,
  _techData: unknown,
  _urlscanData: unknown,
): ProviderAttribution | null {
  const evidence: Evidence[] = [];
  let bestMatch: { provider: string; confidence: number; tier: string } | null =
    null;

  for (const [provider, patterns] of Object.entries(HOSTING_PATTERNS)) {
    let matchScore = 0;
    const providerEvidence: Evidence[] = [];

    // Check nameservers
    for (const nsPattern of patterns.nameservers) {
      const regex = new RegExp(nsPattern, "i");
      const matches = fingerprint.nameservers.filter((ns) => regex.test(ns));
      if (matches.length > 0) {
        matchScore += 40;
        providerEvidence.push({
          source: "dns",
          type: "nameserver",
          value: matches.join(", "),
          weight: 0.8,
          description: `Nameservers match ${provider} pattern`,
        });
      }
    }

    // Check IP addresses
    for (const ipPrefix of patterns.ips) {
      const matches = fingerprint.ipAddresses.filter((ip) =>
        ip.startsWith(ipPrefix),
      );
      if (matches.length > 0) {
        matchScore += 30;
        providerEvidence.push({
          source: "ip",
          type: "ip_range",
          value: matches.join(", "),
          weight: 0.6,
          description: `IP addresses in ${provider} range`,
        });
      }
    }

    // Check ASN
    for (const asn of patterns.asn) {
      if (fingerprint.asn.includes(asn)) {
        matchScore += 25;
        providerEvidence.push({
          source: "ip",
          type: "asn",
          value: asn,
          weight: 0.7,
          description: `ASN belongs to ${provider}`,
        });
      }
    }

    // Check technologies
    for (const tech of patterns.technologies) {
      if (
        fingerprint.technologies.some((t) =>
          t.toLowerCase().includes(tech.toLowerCase()),
        )
      ) {
        matchScore += 20;
        providerEvidence.push({
          source: "technology",
          type: "technology",
          value: tech,
          weight: 0.5,
          description: `Uses ${tech} technology`,
        });
      }
    }

    // Update best match
    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.confidence)) {
      bestMatch = {
        provider,
        confidence: Math.min(matchScore, 100),
        tier: patterns.tier,
      };
      evidence.push(...providerEvidence);
    }
  }

  if (!bestMatch) return null;

  return {
    name:
      bestMatch.provider.charAt(0).toUpperCase() + bestMatch.provider.slice(1),
    type: "hosting",
    confidence: bestMatch.confidence,
    evidence,
    detectionMethod: "pattern_matching",
    services: ["web_hosting"],
    tier: bestMatch.tier,
  };
}

function detectCdnProvider(
  fingerprint: InfrastructureFingerprint,
  _techData: unknown,
  _urlscanData: unknown,
): ProviderAttribution | null {
  const evidence: Evidence[] = [];
  let bestMatch: { provider: string; confidence: number } | null = null;

  for (const [provider, patterns] of Object.entries(CDN_PATTERNS)) {
    let matchScore = 0;
    const providerEvidence: Evidence[] = [];

    // Check nameservers
    for (const nsPattern of patterns.nameservers) {
      const regex = new RegExp(nsPattern, "i");
      const matches = fingerprint.nameservers.filter((ns) => regex.test(ns));
      if (matches.length > 0) {
        matchScore += 35;
        providerEvidence.push({
          source: "dns",
          type: "nameserver",
          value: matches.join(", "),
          weight: 0.7,
          description: `Nameservers indicate ${provider} CDN`,
        });
      }
    }

    // Check IP addresses
    for (const ipPrefix of patterns.ips) {
      const matches = fingerprint.ipAddresses.filter((ip) =>
        ip.startsWith(ipPrefix),
      );
      if (matches.length > 0) {
        matchScore += 40;
        providerEvidence.push({
          source: "ip",
          type: "ip_range",
          value: matches.join(", "),
          weight: 0.8,
          description: `IP addresses in ${provider} CDN range`,
        });
      }
    }

    // Check technologies
    for (const tech of patterns.technologies) {
      if (
        fingerprint.technologies.some((t) =>
          t.toLowerCase().includes(tech.toLowerCase()),
        )
      ) {
        matchScore += 30;
        providerEvidence.push({
          source: "technology",
          type: "technology",
          value: tech,
          weight: 0.6,
          description: `Uses ${tech} CDN`,
        });
      }
    }

    // Update best match
    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.confidence)) {
      bestMatch = { provider, confidence: Math.min(matchScore, 100) };
      evidence.push(...providerEvidence);
    }
  }

  if (!bestMatch) return null;

  return {
    name:
      bestMatch.provider.charAt(0).toUpperCase() + bestMatch.provider.slice(1),
    type: "cdn",
    confidence: bestMatch.confidence,
    evidence,
    detectionMethod: "pattern_matching",
    services: ["cdn", "caching", "ddos_protection"],
  };
}

function detectCloudPlatform(
  fingerprint: InfrastructureFingerprint,
  _techData: unknown,
): ProviderAttribution | null {
  const cloudProviders = ["aws", "azure", "gcp", "digitalocean"];
  const evidence: Evidence[] = [];
  let bestMatch: { provider: string; confidence: number } | null = null;

  for (const provider of cloudProviders) {
    const patterns =
      HOSTING_PATTERNS[provider as keyof typeof HOSTING_PATTERNS];
    if (!patterns || (patterns.tier !== "cloud" && patterns.tier !== "vps"))
      continue;

    let matchScore = 0;
    const providerEvidence: Evidence[] = [];

    // Check ASN
    for (const asn of patterns.asn) {
      if (fingerprint.asn.includes(asn)) {
        matchScore += 50;
        providerEvidence.push({
          source: "ip",
          type: "asn",
          value: asn,
          weight: 0.9,
          description: `ASN indicates ${provider} cloud platform`,
        });
      }
    }

    // Check technologies
    for (const tech of patterns.technologies) {
      if (
        fingerprint.technologies.some((t) =>
          t.toLowerCase().includes(tech.toLowerCase()),
        )
      ) {
        matchScore += 40;
        providerEvidence.push({
          source: "technology",
          type: "technology",
          value: tech,
          weight: 0.8,
          description: `Uses ${tech} cloud service`,
        });
      }
    }

    // Update best match
    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.confidence)) {
      bestMatch = { provider, confidence: Math.min(matchScore, 100) };
      evidence.push(...providerEvidence);
    }
  }

  if (!bestMatch) return null;

  return {
    name: bestMatch.provider.toUpperCase(),
    type: "cloud",
    confidence: bestMatch.confidence,
    evidence,
    detectionMethod: "pattern_matching",
    services: ["compute", "storage", "networking"],
  };
}

function detectEmailProvider(dnsData: unknown): ProviderAttribution | null {
  const typedDnsData = dnsData as DnsSnapshot | null;
  const mxHosts = parseJsonArray(typedDnsData?.mxRecords)
    .map((mx) => {
      if (typeof mx === "string") return mx;
      if (mx && typeof mx === "object") {
        const exchange = (mx as { exchange?: unknown }).exchange;
        if (typeof exchange === "string") return exchange;
      }
      return null;
    })
    .filter((host): host is string => Boolean(host));

  if (mxHosts.length === 0) return null;

  const evidence: Evidence[] = [];
  let bestMatch: { provider: string; confidence: number } | null = null;

  for (const [provider, patterns] of Object.entries(EMAIL_PATTERNS)) {
    for (const mxPattern of patterns.mx) {
      const regex = new RegExp(mxPattern, "i");
      const matches = mxHosts.filter((host) => regex.test(host));

      if (matches.length > 0) {
        const confidence = 90;
        evidence.push({
          source: "dns",
          type: "mx_record",
          value: matches.join(", "),
          weight: 0.9,
          description: `MX records point to ${provider} email service`,
        });

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { provider, confidence };
        }
      }
    }
  }

  if (!bestMatch) return null;

  return {
    name:
      bestMatch.provider.charAt(0).toUpperCase() + bestMatch.provider.slice(1),
    type: "email",
    confidence: bestMatch.confidence,
    evidence,
    detectionMethod: "mx_record_analysis",
    services: ["email", "smtp", "imap"],
  };
}

function detectDnsProvider(dnsData: unknown): ProviderAttribution | null {
  const typedDnsData = dnsData as DnsSnapshot | null;
  const nsRecords = toStringArray(parseJsonArray(typedDnsData?.nsRecords));
  if (nsRecords.length === 0) return null;

  const evidence: Evidence[] = [];

  // Extract provider from nameserver hostnames
  const providers = new Set<string>();
  for (const ns of nsRecords) {
    // Extract domain from nameserver (e.g., ns1.hostinginfo.gg -> godaddy)
    const match = ns.match(/\.([a-z0-9-]+)\.(com|net|org|io)$/i);
    if (match) {
      providers.add(match[1]);
    }
  }

  if (providers.size === 0) return null;

  const provider = Array.from(providers)[0];
  evidence.push({
    source: "dns",
    type: "nameserver",
    value: nsRecords.join(", "),
    weight: 0.8,
    description: `Nameservers hosted by ${provider}`,
  });

  return {
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    type: "dns",
    confidence: 85,
    evidence,
    detectionMethod: "nameserver_analysis",
    services: ["dns", "nameserver"],
  };
}

// ============================================================================
// TECHNOLOGY MAPPING
// ============================================================================

function mapTechnologies(techData: unknown): TechnologyMapping {
  const mapping: TechnologyMapping = {
    webServer: [],
    applicationServer: [],
    database: [],
    cache: [],
    loadBalancer: [],
    monitoring: [],
    analytics: [],
    security: [],
  };

  const typedTechData = techData as TechSnapshot | null;
  const technologies = parseJsonArray(typedTechData?.technologies);

  for (const tech of technologies) {
    const name =
      typeof tech === "string"
        ? tech
        : tech &&
            typeof tech === "object" &&
            typeof (tech as { name?: unknown }).name === "string"
          ? ((tech as { name?: string }).name as string)
          : null;
    if (!name) continue;
    const nameLower = name.toLowerCase();

    // Web servers
    if (
      ["nginx", "apache", "iis", "litespeed", "caddy"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.webServer.push(name);
    }

    // Application servers
    if (
      ["node.js", "php", "python", "ruby", "java", "asp.net", "tomcat"].some(
        (s) => nameLower.includes(s),
      )
    ) {
      mapping.applicationServer.push(name);
    }

    // Databases
    if (
      [
        "mysql",
        "postgresql",
        "mongodb",
        "redis",
        "mariadb",
        "oracle",
        "mssql",
      ].some((s) => nameLower.includes(s))
    ) {
      mapping.database.push(name);
    }

    // Cache
    if (
      ["varnish", "redis", "memcached", "cloudflare"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.cache.push(name);
    }

    // Load balancers
    if (
      ["nginx", "haproxy", "aws elb", "cloudflare"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.loadBalancer.push(name);
    }

    // Monitoring
    if (
      ["google analytics", "new relic", "datadog", "sentry"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.monitoring.push(name);
    }

    // Analytics
    if (
      ["google analytics", "mixpanel", "segment", "amplitude"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.analytics.push(name);
    }

    // Security
    if (
      ["cloudflare", "sucuri", "wordfence", "recaptcha"].some((s) =>
        nameLower.includes(s),
      )
    ) {
      mapping.security.push(name);
    }
  }

  return mapping;
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

function calculateConfidenceScores(providers: {
  hosting: ProviderAttribution | null;
  cdn: ProviderAttribution | null;
  cloud: ProviderAttribution | null;
  email: ProviderAttribution | null;
  dns: ProviderAttribution | null;
}): ConfidenceScore {
  return {
    overall: Math.round(
      [
        providers.hosting?.confidence || 0,
        providers.cdn?.confidence || 0,
        providers.cloud?.confidence || 0,
        providers.email?.confidence || 0,
        providers.dns?.confidence || 0,
      ].reduce((sum, c) => sum + c, 0) / 5,
    ),
    hosting: providers.hosting?.confidence || 0,
    cdn: providers.cdn?.confidence || 0,
    cloud: providers.cloud?.confidence || 0,
    email: providers.email?.confidence || 0,
    dns: providers.dns?.confidence || 0,
  };
}

// ============================================================================
// INFRASTRUCTURE COMPARISON
// ============================================================================

export async function compareInfrastructure(domains: string[]): Promise<{
  domains: string[];
  attributions: InfrastructureAttribution[];
  commonProviders: {
    hosting: string[];
    cdn: string[];
    cloud: string[];
    email: string[];
    dns: string[];
  };
  uniqueProviders: Record<string, string[]>;
  sharedInfrastructure: boolean;
}> {
  // Fetch attributions for all domains
  const attributions = await Promise.all(
    domains.map((domain) => attributeInfrastructure(domain)),
  );

  // Find common providers
  const commonProviders = {
    hosting: findCommonProviders(attributions, "hostingProvider"),
    cdn: findCommonProviders(attributions, "cdnProvider"),
    cloud: findCommonProviders(attributions, "cloudPlatform"),
    email: findCommonProviders(attributions, "emailProvider"),
    dns: findCommonProviders(attributions, "dnsProvider"),
  };

  // Find unique providers per domain
  const uniqueProviders: Record<string, string[]> = {};
  for (const attr of attributions) {
    const providers = [
      attr.hostingProvider?.name,
      attr.cdnProvider?.name,
      attr.cloudPlatform?.name,
      attr.emailProvider?.name,
      attr.dnsProvider?.name,
    ].filter(Boolean) as string[];
    uniqueProviders[attr.domain] = providers;
  }

  // Check if domains share infrastructure
  const sharedInfrastructure = Object.values(commonProviders).some(
    (providers) => providers.length > 0,
  );

  return {
    domains,
    attributions,
    commonProviders,
    uniqueProviders,
    sharedInfrastructure,
  };
}

function findCommonProviders(
  attributions: InfrastructureAttribution[],
  providerKey: keyof InfrastructureAttribution,
): string[] {
  const providerCounts = new Map<string, number>();

  for (const attr of attributions) {
    const provider = attr[providerKey] as ProviderAttribution | null;
    if (provider?.name) {
      providerCounts.set(
        provider.name,
        (providerCounts.get(provider.name) || 0) + 1,
      );
    }
  }

  // Return providers used by at least half of the domains
  const threshold = Math.ceil(attributions.length / 2);
  return Array.from(providerCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([name]) => name);
}
