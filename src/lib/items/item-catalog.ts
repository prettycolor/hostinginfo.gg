/**
 * Item Catalog - All available items in the game
 * 
 * Items are unlocked through:
 * - Level progression
 * - Achievements
 * - Scan milestones
 * - Domain verification
 * - Special events
 */

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'chest' | 'badge' | 'crystal' | 'knight' | 'weapon' | 'armor' | 'consumable' | 'avatar' | 'decoration' | 'vehicle';

export interface ItemEffect {
  xpBoost?: number; // Multiplier (1.1 = 10% boost)
  scanSpeedBoost?: number;
  unlockBonus?: number;
  prestigePoints?: number;
}

export interface UnlockCondition {
  scansRequired?: number;
  domainsVerified?: number;
  achievementsCompleted?: number;
  consecutiveDays?: number;
  totalXP?: number;
  specificAchievement?: string;
}

export interface Item {
  itemKey: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: ItemRarity;
  category: ItemCategory;
  levelRequired: number;
  xpRequired?: number;
  achievementRequired?: string;
  unlockConditions?: UnlockCondition;
  effects?: ItemEffect;
  sortOrder: number;
  isActive: boolean;
}

// Rarity color schemes
export const RARITY_COLORS: Record<ItemRarity, { gradient: string; border: string; glow: string }> = {
  common: {
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-400',
    glow: 'shadow-slate-500/50',
  },
  uncommon: {
    gradient: 'from-green-500 to-emerald-700',
    border: 'border-green-400',
    glow: 'shadow-green-500/50',
  },
  rare: {
    gradient: 'from-blue-500 to-cyan-700',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50',
  },
  epic: {
    gradient: 'from-purple-500 to-pink-700',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50',
  },
  legendary: {
    gradient: 'from-amber-500 to-yellow-700',
    border: 'border-amber-400',
    glow: 'shadow-amber-500/50',
  },
};

// Item catalog with your provided assets
export const ITEM_CATALOG: Item[] = [
  // ===== STARTER ITEMS (Level 1-5) =====
  {
    itemKey: 'wooden_chest_basic',
    name: 'Wooden Chest',
    description: 'A simple wooden chest. Your first reward for joining HostingInfo!',
    imageUrl: '/assets/placeholder.png
    rarity: 'common',
    category: 'chest',
    levelRequired: 1,
    xpRequired: 0,
    unlockConditions: {
      scansRequired: 1, // First scan unlocks this
    },
    sortOrder: 1,
    isActive: true,
  },
  {
    itemKey: 'bronze_badge_starter',
    name: 'Bronze Scanner Badge',
    description: 'Your first badge as a domain scanner. Awarded for completing 5 scans.',
    imageUrl: '/assets/placeholder.png
    rarity: 'common',
    category: 'badge',
    levelRequired: 2,
    xpRequired: 100,
    unlockConditions: {
      scansRequired: 5,
    },
    sortOrder: 2,
    isActive: true,
  },

  // ===== UNCOMMON ITEMS (Level 5-15) =====
  {
    itemKey: 'silver_chest_explorer',
    name: 'Silver Explorer Chest',
    description: 'A sturdy silver chest for dedicated explorers. Unlocked at level 5.',
    imageUrl: '/assets/placeholder.png
    rarity: 'uncommon',
    category: 'chest',
    levelRequired: 5,
    xpRequired: 500,
    unlockConditions: {
      scansRequired: 10,
      domainsVerified: 1,
    },
    effects: {
      xpBoost: 1.05, // 5% XP boost
    },
    sortOrder: 10,
    isActive: true,
  },
  {
    itemKey: 'emerald_crystal_energy',
    name: 'Emerald Energy Crystal',
    description: 'A glowing emerald crystal pulsing with energy. Grants a small XP boost.',
    imageUrl: '/assets/placeholder.png
    rarity: 'uncommon',
    category: 'crystal',
    levelRequired: 8,
    xpRequired: 800,
    unlockConditions: {
      scansRequired: 20,
      totalXP: 800,
    },
    effects: {
      xpBoost: 1.1, // 10% XP boost
    },
    sortOrder: 11,
    isActive: true,
  },

  // ===== RARE ITEMS (Level 15-30) =====
  {
    itemKey: 'sapphire_badge_master',
    name: 'Sapphire Master Badge',
    description: 'A prestigious sapphire badge for master scanners. Awarded for 50 scans.',
    imageUrl: 'https://media.gettyimages.com/id/2156027933/photo/open-treasure-chest-map-location-guide-paper-scroll-game-ui-assets-3d-icon-illustration.jpg?b=1&s=2048x2048&w=0&k=20&c=Np0mBofu7rgOXrQfVuoTEWAciLbJRLrShF5k4wpMAd4=',
    rarity: 'rare',
    category: 'badge',
    levelRequired: 15,
    xpRequired: 2000,
    unlockConditions: {
      scansRequired: 50,
      achievementsCompleted: 5,
    },
    effects: {
      xpBoost: 1.15, // 15% XP boost
      prestigePoints: 10,
    },
    sortOrder: 20,
    isActive: true,
  },
  {
    itemKey: 'golden_chest_treasure',
    name: 'Golden Treasure Chest',
    description: 'A magnificent golden chest overflowing with rewards. For true treasure hunters.',
    imageUrl: 'https://media.gettyimages.com/id/1256293492/photo/opened-pirate-chest-with-golden-coins-isolated-on-black-3d-rendering.jpg?b=1&s=2048x2048&w=0&k=20&c=1QecKbLa_ljKvDmdqa-HrFvYiA7H5hZLTYj2x9P5XA0=',
    rarity: 'rare',
    category: 'chest',
    levelRequired: 20,
    xpRequired: 3000,
    unlockConditions: {
      scansRequired: 75,
      domainsVerified: 3,
      consecutiveDays: 7,
    },
    effects: {
      xpBoost: 1.2, // 20% XP boost
      unlockBonus: 50,
    },
    sortOrder: 21,
    isActive: true,
  },

  // ===== EPIC ITEMS (Level 30-50) =====
  {
    itemKey: 'amethyst_crystal_mystic',
    name: 'Mystic Amethyst Crystal',
    description: 'A rare mystic crystal radiating purple energy. Significantly boosts XP gains.',
    imageUrl: 'https://media.gettyimages.com/id/2244168554/photo/treasure-box-icon-3d-rendering-element.jpg?b=1&s=2048x2048&w=0&k=20&c=UwHwtfq8Nj4al4LzeMk2DS1GgYVRR1SVM6oL3ArnSxI=',
    rarity: 'epic',
    category: 'crystal',
    levelRequired: 30,
    xpRequired: 5000,
    unlockConditions: {
      scansRequired: 100,
      achievementsCompleted: 10,
      totalXP: 5000,
    },
    effects: {
      xpBoost: 1.25, // 25% XP boost
      scanSpeedBoost: 1.1,
    },
    sortOrder: 30,
    isActive: true,
  },
  {
    itemKey: 'platinum_chest_legendary',
    name: 'Platinum Legendary Chest',
    description: 'An ultra-rare platinum chest. Only the most dedicated scanners can unlock this.',
    imageUrl: 'https://media.gettyimages.com/id/2206777560/photo/locked-wooden-treasure-chest.jpg?b=1&s=2048x2048&w=0&k=20&c=IWCgNSCv34DbJzBJX4APYTc9lnhwkKwmiD59k5KlzA4=',
    rarity: 'epic',
    category: 'chest',
    levelRequired: 40,
    xpRequired: 8000,
    unlockConditions: {
      scansRequired: 150,
      domainsVerified: 5,
      consecutiveDays: 14,
    },
    effects: {
      xpBoost: 1.3, // 30% XP boost
      unlockBonus: 100,
      prestigePoints: 25,
    },
    sortOrder: 31,
    isActive: true,
  },

  // ===== LEGENDARY ITEMS (Level 50+) =====
  {
    itemKey: 'diamond_crystal_ultimate',
    name: 'Ultimate Diamond Crystal',
    description: 'The rarest crystal in existence. Grants massive bonuses to all activities.',
    imageUrl: 'https://media.gettyimages.com/id/2206535673/photo/chest-with-treasures-on-sand.jpg?b=1&s=2048x2048&w=0&k=20&c=lZVczkb1VlMVNhXSLY6S7yB2-JVvDQu0sWi1BukCnp0=',
    rarity: 'legendary',
    category: 'crystal',
    levelRequired: 50,
    xpRequired: 15000,
    achievementRequired: 'legendary_scanner',
    unlockConditions: {
      scansRequired: 250,
      domainsVerified: 10,
      achievementsCompleted: 20,
      consecutiveDays: 30,
      totalXP: 15000,
    },
    effects: {
      xpBoost: 1.5, // 50% XP boost
      scanSpeedBoost: 1.25,
      unlockBonus: 200,
      prestigePoints: 50,
    },
    sortOrder: 50,
    isActive: true,
  },
  {
    itemKey: 'mythic_chest_eternal',
    name: 'Eternal Mythic Chest',
    description: 'The ultimate treasure. A legendary chest that only the greatest masters can obtain.',
    imageUrl: 'https://media.gettyimages.com/id/2222387478/photo/close-up-of-vintage-chest-and-weathered-journal.jpg?b=1&s=2048x2048&w=0&k=20&c=P7X7CQvTw67jaVimrd2K6kDQJg2nT8lhTuwWrrqztC0=',
    rarity: 'legendary',
    category: 'chest',
    levelRequired: 75,
    xpRequired: 25000,
    achievementRequired: 'grand_master',
    unlockConditions: {
      scansRequired: 500,
      domainsVerified: 20,
      achievementsCompleted: 30,
      consecutiveDays: 60,
      totalXP: 25000,
    },
    effects: {
      xpBoost: 2.0, // 100% XP boost (double XP!)
      scanSpeedBoost: 1.5,
      unlockBonus: 500,
      prestigePoints: 100,
    },
    sortOrder: 51,
    isActive: true,
  },

  // ===== SPECIAL HOSTINGINFO ASSETS =====
  {
    itemKey: 'fox_mascot_badge',
    name: 'Fox Mascot Badge',
    description: 'The official HostingInfo fox mascot badge. A symbol of cunning and technical prowess.',
    imageUrl: '/assets/placeholder.png
    rarity: 'rare',
    category: 'badge',
    levelRequired: 20,
    xpRequired: 3000,
    unlockConditions: {
      scansRequired: 75,
      achievementsCompleted: 8,
    },
    effects: {
      xpBoost: 1.15, // 15% XP boost
      prestigePoints: 15,
    },
    sortOrder: 52,
    isActive: true,
  },
  {
    itemKey: 'g_dollar_currency',
    name: 'G-Dollar Token',
    description: 'The legendary G-Dollar currency token. A rare collectible for elite members.',
    imageUrl: '/assets/placeholder.png
    rarity: 'epic',
    category: 'decoration',
    levelRequired: 35,
    xpRequired: 8000,
    unlockConditions: {
      scansRequired: 150,
      domainsVerified: 5,
      achievementsCompleted: 15,
    },
    effects: {
      xpBoost: 1.25, // 25% XP boost
      unlockBonus: 50,
      prestigePoints: 25,
    },
    sortOrder: 53,
    isActive: true,
  },
  {
    itemKey: 'dance_celebration_emote',
    name: 'Victory Dance Emote',
    description: 'Celebrate your achievements with this exclusive dance animation! Unlocked for reaching level 25.',
    imageUrl: '/assets/placeholder.png
    rarity: 'uncommon',
    category: 'avatar',
    levelRequired: 25,
    xpRequired: 4000,
    achievementRequired: 'reach_level_25',
    unlockConditions: {
      scansRequired: 100,
      achievementsCompleted: 10,
    },
    effects: {
      xpBoost: 1.1, // 10% XP boost
    },
    sortOrder: 54,
    isActive: true,
  },
  {
    itemKey: 'hostinginfo_master_badge',
    name: 'HostingInfo Master Badge',
    description: 'The ultimate HostingInfo badge. Only the most dedicated masters can earn this prestigious honor.',
    imageUrl: '/assets/placeholder.png
    rarity: 'legendary',
    category: 'badge',
    levelRequired: 80,
    xpRequired: 30000,
    achievementRequired: 'ultimate_master',
    unlockConditions: {
      scansRequired: 600,
      domainsVerified: 25,
      achievementsCompleted: 35,
      consecutiveDays: 90,
      totalXP: 30000,
    },
    effects: {
      xpBoost: 2.0, // 100% XP boost (double XP!)
      scanSpeedBoost: 1.5,
      unlockBonus: 500,
      prestigePoints: 150,
    },
    sortOrder: 55,
    isActive: true,
  },

  // ===== KNIGHTS & WARRIORS - COLLECTIBLE CHARACTERS =====
  {
    itemKey: 'bronze_knight',
    name: 'Bronze Knight',
    description: 'A valiant bronze knight ready to defend your domains. Your first warrior companion.',
    imageUrl: '/assets/placeholder.png
    rarity: 'common',
    category: 'knight',
    levelRequired: 3,
    xpRequired: 200,
    unlockConditions: {
      scansRequired: 10,
    },
    effects: {
      xpBoost: 1.05, // 5% XP boost
    },
    sortOrder: 60,
    isActive: true,
  },
  {
    itemKey: 'silver_warrior',
    name: 'Silver Warrior',
    description: 'A skilled silver warrior with enhanced combat abilities. Protects your digital assets.',
    imageUrl: '/assets/placeholder.png
    rarity: 'uncommon',
    category: 'knight',
    levelRequired: 12,
    xpRequired: 1500,
    unlockConditions: {
      scansRequired: 30,
      achievementsCompleted: 4,
    },
    effects: {
      xpBoost: 1.1, // 10% XP boost
      scanSpeedBoost: 1.05,
    },
    sortOrder: 61,
    isActive: true,
  },
  {
    itemKey: 'golden_champion',
    name: 'Golden Champion',
    description: 'A legendary golden champion. Elite warrior with exceptional domain protection powers.',
    imageUrl: '/assets/placeholder.png
    rarity: 'rare',
    category: 'knight',
    levelRequired: 25,
    xpRequired: 4500,
    unlockConditions: {
      scansRequired: 80,
      domainsVerified: 2,
      achievementsCompleted: 8,
    },
    effects: {
      xpBoost: 1.2, // 20% XP boost
      scanSpeedBoost: 1.15,
      prestigePoints: 15,
    },
    sortOrder: 62,
    isActive: true,
  },
  {
    itemKey: 'platinum_guardian',
    name: 'Platinum Guardian',
    description: 'The ultimate guardian warrior. A mythical protector of the highest security domains.',
    imageUrl: '/assets/placeholder.png
    rarity: 'epic',
    category: 'knight',
    levelRequired: 45,
    xpRequired: 10000,
    unlockConditions: {
      scansRequired: 200,
      domainsVerified: 8,
      achievementsCompleted: 18,
      consecutiveDays: 21,
    },
    effects: {
      xpBoost: 1.3, // 30% XP boost
      scanSpeedBoost: 1.25,
      unlockBonus: 75,
      prestigePoints: 35,
    },
    sortOrder: 63,
    isActive: true,
  },

  // ===== VEHICLES - UNLOCKABLE TRANSPORTATION =====
  {
    itemKey: 'scout_speeder',
    name: 'Scout Speeder',
    description: 'A nimble entry-level speeder for quick domain reconnaissance. Perfect for beginners starting their journey.',
    imageUrl: '/assets/placeholder.png
    rarity: 'uncommon',
    category: 'vehicle',
    levelRequired: 10,
    xpRequired: 1000,
    unlockConditions: {
      scansRequired: 25,
      achievementsCompleted: 3,
    },
    effects: {
      scanSpeedBoost: 1.1, // 10% faster scans
      xpBoost: 1.05, // 5% XP boost
    },
    sortOrder: 56,
    isActive: true,
  },
  {
    itemKey: 'combat_cruiser',
    name: 'Combat Cruiser',
    description: 'A battle-tested cruiser equipped for security operations. Handles threats with ease and style.',
    imageUrl: '/assets/placeholder.png
    rarity: 'rare',
    category: 'vehicle',
    levelRequired: 30,
    xpRequired: 5000,
    unlockConditions: {
      scansRequired: 120,
      domainsVerified: 3,
      achievementsCompleted: 12,
    },
    effects: {
      scanSpeedBoost: 1.2, // 20% faster scans
      xpBoost: 1.15, // 15% XP boost
      prestigePoints: 20,
    },
    sortOrder: 57,
    isActive: true,
  },
  {
    itemKey: 'stealth_interceptor',
    name: 'Stealth Interceptor',
    description: 'An advanced stealth vehicle for covert operations. Slips through security checks undetected.',
    imageUrl: '/assets/placeholder.png
    rarity: 'epic',
    category: 'vehicle',
    levelRequired: 50,
    xpRequired: 12000,
    unlockConditions: {
      scansRequired: 250,
      domainsVerified: 10,
      achievementsCompleted: 20,
      consecutiveDays: 14,
    },
    effects: {
      scanSpeedBoost: 1.35, // 35% faster scans
      xpBoost: 1.25, // 25% XP boost
      unlockBonus: 100,
      prestigePoints: 40,
    },
    sortOrder: 58,
    isActive: true,
  },
  {
    itemKey: 'titan_battleship',
    name: 'Titan Battleship',
    description: 'The ultimate command vessel. A legendary battleship reserved for elite masters who have proven their worth.',
    imageUrl: '/assets/placeholder.png
    rarity: 'legendary',
    category: 'vehicle',
    levelRequired: 70,
    xpRequired: 20000,
    achievementRequired: 'reach_level_50',
    unlockConditions: {
      scansRequired: 400,
      domainsVerified: 15,
      achievementsCompleted: 28,
      consecutiveDays: 45,
      totalXP: 20000,
    },
    effects: {
      scanSpeedBoost: 1.5, // 50% faster scans
      xpBoost: 1.5, // 50% XP boost
      unlockBonus: 300,
      prestigePoints: 75,
    },
    sortOrder: 59,
    isActive: true,
  },
];

// Helper functions
export function getItemByKey(itemKey: string): Item | undefined {
  return ITEM_CATALOG.find(item => item.itemKey === itemKey);
}

export function getItemsByRarity(rarity: ItemRarity): Item[] {
  return ITEM_CATALOG.filter(item => item.rarity === rarity && item.isActive);
}

export function getItemsByCategory(category: ItemCategory): Item[] {
  return ITEM_CATALOG.filter(item => item.category === category && item.isActive);
}

export function getItemsByLevel(level: number): Item[] {
  return ITEM_CATALOG.filter(item => item.levelRequired <= level && item.isActive);
}

export function getUnlockedItems(level: number, xp: number, achievements: string[]): Item[] {
  return ITEM_CATALOG.filter(item => {
    if (!item.isActive) return false;
    if (item.levelRequired > level) return false;
    if (item.xpRequired && item.xpRequired > xp) return false;
    if (item.achievementRequired && !achievements.includes(item.achievementRequired)) return false;
    return true;
  });
}

export function canUnlockItem(item: Item, userStats: {
  level: number;
  xp: number;
  scans: number;
  domainsVerified: number;
  achievementsCompleted: number;
  consecutiveDays: number;
  achievements: string[];
}): { canUnlock: boolean; missingRequirements: string[] } {
  const missing: string[] = [];

  if (item.levelRequired > userStats.level) {
    missing.push(`Level ${item.levelRequired} required (current: ${userStats.level})`);
  }

  if (item.xpRequired && item.xpRequired > userStats.xp) {
    missing.push(`${item.xpRequired} XP required (current: ${userStats.xp})`);
  }

  if (item.achievementRequired && !userStats.achievements.includes(item.achievementRequired)) {
    missing.push(`Achievement "${item.achievementRequired}" required`);
  }

  if (item.unlockConditions) {
    const cond = item.unlockConditions;
    
    if (cond.scansRequired && cond.scansRequired > userStats.scans) {
      missing.push(`${cond.scansRequired} scans required (current: ${userStats.scans})`);
    }
    
    if (cond.domainsVerified && cond.domainsVerified > userStats.domainsVerified) {
      missing.push(`${cond.domainsVerified} domains verified (current: ${userStats.domainsVerified})`);
    }
    
    if (cond.achievementsCompleted && cond.achievementsCompleted > userStats.achievementsCompleted) {
      missing.push(`${cond.achievementsCompleted} achievements (current: ${userStats.achievementsCompleted})`);
    }
    
    if (cond.consecutiveDays && cond.consecutiveDays > userStats.consecutiveDays) {
      missing.push(`${cond.consecutiveDays} day streak (current: ${userStats.consecutiveDays})`);
    }
    
    if (cond.totalXP && cond.totalXP > userStats.xp) {
      missing.push(`${cond.totalXP} total XP (current: ${userStats.xp})`);
    }
  }

  return {
    canUnlock: missing.length === 0,
    missingRequirements: missing,
  };
}
