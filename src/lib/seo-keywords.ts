/**
 * SEO Keywords & Meta Tags Configuration
 *
 * Comprehensive keyword strategy for national organic SEO ranking.
 * Targets webmasters, IT professionals, businesses, and developers.
 */

export const SEO_KEYWORDS = {
  // Primary Keywords (High Volume, High Intent)
  primary: [
    "website checker",
    "domain checker",
    "hosting checker",
    "whois search",
    "dns checker",
    "email checker",
    "security checker",
    "ssl checker",
    "website security",
    "domain analysis",
  ],

  // Secondary Keywords (Medium Volume, Specific Intent)
  secondary: [
    "dmarc checker",
    "dkim checker",
    "spf checker",
    "waf checker",
    "firewall checker",
    "performance checker",
    "website speed test",
    "dns lookup tool",
    "mx record checker",
    "ssl certificate checker",
  ],

  // Long-Tail Keywords (Low Volume, High Conversion)
  longTail: [
    "where is my website hosted",
    "what company is hosting my website",
    "where is my domain located",
    "what company has my domain",
    "check website hosting provider",
    "find domain registrar",
    "check email security settings",
    "verify ssl certificate",
    "test website security",
    "analyze website performance",
  ],

  // AI-Powered Keywords (Emerging, Future-Focused)
  aiPowered: [
    "ai hosting tool",
    "ai webmaster tool",
    "ai website analyzer",
    "ai security scanner",
    "ai domain checker",
    "ai all in one hosting tool",
    "ai all in one web developer tool",
    "ai all in one business dns tool",
  ],

  // Professional/Enterprise Keywords
  enterprise: [
    "enterprise security checker",
    "business dns tool",
    "professional hosting tool",
    "webmaster tool",
    "all in one hosting tool",
    "all in one webmaster tool",
    "website management tool",
    "domain management tool",
  ],

  // Technical Keywords (SEO for Developers)
  technical: [
    "dns propagation checker",
    "nameserver lookup",
    "a record checker",
    "mx record lookup",
    "txt record checker",
    "cname lookup",
    "reverse dns lookup",
    "ip geolocation",
    "server location checker",
    "hosting provider detection",
  ],

  // Email Security Keywords
  emailSecurity: [
    "dmarc",
    "dkim",
    "spf",
    "email authentication",
    "email security checker",
    "spf record checker",
    "dmarc record checker",
    "dkim record checker",
    "m365 email check",
    "microsoft 365 email security",
    "google workspace email security",
  ],

  // Comparison Keywords (High Intent)
  comparison: [
    "free hosting checker",
    "free domain checker",
    "free website analyzer",
    "free security scanner",
    "best hosting checker",
    "best domain tool",
    "hosting checker vs",
    "free pro hosting tool",
  ],

  // Question-Based Keywords (Voice Search)
  questions: [
    "how to check website hosting",
    "how to find domain registrar",
    "how to check dns records",
    "how to verify ssl certificate",
    "how to check email security",
    "how to test website security",
    "how to check website performance",
    "how to find website owner",
    "how to check domain availability",
    "how to analyze website",
  ],

  // Location-Based Keywords
  location: [
    "website hosting location",
    "server location checker",
    "domain location finder",
    "ip location lookup",
    "website geolocation",
    "hosting provider location",
  ],

  // Brand/Product Keywords
  brand: [
    "hostinginfo",
    "hosting tool",
    "ht terminal",
    "domain intelligence",
    "website intelligence",
  ],
};

// Flatten all keywords for meta tags
export const ALL_KEYWORDS = Object.values(SEO_KEYWORDS).flat();

// Top 50 keywords for primary meta tag
export const TOP_KEYWORDS = [
  ...SEO_KEYWORDS.primary,
  ...SEO_KEYWORDS.secondary,
  ...SEO_KEYWORDS.longTail.slice(0, 10),
  ...SEO_KEYWORDS.aiPowered.slice(0, 5),
  ...SEO_KEYWORDS.enterprise.slice(0, 5),
  ...SEO_KEYWORDS.emailSecurity.slice(0, 10),
].slice(0, 50);

// Page-specific keyword mapping
export const PAGE_KEYWORDS = {
  home: [
    "website checker",
    "domain checker",
    "hosting checker",
    "all in one hosting tool",
    "ai webmaster tool",
    "website security",
    "dns checker",
    "email checker",
    "ssl checker",
    "whois search",
  ],

  dashboard: [
    "website analysis",
    "domain intelligence",
    "hosting information",
    "security scan results",
    "performance metrics",
    "dns records",
    "email security",
    "ssl certificate",
  ],

  archives: [
    "scan history",
    "website scan archive",
    "domain scan history",
    "security scan history",
    "performance history",
  ],

  leaderboard: [
    "top domains",
    "website rankings",
    "security scores",
    "performance rankings",
  ],

  ddcCalculator: [
    "domain cost calculator",
    "domain pricing",
    "domain registration cost",
    "domain renewal cost",
    "tld pricing",
  ],
};

// Schema.org structured data
export const SCHEMA_ORG = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HostingInfo",
  applicationCategory: "WebApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  url: "https://hostinginfo.gg",
  description:
    "Free all-in-one website checker, domain analyzer, and hosting tool. Check DNS, SSL, email security (DMARC, DKIM, SPF), performance, and more.",
  featureList: [
    "Website Security Scanner",
    "DNS Checker & Lookup",
    "SSL Certificate Checker",
    "Email Security Checker (DMARC, DKIM, SPF)",
    "Performance & Speed Test",
    "WHOIS Lookup",
    "Hosting Provider Detection",
    "Domain Intelligence",
    "Malware Scanner",
    "Firewall Detection",
  ],
};
