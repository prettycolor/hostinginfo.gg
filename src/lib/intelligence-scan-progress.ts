const FAST_SCAN_COMPLETION_PERCENT = 60;
const SLOW_SCAN_WEIGHT_PERCENT = 40;
const TOTAL_SLOW_SCANS = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateOverviewScanCompletion(
  hasResults: boolean,
  pendingSlowScans: number,
): number {
  if (!hasResults) {
    return 0;
  }

  const normalizedPending = clamp(Math.round(pendingSlowScans), 0, TOTAL_SLOW_SCANS);
  const completedSlow = TOTAL_SLOW_SCANS - normalizedPending;
  const targetCompletion =
    FAST_SCAN_COMPLETION_PERCENT + (completedSlow / TOTAL_SLOW_SCANS) * SLOW_SCAN_WEIGHT_PERCENT;

  return Math.round(clamp(targetCompletion, FAST_SCAN_COMPLETION_PERCENT, 100));
}

