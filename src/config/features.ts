/**
 * Feature Flags Configuration
 * 
 * Control which features are enabled/disabled in production.
 * Simply change the boolean values to turn features on/off.
 */

export const FEATURES = {
  /**
   * Leveling System (Gamification)
   * 
   * Controls:
   * - XP earning from actions
   * - Level progression
   * - Achievement unlocks
   * - Item/vehicle unlocks
   * - Discord toast notifications for gamification
   * - Profile XP/level display
   * - Leaderboard
   * 
   * Set to `false` to completely disable all gamification features.
   * Set to `true` to enable the full leveling system.
   */
  LEVELING_SYSTEM: false,

  /**
   * Toast Notifications
   * 
   * Controls Discord-style toast notifications for:
   * - System messages (errors, success, info)
   * - Scan failures
   * 
   * Note: If LEVELING_SYSTEM is disabled, only system toasts will show.
   * If LEVELING_SYSTEM is enabled, gamification toasts will also show.
   */
  TOAST_NOTIFICATIONS: true,

  /**
   * Analytics Tracking
   * 
   * Controls Google Analytics and custom event tracking.
   */
  ANALYTICS: true,
} as const;

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

/**
 * Helper function to check if leveling system is enabled
 */
export function isLevelingEnabled(): boolean {
  return FEATURES.LEVELING_SYSTEM;
}
