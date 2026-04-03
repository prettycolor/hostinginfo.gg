export interface WafRecommendationInput {
  wafDetected?: boolean;
  hostProvider?: string | null;
  wafConfidence?: number;
  corroborated?: boolean;
}

export function isManagedEdgeLikely(input: WafRecommendationInput): boolean {
  if (input.wafDetected) return true;
  if (!input.hostProvider) return false;

  const confidence = Number(input.wafConfidence ?? 0);
  if (input.corroborated) return true;
  if (Number.isFinite(confidence) && confidence >= 70) return true;

  return false;
}

export function shouldRecommendWaf(input: WafRecommendationInput): boolean {
  return !isManagedEdgeLikely(input);
}
