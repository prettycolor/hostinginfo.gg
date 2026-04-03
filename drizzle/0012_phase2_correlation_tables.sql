-- Phase 2: Advanced Intelligence Analysis - Correlation Tables
-- Created: 2026-02-07

-- Intelligence Correlations - Cross-reference analysis results
CREATE TABLE `intelligence_correlations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`correlation_type` varchar(50) NOT NULL,
	`source_a` varchar(50) NOT NULL,
	`source_b` varchar(50) NOT NULL,
	`confidence` int NOT NULL,
	`confidence_level` varchar(20) NOT NULL,
	`description` text NOT NULL,
	`evidence` json,
	`details` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `intelligence_correlations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `domain_idx` ON `intelligence_correlations` (`domain`);
--> statement-breakpoint
CREATE INDEX `type_idx` ON `intelligence_correlations` (`correlation_type`);
--> statement-breakpoint
CREATE INDEX `confidence_idx` ON `intelligence_correlations` (`confidence`);
--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `intelligence_correlations` (`created_at`);
--> statement-breakpoint

-- Intelligence Reports Cache - Cache complete intelligence reports
CREATE TABLE `intelligence_reports_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`report_data` json NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `intelligence_reports_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `intelligence_reports_cache_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE INDEX `domain_idx` ON `intelligence_reports_cache` (`domain`);
--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `intelligence_reports_cache` (`expires_at`);
