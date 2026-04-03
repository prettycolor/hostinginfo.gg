/**
 * Confidence Scorer - Calculate confidence scores for intelligence data
 * 
 * Features:
 * - Multi-signal confidence scoring
 * - Weighted evidence aggregation
 * - Time-decay for stale data
 * - Conflict resolution
 */

export interface EvidenceSignal {
  type: 'dns' | 'ip' | 'http' | 'tech' | 'whois' | 'cert';
  value: string;
  weight: number; // 0-100
  timestamp: Date;
  source: string; // Where this signal came from
}

export interface ConfidenceResult {
  score: number; // 0-100
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  signals: EvidenceSignal[];
  conflicts: string[]; // Conflicting signals
  staleness: number; // Days since last update
}

/**
 * Calculate confidence score from multiple evidence signals
 */
export function calculateConfidence(signals: EvidenceSignal[]): ConfidenceResult {
  if (signals.length === 0) {
    return {
      score: 0,
      level: 'very_low',
      signals: [],
      conflicts: [],
      staleness: 0,
    };
  }

  // Apply time decay to weights
  const decayedSignals = signals.map((signal) => ({
    ...signal,
    weight: applyTimeDecay(signal.weight, signal.timestamp),
  }));

  // Detect conflicts
  const conflicts = detectConflicts(decayedSignals);

  // Calculate weighted average
  const totalWeight = decayedSignals.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = decayedSignals.reduce((sum, s) => sum + s.weight * s.weight, 0);
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Apply conflict penalty
  const conflictPenalty = conflicts.length * 10; // -10% per conflict
  const finalScore = Math.max(0, Math.min(100, rawScore - conflictPenalty));

  // Calculate staleness
  const oldestSignal = decayedSignals.reduce(
    (oldest, s) => (s.timestamp < oldest ? s.timestamp : oldest),
    new Date()
  );
  const staleness = Math.floor(
    (Date.now() - oldestSignal.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    score: Math.round(finalScore),
    level: getConfidenceLevel(finalScore),
    signals: decayedSignals,
    conflicts,
    staleness,
  };
}

/**
 * Apply time decay to signal weight
 * - 0-7 days: 100% weight
 * - 7-30 days: Linear decay to 80%
 * - 30-90 days: Linear decay to 50%
 * - 90+ days: 50% weight (minimum)
 */
function applyTimeDecay(weight: number, timestamp: Date): number {
  const ageInDays = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 7) {
    return weight; // No decay
  } else if (ageInDays <= 30) {
    const decayFactor = 1 - (ageInDays - 7) * 0.01; // 1% per day
    return weight * Math.max(0.8, decayFactor);
  } else if (ageInDays <= 90) {
    const decayFactor = 0.8 - ((ageInDays - 30) / 60) * 0.3; // Decay to 50%
    return weight * Math.max(0.5, decayFactor);
  } else {
    return weight * 0.5; // Minimum 50% weight
  }
}

/**
 * Detect conflicting signals
 */
function detectConflicts(signals: EvidenceSignal[]): string[] {
  const conflicts: string[] = [];
  const signalsByType = new Map<string, EvidenceSignal[]>();

  // Group signals by type
  signals.forEach((signal) => {
    const key = signal.type;
    if (!signalsByType.has(key)) {
      signalsByType.set(key, []);
    }
    signalsByType.get(key)!.push(signal);
  });

  // Check for conflicts within each type
  signalsByType.forEach((typeSignals, type) => {
    const uniqueValues = new Set(typeSignals.map((s) => s.value));
    if (uniqueValues.size > 1) {
      conflicts.push(
        `Conflicting ${type} signals: ${Array.from(uniqueValues).join(', ')}`
      );
    }
  });

  return conflicts;
}

/**
 * Convert numeric score to confidence level
 */
function getConfidenceLevel(
  score: number
): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 90) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

/**
 * Merge multiple confidence results (for multi-source data)
 */
export function mergeConfidenceResults(
  results: ConfidenceResult[]
): ConfidenceResult {
  if (results.length === 0) {
    return {
      score: 0,
      level: 'very_low',
      signals: [],
      conflicts: [],
      staleness: 0,
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  // Combine all signals
  const allSignals = results.flatMap((r) => r.signals);
  const allConflicts = [...new Set(results.flatMap((r) => r.conflicts))];

  // Recalculate confidence from combined signals
  const merged = calculateConfidence(allSignals);

  return {
    ...merged,
    conflicts: allConflicts,
  };
}

/**
 * Create evidence signal helper
 */
export function createSignal(
  type: EvidenceSignal['type'],
  value: string,
  weight: number,
  source: string,
  timestamp?: Date
): EvidenceSignal {
  return {
    type,
    value,
    weight: Math.max(0, Math.min(100, weight)), // Clamp 0-100
    timestamp: timestamp || new Date(),
    source,
  };
}

/**
 * Calculate confidence for hosting attribution
 */
export function calculateHostingConfidence(evidence: {
  dnsSignals: EvidenceSignal[];
  ipSignals: EvidenceSignal[];
  techSignals: EvidenceSignal[];
}): {
  overall: number;
  edgeConfidence: number;
  originConfidence: number;
} {
  // DNS signals are most reliable for edge detection (CDN)
  const dnsConfidence = calculateConfidence(evidence.dnsSignals);

  // IP + Tech signals are best for origin detection
  const originSignals = [...evidence.ipSignals, ...evidence.techSignals];
  const originConfidence = calculateConfidence(originSignals);

  // Overall confidence is weighted average
  const overall = Math.round((dnsConfidence.score * 0.6 + originConfidence.score * 0.4));

  return {
    overall,
    edgeConfidence: dnsConfidence.score,
    originConfidence: originConfidence.score,
  };
}
