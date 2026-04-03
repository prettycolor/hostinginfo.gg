CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`event_type` varchar(100) NOT NULL,
	`event_category` varchar(100),
	`event_action` varchar(100),
	`event_label` varchar(255),
	`event_value` int,
	`metadata` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `claimed_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`claimed_at` timestamp DEFAULT (now()),
	`verification_method` varchar(50),
	`verified_at` timestamp,
	`is_verified` boolean NOT NULL DEFAULT false,
	CONSTRAINT `claimed_domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`used_at` timestamp,
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verifications_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `scan_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`domain` varchar(255) NOT NULL,
	`scan_type` varchar(50) NOT NULL,
	`scan_data` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `scan_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`last_activity_at` timestamp DEFAULT (now()),
	`ip_address` varchar(45),
	`user_agent` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`full_name` varchar(255),
	`email_verified` boolean NOT NULL DEFAULT false,
	`email_verified_at` timestamp,
	`auth_provider` varchar(50) DEFAULT 'email',
	`provider_id` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_login_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `analytics_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `event_type_idx` ON `analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `claimed_domains` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `claimed_domains` (`domain`);--> statement-breakpoint
CREATE INDEX `user_domain_idx` ON `claimed_domains` (`user_id`,`domain`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `email_verifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `email_verifications` (`token`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `scan_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `scan_history` (`domain`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `scan_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `provider_idx` ON `users` (`auth_provider`,`provider_id`);