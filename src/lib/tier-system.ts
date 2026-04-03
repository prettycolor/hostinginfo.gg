/**
 * Tier-Based Avatar Unlock System
 * 
 * This module provides the core logic for the tier progression system.
 * Users unlock new avatar tiers as they level up.
 */

export type TierName = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface TierConfig {
  name: TierName;
  minLevel: number;
  maxLevel: number;
  borderColor: string;
  glowColor: string;
  label: string;
  unlockLevel: number;
  description: string;
}

/**
 * Tier Configuration
 * Defines the 5-tier progression system with level ranges and visual styling
 */
export const TIERS: Record<TierName, TierConfig> = {
  common: {
    name: 'common',
    minLevel: 1,
    maxLevel: 9,
    borderColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    label: 'Common',
    unlockLevel: 1,
    description: 'Starting tier - available to all users'
  },
  uncommon: {
    name: 'uncommon',
    minLevel: 10,
    maxLevel: 24,
    borderColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    label: 'Uncommon',
    unlockLevel: 10,
    description: 'Unlock at level 10 - first milestone'
  },
  rare: {
    name: 'rare',
    minLevel: 25,
    maxLevel: 49,
    borderColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    label: 'Rare',
    unlockLevel: 25,
    description: 'Unlock at level 25 - prestige marker'
  },
  epic: {
    name: 'epic',
    minLevel: 50,
    maxLevel: 99,
    borderColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    label: 'Epic',
    unlockLevel: 50,
    description: 'Unlock at level 50 - elite status'
  },
  legendary: {
    name: 'legendary',
    minLevel: 100,
    maxLevel: 999,
    borderColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    label: 'Legendary',
    unlockLevel: 100,
    description: 'Unlock at level 100 - master status'
  }
};

/**
 * Get the user's current tier based on their level
 * @param level - User's current level
 * @returns TierConfig for the user's current tier
 */
export function getUserTier(level: number): TierConfig {
  if (level >= 100) return TIERS.legendary;
  if (level >= 50) return TIERS.epic;
  if (level >= 25) return TIERS.rare;
  if (level >= 10) return TIERS.uncommon;
  return TIERS.common;
}

/**
 * Get all tiers that are unlocked for the user
 * @param level - User's current level
 * @returns Array of unlocked tier names
 */
export function getUnlockedTiers(level: number): TierName[] {
  const tiers: TierName[] = ['common'];
  if (level >= 10) tiers.push('uncommon');
  if (level >= 25) tiers.push('rare');
  if (level >= 50) tiers.push('epic');
  if (level >= 100) tiers.push('legendary');
  return tiers;
}

/**
 * Get information about the next tier to unlock
 * @param level - User's current level
 * @returns Next tier info with levels needed, or null if at max tier
 */
export function getNextTierInfo(level: number): { tier: TierConfig; levelsNeeded: number } | null {
  if (level >= 100) return null; // Max tier reached
  if (level >= 50) return { tier: TIERS.legendary, levelsNeeded: 100 - level };
  if (level >= 25) return { tier: TIERS.epic, levelsNeeded: 50 - level };
  if (level >= 10) return { tier: TIERS.rare, levelsNeeded: 25 - level };
  return { tier: TIERS.uncommon, levelsNeeded: 10 - level };
}

/**
 * Calculate progress percentage to next tier
 * @param level - User's current level
 * @returns Progress percentage (0-100)
 */
export function getTierProgress(level: number): number {
  const currentTier = getUserTier(level);
  const nextTierInfo = getNextTierInfo(level);
  
  if (!nextTierInfo) return 100; // Max tier
  
  const levelsInCurrentTier = nextTierInfo.tier.unlockLevel - currentTier.unlockLevel;
  const levelsCompleted = level - currentTier.unlockLevel;
  
  return Math.round((levelsCompleted / levelsInCurrentTier) * 100);
}

/**
 * Check if a specific tier is unlocked
 * @param userLevel - User's current level
 * @param tierName - Tier to check
 * @returns true if tier is unlocked
 */
export function isTierUnlocked(userLevel: number, tierName: TierName): boolean {
  return userLevel >= TIERS[tierName].unlockLevel;
}

/**
 * Get all tiers in order
 * @returns Array of all tier configs in unlock order
 */
export function getAllTiers(): TierConfig[] {
  return [
    TIERS.common,
    TIERS.uncommon,
    TIERS.rare,
    TIERS.epic,
    TIERS.legendary
  ];
}

/**
 * Get tier by name
 * @param tierName - Name of the tier
 * @returns TierConfig for the specified tier
 */
export function getTierByName(tierName: TierName): TierConfig {
  return TIERS[tierName];
}

/**
 * Get CSS classes for tier border styling
 * @param tierName - Name of the tier
 * @returns Object with CSS properties for tier styling
 */
export function getTierStyles(tierName: TierName): {
  borderColor: string;
  boxShadow: string;
  animation?: string;
} {
  const tier = TIERS[tierName];
  
  return {
    borderColor: tier.borderColor,
    boxShadow: `0 0 ${tierName === 'legendary' ? '16px' : '12px'} ${tier.glowColor}`,
    ...(tierName === 'legendary' && {
      animation: 'legendary-pulse 2s ease-in-out infinite'
    })
  };
}

/**
 * Get Tailwind CSS classes for tier badge
 * @param tierName - Name of the tier
 * @returns Tailwind classes for badge styling
 */
export function getTierBadgeClasses(tierName: TierName): string {
  const baseClasses = 'text-xs font-medium px-2 py-1 rounded-full';
  
  const tierClasses: Record<TierName, string> = {
    common: 'bg-green-500/10 text-green-500',
    uncommon: 'bg-blue-500/10 text-blue-500',
    rare: 'bg-purple-500/10 text-purple-500',
    epic: 'bg-red-500/10 text-red-500',
    legendary: 'bg-orange-500/10 text-orange-500'
  };
  
  return `${baseClasses} ${tierClasses[tierName]}`;
}

/**
 * Get total number of avatars unlocked at a given level
 * @param level - User's current level
 * @returns Number of avatars unlocked (15 per tier)
 */
export function getUnlockedAvatarCount(level: number): number {
  return getUnlockedTiers(level).length * 15;
}

/**
 * Get total number of avatars available
 * @returns Total avatar count (75)
 */
export function getTotalAvatarCount(): number {
  return 75;
}
