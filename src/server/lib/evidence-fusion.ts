/**
 * Evidence Fusion Algorithm - Combine multiple data sources intelligently
 *
 * Features:
 * - Multi-source data aggregation
 * - Conflict resolution with weighted voting
 * - Confidence-based merging
 * - Source reliability tracking
 */

import {
  calculateConfidence,
  createSignal,
  type EvidenceSignal,
  type ConfidenceResult,
} from "./confidence-scorer.js";

export interface DataSource {
  name: string;
  reliability: number; // 0-100, how trustworthy this source is
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface FusedResult<T = Record<string, unknown>> {
  data: T;
  confidence: ConfidenceResult;
  sources: string[]; // Which sources contributed
  conflicts: Array<{
    field: string;
    values: Array<{ value: unknown; source: string; weight: number }>;
    resolution: "majority" | "highest_confidence" | "most_recent" | "manual";
  }>;
}

/**
 * Fuse multiple data sources into a single result
 */
export function fuseDataSources<T extends Record<string, unknown>>(
  sources: DataSource[],
  options: {
    preferRecent?: boolean; // Prefer newer data
    requireConsensus?: boolean; // Require multiple sources to agree
    conflictResolution?: "majority" | "highest_confidence" | "most_recent";
  } = {},
): FusedResult<T> {
  const {
    preferRecent = true,
    requireConsensus = false,
    conflictResolution = "highest_confidence",
  } = options;

  if (sources.length === 0) {
    return {
      data: {} as T,
      confidence: {
        score: 0,
        level: "very_low",
        signals: [],
        conflicts: [],
        staleness: 0,
      },
      sources: [],
      conflicts: [],
    };
  }

  // Single source - no fusion needed
  if (sources.length === 1) {
    const source = sources[0];
    const signals = Object.keys(source.data).map((key) =>
      createSignal(
        "tech",
        String(source.data[key]),
        source.reliability,
        source.name,
        source.timestamp,
      ),
    );

    return {
      data: source.data as T,
      confidence: calculateConfidence(signals),
      sources: [source.name],
      conflicts: [],
    };
  }

  // Multi-source fusion
  const fusedData: Record<string, unknown> = {};
  const allFields = new Set<string>();
  const conflicts: FusedResult["conflicts"] = [];
  const signals: EvidenceSignal[] = [];
  const contributingSources = new Set<string>();

  // Collect all unique fields
  sources.forEach((source) => {
    Object.keys(source.data).forEach((field) => allFields.add(field));
  });

  // Process each field
  allFields.forEach((field) => {
    const fieldValues: Array<{ value: unknown; source: DataSource }> = [];

    // Collect values from all sources
    sources.forEach((source) => {
      if (field in source.data && source.data[field] != null) {
        fieldValues.push({ value: source.data[field], source });
      }
    });

    if (fieldValues.length === 0) {
      return; // No data for this field
    }

    if (fieldValues.length === 1) {
      // Single source for this field
      const { value, source } = fieldValues[0];
      fusedData[field] = value;
      contributingSources.add(source.name);
      signals.push(
        createSignal(
          "tech",
          String(value),
          source.reliability,
          source.name,
          source.timestamp,
        ),
      );
      return;
    }

    // Multiple sources - check for conflicts
    const uniqueValues = new Set(
      fieldValues.map((fv) => JSON.stringify(fv.value)),
    );

    if (uniqueValues.size === 1) {
      // All sources agree
      const { value } = fieldValues[0];
      fusedData[field] = value;
      fieldValues.forEach((fv) => {
        contributingSources.add(fv.source.name);
        signals.push(
          createSignal(
            "tech",
            String(value),
            fv.source.reliability,
            fv.source.name,
            fv.source.timestamp,
          ),
        );
      });
    } else {
      // Conflict detected - resolve
      const resolution = resolveConflict(
        fieldValues,
        conflictResolution,
        preferRecent,
      );
      fusedData[field] = resolution.value;
      contributingSources.add(resolution.source.name);

      conflicts.push({
        field,
        values: fieldValues.map((fv) => ({
          value: fv.value,
          source: fv.source.name,
          weight: fv.source.reliability,
        })),
        resolution: conflictResolution,
      });

      // Add signal for resolved value
      signals.push(
        createSignal(
          "tech",
          String(resolution.value),
          resolution.source.reliability,
          resolution.source.name,
          resolution.source.timestamp,
        ),
      );
    }
  });

  // Calculate overall confidence
  const confidence = calculateConfidence(signals);

  // Apply consensus penalty if required
  if (requireConsensus && sources.length > 1) {
    const consensusRatio = (sources.length - conflicts.length) / sources.length;
    confidence.score = Math.round(confidence.score * consensusRatio);
  }

  return {
    data: fusedData as T,
    confidence,
    sources: Array.from(contributingSources),
    conflicts,
  };
}

/**
 * Resolve conflict between multiple values
 */
function resolveConflict(
  fieldValues: Array<{ value: unknown; source: DataSource }>,
  strategy: "majority" | "highest_confidence" | "most_recent",
  _preferRecent: boolean,
): { value: unknown; source: DataSource } {
  switch (strategy) {
    case "majority": {
      // Count occurrences of each value
      const valueCounts = new Map<
        string,
        { count: number; example: { value: unknown; source: DataSource } }
      >();
      fieldValues.forEach((fv) => {
        const key = JSON.stringify(fv.value);
        const existing = valueCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          valueCounts.set(key, { count: 1, example: fv });
        }
      });

      // Find most common value
      let maxCount = 0;
      let winner = fieldValues[0];
      valueCounts.forEach((data) => {
        if (data.count > maxCount) {
          maxCount = data.count;
          winner = data.example;
        }
      });
      return winner;
    }

    case "highest_confidence": {
      // Choose value from most reliable source
      return fieldValues.reduce((best, current) =>
        current.source.reliability > best.source.reliability ? current : best,
      );
    }

    case "most_recent": {
      // Choose most recent value
      return fieldValues.reduce((best, current) =>
        current.source.timestamp > best.source.timestamp ? current : best,
      );
    }

    default:
      return fieldValues[0];
  }
}

/**
 * Fuse hosting attribution data from multiple sources
 */
export function fuseHostingData(sources: {
  dns?: { provider: string; confidence: number; timestamp: Date };
  ip?: { provider: string; confidence: number; timestamp: Date };
  tech?: { provider: string; confidence: number; timestamp: Date };
  whois?: { provider: string; confidence: number; timestamp: Date };
}): {
  edgeProvider: string | null;
  originProvider: string | null;
  confidence: number;
  sources: string[];
} {
  const dataSources: DataSource[] = [];

  // Convert to DataSource format
  if (sources.dns) {
    dataSources.push({
      name: "dns",
      reliability: sources.dns.confidence,
      timestamp: sources.dns.timestamp,
      data: { edge: sources.dns.provider },
    });
  }

  if (sources.ip) {
    dataSources.push({
      name: "ip",
      reliability: sources.ip.confidence,
      timestamp: sources.ip.timestamp,
      data: { origin: sources.ip.provider },
    });
  }

  if (sources.tech) {
    dataSources.push({
      name: "tech",
      reliability: sources.tech.confidence,
      timestamp: sources.tech.timestamp,
      data: { origin: sources.tech.provider },
    });
  }

  if (sources.whois) {
    dataSources.push({
      name: "whois",
      reliability: sources.whois.confidence,
      timestamp: sources.whois.timestamp,
      data: { origin: sources.whois.provider },
    });
  }

  const fused = fuseDataSources<{ edge?: string; origin?: string }>(
    dataSources,
    {
      conflictResolution: "highest_confidence",
      preferRecent: true,
    },
  );

  return {
    edgeProvider: fused.data.edge || null,
    originProvider: fused.data.origin || null,
    confidence: fused.confidence.score,
    sources: fused.sources,
  };
}
