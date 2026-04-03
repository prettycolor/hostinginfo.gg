/**
 * GET /api/intelligence/dns/history?domain=example.com&recordType=A
 *
 * Get DNS history for a domain
 */

import type { Request, Response } from "express";
import { getDNSHistory } from "../../../../../lib/engines/dns-engine.js";

const DNS_RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "NS",
  "MX",
  "TXT",
  "SOA",
  "CAA",
] as const;
type DNSRecordType = (typeof DNS_RECORD_TYPES)[number];

function isDNSRecordType(value: string): value is DNSRecordType {
  return DNS_RECORD_TYPES.includes(value as DNSRecordType);
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain, recordType } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const normalizedRecordType =
      typeof recordType === "string" &&
      isDNSRecordType(recordType.toUpperCase())
        ? recordType.toUpperCase()
        : undefined;

    const history = await getDNSHistory(domain, normalizedRecordType);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: unknown) {
    console.error("DNS history error:", error);
    const message = "An internal error occurred";
    res.status(500).json({
      error: "Failed to fetch DNS history",
      message,
    });
  }
}
