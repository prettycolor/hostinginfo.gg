import type { Request, Response } from "express";
import { db } from "../../../../db/client.js";
import { dnsRecords } from "../../../../db/schema.js";
import dns from "dns/promises";

interface DNSCollectionRequest {
  domain: string;
  recordTypes?: string[]; // Optional: specify which records to fetch
}

interface DNSRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
}

/**
 * POST /api/intelligence/collect/dns
 *
 * Performs DNS lookups for a domain and stores results in dns_records table.
 * Uses built-in Node.js dns/promises module - no API key required!
 *
 * Request body:
 * {
 *   "domain": "example.com",
 *   "recordTypes": ["A", "AAAA", "MX", "TXT", "NS", "CNAME"] // optional
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "example.com",
 *   "recordsCollected": 15,
 *   "recordTypes": ["A", "MX", "TXT", "NS"],
 *   "records": [...]
 * }
 */
export default async function handler(req: Request, res: Response) {
  try {
    const { domain, recordTypes = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"] } =
      req.body as DNSCollectionRequest;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Normalize domain (remove protocol, www, trailing slash)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .split("/")[0];

    console.log(
      `[DNS Collection] Starting DNS lookup for: ${normalizedDomain}`,
    );

    const collectedRecords: DNSRecord[] = [];
    const errors: { type: string; error: string }[] = [];

    // A Records (IPv4)
    if (recordTypes.includes("A")) {
      try {
        const records = await dns.resolve4(normalizedDomain, { ttl: true });
        for (const record of records) {
          collectedRecords.push({
            type: "A",
            value: record.address,
            ttl: record.ttl,
          });
        }
        console.log(`[DNS Collection] Found ${records.length} A records`);
      } catch (error) {
        errors.push({ type: "A", error: String(error) });
        console.log(`[DNS Collection] No A records found`);
      }
    }

    // AAAA Records (IPv6)
    if (recordTypes.includes("AAAA")) {
      try {
        const records = await dns.resolve6(normalizedDomain, { ttl: true });
        for (const record of records) {
          collectedRecords.push({
            type: "AAAA",
            value: record.address,
            ttl: record.ttl,
          });
        }
        console.log(`[DNS Collection] Found ${records.length} AAAA records`);
      } catch (error) {
        errors.push({ type: "AAAA", error: String(error) });
        console.log(`[DNS Collection] No AAAA records found`);
      }
    }

    // MX Records (Mail Exchange)
    if (recordTypes.includes("MX")) {
      try {
        const records = await dns.resolveMx(normalizedDomain);
        for (const record of records) {
          collectedRecords.push({
            type: "MX",
            value: record.exchange,
            priority: record.priority,
          });
        }
        console.log(`[DNS Collection] Found ${records.length} MX records`);
      } catch (error) {
        errors.push({ type: "MX", error: String(error) });
        console.log(`[DNS Collection] No MX records found`);
      }
    }

    // TXT Records
    if (recordTypes.includes("TXT")) {
      try {
        const records = await dns.resolveTxt(normalizedDomain);
        for (const record of records) {
          collectedRecords.push({
            type: "TXT",
            value: Array.isArray(record) ? record.join("") : String(record),
          });
        }
        console.log(`[DNS Collection] Found ${records.length} TXT records`);
      } catch (error) {
        errors.push({ type: "TXT", error: String(error) });
        console.log(`[DNS Collection] No TXT records found`);
      }
    }

    // NS Records (Nameservers)
    if (recordTypes.includes("NS")) {
      try {
        const records = await dns.resolveNs(normalizedDomain);
        for (const record of records) {
          collectedRecords.push({
            type: "NS",
            value: record,
          });
        }
        console.log(`[DNS Collection] Found ${records.length} NS records`);
      } catch (error) {
        errors.push({ type: "NS", error: String(error) });
        console.log(`[DNS Collection] No NS records found`);
      }
    }

    // CNAME Records
    if (recordTypes.includes("CNAME")) {
      try {
        const records = await dns.resolveCname(normalizedDomain);
        for (const record of records) {
          collectedRecords.push({
            type: "CNAME",
            value: record,
          });
        }
        console.log(`[DNS Collection] Found ${records.length} CNAME records`);
      } catch (error) {
        errors.push({ type: "CNAME", error: String(error) });
        console.log(`[DNS Collection] No CNAME records found`);
      }
    }

    // Store records in database
    const scannedAt = new Date();
    const insertedRecords = [];

    for (const record of collectedRecords) {
      try {
        await db.insert(dnsRecords).values({
          domain: normalizedDomain,
          recordType: record.type,
          value: record.value,
          ttl: record.ttl || null,
          priority: record.priority || null,
          scannedAt,
        });
        insertedRecords.push(record);
      } catch (error) {
        console.error(
          `[DNS Collection] Failed to insert ${record.type} record:`,
          error,
        );
      }
    }

    console.log(
      `[DNS Collection] Stored ${insertedRecords.length} records in database`,
    );

    // Return results
    return res.json({
      success: true,
      domain: normalizedDomain,
      recordsCollected: insertedRecords.length,
      recordTypes: [...new Set(insertedRecords.map((r) => r.type))],
      records: insertedRecords,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: scannedAt.toISOString(),
    });
  } catch (error) {
    console.error("[DNS Collection] Error:", error);
    return res.status(500).json({
      error: "DNS collection failed",
      message: "An internal error occurred",
    });
  }
}
