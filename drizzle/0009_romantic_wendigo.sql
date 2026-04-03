CREATE TABLE `alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255),
	`name` varchar(255) NOT NULL,
	`enabled` boolean DEFAULT true,
	`conditions` json NOT NULL,
	`actions` json NOT NULL,
	`frequency_limit` int DEFAULT 3600,
	`last_triggered_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`type` enum('uptime','performance','security','ssl','dns','technology') NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`data` json,
	`is_read` boolean DEFAULT false,
	`is_archived` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_domain` varchar(255) NOT NULL,
	`competitor_domain` varchar(255) NOT NULL,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `competitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`status` enum('open','investigating','resolved','closed') DEFAULT 'open',
	`started_at` timestamp NOT NULL,
	`resolved_at` timestamp,
	`resolution_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intelligence_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`edge_provider` varchar(100),
	`edge_confidence` int,
	`origin_host` varchar(100),
	`origin_confidence` int,
	`confidence_score` int,
	`detection_method` varchar(50),
	`hosting_data` text,
	`dns_data` text,
	`ip_data` text,
	`tech_data` text,
	`tech_count` int DEFAULT 0,
	`record_count` int DEFAULT 0,
	`open_ports` text,
	`scan_duration` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `intelligence_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`enabled` boolean DEFAULT true,
	`check_interval` int DEFAULT 300,
	`regions` json,
	`alert_thresholds` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('email','sms','slack','discord','teams','webhook') NOT NULL,
	`name` varchar(255) NOT NULL,
	`config` json NOT NULL,
	`enabled` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_baselines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`baseline_value` float NOT NULL,
	`std_deviation` float,
	`sample_size` int,
	`calculated_at` timestamp DEFAULT (now()),
	CONSTRAINT `performance_baselines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('critical','high','medium','low') NOT NULL,
	`impact_score` int,
	`difficulty` enum('easy','moderate','hard') NOT NULL,
	`estimated_time` varchar(50),
	`implementation_guide` text,
	`status` enum('active','completed','dismissed') DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uptime_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monitoring_config_id` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`status` enum('up','down','degraded') NOT NULL,
	`response_time` int,
	`status_code` int,
	`error_message` text,
	`region` varchar(50),
	`checked_at` timestamp DEFAULT (now()),
	CONSTRAINT `uptime_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `alert_rules` (`user_id`);--> statement-breakpoint
CREATE INDEX `enabled_idx` ON `alert_rules` (`enabled`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `alerts` (`user_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `alerts` (`type`);--> statement-breakpoint
CREATE INDEX `is_read_idx` ON `alerts` (`is_read`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `competitors` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_domain_idx` ON `competitors` (`user_domain`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `incidents` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `incidents` (`domain`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `incidents` (`status`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `intelligence_scans` (`domain`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `intelligence_scans` (`created_at`);--> statement-breakpoint
CREATE INDEX `domain_created_idx` ON `intelligence_scans` (`domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `monitoring_config` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `monitoring_config` (`domain`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `notification_channels` (`user_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `notification_channels` (`type`);--> statement-breakpoint
CREATE INDEX `domain_metric_idx` ON `performance_baselines` (`domain`,`metric_name`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `recommendations` (`user_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `recommendations` (`domain`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `recommendations` (`status`);--> statement-breakpoint
CREATE INDEX `config_id_idx` ON `uptime_checks` (`monitoring_config_id`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `uptime_checks` (`domain`);--> statement-breakpoint
CREATE INDEX `checked_at_idx` ON `uptime_checks` (`checked_at`);