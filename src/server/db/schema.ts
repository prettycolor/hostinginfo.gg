/**
 * Drizzle ORM schema entrypoint.
 *
 * The template ships with no predefined tables. Agents should add tables by
 * exporting `mysqlTable(...)` instances from this module as they provision data
 * models for the generated app.
 */

import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  text,
  decimal,
  boolean,
  index,
  json,
  mysqlEnum,
  float,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// WhoisFreaks API usage tracking (prevent exceeding 1,000/month free tier)
export const whoisApiUsage = mysqlTable("whois_api_usage", {
  id: int("id").primaryKey().autoincrement(),
  yearMonth: varchar("year_month", { length: 7 }).notNull().unique(), // Format: YYYY-MM
  queryCount: int("query_count").notNull().default(0),
  lastQueryAt: timestamp("last_query_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Performance history tracking for historical charts
export const performanceHistory = mysqlTable("performance_history", {
  id: int("id").primaryKey().autoincrement(),
  domain: varchar("domain", { length: 255 }).notNull(),
  scanDate: timestamp("scan_date").notNull().defaultNow(),

  // Overall scores
  mobileScore: int("mobile_score").notNull(),
  desktopScore: int("desktop_score").notNull(),

  // Core Web Vitals - Mobile
  mobileFcp: decimal("mobile_fcp", { precision: 10, scale: 2 }),
  mobileLcp: decimal("mobile_lcp", { precision: 10, scale: 2 }),
  mobileTbt: decimal("mobile_tbt", { precision: 10, scale: 2 }),
  mobileCls: decimal("mobile_cls", { precision: 10, scale: 4 }),
  mobileSpeedIndex: decimal("mobile_speed_index", { precision: 10, scale: 2 }),

  // Core Web Vitals - Desktop
  desktopFcp: decimal("desktop_fcp", { precision: 10, scale: 2 }),
  desktopLcp: decimal("desktop_lcp", { precision: 10, scale: 2 }),
  desktopTbt: decimal("desktop_tbt", { precision: 10, scale: 2 }),
  desktopCls: decimal("desktop_cls", { precision: 10, scale: 4 }),
  desktopSpeedIndex: decimal("desktop_speed_index", {
    precision: 10,
    scale: 2,
  }),

  // Multi-page data (JSON)
  pagesScanned: text("pages_scanned"), // JSON array of page URLs
  pageScores: text("page_scores"), // JSON object with per-page scores

  createdAt: timestamp("created_at").defaultNow(),
});

// Users table
export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }), // Nullable for OAuth users
    password: varchar("password", { length: 255 }), // Nullable for OAuth users (new field)
    fullName: varchar("full_name", { length: 255 }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    profileName: varchar("profile_name", { length: 100 }), // Display name
    bio: text("bio"), // User bio
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at"),
    authProvider: varchar("auth_provider", { length: 50 }).default("email"), // email, google, microsoft, apple, github
    providerId: varchar("provider_id", { length: 255 }), // OAuth provider user ID
    // Notification preferences
    emailNotifications: boolean("email_notifications").default(false),
    scanAlerts: boolean("scan_alerts").default(false),
    weeklyReports: boolean("weekly_reports").default(false),
    marketingEmails: boolean("marketing_emails").default(false),
    // Privacy settings
    profileVisibility: varchar("profile_visibility", { length: 20 }).default(
      "public",
    ),
    showEmail: boolean("show_email").default(false),
    showStats: boolean("show_stats").default(true),
    isAdmin: boolean("is_admin").notNull().default(false),
    isDisabled: boolean("is_disabled").notNull().default(false),
    disabledAt: timestamp("disabled_at"),
    // Leveling system
    level: int("level").notNull().default(1),
    totalXp: int("total_xp").notNull().default(0),
    currentXp: int("current_xp").notNull().default(0),
    xpToNextLevel: int("xp_to_next_level").notNull().default(100),
    // Avatar system
    selectedAvatarId: int("selected_avatar_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    providerIdx: index("provider_idx").on(table.authProvider, table.providerId),
    selectedAvatarIdx: index("selected_avatar_idx").on(table.selectedAvatarId),
    isAdminIdx: index("is_admin_idx").on(table.isAdmin),
    isDisabledIdx: index("is_disabled_idx").on(table.isDisabled),
  }),
);

// Sessions table for JWT token management
export const sessions = mysqlTable(
  "sessions",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    token: varchar("token", { length: 500 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 support
    userAgent: text("user_agent"),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    tokenIdx: index("token_idx").on(table.token),
    expiresIdx: index("expires_idx").on(table.expiresAt),
  }),
);

// Email verification tokens
export const emailVerifications = mysqlTable(
  "email_verifications",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    usedAt: timestamp("used_at"),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    tokenIdx: index("token_idx").on(table.token),
  }),
);

// Password reset tokens (admin-issued and self-service)
export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdByAdminId: int("created_by_admin_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("password_reset_user_id_idx").on(table.userId),
    tokenHashIdx: index("password_reset_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("password_reset_expires_at_idx").on(table.expiresAt),
  }),
);

// Claimed domains (users can claim ownership of domains)
export const claimedDomains = mysqlTable(
  "claimed_domains",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    claimedAt: timestamp("claimed_at").defaultNow(),
    verificationMethod: varchar("verification_method", { length: 50 }), // dns, file, email, meta
    verificationToken: varchar("verification_token", { length: 255 }), // Token for verification
    verifiedAt: timestamp("verified_at"),
    isVerified: boolean("is_verified").notNull().default(false),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    userDomainIdx: index("user_domain_idx").on(table.userId, table.domain),
  }),
);

// Scan history (link scans to users)
export const scanHistory = mysqlTable(
  "scan_history",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id"), // Nullable for anonymous scans
    domain: varchar("domain", { length: 255 }).notNull(),
    scanType: varchar("scan_type", { length: 50 }).notNull(), // full, quick, security, performance
    scanData: text("scan_data"), // JSON of scan results
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

// Favorite domains for quick access
export const favoriteDomains = mysqlTable(
  "favorite_domains",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    alias: varchar("alias", { length: 100 }), // Optional friendly name
    notes: text("notes"), // Optional notes about the domain
    addedAt: timestamp("added_at").defaultNow(),
    lastScannedAt: timestamp("last_scanned_at"),
    scanCount: int("scan_count").notNull().default(0),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    userDomainUnique: index("user_domain_unique").on(
      table.userId,
      table.domain,
    ),
  }),
);

// Scan history for favorite domains
export const favoriteDomainScans = mysqlTable(
  "favorite_domain_scans",
  {
    id: int("id").primaryKey().autoincrement(),
    favoriteDomainId: int("favorite_domain_id").notNull(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),

    // Scan type and results
    scanType: varchar("scan_type", { length: 50 }).notNull(), // performance, security, full

    // Performance data (if performance scan)
    mobileScore: int("mobile_score"),
    desktopScore: int("desktop_score"),
    mobileFcp: decimal("mobile_fcp", { precision: 10, scale: 2 }),
    mobileLcp: decimal("mobile_lcp", { precision: 10, scale: 2 }),
    mobileTbt: decimal("mobile_tbt", { precision: 10, scale: 2 }),
    mobileCls: decimal("mobile_cls", { precision: 10, scale: 4 }),
    desktopFcp: decimal("desktop_fcp", { precision: 10, scale: 2 }),
    desktopLcp: decimal("desktop_lcp", { precision: 10, scale: 2 }),
    desktopTbt: decimal("desktop_tbt", { precision: 10, scale: 2 }),
    desktopCls: decimal("desktop_cls", { precision: 10, scale: 4 }),

    // Security data (if security scan)
    securityScore: int("security_score"),
    sslValid: boolean("ssl_valid"),
    malwareDetected: boolean("malware_detected"),
    vulnerabilities: text("vulnerabilities"), // JSON array

    // Full scan results (JSON)
    fullResults: text("full_results"), // Complete scan data as JSON

    scannedAt: timestamp("scanned_at").defaultNow(),
  },
  (table) => ({
    favoriteDomainIdIdx: index("favorite_domain_id_idx").on(
      table.favoriteDomainId,
    ),
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
    scanTypeIdx: index("scan_type_idx").on(table.scanType),
  }),
);

// Monitoring settings (automated daily scans)
export const monitoringSettings = mysqlTable(
  "monitoring_settings",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    frequency: varchar("frequency", { length: 50 }).default("daily"), // daily, weekly, monthly
    clientTag: varchar("client_tag", { length: 255 }), // Tag for client domains (for monthly reports)
    lastScanAt: timestamp("last_scan_at"),
    nextScanAt: timestamp("next_scan_at"),
    consecutiveFailures: int("consecutive_failures").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    enabledIdx: index("enabled_idx").on(table.enabled),
    nextScanIdx: index("next_scan_idx").on(table.nextScanAt),
    userDomainUnique: index("user_domain_unique").on(
      table.userId,
      table.domain,
    ),
  }),
);

// Alert settings (email notifications)
export const alertSettings = mysqlTable(
  "alert_settings",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),

    // Alert types
    alertPerformance: boolean("alert_performance").default(true),
    alertSecurity: boolean("alert_security").default(true),
    alertSsl: boolean("alert_ssl").default(true),
    alertDowntime: boolean("alert_downtime").default(true),

    // Thresholds
    performanceThreshold: int("performance_threshold").default(50), // Alert if score drops below this
    sslExpiryDays: int("ssl_expiry_days").default(30), // Alert if SSL expires within X days

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    enabledIdx: index("enabled_idx").on(table.enabled),
    userDomainUnique: index("user_domain_unique").on(
      table.userId,
      table.domain,
    ),
  }),
);

// Alert logs (track sent alerts to prevent spam)
export const alertLogs = mysqlTable(
  "alert_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    alertType: varchar("alert_type", { length: 50 }).notNull(), // performance, security, ssl, downtime
    severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
    message: text("message"),
    metadata: text("metadata"), // JSON with alert details
    sentAt: timestamp("sent_at").defaultNow(),
    emailSent: boolean("email_sent").default(false),
    emailError: text("email_error"),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    alertTypeIdx: index("alert_type_idx").on(table.alertType),
    sentAtIdx: index("sent_at_idx").on(table.sentAt),
  }),
);

// Usage tracking for pro features and upselling
export const usageTracking = mysqlTable(
  "usage_tracking",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    yearMonth: varchar("year_month", { length: 7 }).notNull(), // Format: YYYY-MM

    // Usage metrics
    scansCount: int("scans_count").default(0),
    domainsMonitored: int("domains_monitored").default(0),
    pdfExports: int("pdf_exports").default(0),
    aiInsightsGenerated: int("ai_insights_generated").default(0),
    apiCalls: int("api_calls").default(0),

    // Limits (for tiered plans)
    scansLimit: int("scans_limit").default(100), // Free tier limit
    domainsLimit: int("domains_limit").default(3),
    pdfExportsLimit: int("pdf_exports_limit").default(10),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    yearMonthIdx: index("year_month_idx").on(table.yearMonth),
    userMonthUnique: index("user_month_unique").on(
      table.userId,
      table.yearMonth,
    ),
  }),
);

// Analytics events (custom event tracking)
export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id"), // Nullable for anonymous users
    eventType: varchar("event_type", { length: 100 }).notNull(), // scan, export, signup, login, etc.
    eventCategory: varchar("event_category", { length: 100 }),
    eventAction: varchar("event_action", { length: 100 }),
    eventLabel: varchar("event_label", { length: 255 }),
    eventValue: int("event_value"),
    metadata: text("metadata"), // JSON for additional data
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    eventTypeIdx: index("event_type_idx").on(table.eventType),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

// ============================================================================
// LEVELING SYSTEM (boot.dev inspired)
// ============================================================================

// User stats for leveling system
export const userStats = mysqlTable(
  "user_stats",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().unique(),

    // Core progression
    level: int("level").notNull().default(1),
    xp: int("xp").notNull().default(0),
    totalXp: int("total_xp").notNull().default(0), // Lifetime XP earned

    // Activity tracking for XP rewards
    totalScans: int("total_scans").notNull().default(0),
    securityScans: int("security_scans").notNull().default(0),
    performanceScans: int("performance_scans").notNull().default(0),
    dnsScans: int("dns_scans").notNull().default(0),
    whoisScans: int("whois_scans").notNull().default(0),
    sslScans: int("ssl_scans").notNull().default(0),
    emailScans: int("email_scans").notNull().default(0),
    malwareScans: int("malware_scans").notNull().default(0),

    domainsVerified: int("domains_verified").notNull().default(0),
    domainsMonitored: int("domains_monitored").notNull().default(0),
    pdfExports: int("pdf_exports").notNull().default(0),
    aiInsightsUsed: int("ai_insights_used").notNull().default(0),

    // Streaks and engagement
    currentStreak: int("current_streak").notNull().default(0), // Days in a row
    longestStreak: int("longest_streak").notNull().default(0),
    lastActivityDate: timestamp("last_activity_date"),

    // Anonymous leaderboard rank (updated daily)
    globalRank: int("global_rank"),
    rankPercentile: decimal("rank_percentile", { precision: 5, scale: 2 }), // 0-100%
    leaderboardAlias: varchar("leaderboard_alias", { length: 50 }), // Optional public username

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    levelIdx: index("level_idx").on(table.level),
    totalXpIdx: index("total_xp_idx").on(table.totalXp),
    globalRankIdx: index("global_rank_idx").on(table.globalRank),
  }),
);

// Achievement definitions (static data, could be in code but DB allows dynamic updates)
export const achievements = mysqlTable("achievements", {
  id: int("id").primaryKey().autoincrement(),
  achievementKey: varchar("achievement_key", { length: 100 })
    .notNull()
    .unique(),

  // Display info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 100 }), // Emoji or icon name
  rarity: varchar("rarity", { length: 50 }).default("common"), // common, uncommon, rare, epic, legendary

  // Unlock criteria
  category: varchar("category", { length: 50 }).notNull(), // scans, domains, streaks, milestones, special
  requirement: text("requirement"), // JSON with unlock conditions
  xpReward: int("xp_reward").notNull().default(0),

  // Fantasy theming
  lore: text("lore"), // Flavor text for the achievement

  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievement unlocks
export const userAchievements = mysqlTable(
  "user_achievements",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    achievementId: int("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow(),
    progress: int("progress").default(0), // For multi-step achievements
    metadata: text("metadata"), // JSON for additional unlock data
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    achievementIdIdx: index("achievement_id_idx").on(table.achievementId),
    userAchievementUnique: index("user_achievement_unique").on(
      table.userId,
      table.achievementId,
    ),
    unlockedAtIdx: index("unlocked_at_idx").on(table.unlockedAt),
  }),
);

// XP transaction log (audit trail for XP awards)
export const xpTransactions = mysqlTable(
  "xp_transactions",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    xpAmount: int("xp_amount").notNull(),
    source: varchar("source", { length: 100 }).notNull(), // scan, achievement, daily_bonus, etc.
    sourceId: int("source_id"), // Reference to scan, achievement, etc.
    description: varchar("description", { length: 255 }),
    metadata: text("metadata"), // JSON for additional context
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    sourceIdx: index("source_idx").on(table.source),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

// XP reward dedupe claims for scan events (per user + source + domain)
export const xpScanRewardClaims = mysqlTable(
  "xp_scan_reward_claims",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    rewardSource: varchar("reward_source", { length: 100 }).notNull(),
    domainNormalized: varchar("domain_normalized", { length: 255 }).notNull(),
    claimedAt: timestamp("claimed_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainNormalizedIdx: index("domain_normalized_idx").on(
      table.domainNormalized,
    ),
    userSourceDomainUniqueIdx: uniqueIndex("user_source_domain_unique_idx").on(
      table.userId,
      table.rewardSource,
      table.domainNormalized,
    ),
  }),
);

// Items catalog (all available items in the game)
export const items = mysqlTable(
  "items",
  {
    id: int("id").primaryKey().autoincrement(),
    itemKey: varchar("item_key", { length: 100 }).notNull().unique(), // Unique identifier (e.g., 'treasure_chest_gold')
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),

    // Item properties
    rarity: varchar("rarity", { length: 50 }).notNull().default("common"), // common, uncommon, rare, epic, legendary
    category: varchar("category", { length: 100 }).notNull(), // chest, badge, crystal, knight, weapon, armor, consumable

    // Unlock requirements
    levelRequired: int("level_required").notNull().default(1),
    xpRequired: int("xp_required").default(0),
    achievementRequired: varchar("achievement_required", { length: 100 }), // Achievement key needed to unlock

    // Unlock conditions (JSON)
    unlockConditions: text("unlock_conditions"), // JSON: { scansRequired: 10, domainsVerified: 1, etc. }

    // Item stats/effects (JSON)
    effects: text("effects"), // JSON: { xpBoost: 1.1, scanSpeedBoost: 1.2, etc. }

    // Display properties
    sortOrder: int("sort_order").default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    itemKeyIdx: index("item_key_idx").on(table.itemKey),
    rarityIdx: index("rarity_idx").on(table.rarity),
    categoryIdx: index("category_idx").on(table.category),
    levelIdx: index("level_idx").on(table.levelRequired),
  }),
);

// User inventory (items owned by users)
export const userInventory = mysqlTable(
  "user_inventory",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    itemId: int("item_id").notNull(),

    // Acquisition details
    acquiredAt: timestamp("acquired_at").defaultNow(),
    acquiredFrom: varchar("acquired_from", { length: 100 }), // achievement, level_up, purchase, gift, quest

    // Item state
    quantity: int("quantity").notNull().default(1), // For stackable items
    isEquipped: boolean("is_equipped").notNull().default(false), // For equippable items (avatars, badges)
    isNew: boolean("is_new").notNull().default(true), // Show "NEW" badge

    // Usage tracking
    timesUsed: int("times_used").default(0),
    lastUsedAt: timestamp("last_used_at"),

    // Metadata
    metadata: text("metadata"), // JSON for item-specific data
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    itemIdIdx: index("item_id_idx").on(table.itemId),
    userItemUnique: index("user_item_unique").on(table.userId, table.itemId),
    acquiredAtIdx: index("acquired_at_idx").on(table.acquiredAt),
  }),
);

// Item unlock progress (track progress toward unlocking items)
export const itemUnlockProgress = mysqlTable(
  "item_unlock_progress",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    itemId: int("item_id").notNull(),

    // Progress tracking
    currentProgress: int("current_progress").notNull().default(0),
    requiredProgress: int("required_progress").notNull(),
    progressType: varchar("progress_type", { length: 50 }).notNull(), // scans, xp, achievements, domains_verified

    // Status
    isUnlocked: boolean("is_unlocked").notNull().default(false),
    unlockedAt: timestamp("unlocked_at"),

    // Notifications
    notificationSent: boolean("notification_sent").notNull().default(false),

    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    itemIdIdx: index("item_id_idx").on(table.itemId),
    userItemUnique: index("user_item_unique").on(table.userId, table.itemId),
    isUnlockedIdx: index("is_unlocked_idx").on(table.isUnlocked),
  }),
);

// ============================================================================
// INTELLIGENCE ENGINE SYSTEM (4-Engine Architecture)
// ============================================================================

// Engine A: DNS History - Store all DNS resolution history
export const dnsHistory = mysqlTable(
  "dns_history",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    subdomain: varchar("subdomain", { length: 255 }), // www, api, mail, cdn, etc.
    recordType: varchar("record_type", { length: 10 }).notNull(), // A, AAAA, CNAME, NS, MX, TXT, SOA, CAA
    recordValue: text("record_value").notNull(), // IP, hostname, or text value
    ttl: int("ttl"), // Time to live

    // Tracking
    firstSeen: timestamp("first_seen").notNull().defaultNow(),
    lastSeen: timestamp("last_seen").notNull().defaultNow(),
    seenCount: int("seen_count").notNull().default(1), // How many times this record was observed

    // Resolution metadata
    resolver: varchar("resolver", { length: 100 }), // Which DNS resolver was used (8.8.8.8, 1.1.1.1, etc.)
    isAuthoritative: boolean("is_authoritative").default(false), // Was this from authoritative nameserver?
    authoritativeNs: varchar("authoritative_ns", { length: 255 }), // Authoritative nameserver queried

    // Confidence scoring
    confidenceScore: int("confidence_score").default(100), // 0-100 confidence in this record

    // Change detection
    previousValue: text("previous_value"), // Previous value if changed
    changedAt: timestamp("changed_at"), // When this record changed

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    subdomainIdx: index("subdomain_idx").on(table.subdomain),
    recordTypeIdx: index("record_type_idx").on(table.recordType),
    firstSeenIdx: index("first_seen_idx").on(table.firstSeen),
    lastSeenIdx: index("last_seen_idx").on(table.lastSeen),
    domainRecordIdx: index("domain_record_idx").on(
      table.domain,
      table.recordType,
    ),
  }),
);

// Engine B: IP Fingerprints - Store IP scan results
export const ipFingerprints = mysqlTable(
  "ip_fingerprints",
  {
    id: int("id").primaryKey().autoincrement(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull().unique(), // IPv4 or IPv6

    // Port scanning results
    openPorts: text("open_ports"), // JSON array of open ports
    closedPorts: text("closed_ports"), // JSON array of closed ports (sample)
    filteredPorts: text("filtered_ports"), // JSON array of filtered ports

    // Service banners (JSON object: { port: banner })
    serviceBanners: text("service_banners"), // JSON: { "80": "nginx/1.21.0", "22": "OpenSSH_8.2p1" }

    // TLS certificate data (JSON)
    tlsCertData: text("tls_cert_data"), // JSON: { issuer, sans, validFrom, validTo, chain }

    // HTTP responses (JSON object: { port: response })
    httpResponses: text("http_responses"), // JSON: { "80": { headers, body_sample, status } }

    // Derived fingerprints
    serverType: varchar("server_type", { length: 100 }), // nginx, Apache, IIS, etc.
    serverVersion: varchar("server_version", { length: 100 }),
    detectedServices: text("detected_services"), // JSON array of detected services

    // Scanning metadata
    lastScanned: timestamp("last_scanned").notNull().defaultNow(),
    scanDuration: int("scan_duration"), // Milliseconds
    scanConfidence: int("scan_confidence").default(100), // 0-100 confidence in results
    scanErrors: text("scan_errors"), // JSON array of errors during scan

    // ASN and geolocation (from IPinfo.io)
    asn: varchar("asn", { length: 20 }), // AS number
    asnOrg: varchar("asn_org", { length: 255 }), // ASN organization name
    country: varchar("country", { length: 2 }), // ISO country code
    city: varchar("city", { length: 100 }),
    region: varchar("region", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    ipAddressIdx: index("ip_address_idx").on(table.ipAddress),
    asnIdx: index("asn_idx").on(table.asn),
    lastScannedIdx: index("last_scanned_idx").on(table.lastScanned),
    serverTypeIdx: index("server_type_idx").on(table.serverType),
  }),
);

// Engine C: Tech Signatures - Store technology detection results
export const techSignatures = mysqlTable(
  "tech_signatures",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),

    // Technology details
    techName: varchar("tech_name", { length: 255 }).notNull(), // WordPress, React, Cloudflare, etc.
    techVersion: varchar("tech_version", { length: 100 }), // Version if detected
    techCategory: varchar("tech_category", { length: 100 }).notNull(), // CMS, Framework, CDN, Analytics, etc.

    // Detection confidence
    confidence: int("confidence").notNull(), // 0-100 confidence score

    // Evidence (JSON array of detection signals)
    evidenceJson: text("evidence_json").notNull(), // JSON: [{ type: 'header', key: 'Server', value: 'nginx' }]

    // Detection method
    detectionMethod: varchar("detection_method", { length: 50 }).notNull(), // http, js, urlscan, signature

    // Timing
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),

    // Validation
    isValidated: boolean("is_validated").default(false), // Has this been manually verified?
    isFalsePositive: boolean("is_false_positive").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    techNameIdx: index("tech_name_idx").on(table.techName),
    techCategoryIdx: index("tech_category_idx").on(table.techCategory),
    confidenceIdx: index("confidence_idx").on(table.confidence),
    detectedAtIdx: index("detected_at_idx").on(table.detectedAt),
    domainTechIdx: index("domain_tech_idx").on(table.domain, table.techName),
  }),
);

// Engine D: Hosting Attribution - Store final hosting determinations
export const hostingAttribution = mysqlTable(
  "hosting_attribution",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull().unique(),

    // Primary hosting determination
    edgeProvider: varchar("edge_provider", { length: 255 }), // CDN/WAF (Cloudflare, Fastly, etc.)
    originHost: varchar("origin_host", { length: 255 }), // Actual hosting provider (AWS, GCP, etc.)

    // Network details
    asn: varchar("asn", { length: 20 }),
    asnOrg: varchar("asn_org", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),

    // Confidence scoring
    confidenceScore: int("confidence_score").notNull(), // 0-100 overall confidence
    edgeConfidence: int("edge_confidence"), // 0-100 confidence in edge provider
    originConfidence: int("origin_confidence"), // 0-100 confidence in origin host

    // Evidence weights (JSON object with weighted signals)
    evidenceWeights: text("evidence_weights"), // JSON: { cnameMatch: 40, asnMatch: 25, httpHeader: 15, ... }

    // Detection metadata
    detectionMethod: varchar("detection_method", { length: 100 }), // fusion, ipinfo, dns, http, etc.

    // Additional details
    serverType: varchar("server_type", { length: 100 }), // nginx, Apache, IIS, etc.
    framework: varchar("framework", { length: 100 }), // React, WordPress, Shopify, etc.
    isCustomCoded: boolean("is_custom_coded").default(false),

    // Timing
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
    lastVerified: timestamp("last_verified"),

    // Validation
    isValidated: boolean("is_validated").default(false),
    validatedBy: varchar("validated_by", { length: 100 }), // manual, user_feedback, ground_truth

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    edgeProviderIdx: index("edge_provider_idx").on(table.edgeProvider),
    originHostIdx: index("origin_host_idx").on(table.originHost),
    asnIdx: index("asn_idx").on(table.asn),
    confidenceIdx: index("confidence_idx").on(table.confidenceScore),
    lastUpdatedIdx: index("last_updated_idx").on(table.lastUpdated),
  }),
);

// Scan Cache - Cache URLScan.io and IPinfo.io API responses
export const scanCache = mysqlTable(
  "scan_cache",
  {
    id: int("id").primaryKey().autoincrement(),
    lookupKey: varchar("lookup_key", { length: 500 }).notNull().unique(), // Hash of request params
    apiSource: varchar("api_source", { length: 50 }).notNull(), // urlscan, ipinfo, rdap, bgp

    // Cached response
    responseJson: text("response_json").notNull(), // Full API response as JSON
    responseStatus: int("response_status").default(200), // HTTP status code

    // Cache metadata
    cachedAt: timestamp("cached_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(), // When this cache entry expires
    hitCount: int("hit_count").default(0), // How many times this cache was used
    lastHitAt: timestamp("last_hit_at"),

    // Request metadata
    requestParams: text("request_params"), // JSON of original request params

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    lookupKeyIdx: index("lookup_key_idx").on(table.lookupKey),
    apiSourceIdx: index("api_source_idx").on(table.apiSource),
    expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
    cachedAtIdx: index("cached_at_idx").on(table.cachedAt),
  }),
);

// Signature Library - Store tech detection signatures
export const signatureLibrary = mysqlTable(
  "signature_library",
  {
    id: int("id").primaryKey().autoincrement(),
    techName: varchar("tech_name", { length: 255 }).notNull(),
    techVersion: varchar("tech_version", { length: 100 }), // Specific version or null for any
    category: varchar("category", { length: 100 }).notNull(), // CMS, Framework, CDN, Server, etc.

    // Signal details
    signalType: varchar("signal_type", { length: 50 }).notNull(), // header, cookie, html, script, meta, path
    pattern: text("pattern").notNull(), // Regex or exact match pattern
    patternType: varchar("pattern_type", { length: 20 }).default("regex"), // regex, exact, contains

    // Matching criteria (JSON)
    matchCriteria: text("match_criteria"), // JSON: { key: 'Server', value: 'nginx/.*', location: 'header' }

    // Confidence weight
    confidenceWeight: int("confidence_weight").notNull(), // 30-100 (weak to strong signal)

    // Metadata
    description: text("description"),
    source: varchar("source", { length: 100 }), // wappalyzer, custom, community, verified
    isActive: boolean("is_active").notNull().default(true),

    // Version detection
    versionPattern: text("version_pattern"), // Regex to extract version number

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    techNameIdx: index("tech_name_idx").on(table.techName),
    categoryIdx: index("category_idx").on(table.category),
    signalTypeIdx: index("signal_type_idx").on(table.signalType),
    isActiveIdx: index("is_active_idx").on(table.isActive),
    techCategoryIdx: index("tech_category_idx").on(
      table.techName,
      table.category,
    ),
  }),
);

// Intelligence scans - stores complete scan results from all engines
export const intelligenceScans = mysqlTable(
  "intelligence_scans",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id"), // Nullable for anonymous intelligence scans
    domain: varchar("domain", { length: 255 }).notNull(),

    // Hosting attribution results
    edgeProvider: varchar("edge_provider", { length: 100 }),
    edgeConfidence: int("edge_confidence"),
    originHost: varchar("origin_host", { length: 100 }),
    originConfidence: int("origin_confidence"),
    confidenceScore: int("confidence_score"),
    detectionMethod: varchar("detection_method", { length: 50 }),

    // Complete scan data (JSON)
    hostingData: text("hosting_data"), // Full fusion engine results
    dnsData: text("dns_data"), // DNS resolution results
    ipData: text("ip_data"), // IP fingerprinting results
    techData: text("tech_data"), // Technology detection results

    // Summary stats
    techCount: int("tech_count").default(0),
    recordCount: int("record_count").default(0),
    openPorts: text("open_ports"), // JSON array

    // Metadata
    scanDuration: int("scan_duration"), // milliseconds
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    userCreatedIdx: index("user_created_idx").on(table.userId, table.createdAt),
    domainCreatedIdx: index("domain_created_idx").on(
      table.domain,
      table.createdAt,
    ),
  }),
);

// ============================================================================
// PHASE 9: ADVANCED FEATURES - MONITORING, ALERTS, RECOMMENDATIONS
// ============================================================================

// Monitoring configuration
export const monitoringConfig = mysqlTable(
  "monitoring_config",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    enabled: boolean("enabled").default(true),
    checkInterval: int("check_interval").default(300), // seconds
    regions: json("regions").$type<string[]>(),
    alertThresholds: json("alert_thresholds").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
  }),
);

// Uptime checks
export const uptimeChecks = mysqlTable(
  "uptime_checks",
  {
    id: int("id").primaryKey().autoincrement(),
    monitoringConfigId: int("monitoring_config_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["up", "down", "degraded"]).notNull(),
    responseTime: int("response_time"), // milliseconds
    statusCode: int("status_code"),
    errorMessage: text("error_message"),
    region: varchar("region", { length: 50 }),
    checkedAt: timestamp("checked_at").defaultNow(),
  },
  (table) => ({
    configIdIdx: index("config_id_idx").on(table.monitoringConfigId),
    domainIdx: index("domain_idx").on(table.domain),
    checkedAtIdx: index("checked_at_idx").on(table.checkedAt),
  }),
);

// Incidents
export const incidents = mysqlTable(
  "incidents",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    severity: mysqlEnum("severity", [
      "critical",
      "high",
      "medium",
      "low",
    ]).notNull(),
    status: mysqlEnum("status", [
      "open",
      "investigating",
      "resolved",
      "closed",
    ]).default("open"),
    startedAt: timestamp("started_at").notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    statusIdx: index("status_idx").on(table.status),
  }),
);

// Alerts
export const alerts = mysqlTable(
  "alerts",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    type: mysqlEnum("type", [
      "uptime",
      "performance",
      "security",
      "ssl",
      "dns",
      "technology",
    ]).notNull(),
    severity: mysqlEnum("severity", [
      "critical",
      "high",
      "medium",
      "low",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    data: json("data").$type<Record<string, unknown>>(),
    isRead: boolean("is_read").default(false),
    isArchived: boolean("is_archived").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    typeIdx: index("type_idx").on(table.type),
    isReadIdx: index("is_read_idx").on(table.isRead),
  }),
);

// Alert rules
export const alertRules = mysqlTable(
  "alert_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    enabled: boolean("enabled").default(true),
    conditions: json("conditions").$type<Record<string, unknown>>().notNull(),
    actions: json("actions").$type<Record<string, unknown>>().notNull(),
    frequencyLimit: int("frequency_limit").default(3600), // seconds
    lastTriggeredAt: timestamp("last_triggered_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    enabledIdx: index("enabled_idx").on(table.enabled),
  }),
);

// Notification channels
export const notificationChannels = mysqlTable(
  "notification_channels",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    type: mysqlEnum("type", [
      "email",
      "sms",
      "slack",
      "discord",
      "teams",
      "webhook",
    ]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    config: json("config").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    typeIdx: index("type_idx").on(table.type),
  }),
);

// Performance baselines
export const performanceBaselines = mysqlTable(
  "performance_baselines",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    baselineValue: float("baseline_value").notNull(),
    stdDeviation: float("std_deviation"),
    sampleSize: int("sample_size"),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  (table) => ({
    domainMetricIdx: index("domain_metric_idx").on(
      table.domain,
      table.metricName,
    ),
  }),
);

// Recommendations
export const recommendationsTable = mysqlTable(
  "recommendations",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    priority: mysqlEnum("priority", [
      "critical",
      "high",
      "medium",
      "low",
    ]).notNull(),
    impactScore: int("impact_score"), // 1-100
    difficulty: mysqlEnum("difficulty", ["easy", "moderate", "hard"]).notNull(),
    estimatedTime: varchar("estimated_time", { length: 50 }),
    implementationGuide: text("implementation_guide"),
    status: mysqlEnum("status", ["active", "completed", "dismissed"]).default(
      "active",
    ),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    statusIdx: index("status_idx").on(table.status),
  }),
);

// Competitors
export const competitors = mysqlTable(
  "competitors",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    userDomain: varchar("user_domain", { length: 255 }).notNull(),
    competitorDomain: varchar("competitor_domain", { length: 255 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    userDomainIdx: index("user_domain_idx").on(table.userDomain),
  }),
);

// ============================================================================
// PHASE 12: ADVANCED REPORTING SYSTEM
// ============================================================================

// Report Templates - Pre-built and custom report templates
export const reportTemplates = mysqlTable(
  "report_templates",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id"), // null for system templates
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).notNull(), // 'performance', 'security', 'uptime', 'comprehensive', 'comparison'
    sections: json("sections").$type<string[]>().notNull(), // ['summary', 'performance', 'security', ...]
    filters: json("filters").$type<Record<string, unknown>>(),
    isDefault: boolean("is_default").default(false),
    isSystem: boolean("is_system").default(false), // true for built-in templates
    isCustom: boolean("is_custom").default(false), // true for user-created templates
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    typeIdx: index("type_idx").on(table.type),
  }),
);

// Generated Reports - History of all generated reports
export const reports = mysqlTable(
  "reports",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    templateId: int("template_id"),
    domain: varchar("domain", { length: 255 }),
    title: varchar("title", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    format: varchar("format", { length: 20 }).notNull(), // 'pdf', 'html', 'json', 'csv'
    fileUrl: varchar("file_url", { length: 500 }),
    fileSize: int("file_size"), // bytes
    data: text("data"), // JSON data used to generate report
    status: varchar("status", { length: 20 }).default("generating"), // 'generating', 'completed', 'failed'
    errorMessage: text("error_message"),
    generatedAt: timestamp("generated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    statusIdx: index("status_idx").on(table.status),
    generatedAtIdx: index("generated_at_idx").on(table.generatedAt),
  }),
);

// Scheduled Reports - Automated report generation
export const scheduledReports = mysqlTable(
  "scheduled_reports",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    templateId: int("template_id").notNull(),
    domain: varchar("domain", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    frequency: varchar("frequency", { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly'
    format: varchar("format", { length: 20 }).notNull(), // 'pdf', 'html', 'csv'
    dayOfWeek: int("day_of_week"), // 0-6 for weekly
    dayOfMonth: int("day_of_month"), // 1-31 for monthly
    time: varchar("time", { length: 5 }).notNull(), // HH:MM format
    recipients: json("recipients").$type<string[]>(), // email addresses (optional)
    enabled: boolean("enabled").default(true),
    lastRun: timestamp("last_run"),
    nextRun: timestamp("next_run"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    enabledIdx: index("enabled_idx").on(table.enabled),
    nextRunIdx: index("next_run_idx").on(table.nextRun),
  }),
);

// ============================================================================
// PHASE 2: ADVANCED INTELLIGENCE ANALYSIS
// ============================================================================

// Intelligence Correlations - Cross-reference analysis results
export const intelligenceCorrelations = mysqlTable(
  "intelligence_correlations",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    correlationType: varchar("correlation_type", { length: 50 }).notNull(), // 'hosting', 'ownership', 'technology', 'infrastructure', 'security'
    sourceA: varchar("source_a", { length: 50 }).notNull(), // 'dns', 'ip', 'whois', 'technology', 'urlscan'
    sourceB: varchar("source_b", { length: 50 }).notNull(),
    confidence: int("confidence").notNull(), // 0-100
    confidenceLevel: varchar("confidence_level", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'very_high'
    description: text("description").notNull(),
    evidence: json("evidence").$type<unknown[]>(), // Array of evidence objects
    details: json("details").$type<unknown>(), // Type-specific correlation details
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    typeIdx: index("type_idx").on(table.correlationType),
    confidenceIdx: index("confidence_idx").on(table.confidence),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

// Intelligence Reports Cache - Cache complete intelligence reports
export const intelligenceReportsCache = mysqlTable(
  "intelligence_reports_cache",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    reportData: json("report_data").$type<unknown>().notNull(), // Complete correlation analysis
    expiresAt: timestamp("expires_at").notNull(), // TTL: 1 hour
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
  }),
);

// ============================================================================
// PHASE 1: INTELLIGENCE DATA TABLES
// ============================================================================

// DNS Records - Store DNS lookup results
export const dnsRecords = mysqlTable(
  "dns_records",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    recordType: varchar("record_type", { length: 10 }).notNull(), // A, AAAA, MX, TXT, NS, CNAME, etc.
    value: text("value").notNull(), // Record value
    ttl: int("ttl"), // Time to live
    priority: int("priority"), // For MX records
    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    recordTypeIdx: index("record_type_idx").on(table.recordType),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
  }),
);

// IP Intelligence - Store IP geolocation and ASN data
export const ipIntelligence = mysqlTable(
  "ip_intelligence",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv4 or IPv6
    ipVersion: int("ip_version").notNull(), // 4 or 6

    // Geolocation
    country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
    countryName: varchar("country_name", { length: 100 }),
    region: varchar("region", { length: 100 }),
    city: varchar("city", { length: 100 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    timezone: varchar("timezone", { length: 50 }),

    // Network
    asn: varchar("asn", { length: 20 }), // Autonomous System Number
    asnOrganization: varchar("asn_organization", { length: 255 }),
    isp: varchar("isp", { length: 255 }),
    organization: varchar("organization", { length: 255 }),

    // Security
    isProxy: boolean("is_proxy").default(false),
    isVpn: boolean("is_vpn").default(false),
    isTor: boolean("is_tor").default(false),
    isHosting: boolean("is_hosting").default(false),
    threatLevel: varchar("threat_level", { length: 20 }), // low, medium, high, critical

    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    ipAddressIdx: index("ip_address_idx").on(table.ipAddress),
    asnIdx: index("asn_idx").on(table.asn),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
  }),
);

// WHOIS Records - Store domain registration data
export const whoisRecords = mysqlTable(
  "whois_records",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull().unique(),

    // Registrar Information
    registrar: varchar("registrar", { length: 255 }),
    registrarUrl: varchar("registrar_url", { length: 500 }),
    registrarIanaId: varchar("registrar_iana_id", { length: 50 }),

    // Dates
    createdDate: timestamp("created_date"),
    updatedDate: timestamp("updated_date"),
    expiryDate: timestamp("expiry_date"),

    // Status
    status: json("status").$type<string[]>(), // Array of status codes

    // Contacts (may be redacted due to GDPR)
    registrantName: varchar("registrant_name", { length: 255 }),
    registrantOrganization: varchar("registrant_organization", { length: 255 }),
    registrantEmail: varchar("registrant_email", { length: 255 }),
    registrantCountry: varchar("registrant_country", { length: 2 }),

    adminName: varchar("admin_name", { length: 255 }),
    adminEmail: varchar("admin_email", { length: 255 }),

    techName: varchar("tech_name", { length: 255 }),
    techEmail: varchar("tech_email", { length: 255 }),

    // Nameservers
    nameservers: json("nameservers").$type<string[]>(),

    // DNSSEC
    dnssec: varchar("dnssec", { length: 50 }),

    // Raw WHOIS text (for reference)
    rawWhois: text("raw_whois"),

    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    expiryDateIdx: index("expiry_date_idx").on(table.expiryDate),
    registrarIdx: index("registrar_idx").on(table.registrar),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
  }),
);

// Technology Stack - Store detected technologies
export const technologyStack = mysqlTable(
  "technology_stack",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),

    // Technology Details
    name: varchar("name", { length: 255 }).notNull(), // e.g., "WordPress", "React", "Nginx"
    version: varchar("version", { length: 100 }), // e.g., "5.9.3"
    category: varchar("category", { length: 100 }).notNull(), // e.g., "CMS", "JavaScript Framework", "Web Server"

    // Detection
    confidence: int("confidence").notNull(), // 0-100
    detectionMethod: varchar("detection_method", { length: 50 }), // header, meta, script, etc.

    // Metadata
    icon: varchar("icon", { length: 500 }), // URL to technology icon
    website: varchar("website", { length: 500 }), // Official website
    description: text("description"),

    // Security
    hasKnownVulnerabilities: boolean("has_known_vulnerabilities").default(
      false,
    ),
    isOutdated: boolean("is_outdated").default(false),
    isEol: boolean("is_eol").default(false), // End of life
    latestVersion: varchar("latest_version", { length: 100 }),

    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    categoryIdx: index("category_idx").on(table.category),
    nameIdx: index("name_idx").on(table.name),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
  }),
);

// URLScan Results - Store security scan results from URLScan.io
export const urlscanResults = mysqlTable(
  "urlscan_results",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),

    // URLScan.io IDs
    scanId: varchar("scan_id", { length: 100 }).notNull().unique(), // UUID from URLScan
    scanUrl: varchar("scan_url", { length: 500 }), // URL to view scan results

    // Verdict
    verdict: varchar("verdict", { length: 50 }), // malicious, suspicious, clean
    score: int("score"), // 0-100 maliciousness score

    // Threats
    malwareDetected: boolean("malware_detected").default(false),
    phishingDetected: boolean("phishing_detected").default(false),
    suspiciousActivity: boolean("suspicious_activity").default(false),

    // Categories
    categories: json("categories").$type<string[]>(), // Array of threat categories
    tags: json("tags").$type<string[]>(), // Array of tags

    // Technical Details
    ipAddress: varchar("ip_address", { length: 45 }),
    asn: varchar("asn", { length: 20 }),
    country: varchar("country", { length: 2 }),
    server: varchar("server", { length: 255 }), // Server header

    // SSL/TLS
    tlsVersion: varchar("tls_version", { length: 20 }),
    tlsIssuer: varchar("tls_issuer", { length: 255 }),
    tlsValidFrom: timestamp("tls_valid_from"),
    tlsValidTo: timestamp("tls_valid_to"),

    // Resources
    totalRequests: int("total_requests"),
    totalDomains: int("total_domains"),
    totalIps: int("total_ips"),

    // Screenshot
    screenshotUrl: varchar("screenshot_url", { length: 500 }),

    // Raw data (for reference)
    rawData: json("raw_data").$type<unknown>(),

    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    scanIdIdx: index("scan_id_idx").on(table.scanId),
    verdictIdx: index("verdict_idx").on(table.verdict),
    scannedAtIdx: index("scanned_at_idx").on(table.scannedAt),
  }),
);

// Background Jobs - Generic async job queue for scheduler
export const backgroundJobs = mysqlTable(
  "background_jobs",
  {
    id: int("id").primaryKey().autoincrement(),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    priority: varchar("priority", { length: 20 }).notNull().default("normal"),
    payload: text("payload").notNull(),
    attempts: int("attempts").notNull().default(0),
    maxAttempts: int("max_attempts").notNull().default(3),
    scheduledFor: timestamp("scheduled_for").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    error: text("error"),
    result: text("result"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    statusIdx: index("status_idx").on(table.status),
    scheduledForIdx: index("scheduled_for_idx").on(table.scheduledFor),
    typeIdx: index("type_idx").on(table.type),
  }),
);

// ============================================================================
// BATCH ANALYSIS SYSTEM
// ============================================================================

/**
 * Batch Analysis Jobs
 * Tracks batch domain analysis jobs with progress and results
 */
export const batchAnalysisJobs = mysqlTable(
  "batch_analysis_jobs",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID
    userId: int("user_id").notNull(),

    // Job metadata
    name: varchar("name", { length: 255 }), // Optional user-provided name
    status: mysqlEnum("status", [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),

    // Progress tracking
    totalDomains: int("total_domains").notNull(),
    completedDomains: int("completed_domains").notNull().default(0),
    failedDomains: int("failed_domains").notNull().default(0),
    progress: int("progress").notNull().default(0), // 0-100 percentage

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    estimatedCompletionAt: timestamp("estimated_completion_at"),

    // Error tracking
    error: text("error"),

    // Settings
    collectDns: boolean("collect_dns").notNull().default(true),
    collectWhois: boolean("collect_whois").notNull().default(true),
    collectIp: boolean("collect_ip").notNull().default(true),
    collectTech: boolean("collect_tech").notNull().default(true),
    collectUrlscan: boolean("collect_urlscan").notNull().default(false), // Expensive, off by default

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    statusIdx: index("status_idx").on(table.status),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  }),
);

/**
 * Batch Analysis Domains
 * Individual domains within a batch job
 */
export const batchAnalysisDomains = mysqlTable(
  "batch_analysis_domains",
  {
    id: int("id").primaryKey().autoincrement(),
    jobId: varchar("job_id", { length: 36 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),

    // Processing status
    status: mysqlEnum("status", [
      "pending",
      "processing",
      "completed",
      "failed",
    ])
      .notNull()
      .default("pending"),

    // Results (stored as JSON for flexibility)
    securityScore: int("security_score"),
    grade: varchar("grade", { length: 5 }),
    expiryDays: int("expiry_days"),
    hostingProvider: varchar("hosting_provider", { length: 255 }),
    criticalIssues: int("critical_issues").default(0),
    highIssues: int("high_issues").default(0),
    mediumIssues: int("medium_issues").default(0),
    lowIssues: int("low_issues").default(0),

    // Full results (JSON)
    results: json("results").$type<unknown>(),

    // Error tracking
    error: text("error"),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    jobIdIdx: index("job_id_idx").on(table.jobId),
    domainIdx: index("domain_idx").on(table.domain),
    statusIdx: index("status_idx").on(table.status),
  }),
);

/**
 * Batch Analysis Statistics
 * Aggregated statistics for completed batch jobs
 */
export const batchAnalysisStats = mysqlTable(
  "batch_analysis_stats",
  {
    id: int("id").primaryKey().autoincrement(),
    jobId: varchar("job_id", { length: 36 }).notNull().unique(),

    // Overall statistics
    averageScore: float("average_score"),
    totalCriticalIssues: int("total_critical_issues").default(0),
    totalHighIssues: int("total_high_issues").default(0),
    totalMediumIssues: int("total_medium_issues").default(0),
    totalLowIssues: int("total_low_issues").default(0),

    // Expiry statistics
    expiringWithin30Days: int("expiring_within_30_days").default(0),
    expiringWithin60Days: int("expiring_within_60_days").default(0),
    expiringWithin90Days: int("expiring_within_90_days").default(0),
    expired: int("expired").default(0),

    // Grade distribution
    gradeAPlus: int("grade_a_plus").default(0),
    gradeA: int("grade_a").default(0),
    gradeAMinus: int("grade_a_minus").default(0),
    gradeBPlus: int("grade_b_plus").default(0),
    gradeB: int("grade_b").default(0),
    gradeBMinus: int("grade_b_minus").default(0),
    gradeCPlus: int("grade_c_plus").default(0),
    gradeC: int("grade_c").default(0),
    gradeCMinus: int("grade_c_minus").default(0),
    gradeD: int("grade_d").default(0),
    gradeF: int("grade_f").default(0),

    // Top hosting providers (JSON array)
    topHostingProviders: json("top_hosting_providers").$type<
      Array<{ provider: string; count: number }>
    >(),

    // Top issues (JSON array)
    topIssues:
      json("top_issues").$type<
        Array<{ issue: string; count: number; severity: string }>
      >(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    jobIdIdx: index("job_id_idx").on(table.jobId),
  }),
);

/**
 * WHOIS Historical Tracking
 * Phase 3 Task 4: Track WHOIS record changes over time
 */

/**
 * WHOIS History - Historical snapshots of WHOIS records
 */
export const whoisHistory = mysqlTable(
  "whois_history",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),

    // Registration Information
    registrar: varchar("registrar", { length: 255 }),
    registrarIanaId: varchar("registrar_iana_id", { length: 50 }),
    registrantName: varchar("registrant_name", { length: 255 }),
    registrantEmail: varchar("registrant_email", { length: 255 }),
    registrantOrganization: varchar("registrant_organization", { length: 255 }),
    registrantCountry: varchar("registrant_country", { length: 100 }),

    // Important Dates
    creationDate: timestamp("creation_date"),
    expirationDate: timestamp("expiration_date"),
    updatedDate: timestamp("updated_date"),

    // Technical Details
    nameservers: json("nameservers").$type<string[]>(),
    status: json("status").$type<string[]>(),
    dnssecEnabled: boolean("dnssec_enabled").default(false),
    transferLock: boolean("transfer_lock").default(false),

    // Full WHOIS Data
    rawWhoisData: json("raw_whois_data"),

    // Metadata
    dataSource: varchar("data_source", { length: 50 }).default("whoisfreaks"),
    scanId: varchar("scan_id", { length: 100 }),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    snapshotDateIdx: index("snapshot_date_idx").on(table.snapshotDate),
    domainDateIdx: index("domain_date_idx").on(
      table.domain,
      table.snapshotDate,
    ),
    registrarIdx: index("registrar_idx").on(table.registrar),
    registrantEmailIdx: index("registrant_email_idx").on(table.registrantEmail),
    expirationDateIdx: index("expiration_date_idx").on(table.expirationDate),
  }),
);

/**
 * WHOIS Changes - Detected changes between WHOIS snapshots
 */
export const whoisChanges = mysqlTable(
  "whois_changes",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    changeDate: timestamp("change_date").notNull().defaultNow(),
    changeType: varchar("change_type", { length: 50 }).notNull(),
    fieldName: varchar("field_name", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    severity: mysqlEnum("severity", [
      "critical",
      "high",
      "medium",
      "low",
      "info",
    ]).default("info"),
    isSuspicious: boolean("is_suspicious").default(false),
    previousSnapshotId: int("previous_snapshot_id"),
    currentSnapshotId: int("current_snapshot_id"),
    notes: text("notes"),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    changeDateIdx: index("change_date_idx").on(table.changeDate),
    changeTypeIdx: index("change_type_idx").on(table.changeType),
    severityIdx: index("severity_idx").on(table.severity),
    suspiciousIdx: index("suspicious_idx").on(table.isSuspicious),
    domainDateIdx: index("domain_date_idx").on(table.domain, table.changeDate),
  }),
);

/**
 * WHOIS Alerts - Alerts for significant WHOIS changes
 */
export const whoisAlerts = mysqlTable(
  "whois_alerts",
  {
    id: int("id").primaryKey().autoincrement(),
    domain: varchar("domain", { length: 255 }).notNull(),
    alertType: varchar("alert_type", { length: 50 }).notNull(),
    severity: mysqlEnum("severity", [
      "critical",
      "high",
      "medium",
      "low",
    ]).default("medium"),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    changeIds: json("change_ids").$type<number[]>(),
    triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
    acknowledged: boolean("acknowledged").default(false),
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: varchar("acknowledged_by", { length: 100 }),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    alertTypeIdx: index("alert_type_idx").on(table.alertType),
    severityIdx: index("severity_idx").on(table.severity),
    triggeredAtIdx: index("triggered_at_idx").on(table.triggeredAt),
    acknowledgedIdx: index("acknowledged_idx").on(table.acknowledged),
  }),
);

/**
 * SEO Checklist System Tables
 * Manages SEO readiness scans and checklist results
 */
export const seoChecklistScans = mysqlTable("seo_checklist_scans", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  scanId: varchar("scan_id", { length: 36 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull(),
  inputUrl: text("input_url").notNull(),
  finalUrl: text("final_url"),
  redirectChain: json("redirect_chain"),
  status: mysqlEnum("status", [
    "pending",
    "running",
    "completed",
    "failed",
  ]).default("pending"),
  decision: mysqlEnum("decision", ["ready", "fix_first", "not_ready"]),
  totalScore: int("total_score"),
  categoryScores: json("category_scores"),
  summary: json("summary"),
  checklist: json("checklist"),
  evidence: json("evidence"),
  errors: json("errors"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const seoChecklistPages = mysqlTable("seo_checklist_pages", {
  id: int("id").primaryKey().autoincrement(),
  scanId: varchar("scan_id", { length: 36 }).notNull(),
  url: text("url").notNull(),
  statusCode: int("status_code"),
  fetchTimeMs: int("fetch_time_ms"),
  pageTitle: text("page_title"),
  metaDescription: text("meta_description"),
  h1Present: boolean("h1_present").default(false),
  h1Text: text("h1_text"),
  structuredData: json("structured_data"),
  socialTags: json("social_tags"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Avatar System Tables
 * Manages user avatars with rarity tiers and unlock levels
 */
export const avatars = mysqlTable(
  "avatars",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    rarity: mysqlEnum("rarity", [
      "default",
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
    ])
      .notNull()
      .default("common"),
    unlockLevel: int("unlock_level").notNull().default(0),
    imagePath: varchar("image_path", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    rarityIdx: index("rarity_idx").on(table.rarity),
    unlockLevelIdx: index("unlock_level_idx").on(table.unlockLevel),
    isActiveIdx: index("is_active_idx").on(table.isActive),
  }),
);

export const userAvatars = mysqlTable(
  "user_avatars",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    avatarId: int("avatar_id").notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    avatarIdIdx: index("avatar_id_idx").on(table.avatarId),
    userAvatarUniqueIdx: index("user_avatar_unique_idx").on(
      table.userId,
      table.avatarId,
    ),
  }),
);

/**
 * Filter Presets Table
 * Allows users to save and reuse filter configurations
 */
export const filterPresets = mysqlTable(
  "filter_presets",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    filters: json("filters").notNull(), // JSON object with filter configuration
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
  }),
);

/**
 * Favorites Table (Enhanced)
 * Stores user's favorite domains with tags and notes
 */
export const favorites = mysqlTable(
  "favorites",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    scanId: int("scan_id"), // Reference to scanHistory
    notes: text("notes"),
    tags: json("tags"), // Array of tags
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    domainIdx: index("domain_idx").on(table.domain),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    userDomainUniqueIdx: index("user_domain_unique_idx").on(
      table.userId,
      table.domain,
    ),
  }),
);

/**
 * Performance History Table (Enhanced)
 * Stores performance metrics over time for trending
 */
export const performanceHistoryEnhanced = mysqlTable(
  "performance_history_enhanced",
  {
    id: int("id").primaryKey().autoincrement(),
    scanId: int("scan_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    userId: int("user_id"),
    mobileScore: int("mobile_score"),
    desktopScore: int("desktop_score"),
    fcpMobile: decimal("fcp_mobile", { precision: 10, scale: 2 }),
    lcpMobile: decimal("lcp_mobile", { precision: 10, scale: 2 }),
    tbtMobile: decimal("tbt_mobile", { precision: 10, scale: 2 }),
    clsMobile: decimal("cls_mobile", { precision: 10, scale: 3 }),
    speedIndexMobile: decimal("speed_index_mobile", {
      precision: 10,
      scale: 2,
    }),
    fcpDesktop: decimal("fcp_desktop", { precision: 10, scale: 2 }),
    lcpDesktop: decimal("lcp_desktop", { precision: 10, scale: 2 }),
    tbtDesktop: decimal("tbt_desktop", { precision: 10, scale: 2 }),
    clsDesktop: decimal("cls_desktop", { precision: 10, scale: 3 }),
    speedIndexDesktop: decimal("speed_index_desktop", {
      precision: 10,
      scale: 2,
    }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: index("domain_idx").on(table.domain),
    userIdIdx: index("user_id_idx").on(table.userId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    domainDateIdx: index("domain_date_idx").on(table.domain, table.createdAt),
  }),
);
