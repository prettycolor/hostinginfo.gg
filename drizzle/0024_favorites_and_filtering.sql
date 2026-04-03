-- Migration 0024: Favorites and Advanced Filtering System
-- Created: 2026-02-24
-- Purpose: Add favorites table, performance history, and indexes for filtering

-- ============================================
-- FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS `favorites` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `domain` VARCHAR(255) NOT NULL,
  `scan_id` INT,
  `notes` TEXT,
  `tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_scan` FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_user_domain` (`user_id`, `domain`),
  INDEX `idx_favorites_user_id` (`user_id`),
  INDEX `idx_favorites_domain` (`domain`),
  INDEX `idx_favorites_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PERFORMANCE HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS `performance_history` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `scan_id` INT NOT NULL,
  `domain` VARCHAR(255) NOT NULL,
  `user_id` INT,
  `mobile_score` INT,
  `desktop_score` INT,
  `fcp_mobile` DECIMAL(10,2),
  `lcp_mobile` DECIMAL(10,2),
  `tbt_mobile` DECIMAL(10,2),
  `cls_mobile` DECIMAL(10,3),
  `speed_index_mobile` DECIMAL(10,2),
  `fcp_desktop` DECIMAL(10,2),
  `lcp_desktop` DECIMAL(10,2),
  `tbt_desktop` DECIMAL(10,2),
  `cls_desktop` DECIMAL(10,3),
  `speed_index_desktop` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_perf_history_scan` FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_perf_history_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_perf_history_domain` (`domain`),
  INDEX `idx_perf_history_user_id` (`user_id`),
  INDEX `idx_perf_history_created_at` (`created_at`),
  INDEX `idx_perf_history_domain_date` (`domain`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADD INDEXES TO EXISTING SCANS TABLE
-- ============================================

-- Add indexes for filtering performance
ALTER TABLE `scans` 
  ADD INDEX IF NOT EXISTS `idx_scans_created_at` (`created_at`),
  ADD INDEX IF NOT EXISTS `idx_scans_domain` (`domain`),
  ADD INDEX IF NOT EXISTS `idx_scans_user_id` (`user_id`),
  ADD INDEX IF NOT EXISTS `idx_scans_domain_date` (`domain`, `created_at`),
  ADD INDEX IF NOT EXISTS `idx_scans_user_date` (`user_id`, `created_at`);

-- ============================================
-- FILTER PRESETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS `filter_presets` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `filters` JSON NOT NULL,
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_filter_presets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_filter_presets_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADD COLUMNS TO SCANS TABLE FOR FILTERING
-- ============================================

-- Add security score column if not exists
ALTER TABLE `scans` 
  ADD COLUMN IF NOT EXISTS `security_score` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `security_grade` VARCHAR(2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `performance_score` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `ssl_status` VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `ssl_expiry_date` DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `hosting_provider` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `technologies` JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `domain_status` VARCHAR(50) DEFAULT 'active';

-- Add indexes for new columns
ALTER TABLE `scans`
  ADD INDEX IF NOT EXISTS `idx_scans_security_grade` (`security_grade`),
  ADD INDEX IF NOT EXISTS `idx_scans_performance_score` (`performance_score`),
  ADD INDEX IF NOT EXISTS `idx_scans_ssl_status` (`ssl_status`),
  ADD INDEX IF NOT EXISTS `idx_scans_hosting_provider` (`hosting_provider`),
  ADD INDEX IF NOT EXISTS `idx_scans_domain_status` (`domain_status`);
