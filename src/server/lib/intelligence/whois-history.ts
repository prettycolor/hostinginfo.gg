/**
 * WHOIS Historical Tracking Engine
 *
 * Provides:
 * - Track changes in domain ownership over time
 * - Detect registrar transfers
 * - Monitor nameserver changes
 * - Alert on contact information updates
 * - Historical timeline visualization
 */

import { db } from "../../db/client.js";
import { whoisRecords } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

type WhoisRecordRow = typeof whoisRecords.$inferSelect;

export interface WhoisChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
  changeType: "added" | "modified" | "removed";
}

export interface WhoisHistoryRecord {
  domain: string;
  timestamp: Date;
  registrar: string | null;
  registrantName: string | null;
  registrantEmail: string | null;
  nameservers: string[];
  expirationDate: Date | null;
  transferLock: boolean | null;
  changes: WhoisChange[];
}

export interface WhoisTimeline {
  domain: string;
  firstSeen: Date;
  lastUpdated: Date;
  totalChanges: number;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  date: Date;
  type:
    | "ownership_change"
    | "registrar_transfer"
    | "nameserver_change"
    | "expiry_update"
    | "contact_update"
    | "lock_change";
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  details: Record<string, unknown>;
}

/**
 * Compare two WHOIS records and detect changes
 */
export function detectChanges(
  oldRecord: WhoisRecordRow,
  newRecord: WhoisRecordRow,
): WhoisChange[] {
  const changes: WhoisChange[] = [];

  // Helper to add change
  const addChange = (field: string, oldValue: unknown, newValue: unknown) => {
    const oldStr = oldValue ? String(oldValue) : null;
    const newStr = newValue ? String(newValue) : null;

    if (oldStr === newStr) return;

    let changeType: "added" | "modified" | "removed";
    if (!oldStr && newStr) changeType = "added";
    else if (oldStr && !newStr) changeType = "removed";
    else changeType = "modified";

    changes.push({
      field,
      oldValue: oldStr,
      newValue: newStr,
      changedAt: new Date(),
      changeType,
    });
  };

  // Check registrar
  if (oldRecord.registrar !== newRecord.registrar) {
    addChange("registrar", oldRecord.registrar, newRecord.registrar);
  }

  // Check registrant name
  if (oldRecord.registrantName !== newRecord.registrantName) {
    addChange(
      "registrantName",
      oldRecord.registrantName,
      newRecord.registrantName,
    );
  }

  // Check registrant email
  if (oldRecord.registrantEmail !== newRecord.registrantEmail) {
    addChange(
      "registrantEmail",
      oldRecord.registrantEmail,
      newRecord.registrantEmail,
    );
  }

  // Check expiration date
  const oldExpiry = oldRecord.expirationDate
    ? new Date(oldRecord.expirationDate).getTime()
    : null;
  const newExpiry = newRecord.expirationDate
    ? new Date(newRecord.expirationDate).getTime()
    : null;
  if (oldExpiry !== newExpiry) {
    addChange(
      "expirationDate",
      oldRecord.expirationDate,
      newRecord.expirationDate,
    );
  }

  // Check transfer lock
  if (oldRecord.transferLock !== newRecord.transferLock) {
    addChange("transferLock", oldRecord.transferLock, newRecord.transferLock);
  }

  // Check nameservers
  const oldNS = Array.isArray(oldRecord.nameservers)
    ? oldRecord.nameservers.sort().join(",")
    : JSON.stringify(oldRecord.nameservers || []);
  const newNS = Array.isArray(newRecord.nameservers)
    ? newRecord.nameservers.sort().join(",")
    : JSON.stringify(newRecord.nameservers || []);

  if (oldNS !== newNS) {
    addChange("nameservers", oldNS, newNS);
  }

  return changes;
}

/**
 * Get WHOIS history for a domain
 */
export async function getWhoisHistory(
  domain: string,
  limit: number = 50,
): Promise<WhoisHistoryRecord[]> {
  try {
    // Get all WHOIS records for this domain, ordered by scan time
    const records = await db
      .select()
      .from(whoisRecords)
      .where(eq(whoisRecords.domain, domain))
      .orderBy(desc(whoisRecords.scannedAt))
      .limit(limit);

    if (records.length === 0) {
      return [];
    }

    const history: WhoisHistoryRecord[] = [];

    // Compare each record with the previous one
    for (let i = 0; i < records.length; i++) {
      const current = records[i];
      const previous = i < records.length - 1 ? records[i + 1] : null;

      const changes = previous ? detectChanges(previous, current) : [];
      const currentStatuses = Array.isArray(current.status)
        ? current.status
        : [];
      const transferLock = currentStatuses.some(
        (status) =>
          typeof status === "string" &&
          status.toLowerCase().includes("transferprohibited"),
      );

      history.push({
        domain: current.domain || domain,
        timestamp: current.scannedAt || new Date(),
        registrar: current.registrar,
        registrantName: current.registrantName,
        registrantEmail: current.registrantEmail,
        nameservers: Array.isArray(current.nameservers)
          ? current.nameservers
          : current.nameservers
            ? JSON.parse(String(current.nameservers))
            : [],
        expirationDate: current.expiryDate,
        transferLock,
        changes,
      });
    }

    return history;
  } catch (error) {
    console.error("[WHOIS History] Error getting history:", error);
    return [];
  }
}

/**
 * Get recent changes for a domain
 */
export async function getRecentChanges(
  domain: string,
  daysBack: number = 30,
): Promise<WhoisChange[]> {
  const history = await getWhoisHistory(domain, 100);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const allChanges: WhoisChange[] = [];

  for (const record of history) {
    if (record.timestamp < cutoffDate) break;
    allChanges.push(...record.changes);
  }

  return allChanges;
}

/**
 * Build timeline of events for a domain
 */
export async function buildTimeline(
  domain: string,
): Promise<WhoisTimeline | null> {
  const history = await getWhoisHistory(domain, 100);

  if (history.length === 0) {
    return null;
  }

  const events: TimelineEvent[] = [];
  let totalChanges = 0;

  for (const record of history) {
    totalChanges += record.changes.length;

    for (const change of record.changes) {
      let eventType: TimelineEvent["type"];
      let severity: TimelineEvent["severity"];
      let description: string;

      switch (change.field) {
        case "registrar":
          eventType = "registrar_transfer";
          severity = "high";
          description = `Registrar changed from ${change.oldValue || "unknown"} to ${change.newValue || "unknown"}`;
          break;

        case "registrantName":
        case "registrantEmail":
          eventType = "ownership_change";
          severity = "critical";
          description = `${change.field === "registrantName" ? "Owner name" : "Owner email"} changed`;
          break;

        case "nameservers":
          eventType = "nameserver_change";
          severity = "medium";
          description = "Nameservers updated";
          break;

        case "expirationDate":
          eventType = "expiry_update";
          severity = "medium";
          description = `Expiration date updated to ${change.newValue || "unknown"}`;
          break;

        case "transferLock":
          eventType = "lock_change";
          severity = "low";
          description = `Transfer lock ${change.newValue === "true" ? "enabled" : "disabled"}`;
          break;

        default:
          eventType = "contact_update";
          severity = "low";
          description = `${change.field} updated`;
      }

      events.push({
        date: change.changedAt,
        type: eventType,
        description,
        severity,
        details: {
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeType: change.changeType,
        },
      });
    }
  }

  // Sort events by date (newest first)
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    domain,
    firstSeen: history[history.length - 1].timestamp,
    lastUpdated: history[0].timestamp,
    totalChanges,
    events,
  };
}

/**
 * Detect if domain has been transferred recently
 */
export async function detectRecentTransfer(
  domain: string,
  daysBack: number = 90,
): Promise<{
  transferred: boolean;
  transferDate?: Date;
  fromRegistrar?: string;
  toRegistrar?: string;
} | null> {
  const changes = await getRecentChanges(domain, daysBack);

  const registrarChange = changes.find((c) => c.field === "registrar");

  if (registrarChange) {
    return {
      transferred: true,
      transferDate: registrarChange.changedAt,
      fromRegistrar: registrarChange.oldValue || undefined,
      toRegistrar: registrarChange.newValue || undefined,
    };
  }

  return {
    transferred: false,
  };
}

/**
 * Get change statistics for a domain
 */
export async function getChangeStatistics(domain: string): Promise<{
  totalScans: number;
  totalChanges: number;
  changesByType: Record<string, number>;
  lastChange?: Date;
  mostFrequentChange?: string;
} | null> {
  const history = await getWhoisHistory(domain, 1000);

  if (history.length === 0) {
    return null;
  }

  const changesByType: Record<string, number> = {};
  let totalChanges = 0;
  let lastChange: Date | undefined;

  for (const record of history) {
    for (const change of record.changes) {
      totalChanges++;
      changesByType[change.field] = (changesByType[change.field] || 0) + 1;

      if (!lastChange || change.changedAt > lastChange) {
        lastChange = change.changedAt;
      }
    }
  }

  // Find most frequent change type
  let mostFrequentChange: string | undefined;
  let maxCount = 0;
  for (const [field, count] of Object.entries(changesByType)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentChange = field;
    }
  }

  return {
    totalScans: history.length,
    totalChanges,
    changesByType,
    lastChange,
    mostFrequentChange,
  };
}

/**
 * Compare domain state at two different points in time
 */
export async function compareTimePoints(
  domain: string,
  date1: Date,
  date2: Date,
): Promise<{
  record1: WhoisHistoryRecord | null;
  record2: WhoisHistoryRecord | null;
  changes: WhoisChange[];
} | null> {
  const history = await getWhoisHistory(domain, 1000);

  if (history.length === 0) {
    return null;
  }

  // Find records closest to the specified dates
  let record1: WhoisHistoryRecord | null = null;
  let record2: WhoisHistoryRecord | null = null;

  for (const record of history) {
    if (!record1 && record.timestamp <= date1) {
      record1 = record;
    }
    if (!record2 && record.timestamp <= date2) {
      record2 = record;
    }
    if (record1 && record2) break;
  }

  if (!record1 || !record2) {
    return null;
  }

  const changes = detectChanges(record1, record2);

  return {
    record1,
    record2,
    changes,
  };
}
