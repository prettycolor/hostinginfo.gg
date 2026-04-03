CREATE TABLE `favorite_domain_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`favorite_domain_id` int NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`scan_type` varchar(50) NOT NULL,
	`mobile_score` int,
	`desktop_score` int,
	`mobile_fcp` decimal(10,2),
	`mobile_lcp` decimal(10,2),
	`mobile_tbt` decimal(10,2),
	`mobile_cls` decimal(10,4),
	`desktop_fcp` decimal(10,2),
	`desktop_lcp` decimal(10,2),
	`desktop_tbt` decimal(10,2),
	`desktop_cls` decimal(10,4),
	`security_score` int,
	`ssl_valid` boolean,
	`malware_detected` boolean,
	`vulnerabilities` text,
	`full_results` text,
	`scanned_at` timestamp DEFAULT (now()),
	CONSTRAINT `favorite_domain_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`alias` varchar(100),
	`notes` text,
	`added_at` timestamp DEFAULT (now()),
	`last_scanned_at` timestamp,
	`scan_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `favorite_domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_stats` ADD `leaderboard_alias` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `profile_name` varchar(100);--> statement-breakpoint
CREATE INDEX `favorite_domain_id_idx` ON `favorite_domain_scans` (`favorite_domain_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `favorite_domain_scans` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `favorite_domain_scans` (`domain`);--> statement-breakpoint
CREATE INDEX `scanned_at_idx` ON `favorite_domain_scans` (`scanned_at`);--> statement-breakpoint
CREATE INDEX `scan_type_idx` ON `favorite_domain_scans` (`scan_type`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `favorite_domains` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `favorite_domains` (`domain`);--> statement-breakpoint
CREATE INDEX `user_domain_unique` ON `favorite_domains` (`user_id`,`domain`);