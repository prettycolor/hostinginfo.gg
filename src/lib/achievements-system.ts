/**
 * Achievement System
 *
 * Defines all achievements, tracks progress, and awards items/XP
 */

export type AchievementCategory =
  | "scanning"
  | "security"
  | "performance"
  | "social"
  | "collection"
  | "mastery";
export type AchievementTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;

  // Requirements
  requirements: {
    type: "count" | "threshold" | "streak" | "collection" | "special";
    target: number;
    current?: number;
  };

  // Rewards
  rewards: {
    xp: number;
    items?: string[]; // Item keys to unlock
    title?: string; // Special title
    badge?: string; // Badge icon
  };

  // Metadata
  isHidden?: boolean; // Secret achievements
  isRepeatable?: boolean;
  sortOrder: number;
}

export const ACHIEVEMENT_CATALOG: Achievement[] = [
  // ============================================
  // SCANNING ACHIEVEMENTS
  // ============================================
  {
    id: "first_scan",
    name: "First Steps",
    description: "Complete your first domain scan",
    category: "scanning",
    tier: "bronze",
    icon: "🎯",
    requirements: {
      type: "count",
      target: 1,
    },
    rewards: {
      xp: 50,
      items: ["scanner_badge_bronze"],
    },
    sortOrder: 1,
  },
  {
    id: "scan_10",
    name: "Getting Started",
    description: "Complete 10 domain scans",
    category: "scanning",
    tier: "bronze",
    icon: "📊",
    requirements: {
      type: "count",
      target: 10,
    },
    rewards: {
      xp: 100,
      items: ["data_crystal_common"],
    },
    sortOrder: 2,
  },
  {
    id: "scan_50",
    name: "Dedicated Scanner",
    description: "Complete 50 domain scans",
    category: "scanning",
    tier: "silver",
    icon: "🔍",
    requirements: {
      type: "count",
      target: 50,
    },
    rewards: {
      xp: 250,
      items: ["scanner_badge_silver", "xp_boost_10"],
    },
    sortOrder: 3,
  },
  {
    id: "scan_100",
    name: "Scan Master",
    description: "Complete 100 domain scans",
    category: "scanning",
    tier: "gold",
    icon: "⭐",
    requirements: {
      type: "count",
      target: 100,
    },
    rewards: {
      xp: 500,
      items: ["scanner_badge_gold", "premium_scanner"],
      title: "Scan Master",
    },
    sortOrder: 4,
  },
  {
    id: "scan_500",
    name: "Elite Scanner",
    description: "Complete 500 domain scans",
    category: "scanning",
    tier: "platinum",
    icon: "💎",
    requirements: {
      type: "count",
      target: 500,
    },
    rewards: {
      xp: 1000,
      items: ["scanner_badge_platinum", "elite_scanner", "xp_boost_25"],
      title: "Elite Scanner",
    },
    sortOrder: 5,
  },
  {
    id: "scan_1000",
    name: "Legendary Scanner",
    description: "Complete 1000 domain scans",
    category: "scanning",
    tier: "diamond",
    icon: "👑",
    requirements: {
      type: "count",
      target: 1000,
    },
    rewards: {
      xp: 2500,
      items: ["scanner_badge_diamond", "legendary_scanner", "prestige_token"],
      title: "Legendary Scanner",
      badge: "legendary_scanner_badge",
    },
    sortOrder: 6,
  },

  // ============================================
  // SECURITY ACHIEVEMENTS
  // ============================================
  {
    id: "perfect_security",
    name: "Fortress",
    description: "Achieve a perfect 100/100 security score",
    category: "security",
    tier: "gold",
    icon: "🛡️",
    requirements: {
      type: "threshold",
      target: 100,
    },
    rewards: {
      xp: 500,
      items: ["security_shield", "fortress_badge"],
      title: "Security Expert",
    },
    sortOrder: 10,
  },
  {
    id: "fix_10_issues",
    name: "Problem Solver",
    description: "Fix 10 security issues",
    category: "security",
    tier: "silver",
    icon: "🔧",
    requirements: {
      type: "count",
      target: 10,
    },
    rewards: {
      xp: 200,
      items: ["repair_kit"],
    },
    sortOrder: 11,
  },
  {
    id: "ssl_champion",
    name: "SSL Champion",
    description: "Verify SSL certificates on 25 domains",
    category: "security",
    tier: "gold",
    icon: "🔐",
    requirements: {
      type: "count",
      target: 25,
    },
    rewards: {
      xp: 400,
      items: ["ssl_badge", "encryption_key"],
    },
    sortOrder: 12,
  },

  // ============================================
  // PERFORMANCE ACHIEVEMENTS
  // ============================================
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Achieve a performance score of 95+",
    category: "performance",
    tier: "gold",
    icon: "⚡",
    requirements: {
      type: "threshold",
      target: 95,
    },
    rewards: {
      xp: 400,
      items: ["speed_boost", "turbo_badge"],
    },
    sortOrder: 20,
  },
  {
    id: "optimize_10",
    name: "Optimizer",
    description: "Optimize 10 domains for performance",
    category: "performance",
    tier: "silver",
    icon: "📈",
    requirements: {
      type: "count",
      target: 10,
    },
    rewards: {
      xp: 250,
      items: ["optimizer_toolkit"],
    },
    sortOrder: 21,
  },

  // ============================================
  // COLLECTION ACHIEVEMENTS
  // ============================================
  {
    id: "collector_10",
    name: "Novice Collector",
    description: "Collect 10 unique items",
    category: "collection",
    tier: "bronze",
    icon: "📦",
    requirements: {
      type: "collection",
      target: 10,
    },
    rewards: {
      xp: 150,
      items: ["collector_badge_bronze"],
    },
    sortOrder: 30,
  },
  {
    id: "collector_25",
    name: "Avid Collector",
    description: "Collect 25 unique items",
    category: "collection",
    tier: "silver",
    icon: "🎁",
    requirements: {
      type: "collection",
      target: 25,
    },
    rewards: {
      xp: 300,
      items: ["collector_badge_silver", "rare_item_box"],
    },
    sortOrder: 31,
  },
  {
    id: "collector_50",
    name: "Master Collector",
    description: "Collect 50 unique items",
    category: "collection",
    tier: "gold",
    icon: "🏆",
    requirements: {
      type: "collection",
      target: 50,
    },
    rewards: {
      xp: 750,
      items: ["collector_badge_gold", "epic_item_box"],
      title: "Master Collector",
    },
    sortOrder: 32,
  },
  {
    id: "complete_collection",
    name: "Completionist",
    description: "Collect ALL items in the catalog",
    category: "collection",
    tier: "diamond",
    icon: "💯",
    requirements: {
      type: "special",
      target: 100, // 100% completion
    },
    rewards: {
      xp: 5000,
      items: ["completionist_crown", "ultimate_prestige_token"],
      title: "The Completionist",
      badge: "completionist_ultimate",
    },
    sortOrder: 33,
  },

  // ============================================
  // SOCIAL ACHIEVEMENTS
  // ============================================
  {
    id: "verify_domain",
    name: "Domain Owner",
    description: "Verify ownership of your first domain",
    category: "social",
    tier: "silver",
    icon: "✅",
    requirements: {
      type: "count",
      target: 1,
    },
    rewards: {
      xp: 200,
      items: ["verified_badge", "domain_key"],
    },
    sortOrder: 40,
  },
  {
    id: "verify_5_domains",
    name: "Portfolio Builder",
    description: "Verify ownership of 5 domains",
    category: "social",
    tier: "gold",
    icon: "🌐",
    requirements: {
      type: "count",
      target: 5,
    },
    rewards: {
      xp: 500,
      items: ["portfolio_badge", "premium_domain_slot"],
    },
    sortOrder: 41,
  },

  // ============================================
  // MASTERY ACHIEVEMENTS
  // ============================================
  {
    id: "reach_level_10",
    name: "Rising Star",
    description: "Reach level 10",
    category: "mastery",
    tier: "silver",
    icon: "⭐",
    requirements: {
      type: "threshold",
      target: 10,
    },
    rewards: {
      xp: 300,
      items: ["star_badge"],
    },
    sortOrder: 50,
  },
  {
    id: "reach_level_25",
    name: "Expert",
    description: "Reach level 25",
    category: "mastery",
    tier: "gold",
    icon: "🌟",
    requirements: {
      type: "threshold",
      target: 25,
    },
    rewards: {
      xp: 750,
      items: ["expert_badge", "mastery_token"],
      title: "Expert",
    },
    sortOrder: 51,
  },
  {
    id: "reach_level_50",
    name: "Master",
    description: "Reach level 50",
    category: "mastery",
    tier: "platinum",
    icon: "💫",
    requirements: {
      type: "threshold",
      target: 50,
    },
    rewards: {
      xp: 2000,
      items: ["master_badge", "legendary_item_box"],
      title: "Master",
    },
    sortOrder: 52,
  },
  {
    id: "reach_level_100",
    name: "Grandmaster",
    description: "Reach level 100",
    category: "mastery",
    tier: "diamond",
    icon: "👑",
    requirements: {
      type: "threshold",
      target: 100,
    },
    rewards: {
      xp: 10000,
      items: ["grandmaster_crown", "ultimate_power"],
      title: "Grandmaster",
      badge: "grandmaster_ultimate",
    },
    sortOrder: 53,
  },
  {
    id: "ultimate_master",
    name: "Ultimate Master",
    description:
      "Achieve true mastery: Level 80+, 600+ scans, 25+ domains verified, 35+ achievements, 90-day streak",
    category: "mastery",
    tier: "diamond",
    icon: "💎",
    requirements: {
      type: "special",
      target: 1,
    },
    rewards: {
      xp: 15000,
      items: ["hostinginfo_master_badge", "ultimate_prestige_token"],
      title: "Ultimate Master",
      badge: "ultimate_master_diamond",
    },
    sortOrder: 54,
  },

  // ============================================
  // SECRET ACHIEVEMENTS
  // ============================================
  {
    id: "easter_egg_hunter",
    name: "Easter Egg Hunter",
    description: "Find the hidden easter egg",
    category: "collection",
    tier: "platinum",
    icon: "🥚",
    requirements: {
      type: "special",
      target: 1,
    },
    rewards: {
      xp: 1000,
      items: ["golden_egg", "secret_badge"],
      title: "Easter Egg Hunter",
    },
    isHidden: true,
    sortOrder: 100,
  },
  {
    id: "midnight_scanner",
    name: "Night Owl",
    description: "Complete a scan at midnight",
    category: "scanning",
    tier: "silver",
    icon: "🦉",
    requirements: {
      type: "special",
      target: 1,
    },
    rewards: {
      xp: 200,
      items: ["night_owl_badge"],
    },
    isHidden: true,
    sortOrder: 101,
  },
  {
    id: "consecutive_7_days",
    name: "Week Warrior",
    description: "Scan domains for 7 consecutive days",
    category: "mastery",
    tier: "gold",
    icon: "📅",
    requirements: {
      type: "streak",
      target: 7,
    },
    rewards: {
      xp: 500,
      items: ["streak_badge_7", "consistency_token"],
    },
    sortOrder: 60,
  },
  {
    id: "consecutive_30_days",
    name: "Monthly Master",
    description: "Scan domains for 30 consecutive days",
    category: "mastery",
    tier: "platinum",
    icon: "🔥",
    requirements: {
      type: "streak",
      target: 30,
    },
    rewards: {
      xp: 2000,
      items: ["streak_badge_30", "dedication_crown"],
      title: "Dedicated Master",
    },
    sortOrder: 61,
  },

  // ============================================
  // VEHICLE COLLECTION ACHIEVEMENTS
  // ============================================
  {
    id: "first_vehicle",
    name: "Licensed Driver",
    description: "Unlock your first vehicle - the Scout Speeder",
    category: "collection",
    tier: "bronze",
    icon: "🚗",
    requirements: {
      type: "collection",
      target: 1,
    },
    rewards: {
      xp: 300,
      items: ["scout_speeder"],
      title: "Driver",
    },
    sortOrder: 70,
  },
  {
    id: "vehicle_collector",
    name: "Fleet Commander",
    description: "Unlock all 4 vehicles in your personal fleet",
    category: "collection",
    tier: "platinum",
    icon: "🚀",
    requirements: {
      type: "collection",
      target: 4,
    },
    rewards: {
      xp: 5000,
      items: ["fleet_commander_badge", "vehicle_mastery_token"],
      title: "Fleet Commander",
      badge: "fleet_master",
    },
    sortOrder: 71,
  },
  {
    id: "titan_pilot",
    name: "Titan Pilot",
    description: "Unlock the legendary Titan Battleship - the ultimate vehicle",
    category: "collection",
    tier: "diamond",
    icon: "⚡",
    requirements: {
      type: "special",
      target: 1,
    },
    rewards: {
      xp: 8000,
      items: ["titan_battleship", "legendary_pilot_wings"],
      title: "Titan Pilot",
      badge: "titan_commander",
    },
    sortOrder: 72,
  },
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENT_CATALOG.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: AchievementCategory,
): Achievement[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.category === category).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.tier === tier);
}

/**
 * Calculate achievement progress
 */
export function calculateAchievementProgress(
  achievement: Achievement,
  userStats: {
    scans: number;
    level: number;
    itemsCollected: number;
    domainsVerified: number;
    issuesFixed: number;
    consecutiveDays: number;
    [key: string]: number | undefined;
  },
): {
  current: number;
  target: number;
  percentage: number;
  isComplete: boolean;
} {
  let current = 0;
  const target = achievement.requirements.target;

  switch (achievement.requirements.type) {
    case "count":
      // Determine which stat to check based on achievement ID
      if (achievement.id.startsWith("scan_")) {
        current = userStats.scans;
      } else if (achievement.id.startsWith("verify_")) {
        current = userStats.domainsVerified;
      } else if (achievement.id.startsWith("fix_")) {
        current = userStats.issuesFixed;
      } else if (achievement.id.startsWith("collector_")) {
        current = userStats.itemsCollected;
      }
      break;

    case "threshold":
      if (achievement.id.startsWith("reach_level_")) {
        current = userStats.level;
      } else if (achievement.id.includes("security")) {
        current = userStats.securityScore || 0;
      } else if (achievement.id.includes("performance")) {
        current = userStats.performanceScore || 0;
      }
      break;

    case "streak":
      current = userStats.consecutiveDays;
      break;

    case "collection":
      current = userStats.itemsCollected;
      break;

    case "special":
      // Special achievements need custom logic
      current = userStats[`special_${achievement.id}`] || 0;
      break;
  }

  const percentage = Math.min(100, Math.round((current / target) * 100));
  const isComplete = current >= target;

  return { current, target, percentage, isComplete };
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: AchievementTier): string {
  const colors = {
    bronze: "from-amber-700 to-amber-900",
    silver: "from-gray-400 to-gray-600",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-cyan-400 to-blue-600",
    diamond: "from-purple-400 to-pink-600",
  };
  return colors[tier];
}

/**
 * Get tier icon for UI
 */
export function getTierIcon(tier: AchievementTier): string {
  const icons = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
    diamond: "👑",
  };
  return icons[tier];
}
