/**
 * Avatar System Configuration
 * 
 * Defines avatar rarity tiers, unlock requirements, and visual styling.
 */

export type AvatarRarity = 'default' | 'common' | 'rare' | 'epic' | 'legendary';

export interface Avatar {
  id: string;
  name: string;
  description: string;
  rarity: AvatarRarity;
  unlockLevel: number;
  imagePath: string;
  isUnlocked?: boolean;
  isCurrent?: boolean;
}

export interface AvatarRarityConfig {
  name: string;
  unlockLevel: number;
  borderColor: string;
  glowColor: string;
  textColor: string;
  bgColor: string;
  hasGlow: boolean;
  hasParticles: boolean;
}

/**
 * Rarity tier configuration
 */
export const RARITY_CONFIG: Record<AvatarRarity, AvatarRarityConfig> = {
  default: {
    name: 'Default',
    unlockLevel: 0,
    borderColor: '#6B7280', // gray-500
    glowColor: 'transparent',
    textColor: '#9CA3AF', // gray-400
    bgColor: '#1F2937', // gray-800
    hasGlow: false,
    hasParticles: false,
  },
  common: {
    name: 'Common',
    unlockLevel: 5,
    borderColor: '#10B981', // green-500
    glowColor: 'rgba(16, 185, 129, 0.3)',
    textColor: '#10B981',
    bgColor: '#064E3B', // green-900
    hasGlow: true,
    hasParticles: false,
  },
  rare: {
    name: 'Rare',
    unlockLevel: 10,
    borderColor: '#3B82F6', // blue-500
    glowColor: 'rgba(59, 130, 246, 0.4)',
    textColor: '#3B82F6',
    bgColor: '#1E3A8A', // blue-900
    hasGlow: true,
    hasParticles: false,
  },
  epic: {
    name: 'Epic',
    unlockLevel: 20,
    borderColor: '#A855F7', // purple-500
    glowColor: 'rgba(168, 85, 247, 0.5)',
    textColor: '#A855F7',
    bgColor: '#581C87', // purple-900
    hasGlow: true,
    hasParticles: false,
  },
  legendary: {
    name: 'Legendary',
    unlockLevel: 50,
    borderColor: '#F97316', // orange-500
    glowColor: 'rgba(249, 115, 22, 0.6)',
    textColor: '#F97316',
    bgColor: '#7C2D12', // orange-900
    hasGlow: true,
    hasParticles: true,
  },
};

/**
 * Get rarity config for an avatar
 */
export function getRarityConfig(rarity: AvatarRarity): AvatarRarityConfig {
  return RARITY_CONFIG[rarity];
}

/**
 * Get CSS classes for avatar rarity border
 */
export function getAvatarBorderClasses(rarity: AvatarRarity, isLocked: boolean = false): string {
  const config = RARITY_CONFIG[rarity];
  
  if (isLocked) {
    return 'border-2 border-gray-600 opacity-50 grayscale';
  }
  
  const baseClasses = 'border-2 transition-all duration-300';
  const glowClasses = config.hasGlow ? 'shadow-lg' : '';
  
  return `${baseClasses} ${glowClasses}`;
}

/**
 * Get inline styles for avatar rarity effects
 */
export function getAvatarStyles(rarity: AvatarRarity, isLocked: boolean = false): React.CSSProperties {
  if (isLocked) {
    return {
      borderColor: '#4B5563',
    };
  }
  
  const config = RARITY_CONFIG[rarity];
  
  return {
    borderColor: config.borderColor,
    boxShadow: config.hasGlow ? `0 0 20px ${config.glowColor}` : undefined,
  };
}

/**
 * Check if user can unlock avatar based on level
 */
export function canUnlockAvatar(userLevel: number, avatarUnlockLevel: number): boolean {
  return userLevel >= avatarUnlockLevel;
}

/**
 * Get avatars unlocked at a specific level
 */
export function getAvatarsUnlockedAtLevel(level: number): AvatarRarity[] {
  const unlockedRarities: AvatarRarity[] = [];
  
  for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
    if (config.unlockLevel === level) {
      unlockedRarities.push(rarity as AvatarRarity);
    }
  }
  
  return unlockedRarities;
}

/**
 * Get next unlock milestone for user
 */
export function getNextUnlockMilestone(userLevel: number): { level: number; rarity: AvatarRarity } | null {
  const sortedRarities = Object.entries(RARITY_CONFIG)
    .sort(([, a], [, b]) => a.unlockLevel - b.unlockLevel)
    .filter(([, config]) => config.unlockLevel > userLevel);
  
  if (sortedRarities.length === 0) {
    return null;
  }
  
  const [rarity, config] = sortedRarities[0];
  return {
    level: config.unlockLevel,
    rarity: rarity as AvatarRarity,
  };
}

/**
 * Format rarity name for display
 */
export function formatRarityName(rarity: AvatarRarity): string {
  return RARITY_CONFIG[rarity].name;
}
