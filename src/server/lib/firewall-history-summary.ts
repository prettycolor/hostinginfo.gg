import type { FirewallHistorySummary } from "./firewall-intelligence.js";

type JsonRecord = Record<string, unknown>;

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function isEnhancedWafRecord(record: JsonRecord): boolean {
  return (
    Boolean(toStringValue(record.sourceVersion)) ||
    Array.isArray(record.evidenceDetails)
  );
}

function isDetectedWafRecord(record: JsonRecord): boolean {
  if (toBoolean(record.detected)) return true;
  return Boolean(toStringValue(record.provider));
}

export function buildWafHistorySummaryFromRecords(
  records: Array<{ waf: JsonRecord; createdAt: string }>,
): FirewallHistorySummary {
  const enhancedRecords = records.filter(({ waf }) => isEnhancedWafRecord(waf));
  const sampleSize = enhancedRecords.length;

  if (sampleSize === 0) {
    return {
      sampleSize: 0,
      detectionRate: 0,
      managedEdgeRate: 0,
      lastDetectedAt: null,
    };
  }

  const detectedRecords = enhancedRecords.filter(({ waf }) =>
    isDetectedWafRecord(waf),
  );
  const managedEdgeRecords = enhancedRecords.filter(({ waf }) =>
    Boolean(toStringValue(waf.hostProvider)),
  );

  return {
    sampleSize,
    detectionRate: Math.round((detectedRecords.length / sampleSize) * 100),
    managedEdgeRate: Math.round((managedEdgeRecords.length / sampleSize) * 100),
    lastDetectedAt: detectedRecords[0]?.createdAt ?? null,
  };
}
