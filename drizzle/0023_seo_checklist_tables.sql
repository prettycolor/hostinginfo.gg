-- SEO Checklist Tables Migration
-- Created: 2026-02-23

-- SEO Checklist Scans
CREATE TABLE `seo_checklist_scans` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `scan_id` VARCHAR(36) UNIQUE NOT NULL,
  `domain` VARCHAR(255) NOT NULL,
  `input_url` TEXT NOT NULL,
  `final_url` TEXT,
  `redirect_chain` JSON,
  `status` ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  `decision` ENUM('ready', 'fix_first', 'not_ready') DEFAULT NULL,
  `total_score` INT DEFAULT NULL,
  `category_scores` JSON,
  `summary` JSON,
  `checklist` JSON,
  `evidence` JSON,
  `errors` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  INDEX `idx_user_domain` (`user_id`, `domain`),
  INDEX `idx_scan_id` (`scan_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- SEO Checklist Sampled Pages
CREATE TABLE `seo_checklist_pages` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `scan_id` VARCHAR(36) NOT NULL,
  `url` TEXT NOT NULL,
  `status_code` INT,
  `fetch_time_ms` INT,
  `page_title` TEXT,
  `meta_description` TEXT,
  `h1_present` BOOLEAN DEFAULT FALSE,
  `h1_text` TEXT,
  `structured_data` JSON,
  `social_tags` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_scan_id` (`scan_id`),
  FOREIGN KEY (`scan_id`) REFERENCES `seo_checklist_scans`(`scan_id`) ON DELETE CASCADE
);
