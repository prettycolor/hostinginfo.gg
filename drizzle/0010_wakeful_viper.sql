CREATE TABLE `report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`sections` json NOT NULL,
	`filters` json,
	`is_default` boolean DEFAULT false,
	`is_system` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`template_id` int,
	`domain` varchar(255),
	`title` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`format` varchar(20) NOT NULL,
	`file_url` varchar(500),
	`file_size` int,
	`data` text,
	`status` varchar(20) DEFAULT 'generating',
	`error_message` text,
	`generated_at` timestamp DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`template_id` int NOT NULL,
	`domain` varchar(255),
	`name` varchar(255) NOT NULL,
	`schedule` varchar(50) NOT NULL,
	`day_of_week` int,
	`day_of_month` int,
	`time` varchar(5) NOT NULL,
	`recipients` json NOT NULL,
	`enabled` boolean DEFAULT true,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `report_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `report_templates` (`type`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `reports` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `reports` (`domain`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `generated_at_idx` ON `reports` (`generated_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `scheduled_reports` (`user_id`);--> statement-breakpoint
CREATE INDEX `enabled_idx` ON `scheduled_reports` (`enabled`);--> statement-breakpoint
CREATE INDEX `next_run_at_idx` ON `scheduled_reports` (`next_run_at`);