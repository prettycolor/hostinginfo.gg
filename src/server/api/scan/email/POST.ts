import type { Request, Response } from "express";
import { promises as dns } from "dns";
import { getOrSet } from "../../../lib/cache/cache-manager.js";

/**
 * Extract apex domain from subdomain
 * Examples:
 *   blog.example.com -> example.com
 *   api.shop.example.co.uk -> example.co.uk
 *   example.com -> example.com
 */
function getApexDomain(domain: string): string {
  const parts = domain.split(".");

  // Handle multi-part TLDs (co.uk, com.au, etc.)
  const multiPartTLDs = [
    "co.uk",
    "com.au",
    "co.nz",
    "co.za",
    "com.br",
    "co.jp",
  ];
  const lastTwo = parts.slice(-2).join(".");

  if (multiPartTLDs.includes(lastTwo)) {
    // Return last 3 parts for multi-part TLDs
    return parts.slice(-3).join(".");
  }

  // Return last 2 parts for standard TLDs
  return parts.slice(-2).join(".");
}

/**
 * Email Provider Fingerprints
 * Used to identify email providers from SPF records
 */
const SPF_FINGERPRINTS: Record<string, string> = {
  // Microsoft
  "spf.protection.outlook.com": "Microsoft 365",
  "outlook.com": "Microsoft Outlook",

  // Google
  "_spf.google.com": "Google Workspace",
  "gmail.com": "Gmail",

  // Zoho
  "zoho.com": "Zoho Mail",
  "zohomail.com": "Zoho Mail",

  // ProtonMail
  "_spf.protonmail.ch": "ProtonMail",

  // Fastmail
  "spf.messagingengine.com": "Fastmail",

  // GoDaddy-managed Microsoft tenant
  "secureserver.net": "Microsoft 365 (GoDaddy)",

  // Namecheap
  "privateemail.com": "Namecheap Private Email",
  "spf.privateemail.com": "Namecheap Private Email",

  // Rackspace
  "emailsrvr.com": "Rackspace Email",

  // SendGrid
  "sendgrid.net": "SendGrid",

  // Mailgun
  "mailgun.org": "Mailgun",

  // Amazon SES
  "amazonses.com": "Amazon SES",

  // Mailchimp/Mandrill
  "mandrillapp.com": "Mailchimp Transactional",

  // NOTE: Proofpoint, Barracuda, Mimecast are security gateways
  // They are detected in SECURITY_FINGERPRINTS instead

  // Postmark
  "spf.mtasv.net": "Postmark",

  // SparkPost
  "sparkpostmail.com": "SparkPost",

  // ImprovMX
  "improvmx.com": "ImprovMX",

  // Titan
  "titan.email": "Titan Email",
};

/**
 * Email Security Gateway Fingerprints
 * Used to identify security gateways from MX records
 * These sit in front of email providers to filter spam, malware, and phishing
 */
const SECURITY_GATEWAY_FINGERPRINTS: Record<string, string> = {
  // Proofpoint
  "pphosted.com": "Proofpoint",
  "ppe-hosted.com": "Proofpoint Essentials",
  "proofpoint.com": "Proofpoint",

  // Barracuda
  "barracudanetworks.com": "Barracuda Email Security Gateway",
  "barracuda.com": "Barracuda",

  // Mimecast
  "mimecast.com": "Mimecast",
  "mimecast.co.uk": "Mimecast",

  // Cisco IronPort
  "iphmx.com": "Cisco IronPort",
  "cisco.com": "Cisco Email Security",

  // Trend Micro
  "trendmicro.com": "Trend Micro Email Security",
  "tmes.trendmicro.com": "Trend Micro",

  // Fortinet
  "fortimail.com": "Fortinet FortiMail",

  // Symantec/Broadcom
  "messagelabs.com": "Symantec Email Security.cloud",

  // Microsoft Email Protection (EOP + Defender)
  // Note: All Microsoft 365 includes Exchange Online Protection (EOP)
  // Defender for Office 365 is an advanced tier on top of EOP
  "mail.protection.outlook.com": "Microsoft 365 Email Protection",
  "eo.outlook.com": "Microsoft 365 Email Protection", // Legacy pattern

  // Sophos
  "sophos.com": "Sophos Email Security",

  // Forcepoint
  "forcepoint.com": "Forcepoint Email Security",
};

/**
 * MX Record Fingerprints
 * Used to identify email providers from MX records
 */
const MX_FINGERPRINTS: Record<string, string> = {
  // Microsoft
  "outlook.com": "Microsoft 365",
  "mail.protection.outlook.com": "Microsoft 365",

  // Google
  "google.com": "Google Workspace",
  "googlemail.com": "Google Workspace",
  "aspmx.l.google.com": "Google Workspace",

  // Zoho
  "zoho.com": "Zoho Mail",
  "zohomail.com": "Zoho Mail",

  // ProtonMail
  "protonmail.ch": "ProtonMail",
  "mail.protonmail.ch": "ProtonMail",

  // Fastmail
  "messagingengine.com": "Fastmail",

  // GoDaddy-managed Microsoft tenant
  "secureserver.net": "Microsoft 365 (GoDaddy)",
  "smtp.secureserver.net": "Microsoft 365 (GoDaddy)",

  // Namecheap
  "privateemail.com": "Namecheap Private Email",

  // Rackspace
  "emailsrvr.com": "Rackspace Email",

  // Security Gateways (mark as such to distinguish from email providers)
  "ppe-hosted.com": "Proofpoint Essentials (Security Gateway)",
  "pphosted.com": "Proofpoint (Security Gateway)",
  "barracudanetworks.com": "Barracuda Email Security (Gateway)",
  "barracuda.com": "Barracuda Email Security (Gateway)",
  "mimecast.com": "Mimecast Email Security (Gateway)",
  "mimecast.co.uk": "Mimecast Email Security (Gateway)",

  // Titan
  "titan.email": "Titan Email",

  // ImprovMX
  "improvmx.com": "ImprovMX",
};

/**
 * DKIM CNAME Fingerprints
 * Used to identify email providers from DKIM CNAME targets
 */
const DKIM_FINGERPRINTS: Record<string, string> = {
  "domainkey.google.com": "Google Workspace",
  "domainkey.outlook.com": "Microsoft 365",
  "zoho.com": "Zoho Mail",
  "protonmail.ch": "ProtonMail",
  "messagingengine.com": "Fastmail",
  "secureserver.net": "Microsoft 365 (GoDaddy)",
  "privateemail.com": "Namecheap Private Email",
  "emailsrvr.com": "Rackspace Email",
  "sendgrid.net": "SendGrid",
  "mailgun.org": "Mailgun",
  "amazonses.com": "Amazon SES",
  "mandrillapp.com": "Mailchimp Transactional",
  // NOTE: Proofpoint, Barracuda, Mimecast are security gateways
  // They are detected in SECURITY_FINGERPRINTS instead
};

// NOTE: Verification patterns (google-site-verification, MS=ms) are NOT used
// They only prove domain ownership, not email hosting

/**
 * Email Security Services Fingerprints
 * Used to identify security layers from SPF/MX records
 */
const SECURITY_FINGERPRINTS: Record<string, string> = {
  // Email Security Gateways
  "barracudanetworks.com": "Barracuda Email Security Gateway",
  "spf.ess.barracudanetworks.com": "Barracuda Email Security Gateway",
  "mimecast.com": "Mimecast Email Security",
  "pphosted.com": "Proofpoint Essentials",
  "ppe-hosted.com": "Proofpoint Essentials",
  "proofpoint.com": "Proofpoint Email Protection",
  "cisco.com": "Cisco Email Security",
  "ironport.com": "Cisco IronPort",
  "forcepoint.com": "Forcepoint Email Security",
  "trendmicro.com": "Trend Micro Email Security",
  "sophos.com": "Sophos Email Security",
  "symantec.com": "Symantec Email Security",
  "messagelabs.com": "Symantec MessageLabs",
  "mcafee.com": "McAfee Email Gateway",
  "fireeye.com": "FireEye Email Security",
  "cloudmark.com": "Cloudmark Email Security",
  "spamtitan.com": "SpamTitan",
  "mailprotector.com": "MailProtector",
  "reflexion.net": "Reflexion Email Security",
  "appriver.com": "AppRiver Email Security",
  "securence.com": "Securence Email Security",
  "mailroute.net": "MailRoute",
  "spamexperts.com": "SpamExperts",
  "antispamcloud.com": "SpamExperts AntiSpam Cloud",

  // Cloud Email Security
  "protection.outlook.com": "Microsoft Defender for Office 365",
  "eo.outlook.com": "Exchange Online Protection",
  "google.com": "Google Workspace Security",
};

/**
 * Parse SPF record and extract all includes, IPs, and mechanisms
 */
function parseSPFRecord(spfRecord: string): {
  includes: string[];
  ips: string[];
  mechanisms: string[];
} {
  const includes: string[] = [];
  const ips: string[] = [];
  const mechanisms: string[] = [];

  // Split by spaces and process each token
  const tokens = spfRecord.split(/\s+/);

  for (const token of tokens) {
    // Extract include: domains
    if (token.startsWith("include:")) {
      const domain = token.substring(8);
      includes.push(domain);
    }
    // Extract a: domains
    else if (token.startsWith("a:")) {
      const domain = token.substring(2);
      includes.push(domain);
    }
    // Extract mx
    else if (token === "mx" || token.startsWith("mx:")) {
      mechanisms.push("mx");
    }
    // Extract ip4: addresses
    else if (token.startsWith("ip4:")) {
      const ip = token.substring(4);
      ips.push(ip);
    }
    // Extract ip6: addresses
    else if (token.startsWith("ip6:")) {
      const ip = token.substring(4);
      ips.push(ip);
    }
  }

  return { includes, ips, mechanisms };
}

/**
 * Identify email provider from SPF includes
 */
function identifyProviderFromSPF(includes: string[]): string[] {
  const providers = new Set<string>();

  for (const include of includes) {
    // Check exact matches
    if (SPF_FINGERPRINTS[include]) {
      providers.add(SPF_FINGERPRINTS[include]);
      continue;
    }

    // Check partial matches (domain contains fingerprint)
    for (const [fingerprint, provider] of Object.entries(SPF_FINGERPRINTS)) {
      if (include.includes(fingerprint)) {
        providers.add(provider);
        break;
      }
    }
  }

  return Array.from(providers);
}

/**
 * Identify email provider from MX records
 */
function identifyProviderFromMX(mxRecords: { exchange: string }[]): string[] {
  const providers = new Set<string>();

  console.log(
    `[MX Detection] Checking ${mxRecords.length} MX records:`,
    mxRecords.map((mx) => mx.exchange),
  );

  for (const mx of mxRecords) {
    const exchange = mx.exchange.toLowerCase();
    console.log(`[MX Detection] Checking exchange: ${exchange}`);

    // Check exact matches
    if (MX_FINGERPRINTS[exchange]) {
      console.log(
        `[MX Detection] Exact match found: ${MX_FINGERPRINTS[exchange]}`,
      );
      providers.add(MX_FINGERPRINTS[exchange]);
      continue;
    }

    // Check partial matches
    let found = false;
    for (const [fingerprint, provider] of Object.entries(MX_FINGERPRINTS)) {
      if (exchange.includes(fingerprint)) {
        console.log(
          `[MX Detection] Partial match found: ${provider} (fingerprint: ${fingerprint})`,
        );
        providers.add(provider);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`[MX Detection] No match found for: ${exchange}`);
    }
  }

  console.log(`[MX Detection] Final providers:`, Array.from(providers));
  return Array.from(providers);
}

/**
 * Identify security services from SPF/MX records
 */
function identifySecurityServices(
  spfIncludes: string[],
  mxRecords: { exchange: string }[],
): string[] {
  const services = new Set<string>();

  // Check SPF includes
  for (const include of spfIncludes) {
    for (const [fingerprint, service] of Object.entries(
      SECURITY_FINGERPRINTS,
    )) {
      if (include.includes(fingerprint)) {
        services.add(service);
      }
    }
  }

  // Check MX records
  for (const mx of mxRecords) {
    const exchange = mx.exchange.toLowerCase();
    for (const [fingerprint, service] of Object.entries(
      SECURITY_FINGERPRINTS,
    )) {
      if (exchange.includes(fingerprint)) {
        services.add(service);
      }
    }
  }

  return Array.from(services);
}

/**
 * Scan for DKIM records by checking all TXT records for _domainkey pattern
 */
async function scanForDKIMRecords(domain: string): Promise<{
  configured: boolean;
  selectors: string[];
  providers: string[];
}> {
  const selectors: string[] = [];
  const providers = new Set<string>();

  try {
    // Get all TXT records for the domain
    // const allRecords = await dns.resolve(domain, "TXT");

    // This won't find DKIM records directly, so we need to check common selectors
    const commonSelectors = [
      "default",
      "google",
      "k1",
      "k2",
      "k3",
      "selector1",
      "selector2",
      "s1",
      "s2",
      "dkim",
      "mail",
      "email",
      "smtp",
      "mx",
      "zoho",
      "mandrill",
      "pm",
      "protonmail",
      "fm1",
      "fm2",
      "fm3",
    ];

    for (const selector of commonSelectors) {
      try {
        const dkimDomain = `${selector}._domainkey.${domain}`;

        // Try to resolve as TXT first
        try {
          const records = await dns.resolveTxt(dkimDomain);
          if (records.length > 0) {
            selectors.push(selector);

            // Check if the record contains provider hints
            const recordText = records[0].join("");
            for (const [fingerprint, provider] of Object.entries(
              DKIM_FINGERPRINTS,
            )) {
              if (recordText.includes(fingerprint)) {
                providers.add(provider);
              }
            }
          }
        } catch {
          // Not a TXT record, try CNAME
          try {
            const cnameRecords = await dns.resolveCname(dkimDomain);
            if (cnameRecords.length > 0) {
              selectors.push(selector);

              // Check CNAME target for provider fingerprints
              const target = cnameRecords[0].toLowerCase();
              for (const [fingerprint, provider] of Object.entries(
                DKIM_FINGERPRINTS,
              )) {
                if (target.includes(fingerprint)) {
                  providers.add(provider);
                }
              }
            }
          } catch {
            // Neither TXT nor CNAME
          }
        }
      } catch {
        // Continue checking other selectors
      }
    }
  } catch (error) {
    console.log(`[DKIM Scan] Error scanning for DKIM records:`, error);
  }

  return {
    configured: selectors.length > 0,
    selectors,
    providers: Array.from(providers),
  };
}

/**
 * Detect email security gateway from MX records
 */
function detectSecurityGateway(
  mxRecords: Array<{ exchange: string; priority: number }>,
): {
  detected: boolean;
  provider: string | null;
} {
  for (const mx of mxRecords) {
    const mxLower = mx.exchange.toLowerCase();

    for (const [pattern, provider] of Object.entries(
      SECURITY_GATEWAY_FINGERPRINTS,
    )) {
      if (mxLower.includes(pattern)) {
        return {
          detected: true,
          provider,
        };
      }
    }
  }

  return {
    detected: false,
    provider: null,
  };
}

type ParsedSpfRecord = ReturnType<typeof parseSPFRecord>;

interface EmailScanResult {
  domain: string;
  apexDomain?: string;
  mx: Array<{ exchange: string; priority: number }>;
  spf: {
    configured: boolean;
    record: string | null;
    parsed: ParsedSpfRecord;
  };
  dmarc: {
    configured: boolean;
    record: string | null;
  };
  dkim: {
    configured: boolean;
    selectors: string[];
    providers: string[];
  };
  providers: string[];
  securityServices: string[];
  securityGateway?: string | { detected: boolean; provider: string | null };
}

/**
 * Email Configuration Scanner API
 * Checks MX records, SPF, DMARC, DKIM, and identifies providers
 */
async function performEmailScan(domain: string) {
  console.log(`[Email Scan] Starting comprehensive scan for: ${domain}`);

  // For email security records (SPF, DMARC, DKIM), use apex domain
  // Subdomains inherit email config from apex domain
  const apexDomain = getApexDomain(domain);
  const isSubdomain = domain !== apexDomain;

  if (isSubdomain) {
    console.log(
      `[Email Scan] Subdomain detected: ${domain} -> checking apex domain: ${apexDomain}`,
    );
  }

  const result: EmailScanResult = {
    domain,
    apexDomain: isSubdomain ? apexDomain : undefined,
    mx: [],
    spf: {
      configured: false,
      record: null,
      parsed: {
        includes: [],
        ips: [],
        mechanisms: [],
      },
    },
    dmarc: {
      configured: false,
      record: null,
    },
    dkim: {
      configured: false,
      selectors: [],
      providers: [],
    },
    providers: [],
    securityServices: [],
    securityGateway: undefined, // Set if MX points to security gateway
  };

  // Get all TXT records for verification pattern matching
  // Use apex domain for email security records
  const domainToCheck = isSubdomain ? apexDomain : domain;
  let allTxtRecords: string[][] = [];
  try {
    allTxtRecords = await dns.resolveTxt(domainToCheck);
  } catch {
    console.log(`[Email Scan] Could not fetch TXT records`);
  }

  // Track providers by source for prioritization
  const mxProviders: string[] = [];
  const spfProviders: string[] = [];

  // MX Records (check original domain, not apex)
  try {
    const mxRecords = await dns.resolveMx(domain);
    result.mx = mxRecords;
    console.log(`[Email Scan] Found ${mxRecords.length} MX records`);

    // Detect security gateway
    const securityGateway = detectSecurityGateway(mxRecords);
    if (securityGateway.detected) {
      result.securityGateway = securityGateway;
      console.log(
        `[Email Scan] Security Gateway detected: ${securityGateway.provider}`,
      );
    }

    // Identify provider from MX (highest priority)
    const providers = identifyProviderFromMX(mxRecords);
    mxProviders.push(...providers);
    console.log(`[Email Scan] Providers from MX: ${providers.join(", ")}`);
  } catch {
    console.log(`[Email Scan] No MX records found`);
  }

  // SPF Record (TXT record starting with v=spf1)
  try {
    const spfRecord = allTxtRecords.find((record) =>
      record.join("").toLowerCase().startsWith("v=spf1"),
    );
    if (spfRecord) {
      const spfText = spfRecord.join("");
      result.spf.configured = true;
      result.spf.record = spfText;

      // Parse SPF record
      const parsed = parseSPFRecord(spfText);
      result.spf.parsed = parsed;

      console.log(
        `[Email Scan] SPF record found with ${parsed.includes.length} includes`,
      );

      // Identify provider from SPF (lower priority than MX)
      const providers = identifyProviderFromSPF(parsed.includes);
      spfProviders.push(...providers);
      console.log(`[Email Scan] Providers from SPF: ${providers.join(", ")}`);

      // Identify security services
      const securityServices = identifySecurityServices(
        parsed.includes,
        result.mx,
      );
      result.securityServices.push(...securityServices);
      console.log(
        `[Email Scan] Security services: ${securityServices.join(", ")}`,
      );
    }
  } catch (error) {
    console.log(`[Email Scan] Error parsing SPF record:`, error);
  }

  // DMARC Record (TXT record at _dmarc subdomain)
  // Check apex domain for DMARC
  try {
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domainToCheck}`);
    const dmarcRecord = dmarcRecords.find((record) =>
      record.join("").toLowerCase().startsWith("v=dmarc1"),
    );
    if (dmarcRecord) {
      result.dmarc.configured = true;
      result.dmarc.record = dmarcRecord.join("");
      console.log(`[Email Scan] DMARC record found`);
    }
  } catch {
    console.log(`[Email Scan] No DMARC record found`);
  }

  // DKIM Records (comprehensive scan)
  // Check apex domain for DKIM
  const dkimResult = await scanForDKIMRecords(domainToCheck);
  result.dkim = dkimResult;
  if (dkimResult.configured) {
    console.log(
      `[Email Scan] DKIM configured with selectors: ${dkimResult.selectors.join(", ")}`,
    );
    result.providers.push(...dkimResult.providers);
  }

  // Prioritize providers: MX > DKIM > SPF
  // BUT: If MX points to security gateway, use SPF for actual provider
  // MX records show actual mail server (highest priority)
  // DKIM shows active email signing (high priority)
  // SPF records may contain old/unused providers (lowest priority)
  // NOTE: Verification records (google-site-verification, MS=ms) are NOT used
  //       because they only prove domain ownership, not email hosting
  const allProviders = new Set<string>();

  // Check if MX providers are security gateways
  const mxIsSecurityGateway = mxProviders.some(
    (p) => p.includes("Security Gateway") || p.includes("(Gateway)"),
  );

  if (mxIsSecurityGateway) {
    console.log(
      `[Email Scan] Security gateway detected in MX: ${mxProviders.join(", ")}`,
    );
    console.log(`[Email Scan] Using SPF for actual email provider`);

    // Store security gateway separately
    result.securityGateway = mxProviders[0];

    // Use SPF for actual email provider (security gateway is in front)
    spfProviders.forEach((p) => allProviders.add(p));

    // Add DKIM providers if available
    if (dkimResult.configured) {
      dkimResult.providers.forEach((p) => allProviders.add(p));
    }
  } else {
    // Normal prioritization: MX > DKIM > SPF

    // Add MX providers first (highest priority)
    mxProviders.forEach((p) => allProviders.add(p));

    // Add DKIM providers (high priority - shows active signing)
    if (dkimResult.configured) {
      dkimResult.providers.forEach((p) => allProviders.add(p));
    }

    // Add SPF providers only if not already detected from MX/DKIM
    // This prevents showing outdated SPF includes
    spfProviders.forEach((p) => {
      // Only add SPF provider if no MX provider detected
      if (mxProviders.length === 0) {
        allProviders.add(p);
      }
    });
  }

  result.providers = Array.from(allProviders);
  result.securityServices = Array.from(new Set(result.securityServices));

  console.log(`[Email Scan] Complete for: ${domain}`);
  console.log(`[Email Scan] MX providers: ${mxProviders.join(", ") || "None"}`);
  console.log(
    `[Email Scan] SPF providers: ${spfProviders.join(", ") || "None"}`,
  );
  console.log(
    `[Email Scan] Final providers (prioritized): ${result.providers.join(", ") || "None detected"}`,
  );
  console.log(
    `[Email Scan] Security services: ${result.securityServices.join(", ") || "None detected"}`,
  );

  return result;
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Use cache-aside pattern
    const result = await getOrSet("email", domain, async () => {
      return await performEmailScan(domain);
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
    console.error("[Email Scan] Error:", error);
    return res.status(500).json({
      error: "Email scan failed",
      message: "An internal error occurred",
    });
  }
}
