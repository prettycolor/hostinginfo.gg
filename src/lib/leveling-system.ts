/**
 * Leveling System - boot.dev inspired
 *
 * XP rewards, level progression, and achievement definitions
 * for HostingInfo's gamification system.
 */

// ============================================================================
// XP REWARDS
// ============================================================================

export const XP_REWARDS = {
  // Scan actions
  SECURITY_SCAN: 25,
  PERFORMANCE_SCAN: 20,
  DNS_SCAN: 15,
  WHOIS_SCAN: 15,
  SSL_SCAN: 15,
  EMAIL_SCAN: 20,
  MALWARE_SCAN: 30,
  TECHNOLOGY_SCAN: 15,
  GEOLOCATION_SCAN: 10,
  PROVIDER_SCAN: 10,
  FULL_SCAN: 50, // All scans combined

  // Domain actions
  DOMAIN_VERIFIED: 100,
  DOMAIN_MONITORED: 50,

  // Engagement
  PDF_EXPORT: 10,
  AI_INSIGHTS: 15,
  DDC_CALCULATOR_USE: 5,
  INTELLIGENCE_DASHBOARD_USE: 10,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 10, // Per day of streak

  // Achievements
  ACHIEVEMENT_COMMON: 50,
  ACHIEVEMENT_UNCOMMON: 100,
  ACHIEVEMENT_RARE: 250,
  ACHIEVEMENT_EPIC: 500,
  ACHIEVEMENT_LEGENDARY: 1000,
} as const;

// ============================================================================
// LEVEL PROGRESSION
// ============================================================================

/**
 * Calculate XP required for a given level
 * Uses a smoothed curve for levels 2-100 to avoid long flat XP bands
 * while preserving the same cumulative XP required for level 100.
 *
 * Levels 2-100: smooth interpolation (calibrated to legacy total XP)
 * Levels 101+: legacy exponential fallback
 *
 * Preserved cumulative XP to level 100: 215,311
 */
const LEGACY_MAX_LEVEL = 100;
const LEGACY_TOTAL_XP_TO_LEVEL_100 = 215311;
const SMOOTH_MIN_XP = 350;
const SMOOTH_MAX_XP_AT_LEVEL_100 = 5047;
const SMOOTH_EXPONENT = 1.5815;

function buildSmoothedXpTable(): number[] {
  const table = Array.from({ length: LEGACY_MAX_LEVEL + 1 }, () => 0);

  for (let level = 2; level <= LEGACY_MAX_LEVEL; level++) {
    const progress = (level - 2) / (LEGACY_MAX_LEVEL - 2);
    table[level] = Math.round(
      SMOOTH_MIN_XP +
        (SMOOTH_MAX_XP_AT_LEVEL_100 - SMOOTH_MIN_XP) *
          Math.pow(progress, SMOOTH_EXPONENT),
    );
  }

  // Keep the level-100 cumulative total exactly aligned with the legacy curve.
  const total = table.reduce((sum, xp, level) => {
    if (level < 2) {
      return sum;
    }
    return sum + xp;
  }, 0);
  const delta = LEGACY_TOTAL_XP_TO_LEVEL_100 - total;
  table[LEGACY_MAX_LEVEL] += delta;

  return table;
}

const SMOOTHED_XP_TABLE = buildSmoothedXpTable();

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  if (level <= LEGACY_MAX_LEVEL) {
    return SMOOTHED_XP_TABLE[level];
  }

  const baseXP = 8;
  const exponent = 1.4;
  return Math.floor(baseXP * Math.pow(level, exponent));
}

/**
 * Calculate total XP required to reach a level (cumulative)
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  let xpNeeded = 0;

  while (xpNeeded <= totalXp) {
    level++;
    xpNeeded += getXpForLevel(level);
  }

  return level - 1;
}

/**
 * Get XP progress for current level
 */
export function getXpProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0-100%
} {
  const level = getLevelFromXp(totalXp);
  const currentLevelTotalXp = getTotalXpForLevel(level);
  const nextLevelTotalXp = getTotalXpForLevel(level + 1);

  const currentLevelXp = totalXp - currentLevelTotalXp;
  const nextLevelXp = nextLevelTotalXp - currentLevelTotalXp;
  const progress = (currentLevelXp / nextLevelXp) * 100;

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

// ============================================================================
// LEVEL TITLES (Fantasy Webmaster Theme)
// ============================================================================

export const LEVEL_TITLES: Record<
  number,
  { title: string; description: string }
> = {
  1: {
    title: "Novice Webmaster",
    description: "Just beginning your journey into the digital realm",
  },
  5: {
    title: "Apprentice Technician",
    description: "Learning the ancient arts of DNS and SSL",
  },
  10: {
    title: "Junior Sysadmin",
    description: "Trusted with basic server incantations",
  },
  15: {
    title: "DNS Sorcerer",
    description: "Master of A records and CNAME spells",
  },
  20: {
    title: "SSL Guardian",
    description: "Protector of encrypted connections",
  },
  25: {
    title: "Performance Wizard",
    description: "Optimizer of load times and Core Web Vitals",
  },
  30: {
    title: "Security Sentinel",
    description: "Defender against malware and vulnerabilities",
  },
  35: { title: "Domain Warden", description: "Keeper of many realms" },
  40: {
    title: "Call Center Paladin",
    description: "Champion of customer support and uptime",
  },
  45: {
    title: "Network Necromancer",
    description: "Resurrector of dead servers",
  },
  50: {
    title: "Hosting Archmage",
    description: "Supreme master of web infrastructure",
  },
  60: {
    title: "DevOps Demigod",
    description: "Transcended mortal limitations",
  },
  70: { title: "Cloud Sovereign", description: "Ruler of distributed systems" },
  80: {
    title: "Uptime Immortal",
    description: "Achieved 99.999% enlightenment",
  },
  90: {
    title: "Legendary Webmaster",
    description: "Your name echoes through data centers",
  },
  100: {
    title: "Eternal Sysadmin",
    description: "Ascended to the highest plane of existence",
  },
};

/**
 * Get title for current level
 */
export function getLevelTitle(level: number): {
  title: string;
  description: string;
} {
  const levels = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  const titleLevel = levels.find((l) => level >= l) || 1;
  return LEVEL_TITLES[titleLevel];
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: "scans" | "domains" | "streaks" | "milestones" | "special";
  xpReward: number;
  lore: string;
  requirement: {
    type: string;
    value: number;
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ========== SCAN ACHIEVEMENTS ==========
  {
    key: "first_scan",
    title: "First Steps",
    description: "Complete your first security scan",
    icon: "🔍",
    rarity: "common",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "Every great webmaster begins with a single scan.",
    requirement: { type: "total_scans", value: 1 },
  },
  {
    key: "scan_apprentice",
    title: "Scan Apprentice",
    description: "Complete 10 scans",
    icon: "🔎",
    rarity: "common",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "You are beginning to understand the patterns of the web.",
    requirement: { type: "total_scans", value: 10 },
  },
  {
    key: "scan_adept",
    title: "Scan Adept",
    description: "Complete 50 scans",
    icon: "🔬",
    rarity: "uncommon",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "Your scanning skills are becoming formidable.",
    requirement: { type: "total_scans", value: 50 },
  },
  {
    key: "scan_master",
    title: "Scan Master",
    description: "Complete 100 scans",
    icon: "🎯",
    rarity: "rare",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_RARE,
    lore: "Few have scanned as thoroughly as you.",
    requirement: { type: "total_scans", value: 100 },
  },
  {
    key: "scan_legend",
    title: "Scan Legend",
    description: "Complete 500 scans",
    icon: "⚡",
    rarity: "legendary",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_LEGENDARY,
    lore: "Your name is whispered in data centers across the realm.",
    requirement: { type: "total_scans", value: 500 },
  },

  // ========== DNS ACHIEVEMENTS ==========
  {
    key: "dns_initiate",
    title: "DNS Initiate",
    description: "Perform 5 DNS scans",
    icon: "🌐",
    rarity: "common",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "You have begun to decipher the language of nameservers.",
    requirement: { type: "dns_scans", value: 5 },
  },
  {
    key: "dns_sorcerer",
    title: "DNS Sorcerer",
    description: "Perform 25 DNS scans",
    icon: "🔮",
    rarity: "uncommon",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "A records, CNAME records, MX records - you know them all.",
    requirement: { type: "dns_scans", value: 25 },
  },
  {
    key: "dns_archmage",
    title: "DNS Archmage",
    description: "Perform 100 DNS scans",
    icon: "🧙",
    rarity: "epic",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_EPIC,
    lore: "You can resolve any domain with a mere thought.",
    requirement: { type: "dns_scans", value: 100 },
  },

  // ========== SECURITY ACHIEVEMENTS ==========
  {
    key: "security_guardian",
    title: "Security Guardian",
    description: "Complete 10 security scans",
    icon: "🛡️",
    rarity: "common",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "You stand watch against the forces of chaos.",
    requirement: { type: "security_scans", value: 10 },
  },
  {
    key: "malware_hunter",
    title: "Malware Hunter",
    description: "Complete 10 malware scans",
    icon: "🦠",
    rarity: "uncommon",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "You hunt the digital plague with unwavering determination.",
    requirement: { type: "malware_scans", value: 10 },
  },
  {
    key: "ssl_protector",
    title: "SSL Protector",
    description: "Complete 15 SSL scans",
    icon: "🔐",
    rarity: "uncommon",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "Encrypted connections are your sacred duty.",
    requirement: { type: "ssl_scans", value: 15 },
  },

  // ========== PERFORMANCE ACHIEVEMENTS ==========
  {
    key: "speed_demon",
    title: "Speed Demon",
    description: "Complete 10 performance scans",
    icon: "🚀",
    rarity: "common",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "Every millisecond matters in your quest for speed.",
    requirement: { type: "performance_scans", value: 10 },
  },
  {
    key: "performance_wizard",
    title: "Performance Wizard",
    description: "Complete 50 performance scans",
    icon: "⚡",
    rarity: "rare",
    category: "scans",
    xpReward: XP_REWARDS.ACHIEVEMENT_RARE,
    lore: "You bend Core Web Vitals to your will.",
    requirement: { type: "performance_scans", value: 50 },
  },

  // ========== DOMAIN ACHIEVEMENTS ==========
  {
    key: "domain_claimer",
    title: "Domain Claimer",
    description: "Verify your first domain",
    icon: "🏰",
    rarity: "uncommon",
    category: "domains",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "You have claimed your first territory in the digital realm.",
    requirement: { type: "domains_verified", value: 1 },
  },
  {
    key: "domain_lord",
    title: "Domain Lord",
    description: "Verify 5 domains",
    icon: "👑",
    rarity: "rare",
    category: "domains",
    xpReward: XP_REWARDS.ACHIEVEMENT_RARE,
    lore: "Multiple realms bow to your authority.",
    requirement: { type: "domains_verified", value: 5 },
  },
  {
    key: "domain_emperor",
    title: "Domain Emperor",
    description: "Verify 10 domains",
    icon: "⚜️",
    rarity: "epic",
    category: "domains",
    xpReward: XP_REWARDS.ACHIEVEMENT_EPIC,
    lore: "Your empire spans the entire internet.",
    requirement: { type: "domains_verified", value: 10 },
  },

  // ========== STREAK ACHIEVEMENTS ==========
  {
    key: "consistent_scanner",
    title: "Consistent Scanner",
    description: "Maintain a 3-day streak",
    icon: "🔥",
    rarity: "common",
    category: "streaks",
    xpReward: XP_REWARDS.ACHIEVEMENT_COMMON,
    lore: "Consistency is the path to mastery.",
    requirement: { type: "current_streak", value: 3 },
  },
  {
    key: "dedicated_webmaster",
    title: "Dedicated Webmaster",
    description: "Maintain a 7-day streak",
    icon: "🔥",
    rarity: "uncommon",
    category: "streaks",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "Your dedication burns bright.",
    requirement: { type: "current_streak", value: 7 },
  },
  {
    key: "unstoppable_force",
    title: "Unstoppable Force",
    description: "Maintain a 30-day streak",
    icon: "💥",
    rarity: "epic",
    category: "streaks",
    xpReward: XP_REWARDS.ACHIEVEMENT_EPIC,
    lore: "Nothing can break your momentum.",
    requirement: { type: "current_streak", value: 30 },
  },

  // ========== MILESTONE ACHIEVEMENTS ==========
  {
    key: "level_10",
    title: "Rising Star",
    description: "Reach level 10",
    icon: "⭐",
    rarity: "uncommon",
    category: "milestones",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "Your potential is beginning to shine.",
    requirement: { type: "level", value: 10 },
  },
  {
    key: "level_25",
    title: "Seasoned Professional",
    description: "Reach level 25",
    icon: "🌟",
    rarity: "rare",
    category: "milestones",
    xpReward: XP_REWARDS.ACHIEVEMENT_RARE,
    lore: "You have proven yourself among the best.",
    requirement: { type: "level", value: 25 },
  },
  {
    key: "level_50",
    title: "Hosting Archmage",
    description: "Reach level 50",
    icon: "✨",
    rarity: "epic",
    category: "milestones",
    xpReward: XP_REWARDS.ACHIEVEMENT_EPIC,
    lore: "Few have reached such heights of mastery.",
    requirement: { type: "level", value: 50 },
  },
  {
    key: "level_100",
    title: "Eternal Sysadmin",
    description: "Reach level 100",
    icon: "🏆",
    rarity: "legendary",
    category: "milestones",
    xpReward: XP_REWARDS.ACHIEVEMENT_LEGENDARY,
    lore: "You have transcended mortal limitations. Legends will be told of your deeds.",
    requirement: { type: "level", value: 100 },
  },

  // ========== SPECIAL ACHIEVEMENTS ==========
  {
    key: "email_expert",
    title: "Email Expert",
    description: "Complete 10 email security scans",
    icon: "📧",
    rarity: "uncommon",
    category: "special",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "SPF, DKIM, DMARC - you speak the language of email security.",
    requirement: { type: "email_scans", value: 10 },
  },
  {
    key: "whois_detective",
    title: "WHOIS Detective",
    description: "Complete 20 WHOIS lookups",
    icon: "🕵️",
    rarity: "uncommon",
    category: "special",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "No domain can hide its secrets from you.",
    requirement: { type: "whois_scans", value: 20 },
  },
  {
    key: "monitoring_master",
    title: "Monitoring Master",
    description: "Monitor 5 domains simultaneously",
    icon: "👁️",
    rarity: "rare",
    category: "special",
    xpReward: XP_REWARDS.ACHIEVEMENT_RARE,
    lore: "Your watchful eye never sleeps.",
    requirement: { type: "domains_monitored", value: 5 },
  },
  {
    key: "ai_collaborator",
    title: "AI Collaborator",
    description: "Use AI Insights 10 times",
    icon: "🤖",
    rarity: "uncommon",
    category: "special",
    xpReward: XP_REWARDS.ACHIEVEMENT_UNCOMMON,
    lore: "You have learned to harness the power of artificial intelligence.",
    requirement: { type: "ai_insights_used", value: 10 },
  },
];

/**
 * Check if user has unlocked an achievement
 */
export function checkAchievementUnlock(
  achievement: AchievementDefinition,
  userStats: Record<string, number>,
): boolean {
  const { type, value } = achievement.requirement;
  const userValue = userStats[type] || 0;
  return userValue >= value;
}

/**
 * Get all newly unlocked achievements
 */
export function getNewlyUnlockedAchievements(
  userStats: Record<string, number>,
  unlockedAchievementKeys: string[],
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (achievement) =>
      !unlockedAchievementKeys.includes(achievement.key) &&
      checkAchievementUnlock(achievement, userStats),
  );
}
