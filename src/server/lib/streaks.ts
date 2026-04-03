const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY,
  );
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Computes streaks from scan timestamps.
 *
 * Current streak counts consecutive days up to today (or yesterday if no scan today).
 * Longest streak counts the longest historical consecutive-day run.
 */
export function computeStreakSummary(
  scanDates: Date[],
  now: Date = new Date(),
): StreakSummary {
  const dayNumbers = new Set<number>();

  for (const scanDate of scanDates) {
    if (!(scanDate instanceof Date) || Number.isNaN(scanDate.getTime())) {
      continue;
    }
    dayNumbers.add(toUtcDayNumber(scanDate));
  }

  if (dayNumbers.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDays = [...dayNumbers].sort((a, b) => b - a);
  let longestStreak = 1;
  let runLength = 1;

  for (let index = 1; index < sortedDays.length; index += 1) {
    const previous = sortedDays[index - 1];
    const current = sortedDays[index];

    if (previous - current === 1) {
      runLength += 1;
      if (runLength > longestStreak) {
        longestStreak = runLength;
      }
    } else {
      runLength = 1;
    }
  }

  const today = toUtcDayNumber(now);
  const yesterday = today - 1;
  const streakStart = dayNumbers.has(today)
    ? today
    : dayNumbers.has(yesterday)
      ? yesterday
      : null;

  if (streakStart === null) {
    return { currentStreak: 0, longestStreak };
  }

  let currentStreak = 0;
  let dayCursor = streakStart;
  while (dayNumbers.has(dayCursor)) {
    currentStreak += 1;
    dayCursor -= 1;
  }

  return { currentStreak, longestStreak };
}
