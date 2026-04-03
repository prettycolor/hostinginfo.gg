/**
 * Intro Animation Manager
 *
 * Manages intro animation display with timestamp-based expiration.
 * Animations replay after 2 hours of inactivity.
 */

const INTRO_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours (120 minutes)

export interface IntroState {
  lastSeen: number;
  count: number;
}

/**
 * Check if intro should be shown based on timestamp
 * @param storageKey - The localStorage key for this intro
 * @returns true if intro should be shown
 */
export function shouldShowIntro(storageKey: string): boolean {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return true; // First time visit
    }

    const state: IntroState = JSON.parse(stored);
    const now = Date.now();
    const timeSinceLastSeen = now - state.lastSeen;

    // Show intro if more than 2 hours have passed
    return timeSinceLastSeen >= INTRO_EXPIRY_MS;
  } catch (error) {
    console.error("Error checking intro state:", error);
    return true; // Show intro on error (safe default)
  }
}

/**
 * Mark intro as seen with current timestamp
 * @param storageKey - The localStorage key for this intro
 */
export function markIntroSeen(storageKey: string): void {
  try {
    const stored = localStorage.getItem(storageKey);
    let state: IntroState;

    if (stored) {
      state = JSON.parse(stored);
      state.lastSeen = Date.now();
      state.count += 1;
    } else {
      state = {
        lastSeen: Date.now(),
        count: 1,
      };
    }

    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error("Error marking intro as seen:", error);
  }
}

/**
 * Get intro statistics
 * @param storageKey - The localStorage key for this intro
 * @returns Intro state or null if not found
 */
export function getIntroStats(storageKey: string): IntroState | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error getting intro stats:", error);
    return null;
  }
}

/**
 * Reset intro state (for testing)
 * @param storageKey - The localStorage key for this intro
 */
export function resetIntro(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Error resetting intro:", error);
  }
}

/**
 * Get time until next intro display
 * @param storageKey - The localStorage key for this intro
 * @returns Milliseconds until next intro, or 0 if should show now
 */
export function getTimeUntilNextIntro(storageKey: string): number {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    const state: IntroState = JSON.parse(stored);
    const now = Date.now();
    const timeSinceLastSeen = now - state.lastSeen;
    const timeRemaining = INTRO_EXPIRY_MS - timeSinceLastSeen;

    return Math.max(0, timeRemaining);
  } catch (error) {
    console.error("Error calculating time until next intro:", error);
    return 0;
  }
}

// Storage keys for different intros
export const INTRO_KEYS = {
  SITE: "hostinginfo_site_intro",
  DDC: "hostinginfo_ddc_intro",
} as const;
