/**
 * WHOIS Historical Tracking Engine
 * Phase 3 Task 4: Track WHOIS record changes over time
 *
 * Features:
 * - Create historical snapshots of WHOIS records
 * - Detect changes between snapshots
 * - Classify change severity
 * - Identify suspicious changes
 * - Generate alerts for significant changes
 * - Compare snapshots across time periods
 */

import { db } from "../db/client.js";
import { whoisHistory, whoisChanges, whoisAlerts } from "../db/schema.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";

type WhoisHistoryRow = typeof whoisHistory.$inferSelect;
type WhoisChangeRow = typeof whoisChanges.$inferSelect;
type WhoisAlertRow = typeof whoisAlerts.$inferSelect;

function extractInsertId(result: unknown): number | null {
  if (typeof result === "object" && result !== null) {
    const direct = (result as { insertId?: unknown }).insertId;
    if (typeof direct === "number") return direct;
    if (typeof direct === "bigint") return Number(direct);
  }

  if (Array.isArray(result) && result.length > 0) {
    return extractInsertId(result[0]);
  }

  return null;
}

/**
 * WHOIS Snapshot Interface
 */
export interface WhoisSnapshot {
  domain: string;
  registrar?: string;
  registrarIanaId?: string;
  registrantName?: string;
  registrantEmail?: string;
  registrantOrganization?: string;
  registrantCountry?: string;
  creationDate?: Date;
  expirationDate?: Date;
  updatedDate?: Date;
  nameservers?: string[];
  status?: string[];
  dnssecEnabled?: boolean;
  transferLock?: boolean;
  rawWhoisData?: unknown;
  dataSource?: string;
  scanId?: string;
}

/**
 * WHOIS Change Interface
 */
export interface WhoisChange {
  domain: string;
  changeType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  isSuspicious: boolean;
  previousSnapshotId?: number;
  currentSnapshotId?: number;
  notes?: string;
}

/**
 * WHOIS Alert Interface
 */
export interface WhoisAlert {
  domain: string;
  alertType: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  changeIds: number[];
}

/**
 * Create a historical snapshot of WHOIS data
 */
export async function createWhoisSnapshot(
  snapshot: WhoisSnapshot,
): Promise<number> {
  const result = await db.insert(whoisHistory).values({
    domain: snapshot.domain,
    snapshotDate: new Date(),
    registrar: snapshot.registrar,
    registrarIanaId: snapshot.registrarIanaId,
    registrantName: snapshot.registrantName,
    registrantEmail: snapshot.registrantEmail,
    registrantOrganization: snapshot.registrantOrganization,
    registrantCountry: snapshot.registrantCountry,
    creationDate: snapshot.creationDate,
    expirationDate: snapshot.expirationDate,
    updatedDate: snapshot.updatedDate,
    nameservers: snapshot.nameservers,
    status: snapshot.status,
    dnssecEnabled: snapshot.dnssecEnabled,
    transferLock: snapshot.transferLock,
    rawWhoisData: snapshot.rawWhoisData,
    dataSource: snapshot.dataSource || "whoisfreaks",
    scanId: snapshot.scanId,
  });

  const insertId = extractInsertId(result);
  if (insertId !== null) {
    return insertId;
  }

  const latestSnapshot = await db
    .select({ id: whoisHistory.id })
    .from(whoisHistory)
    .where(eq(whoisHistory.domain, snapshot.domain))
    .orderBy(desc(whoisHistory.snapshotDate))
    .limit(1);

  if (latestSnapshot.length === 0) {
    throw new Error("Failed to determine inserted WHOIS snapshot id");
  }

  return latestSnapshot[0].id;
}

/**
 * Get the latest snapshot for a domain
 */
export async function getLatestSnapshot(
  domain: string,
): Promise<WhoisHistoryRow | null> {
  const snapshots = await db
    .select()
    .from(whoisHistory)
    .where(eq(whoisHistory.domain, domain))
    .orderBy(desc(whoisHistory.snapshotDate))
    .limit(1);

  return snapshots.length > 0 ? snapshots[0] : null;
}

/**
 * Get all snapshots for a domain
 */
export async function getDomainHistory(
  domain: string,
  limit: number = 50,
): Promise<WhoisHistoryRow[]> {
  return await db
    .select()
    .from(whoisHistory)
    .where(eq(whoisHistory.domain, domain))
    .orderBy(desc(whoisHistory.snapshotDate))
    .limit(limit);
}

/**
 * Compare two snapshots and detect changes
 */
export async function compareSnapshots(
  previousSnapshot: WhoisHistoryRow,
  currentSnapshot: WhoisHistoryRow,
): Promise<WhoisChange[]> {
  const changes: WhoisChange[] = [];
  const domain = currentSnapshot.domain;

  // Define fields to compare with their severity levels
  const fieldComparisons: Array<{
    field: string;
    label: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    suspicious: boolean;
  }> = [
    {
      field: "registrantEmail",
      label: "Registrant Email",
      severity: "critical",
      suspicious: true,
    },
    {
      field: "registrantName",
      label: "Registrant Name",
      severity: "critical",
      suspicious: true,
    },
    {
      field: "registrar",
      label: "Registrar",
      severity: "high",
      suspicious: true,
    },
    {
      field: "registrantOrganization",
      label: "Registrant Organization",
      severity: "high",
      suspicious: true,
    },
    {
      field: "nameservers",
      label: "Nameservers",
      severity: "high",
      suspicious: false,
    },
    {
      field: "expirationDate",
      label: "Expiration Date",
      severity: "medium",
      suspicious: false,
    },
    {
      field: "transferLock",
      label: "Transfer Lock",
      severity: "medium",
      suspicious: true,
    },
    {
      field: "dnssecEnabled",
      label: "DNSSEC Status",
      severity: "medium",
      suspicious: false,
    },
    {
      field: "status",
      label: "Domain Status",
      severity: "low",
      suspicious: false,
    },
    {
      field: "registrantCountry",
      label: "Registrant Country",
      severity: "low",
      suspicious: true,
    },
    {
      field: "updatedDate",
      label: "Updated Date",
      severity: "info",
      suspicious: false,
    },
  ];

  for (const comparison of fieldComparisons) {
    const oldValue = previousSnapshot[comparison.field];
    const newValue = currentSnapshot[comparison.field];

    // Handle array comparisons (nameservers, status)
    if (Array.isArray(oldValue) || Array.isArray(newValue)) {
      const oldArray = Array.isArray(oldValue) ? oldValue : [];
      const newArray = Array.isArray(newValue) ? newValue : [];

      if (JSON.stringify(oldArray.sort()) !== JSON.stringify(newArray.sort())) {
        changes.push({
          domain,
          changeType: "array_change",
          fieldName: comparison.field,
          oldValue: JSON.stringify(oldArray),
          newValue: JSON.stringify(newArray),
          severity: comparison.severity,
          isSuspicious: comparison.suspicious,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: currentSnapshot.id,
          notes: `${comparison.label} changed`,
        });
      }
    }
    // Handle date comparisons
    else if (oldValue instanceof Date || newValue instanceof Date) {
      const oldDate = oldValue ? new Date(oldValue).getTime() : null;
      const newDate = newValue ? new Date(newValue).getTime() : null;

      if (oldDate !== newDate) {
        changes.push({
          domain,
          changeType: "date_change",
          fieldName: comparison.field,
          oldValue: oldValue ? new Date(oldValue).toISOString() : null,
          newValue: newValue ? new Date(newValue).toISOString() : null,
          severity: comparison.severity,
          isSuspicious: comparison.suspicious,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: currentSnapshot.id,
          notes: `${comparison.label} changed`,
        });
      }
    }
    // Handle boolean comparisons
    else if (typeof oldValue === "boolean" || typeof newValue === "boolean") {
      if (oldValue !== newValue) {
        changes.push({
          domain,
          changeType: "boolean_change",
          fieldName: comparison.field,
          oldValue: String(oldValue),
          newValue: String(newValue),
          severity: comparison.severity,
          isSuspicious: comparison.suspicious,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: currentSnapshot.id,
          notes: `${comparison.label} changed from ${oldValue} to ${newValue}`,
        });
      }
    }
    // Handle string comparisons
    else {
      if (oldValue !== newValue) {
        changes.push({
          domain,
          changeType: "value_change",
          fieldName: comparison.field,
          oldValue: String(oldValue || ""),
          newValue: String(newValue || ""),
          severity: comparison.severity,
          isSuspicious: comparison.suspicious,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: currentSnapshot.id,
          notes: `${comparison.label} changed`,
        });
      }
    }
  }

  return changes;
}

/**
 * Record detected changes in the database
 */
export async function recordChanges(changes: WhoisChange[]): Promise<number[]> {
  if (changes.length === 0) return [];

  const changeIds: number[] = [];

  for (const change of changes) {
    const changeDate = new Date();
    const result = await db.insert(whoisChanges).values({
      domain: change.domain,
      changeDate,
      changeType: change.changeType,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      severity: change.severity,
      isSuspicious: change.isSuspicious,
      previousSnapshotId: change.previousSnapshotId,
      currentSnapshotId: change.currentSnapshotId,
      notes: change.notes,
    });

    const insertId = extractInsertId(result);
    if (insertId !== null) {
      changeIds.push(insertId);
      continue;
    }

    const latestChange = await db
      .select({ id: whoisChanges.id })
      .from(whoisChanges)
      .where(
        and(
          eq(whoisChanges.domain, change.domain),
          eq(whoisChanges.changeDate, changeDate),
        ),
      )
      .orderBy(desc(whoisChanges.id))
      .limit(1);

    if (latestChange.length > 0) {
      changeIds.push(latestChange[0].id);
    }
  }

  return changeIds;
}

/**
 * Generate alerts for significant changes
 */
export async function generateAlerts(changes: WhoisChange[]): Promise<void> {
  // Group changes by severity and type
  const criticalChanges = changes.filter((c) => c.severity === "critical");
  const suspiciousChanges = changes.filter((c) => c.isSuspicious);
  const ownershipChanges = changes.filter(
    (c) =>
      c.fieldName === "registrantEmail" ||
      c.fieldName === "registrantName" ||
      c.fieldName === "registrantOrganization",
  );
  const registrarChanges = changes.filter((c) => c.fieldName === "registrar");
  const nameserverChanges = changes.filter(
    (c) => c.fieldName === "nameservers",
  );

  // Create alerts for critical changes
  if (criticalChanges.length > 0) {
    const domain = criticalChanges[0].domain;
    const changeIds = criticalChanges.map((_, idx) => idx + 1); // Placeholder IDs

    await db.insert(whoisAlerts).values({
      domain,
      alertType: "critical_change",
      severity: "critical",
      title: "Critical WHOIS Changes Detected",
      description: `${criticalChanges.length} critical changes detected in WHOIS record`,
      changeIds,
      triggeredAt: new Date(),
      acknowledged: false,
    });
  }

  // Create alerts for ownership changes
  if (ownershipChanges.length > 0) {
    const domain = ownershipChanges[0].domain;
    const changeIds = ownershipChanges.map((_, idx) => idx + 1);

    await db.insert(whoisAlerts).values({
      domain,
      alertType: "ownership_change",
      severity: "critical",
      title: "Domain Ownership Change Detected",
      description:
        "Domain ownership information has changed. This may indicate a transfer.",
      changeIds,
      triggeredAt: new Date(),
      acknowledged: false,
    });
  }

  // Create alerts for registrar changes
  if (registrarChanges.length > 0) {
    const domain = registrarChanges[0].domain;
    const changeIds = registrarChanges.map((_, idx) => idx + 1);

    await db.insert(whoisAlerts).values({
      domain,
      alertType: "registrar_change",
      severity: "high",
      title: "Registrar Change Detected",
      description:
        "Domain registrar has changed. Verify this was an authorized transfer.",
      changeIds,
      triggeredAt: new Date(),
      acknowledged: false,
    });
  }

  // Create alerts for nameserver changes
  if (nameserverChanges.length > 0) {
    const domain = nameserverChanges[0].domain;
    const changeIds = nameserverChanges.map((_, idx) => idx + 1);

    await db.insert(whoisAlerts).values({
      domain,
      alertType: "nameserver_change",
      severity: "high",
      title: "Nameserver Change Detected",
      description: "Domain nameservers have changed. Verify DNS configuration.",
      changeIds,
      triggeredAt: new Date(),
      acknowledged: false,
    });
  }

  // Create alerts for suspicious changes
  if (
    suspiciousChanges.length > 0 &&
    suspiciousChanges.length !== ownershipChanges.length
  ) {
    const domain = suspiciousChanges[0].domain;
    const changeIds = suspiciousChanges.map((_, idx) => idx + 1);

    await db.insert(whoisAlerts).values({
      domain,
      alertType: "suspicious_activity",
      severity: "high",
      title: "Suspicious WHOIS Activity Detected",
      description: `${suspiciousChanges.length} suspicious changes detected in WHOIS record`,
      changeIds,
      triggeredAt: new Date(),
      acknowledged: false,
    });
  }
}

/**
 * Track WHOIS changes for a domain
 * This is the main function that orchestrates the tracking process
 */
export async function trackWhoisChanges(snapshot: WhoisSnapshot): Promise<{
  snapshotId: number;
  changes: WhoisChange[];
  alertsGenerated: number;
}> {
  // Create new snapshot
  const snapshotId = await createWhoisSnapshot(snapshot);

  // Get previous snapshot
  const snapshots = await db
    .select()
    .from(whoisHistory)
    .where(eq(whoisHistory.domain, snapshot.domain))
    .orderBy(desc(whoisHistory.snapshotDate))
    .limit(2);

  // If this is the first snapshot, no changes to detect
  if (snapshots.length < 2) {
    return {
      snapshotId,
      changes: [],
      alertsGenerated: 0,
    };
  }

  const currentSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];

  // Detect changes
  const changes = await compareSnapshots(previousSnapshot, currentSnapshot);

  // Record changes
  if (changes.length > 0) {
    await recordChanges(changes);

    // Generate alerts
    await generateAlerts(changes);
  }

  return {
    snapshotId,
    changes,
    alertsGenerated: changes.filter(
      (c) => c.severity === "critical" || c.isSuspicious,
    ).length,
  };
}

/**
 * Get recent changes for a domain
 */
export async function getRecentChanges(
  domain: string,
  days: number = 30,
): Promise<WhoisChangeRow[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await db
    .select()
    .from(whoisChanges)
    .where(
      and(
        eq(whoisChanges.domain, domain),
        gte(whoisChanges.changeDate, cutoffDate),
      ),
    )
    .orderBy(desc(whoisChanges.changeDate));
}

/**
 * Get unacknowledged alerts for a domain
 */
export async function getUnacknowledgedAlerts(
  domain?: string,
): Promise<WhoisAlertRow[]> {
  if (domain) {
    return await db
      .select()
      .from(whoisAlerts)
      .where(
        and(
          eq(whoisAlerts.domain, domain),
          eq(whoisAlerts.acknowledged, false),
        ),
      )
      .orderBy(desc(whoisAlerts.triggeredAt));
  }

  return await db
    .select()
    .from(whoisAlerts)
    .where(eq(whoisAlerts.acknowledged, false))
    .orderBy(desc(whoisAlerts.triggeredAt));
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: number,
  acknowledgedBy: string,
): Promise<void> {
  await db
    .update(whoisAlerts)
    .set({
      acknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedBy,
    })
    .where(eq(whoisAlerts.id, alertId));
}

/**
 * Compare two time periods for a domain
 */
export async function compareTimePeriods(
  domain: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  snapshots: WhoisHistoryRow[];
  changes: WhoisChangeRow[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    suspiciousChanges: number;
    ownershipChanges: number;
  };
}> {
  // Get snapshots in the time period
  const snapshots = await db
    .select()
    .from(whoisHistory)
    .where(
      and(
        eq(whoisHistory.domain, domain),
        gte(whoisHistory.snapshotDate, startDate),
        lte(whoisHistory.snapshotDate, endDate),
      ),
    )
    .orderBy(desc(whoisHistory.snapshotDate));

  // Get changes in the time period
  const changes = await db
    .select()
    .from(whoisChanges)
    .where(
      and(
        eq(whoisChanges.domain, domain),
        gte(whoisChanges.changeDate, startDate),
        lte(whoisChanges.changeDate, endDate),
      ),
    )
    .orderBy(desc(whoisChanges.changeDate));

  // Calculate summary
  const summary = {
    totalChanges: changes.length,
    criticalChanges: changes.filter((c) => c.severity === "critical").length,
    suspiciousChanges: changes.filter((c) => c.isSuspicious).length,
    ownershipChanges: changes.filter(
      (c) =>
        c.fieldName === "registrantEmail" ||
        c.fieldName === "registrantName" ||
        c.fieldName === "registrantOrganization",
    ).length,
  };

  return {
    snapshots,
    changes,
    summary,
  };
}
