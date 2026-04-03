/**
 * WHOIS Intelligence Module
 *
 * Provides comprehensive WHOIS analysis with:
 * - Domain registration data (registrar, dates, status)
 * - Registrant information (when available)
 * - Name server analysis
 * - Historical tracking of WHOIS changes
 * - Transfer lock detection
 * - Expiry monitoring
 *
 * Part of Phase 1: Core Intelligence Engine
 */

import { db } from "../../db/client.js";
import { whoisRecords, whoisHistory } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { calculateConfidence, createSignal } from "../confidence-scorer.js";
import { checkRateLimit, incrementRateLimit } from "../rate-limiter.js";

export interface WhoisData {
  domain: string;
  registrar: string | null;
  registrarUrl: string | null;
  createdDate: string | null;
  updatedDate: string | null;
  expiryDate: string | null;
  status: string[];
  nameServers: string[];
  registrantOrg: string | null;
  registrantCountry: string | null;
  adminEmail: string | null;
  techEmail: string | null;
  dnssec: boolean;
}

export interface WhoisIntelligence {
  domain: string;
  data: WhoisData;
  analysis: {
    domainAge: {
      years: number;
      months: number;
      days: number;
      category: "new" | "established" | "mature";
    } | null;
    expiryStatus: {
      daysUntilExpiry: number;
      urgency: "expired" | "critical" | "warning" | "attention" | "safe";
    } | null;
    transferLocked: boolean;
    privacyProtected: boolean;
    dnssecEnabled: boolean;
  };
  confidence: number;
  lastChecked: Date;
  hasChanges: boolean;
  changesSince?: Date;
  evidence: {
    source: string;
    timestamp: Date;
    data: Record<string, unknown>;
  }[];
}

type RDAPVCardValue = string | string[] | null | undefined;
type RDAPVCardField = [string, unknown?, unknown?, RDAPVCardValue?];

interface RDAPEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RDAPNameserver {
  ldhName?: string;
  unicodeName?: string;
}

interface RDAPLink {
  rel?: string;
  href?: string;
}

interface RDAPEntity {
  roles?: string[];
  vcardArray?: [string, RDAPVCardField[]];
  links?: RDAPLink[];
}

interface RDAPResponse {
  events?: RDAPEvent[];
  status?: string[];
  nameservers?: RDAPNameserver[];
  entities?: RDAPEntity[];
  secureDNS?: {
    delegationSigned?: boolean;
  };
}

function getEntityVCardFields(entity: RDAPEntity): RDAPVCardField[] {
  return Array.isArray(entity.vcardArray?.[1]) ? entity.vcardArray[1] : [];
}

function getVCardValue(
  fields: RDAPVCardField[],
  fieldName: string,
): RDAPVCardValue {
  const field = fields.find((entry) => entry[0] === fieldName);
  return field?.[3];
}

function getCountryFromAdr(value: RDAPVCardValue): string | null {
  if (Array.isArray(value) && typeof value[6] === "string") {
    return value[6];
  }
  return null;
}

/**
 * Fetch WHOIS data using RDAP (Registration Data Access Protocol)
 * RDAP is the modern replacement for WHOIS
 */
async function fetchRDAPData(domain: string): Promise<WhoisData | null> {
  try {
    // Determine TLD
    const tld = domain.split(".").pop()?.toLowerCase();

    // RDAP servers by TLD (major TLDs)
    const rdapServers: Record<string, string> = {
      com: "https://rdap.verisign.com/com/v1/domain/",
      net: "https://rdap.verisign.com/net/v1/domain/",
      org: "https://rdap.publicinterestregistry.org/rdap/domain/",
      io: "https://rdap.nic.io/domain/",
      co: "https://rdap.nic.co/domain/",
      uk: "https://rdap.nominet.uk/uk/domain/",
      de: "https://rdap.denic.de/domain/",
      fr: "https://rdap.nic.fr/domain/",
    };

    const rdapServer = rdapServers[tld || ""];
    if (!rdapServer) {
      console.log(`No RDAP server configured for TLD: ${tld}`);
      return null;
    }

    const response = await fetch(`${rdapServer}${domain}`, {
      headers: {
        Accept: "application/rdap+json",
      },
    });

    if (!response.ok) {
      console.error(
        `RDAP request failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as RDAPResponse;

    // Parse RDAP response
    const whoisData: WhoisData = {
      domain,
      registrar: null,
      registrarUrl: null,
      createdDate: null,
      updatedDate: null,
      expiryDate: null,
      status: [],
      nameServers: [],
      registrantOrg: null,
      registrantCountry: null,
      adminEmail: null,
      techEmail: null,
      dnssec: false,
    };

    // Extract dates
    if (data.events) {
      for (const event of data.events) {
        if (event.eventAction === "registration") {
          whoisData.createdDate = event.eventDate;
        } else if (
          event.eventAction === "last changed" ||
          event.eventAction === "last update of RDAP database"
        ) {
          whoisData.updatedDate = event.eventDate;
        } else if (event.eventAction === "expiration") {
          whoisData.expiryDate = event.eventDate;
        }
      }
    }

    // Extract status
    if (data.status) {
      whoisData.status = data.status;
    }

    // Extract name servers
    if (data.nameservers) {
      whoisData.nameServers = data.nameservers
        .map((nameserver) => nameserver.ldhName || nameserver.unicodeName || "")
        .filter((value): value is string => value.length > 0);
    }

    // Extract registrar
    if (data.entities) {
      for (const entity of data.entities) {
        const vcardFields = getEntityVCardFields(entity);

        if (entity.roles?.includes("registrar")) {
          const registrarName = getVCardValue(vcardFields, "fn");
          whoisData.registrar =
            typeof registrarName === "string" ? registrarName : null;
          whoisData.registrarUrl =
            entity.links?.find((link) => link.rel === "self")?.href || null;
        }
        if (entity.roles?.includes("registrant")) {
          const registrantOrg = getVCardValue(vcardFields, "org");
          whoisData.registrantOrg =
            typeof registrantOrg === "string" ? registrantOrg : null;
          const countryField = getVCardValue(vcardFields, "adr");
          whoisData.registrantCountry = getCountryFromAdr(countryField);
        }
        if (entity.roles?.includes("administrative")) {
          const adminEmail = getVCardValue(vcardFields, "email");
          whoisData.adminEmail =
            typeof adminEmail === "string" ? adminEmail : null;
        }
        if (entity.roles?.includes("technical")) {
          const techEmail = getVCardValue(vcardFields, "email");
          whoisData.techEmail =
            typeof techEmail === "string" ? techEmail : null;
        }
      }
    }

    // Check DNSSEC
    if (data.secureDNS) {
      whoisData.dnssec = data.secureDNS.delegationSigned === true;
    }

    return whoisData;
  } catch (error) {
    console.error("RDAP fetch error:", error);
    return null;
  }
}

/**
 * Calculate domain age
 */
function calculateDomainAge(createdDate: string | null): {
  years: number;
  months: number;
  days: number;
  category: "new" | "established" | "mature";
} | null {
  if (!createdDate) return null;

  const created = new Date(createdDate);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;

  let category: "new" | "established" | "mature" = "new";
  if (years >= 10) category = "mature";
  else if (years >= 3) category = "established";

  return { years, months, days, category };
}

/**
 * Calculate days until expiry
 */
function calculateExpiryStatus(expiryDate: string | null): {
  daysUntilExpiry: number;
  urgency: "expired" | "critical" | "warning" | "attention" | "safe";
} | null {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const daysUntilExpiry = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let urgency: "expired" | "critical" | "warning" | "attention" | "safe" =
    "safe";
  if (daysUntilExpiry < 0) urgency = "expired";
  else if (daysUntilExpiry <= 30) urgency = "critical";
  else if (daysUntilExpiry <= 60) urgency = "warning";
  else if (daysUntilExpiry <= 90) urgency = "attention";

  return { daysUntilExpiry, urgency };
}

/**
 * Check if domain has transfer lock
 */
function checkTransferLock(status: string[]): boolean {
  const lockStatuses = [
    "clientTransferProhibited",
    "serverTransferProhibited",
    "pendingTransfer",
  ];
  return status.some((s) =>
    lockStatuses.some((ls) => s.toLowerCase().includes(ls.toLowerCase())),
  );
}

/**
 * Check if domain has privacy protection
 */
function checkPrivacyProtection(data: WhoisData): boolean {
  if (!data.registrantOrg) return true; // No org = likely privacy protected

  const privacyKeywords = [
    "privacy",
    "redacted",
    "protected",
    "proxy",
    "whoisguard",
    "domains by proxy",
  ];
  const org = data.registrantOrg.toLowerCase();

  return privacyKeywords.some((keyword) => org.includes(keyword));
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asComparableDate(value: Date | null): string {
  return value ? value.toISOString() : "";
}

/**
 * Get comprehensive WHOIS intelligence
 */
export async function getWhoisIntelligence(
  domain: string,
  _userId?: number,
): Promise<WhoisIntelligence> {
  // Check rate limit
  const rateCheck = await checkRateLimit("whois");
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.ceil(
      (rateCheck.resetAt - Date.now()) / 1000,
    );
    throw new Error(
      `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds`,
    );
  }

  // Fetch WHOIS data
  const whoisData = await fetchRDAPData(domain);
  await incrementRateLimit("whois");

  if (!whoisData) {
    throw new Error("Failed to fetch WHOIS data");
  }

  // Get historical records
  const historicalRecords = await db
    .select()
    .from(whoisRecords)
    .where(eq(whoisRecords.domain, domain))
    .orderBy(desc(whoisRecords.scannedAt))
    .limit(10);

  // Check for changes
  let hasChanges = false;
  let changesSince: Date | undefined;

  if (historicalRecords.length > 0) {
    const lastRecord = historicalRecords[0];
    const lastNameservers = Array.isArray(lastRecord.nameservers)
      ? lastRecord.nameservers
      : [];
    const lastStatus = Array.isArray(lastRecord.status)
      ? lastRecord.status
      : [];

    hasChanges =
      (lastRecord.registrar || null) !== whoisData.registrar ||
      asComparableDate(lastRecord.expiryDate) !==
        asComparableDate(parseOptionalDate(whoisData.expiryDate)) ||
      JSON.stringify(lastNameservers) !==
        JSON.stringify(whoisData.nameServers) ||
      JSON.stringify(lastStatus) !== JSON.stringify(whoisData.status);

    if (hasChanges) {
      changesSince = lastRecord.scannedAt;
    }
  }

  // Analyze data
  const analysis = {
    domainAge: calculateDomainAge(whoisData.createdDate),
    expiryStatus: calculateExpiryStatus(whoisData.expiryDate),
    transferLocked: checkTransferLock(whoisData.status),
    privacyProtected: checkPrivacyProtection(whoisData),
    dnssecEnabled: whoisData.dnssec,
  };

  // Calculate confidence score
  const signals = [
    createSignal(
      "whois",
      whoisData.registrar ? "registrar_present" : "registrar_missing",
      20,
      "rdap",
    ),
    createSignal(
      "whois",
      whoisData.createdDate && whoisData.expiryDate
        ? "dates_present"
        : "dates_partial",
      30,
      "rdap",
    ),
    createSignal(
      "whois",
      whoisData.nameServers.length > 0
        ? "nameservers_present"
        : "nameservers_missing",
      20,
      "rdap",
    ),
    createSignal(
      "whois",
      whoisData.status.length > 0 ? "status_present" : "status_missing",
      15,
      "rdap",
    ),
    createSignal(
      "whois",
      whoisData.dnssec ? "dnssec_enabled" : "dnssec_disabled",
      15,
      "rdap",
    ),
  ];

  const confidence = calculateConfidence(signals).score;

  const upsertPayload: typeof whoisRecords.$inferInsert = {
    domain,
    registrar: whoisData.registrar,
    registrarUrl: whoisData.registrarUrl,
    createdDate: parseOptionalDate(whoisData.createdDate),
    updatedDate: parseOptionalDate(whoisData.updatedDate),
    expiryDate: parseOptionalDate(whoisData.expiryDate),
    status: whoisData.status,
    registrantOrganization: whoisData.registrantOrg,
    registrantCountry: whoisData.registrantCountry,
    adminEmail: whoisData.adminEmail,
    techEmail: whoisData.techEmail,
    nameservers: whoisData.nameServers,
    dnssec: whoisData.dnssec ? "signed" : "unsigned",
    rawWhois: null,
    scannedAt: new Date(),
  };

  // whois_records is unique by domain, so we update current snapshot in place.
  await db.insert(whoisRecords).values(upsertPayload).onDuplicateKeyUpdate({
    set: upsertPayload,
  });

  // If changes detected, log to history
  if (hasChanges && historicalRecords.length > 0) {
    await db.insert(whoisHistory).values({
      domain,
      snapshotDate: new Date(),
      registrar: whoisData.registrar,
      registrarIanaId: null,
      registrantName: null,
      registrantEmail: null,
      registrantOrganization: whoisData.registrantOrg,
      registrantCountry: whoisData.registrantCountry,
      creationDate: parseOptionalDate(whoisData.createdDate),
      expirationDate: parseOptionalDate(whoisData.expiryDate),
      updatedDate: parseOptionalDate(whoisData.updatedDate),
      nameservers: whoisData.nameServers,
      status: whoisData.status,
      dnssecEnabled: whoisData.dnssec,
      transferLock: checkTransferLock(whoisData.status),
      rawWhoisData: whoisData as unknown as Record<string, unknown>,
      dataSource: "rdap",
      scanId: null,
    });
  }

  // Build evidence array
  const evidence = [
    {
      source: "rdap",
      timestamp: new Date(),
      data: whoisData as unknown as Record<string, unknown>,
    },
  ];

  return {
    domain,
    data: whoisData,
    analysis,
    confidence,
    lastChecked: new Date(),
    hasChanges,
    changesSince,
    evidence,
  };
}

/**
 * Get WHOIS change history
 */
export async function getWhoisHistory(domain: string, limit: number = 10) {
  const history = await db
    .select()
    .from(whoisHistory)
    .where(eq(whoisHistory.domain, domain))
    .orderBy(desc(whoisHistory.snapshotDate))
    .limit(limit);

  return history;
}
