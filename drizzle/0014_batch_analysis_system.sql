-- Batch Analysis System Tables
-- Created: 2026-02-08
-- Purpose: Support batch domain analysis with queue, progress tracking, and statistics

-- Batch Analysis Jobs table
CREATE TABLE `batch_analysis_jobs` (
  `id` varchar(36) PRIMARY KEY,
  `user_id` int NOT NULL,
  `name` varchar(255),
  `status` enum('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  `total_domains` int NOT NULL,
  `completed_domains` int NOT NULL DEFAULT 0,
  `failed_domains` int NOT NULL DEFAULT 0,
  `progress` int NOT NULL DEFAULT 0,
  `started_at` timestamp,
  `completed_at` timestamp,
  `estimated_completion_at` timestamp,
  `error` text,
  `collect_dns` boolean NOT NULL DEFAULT true,
  `collect_whois` boolean NOT NULL DEFAULT true,
  `collect_ip` boolean NOT NULL DEFAULT true,
  `collect_tech` boolean NOT NULL DEFAULT true,
  `collect_urlscan` boolean NOT NULL DEFAULT false,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX `user_id_idx` ON `batch_analysis_jobs` (`user_id`);
CREATE INDEX `status_idx` ON `batch_analysis_jobs` (`status`);
CREATE INDEX `created_at_idx` ON `batch_analysis_jobs` (`created_at`);

-- Batch Analysis Domains table
CREATE TABLE `batch_analysis_domains` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `job_id` varchar(36) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `status` enum('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  `security_score` int,
  `grade` varchar(5),
  `expiry_days` int,
  `hosting_provider` varchar(255),
  `critical_issues` int DEFAULT 0,
  `high_issues` int DEFAULT 0,
  `medium_issues` int DEFAULT 0,
  `low_issues` int DEFAULT 0,
  `results` json,
  `error` text,
  `started_at` timestamp,
  `completed_at` timestamp,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX `job_id_idx` ON `batch_analysis_domains` (`job_id`);
CREATE INDEX `domain_idx` ON `batch_analysis_domains` (`domain`);
CREATE INDEX `status_idx` ON `batch_analysis_domains` (`status`);

-- Batch Analysis Statistics table
CREATE TABLE `batch_analysis_stats` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `job_id` varchar(36) NOT NULL UNIQUE,
  `average_score` float,
  `total_critical_issues` int DEFAULT 0,
  `total_high_issues` int DEFAULT 0,
  `total_medium_issues` int DEFAULT 0,
  `total_low_issues` int DEFAULT 0,
  `expiring_within_30_days` int DEFAULT 0,
  `expiring_within_60_days` int DEFAULT 0,
  `expiring_within_90_days` int DEFAULT 0,
  `expired` int DEFAULT 0,
  `grade_a_plus` int DEFAULT 0,
  `grade_a` int DEFAULT 0,
  `grade_a_minus` int DEFAULT 0,
  `grade_b_plus` int DEFAULT 0,
  `grade_b` int DEFAULT 0,
  `grade_b_minus` int DEFAULT 0,
  `grade_c_plus` int DEFAULT 0,
  `grade_c` int DEFAULT 0,
  `grade_c_minus` int DEFAULT 0,
  `grade_d` int DEFAULT 0,
  `grade_f` int DEFAULT 0,
  `top_hosting_providers` json,
  `top_issues` json,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX `job_id_idx` ON `batch_analysis_stats` (`job_id`);
