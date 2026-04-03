-- Migration 0025: Scan XP reward claims (per-user, per-source, per-domain dedupe)
-- Created: 2026-03-01

CREATE TABLE IF NOT EXISTS `xp_scan_reward_claims` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `reward_source` VARCHAR(100) NOT NULL,
  `domain_normalized` VARCHAR(255) NOT NULL,
  `claimed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `user_source_domain_unique_idx` (`user_id`, `reward_source`, `domain_normalized`),
  INDEX `user_id_idx` (`user_id`),
  INDEX `domain_normalized_idx` (`domain_normalized`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
