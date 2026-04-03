CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`achievement_key` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(100),
	`rarity` varchar(50) DEFAULT 'common',
	`category` varchar(50) NOT NULL,
	`requirement` text,
	`xp_reward` int NOT NULL DEFAULT 0,
	`lore` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_achievement_key_unique` UNIQUE(`achievement_key`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`achievement_id` int NOT NULL,
	`unlocked_at` timestamp DEFAULT (now()),
	`progress` int DEFAULT 0,
	`metadata` text,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`xp` int NOT NULL DEFAULT 0,
	`total_xp` int NOT NULL DEFAULT 0,
	`total_scans` int NOT NULL DEFAULT 0,
	`security_scans` int NOT NULL DEFAULT 0,
	`performance_scans` int NOT NULL DEFAULT 0,
	`dns_scans` int NOT NULL DEFAULT 0,
	`whois_scans` int NOT NULL DEFAULT 0,
	`ssl_scans` int NOT NULL DEFAULT 0,
	`email_scans` int NOT NULL DEFAULT 0,
	`malware_scans` int NOT NULL DEFAULT 0,
	`domains_verified` int NOT NULL DEFAULT 0,
	`domains_monitored` int NOT NULL DEFAULT 0,
	`pdf_exports` int NOT NULL DEFAULT 0,
	`ai_insights_used` int NOT NULL DEFAULT 0,
	`current_streak` int NOT NULL DEFAULT 0,
	`longest_streak` int NOT NULL DEFAULT 0,
	`last_activity_date` timestamp,
	`global_rank` int,
	`rank_percentile` decimal(5,2),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stats_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `xp_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`xp_amount` int NOT NULL,
	`source` varchar(100) NOT NULL,
	`source_id` int,
	`description` varchar(255),
	`metadata` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `xp_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_achievements` (`user_id`);--> statement-breakpoint
CREATE INDEX `achievement_id_idx` ON `user_achievements` (`achievement_id`);--> statement-breakpoint
CREATE INDEX `user_achievement_unique` ON `user_achievements` (`user_id`,`achievement_id`);--> statement-breakpoint
CREATE INDEX `unlocked_at_idx` ON `user_achievements` (`unlocked_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_stats` (`user_id`);--> statement-breakpoint
CREATE INDEX `level_idx` ON `user_stats` (`level`);--> statement-breakpoint
CREATE INDEX `total_xp_idx` ON `user_stats` (`total_xp`);--> statement-breakpoint
CREATE INDEX `global_rank_idx` ON `user_stats` (`global_rank`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `xp_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `xp_transactions` (`source`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `xp_transactions` (`created_at`);