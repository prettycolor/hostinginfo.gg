/**
 * Leaderboard System
 *
 * Manages global rankings, special titles for top players, and competitive features
 */

export type LeaderboardCategory =
  | "level"
  | "xp"
  | "scans"
  | "achievements"
  | "items"
  | "streak";

export interface LeaderboardEntry {
  userId: number;
  username: string;
  avatar?: string;
  rank: number;
  score: number;
  level: number;
  title?: string;
  badge?: string;
  specialTitle?: SpecialTitle;
  isCurrentUser?: boolean;
}

export interface SpecialTitle {
  name: string;
  color: string;
  icon: string;
  description: string;
  rank: number; // 1, 2, or 3
}

/**
 * Special titles for top 3 leaderboard positions
 */
export const TOP_3_TITLES: Record<number, SpecialTitle> = {
  1: {
    name: "DNS Paladin",
    color: "from-yellow-400 via-amber-500 to-yellow-600",
    icon: "👑",
    description: "The #1 ranked DNS Paladin",
    rank: 1,
  },
  2: {
    name: "Keeper of Nameservers",
    color: "from-gray-300 via-gray-400 to-gray-500",
    icon: "🥈",
    description: "The #2 ranked Keeper of Nameservers",
    rank: 2,
  },
  3: {
    name: "Warden of Wordpress",
    color: "from-amber-600 via-amber-700 to-amber-800",
    icon: "🥉",
    description: "The #3 ranked Warden of Wordpress",
    rank: 3,
  },
};

/**
 * Category-specific special titles
 */
export const CATEGORY_TITLES: Record<
  LeaderboardCategory,
  Record<number, SpecialTitle>
> = {
  level: {
    1: {
      name: "DNS Paladin",
      color: "from-purple-400 to-pink-600",
      icon: "⚡",
      description: "The #1 ranked DNS Paladin",
      rank: 1,
    },
    2: {
      name: "Keeper of Nameservers",
      color: "from-blue-400 to-cyan-500",
      icon: "⭐",
      description: "The #2 ranked Keeper of Nameservers",
      rank: 2,
    },
    3: {
      name: "Warden of Wordpress",
      color: "from-green-400 to-emerald-500",
      icon: "✨",
      description: "The #3 ranked Warden of Wordpress",
      rank: 3,
    },
  },
  xp: {
    1: {
      name: "XP Titan",
      color: "from-yellow-400 to-orange-500",
      icon: "💫",
      description: "Most XP earned",
      rank: 1,
    },
    2: {
      name: "XP Master",
      color: "from-blue-400 to-indigo-500",
      icon: "🌟",
      description: "2nd most XP",
      rank: 2,
    },
    3: {
      name: "XP Expert",
      color: "from-purple-400 to-violet-500",
      icon: "⭐",
      description: "3rd most XP",
      rank: 3,
    },
  },
  scans: {
    1: {
      name: "Scan Overlord",
      color: "from-red-400 to-rose-600",
      icon: "🔍",
      description: "Most scans completed",
      rank: 1,
    },
    2: {
      name: "Scan Champion",
      color: "from-orange-400 to-amber-500",
      icon: "🎯",
      description: "2nd most scans",
      rank: 2,
    },
    3: {
      name: "Scan Expert",
      color: "from-yellow-400 to-lime-500",
      icon: "📊",
      description: "3rd most scans",
      rank: 3,
    },
  },
  achievements: {
    1: {
      name: "Achievement God",
      color: "from-purple-500 to-fuchsia-600",
      icon: "🏆",
      description: "Most achievements unlocked",
      rank: 1,
    },
    2: {
      name: "Achievement Master",
      color: "from-pink-400 to-rose-500",
      icon: "🎖️",
      description: "2nd most achievements",
      rank: 2,
    },
    3: {
      name: "Achievement Hunter",
      color: "from-violet-400 to-purple-500",
      icon: "🎗️",
      description: "3rd most achievements",
      rank: 3,
    },
  },
  items: {
    1: {
      name: "Ultimate Collector",
      color: "from-emerald-400 to-teal-600",
      icon: "💎",
      description: "Most items collected",
      rank: 1,
    },
    2: {
      name: "Master Collector",
      color: "from-cyan-400 to-blue-500",
      icon: "📦",
      description: "2nd most items",
      rank: 2,
    },
    3: {
      name: "Avid Collector",
      color: "from-sky-400 to-indigo-500",
      icon: "🎁",
      description: "3rd most items",
      rank: 3,
    },
  },
  streak: {
    1: {
      name: "Streak Legend",
      color: "from-orange-500 to-red-600",
      icon: "🔥",
      description: "Longest consecutive streak",
      rank: 1,
    },
    2: {
      name: "Streak Master",
      color: "from-yellow-500 to-orange-600",
      icon: "⚡",
      description: "2nd longest streak",
      rank: 2,
    },
    3: {
      name: "Streak Champion",
      color: "from-amber-500 to-yellow-600",
      icon: "✨",
      description: "3rd longest streak",
      rank: 3,
    },
  },
};

/**
 * Get special title for a leaderboard position
 */
export function getSpecialTitle(
  rank: number,
  category: LeaderboardCategory = "level",
): SpecialTitle | undefined {
  if (rank < 1 || rank > 3) return undefined;
  return CATEGORY_TITLES[category][rank];
}

/**
 * Get rank badge/icon based on position
 */
export function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank <= 10) return "🌟";
  if (rank <= 25) return "⭐";
  if (rank <= 50) return "✨";
  if (rank <= 100) return "💫";
  return "🔹";
}

/**
 * Get rank color class based on position
 */
export function getRankColor(rank: number): string {
  if (rank === 1) return "from-yellow-400 to-amber-600";
  if (rank === 2) return "from-gray-300 to-gray-500";
  if (rank === 3) return "from-amber-600 to-amber-800";
  if (rank <= 10) return "from-purple-400 to-purple-600";
  if (rank <= 25) return "from-blue-400 to-blue-600";
  if (rank <= 50) return "from-green-400 to-green-600";
  if (rank <= 100) return "from-cyan-400 to-cyan-600";
  return "from-gray-400 to-gray-600";
}

/**
 * Calculate rank change indicator
 */
export function getRankChange(
  currentRank: number,
  previousRank: number,
): {
  change: number;
  direction: "up" | "down" | "same";
  icon: string;
  color: string;
} {
  const change = previousRank - currentRank; // Positive = moved up

  if (change > 0) {
    return {
      change: Math.abs(change),
      direction: "up",
      icon: "↑",
      color: "text-green-500",
    };
  } else if (change < 0) {
    return {
      change: Math.abs(change),
      direction: "down",
      icon: "↓",
      color: "text-red-500",
    };
  } else {
    return {
      change: 0,
      direction: "same",
      icon: "−",
      color: "text-gray-500",
    };
  }
}

/**
 * Format score based on category
 */
export function formatScore(
  score: number,
  category: LeaderboardCategory,
): string {
  switch (category) {
    case "xp":
      return `${score.toLocaleString()} XP`;
    case "scans":
      return `${score.toLocaleString()} scans`;
    case "achievements":
      return `${score} achievements`;
    case "items":
      return `${score} items`;
    case "streak":
      return `${score} days`;
    case "level":
    default:
      return `Level ${score}`;
  }
}

/**
 * Get leaderboard tier based on rank
 */
export function getLeaderboardTier(rank: number): {
  name: string;
  color: string;
  minRank: number;
  maxRank: number;
} {
  if (rank === 1) {
    return {
      name: "Champion",
      color: "from-yellow-400 to-amber-600",
      minRank: 1,
      maxRank: 1,
    };
  } else if (rank <= 3) {
    return {
      name: "Elite",
      color: "from-gray-300 to-gray-600",
      minRank: 2,
      maxRank: 3,
    };
  } else if (rank <= 10) {
    return {
      name: "Master",
      color: "from-purple-400 to-purple-600",
      minRank: 4,
      maxRank: 10,
    };
  } else if (rank <= 25) {
    return {
      name: "Expert",
      color: "from-blue-400 to-blue-600",
      minRank: 11,
      maxRank: 25,
    };
  } else if (rank <= 50) {
    return {
      name: "Advanced",
      color: "from-green-400 to-green-600",
      minRank: 26,
      maxRank: 50,
    };
  } else if (rank <= 100) {
    return {
      name: "Intermediate",
      color: "from-cyan-400 to-cyan-600",
      minRank: 51,
      maxRank: 100,
    };
  } else {
    return {
      name: "Beginner",
      color: "from-gray-400 to-gray-600",
      minRank: 101,
      maxRank: Infinity,
    };
  }
}

/**
 * Calculate percentile rank
 */
export function calculatePercentile(rank: number, totalUsers: number): number {
  if (totalUsers === 0) return 0;
  return Math.round(((totalUsers - rank + 1) / totalUsers) * 100);
}

/**
 * Get motivational message based on rank
 */
export function getMotivationalMessage(
  rank: number,
  _category: LeaderboardCategory,
): string {
  if (rank === 1) {
    return "You're at the top! Defend your throne! 👑";
  } else if (rank === 2) {
    return "So close to #1! Keep pushing! 🔥";
  } else if (rank === 3) {
    return "Top 3! You're almost there! ⚡";
  } else if (rank <= 10) {
    return "Top 10! Elite status achieved! 🌟";
  } else if (rank <= 25) {
    return "Top 25! You're doing great! ⭐";
  } else if (rank <= 50) {
    return "Top 50! Keep climbing! 💪";
  } else if (rank <= 100) {
    return "Top 100! You're on your way! 🚀";
  } else {
    return "Keep going! Every scan counts! 💫";
  }
}
