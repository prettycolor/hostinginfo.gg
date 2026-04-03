CREATE TABLE `alert_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`alert_type` varchar(50) NOT NULL,
	`severity` varchar(20) DEFAULT 'medium',
	`message` text,
	`metadata` text,
	`sent_at` timestamp DEFAULT (now()),
	`email_sent` boolean DEFAULT false,
	`email_error` text,
	CONSTRAINT `alert_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`alert_performance` boolean DEFAULT true,
	`alert_security` boolean DEFAULT true,
	`alert_ssl` boolean DEFAULT true,
	`alert_downtime` boolean DEFAULT true,
	`performance_threshold` int DEFAULT 50,
	`ssl_expiry_days` int DEFAULT 30,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`frequency` varchar(50) DEFAULT 'daily',
	`last_scan_at` timestamp,
	`next_scan_at` timestamp,
	`consecutive_failures` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`year_month` varchar(7) NOT NULL,
	`scans_count` int DEFAULT 0,
	`domains_monitored` int DEFAULT 0,
	`pdf_exports` int DEFAULT 0,
	`ai_insights_generated` int DEFAULT 0,
	`api_calls` int DEFAULT 0,
	`scans_limit` int DEFAULT 100,
	`domains_limit` int DEFAULT 3,
	`pdf_exports_limit` int DEFAULT 10,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `claimed_domains` ADD `verification_token` varchar(255);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `alert_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `alert_logs` (`domain`);--> statement-breakpoint
CREATE INDEX `alert_type_idx` ON `alert_logs` (`alert_type`);--> statement-breakpoint
CREATE INDEX `sent_at_idx` ON `alert_logs` (`sent_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `alert_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `alert_settings` (`domain`);--> statement-breakpoint
CREATE INDEX `enabled_idx` ON `alert_settings` (`enabled`);--> statement-breakpoint
CREATE INDEX `user_domain_unique` ON `alert_settings` (`user_id`,`domain`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `monitoring_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `monitoring_settings` (`domain`);--> statement-breakpoint
CREATE INDEX `enabled_idx` ON `monitoring_settings` (`enabled`);--> statement-breakpoint
CREATE INDEX `next_scan_idx` ON `monitoring_settings` (`next_scan_at`);--> statement-breakpoint
CREATE INDEX `user_domain_unique` ON `monitoring_settings` (`user_id`,`domain`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `usage_tracking` (`user_id`);--> statement-breakpoint
CREATE INDEX `year_month_idx` ON `usage_tracking` (`year_month`);--> statement-breakpoint
CREATE INDEX `user_month_unique` ON `usage_tracking` (`user_id`,`year_month`);