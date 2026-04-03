CREATE TABLE `dns_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`subdomain` varchar(255),
	`record_type` varchar(10) NOT NULL,
	`record_value` text NOT NULL,
	`ttl` int,
	`first_seen` timestamp NOT NULL DEFAULT (now()),
	`last_seen` timestamp NOT NULL DEFAULT (now()),
	`seen_count` int NOT NULL DEFAULT 1,
	`resolver` varchar(100),
	`is_authoritative` boolean DEFAULT false,
	`authoritative_ns` varchar(255),
	`confidence_score` int DEFAULT 100,
	`previous_value` text,
	`changed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dns_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hosting_attribution` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`edge_provider` varchar(255),
	`origin_host` varchar(255),
	`asn` varchar(20),
	`asn_org` varchar(255),
	`ip_address` varchar(45),
	`confidence_score` int NOT NULL,
	`edge_confidence` int,
	`origin_confidence` int,
	`evidence_weights` text,
	`detection_method` varchar(100),
	`server_type` varchar(100),
	`framework` varchar(100),
	`is_custom_coded` boolean DEFAULT false,
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	`last_verified` timestamp,
	`is_validated` boolean DEFAULT false,
	`validated_by` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hosting_attribution_id` PRIMARY KEY(`id`),
	CONSTRAINT `hosting_attribution_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `ip_fingerprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`open_ports` text,
	`closed_ports` text,
	`filtered_ports` text,
	`service_banners` text,
	`tls_cert_data` text,
	`http_responses` text,
	`server_type` varchar(100),
	`server_version` varchar(100),
	`detected_services` text,
	`last_scanned` timestamp NOT NULL DEFAULT (now()),
	`scan_duration` int,
	`scan_confidence` int DEFAULT 100,
	`scan_errors` text,
	`asn` varchar(20),
	`asn_org` varchar(255),
	`country` varchar(2),
	`city` varchar(100),
	`region` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ip_fingerprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `ip_fingerprints_ip_address_unique` UNIQUE(`ip_address`)
);
--> statement-breakpoint
CREATE TABLE `scan_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lookup_key` varchar(500) NOT NULL,
	`api_source` varchar(50) NOT NULL,
	`response_json` text NOT NULL,
	`response_status` int DEFAULT 200,
	`cached_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`hit_count` int DEFAULT 0,
	`last_hit_at` timestamp,
	`request_params` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `scan_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_cache_lookup_key_unique` UNIQUE(`lookup_key`)
);
--> statement-breakpoint
CREATE TABLE `signature_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tech_name` varchar(255) NOT NULL,
	`tech_version` varchar(100),
	`category` varchar(100) NOT NULL,
	`signal_type` varchar(50) NOT NULL,
	`pattern` text NOT NULL,
	`pattern_type` varchar(20) DEFAULT 'regex',
	`match_criteria` text,
	`confidence_weight` int NOT NULL,
	`description` text,
	`source` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`version_pattern` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signature_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tech_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`tech_name` varchar(255) NOT NULL,
	`tech_version` varchar(100),
	`tech_category` varchar(100) NOT NULL,
	`confidence` int NOT NULL,
	`evidence_json` text NOT NULL,
	`detection_method` varchar(50) NOT NULL,
	`detected_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`is_validated` boolean DEFAULT false,
	`is_false_positive` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tech_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `domain_idx` ON `dns_history` (`domain`);--> statement-breakpoint
CREATE INDEX `subdomain_idx` ON `dns_history` (`subdomain`);--> statement-breakpoint
CREATE INDEX `record_type_idx` ON `dns_history` (`record_type`);--> statement-breakpoint
CREATE INDEX `first_seen_idx` ON `dns_history` (`first_seen`);--> statement-breakpoint
CREATE INDEX `last_seen_idx` ON `dns_history` (`last_seen`);--> statement-breakpoint
CREATE INDEX `domain_record_idx` ON `dns_history` (`domain`,`record_type`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `hosting_attribution` (`domain`);--> statement-breakpoint
CREATE INDEX `edge_provider_idx` ON `hosting_attribution` (`edge_provider`);--> statement-breakpoint
CREATE INDEX `origin_host_idx` ON `hosting_attribution` (`origin_host`);--> statement-breakpoint
CREATE INDEX `asn_idx` ON `hosting_attribution` (`asn`);--> statement-breakpoint
CREATE INDEX `confidence_idx` ON `hosting_attribution` (`confidence_score`);--> statement-breakpoint
CREATE INDEX `last_updated_idx` ON `hosting_attribution` (`last_updated`);--> statement-breakpoint
CREATE INDEX `ip_address_idx` ON `ip_fingerprints` (`ip_address`);--> statement-breakpoint
CREATE INDEX `asn_idx` ON `ip_fingerprints` (`asn`);--> statement-breakpoint
CREATE INDEX `last_scanned_idx` ON `ip_fingerprints` (`last_scanned`);--> statement-breakpoint
CREATE INDEX `server_type_idx` ON `ip_fingerprints` (`server_type`);--> statement-breakpoint
CREATE INDEX `lookup_key_idx` ON `scan_cache` (`lookup_key`);--> statement-breakpoint
CREATE INDEX `api_source_idx` ON `scan_cache` (`api_source`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `scan_cache` (`expires_at`);--> statement-breakpoint
CREATE INDEX `cached_at_idx` ON `scan_cache` (`cached_at`);--> statement-breakpoint
CREATE INDEX `tech_name_idx` ON `signature_library` (`tech_name`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `signature_library` (`category`);--> statement-breakpoint
CREATE INDEX `signal_type_idx` ON `signature_library` (`signal_type`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `signature_library` (`is_active`);--> statement-breakpoint
CREATE INDEX `tech_category_idx` ON `signature_library` (`tech_name`,`category`);--> statement-breakpoint
CREATE INDEX `domain_idx` ON `tech_signatures` (`domain`);--> statement-breakpoint
CREATE INDEX `tech_name_idx` ON `tech_signatures` (`tech_name`);--> statement-breakpoint
CREATE INDEX `tech_category_idx` ON `tech_signatures` (`tech_category`);--> statement-breakpoint
CREATE INDEX `confidence_idx` ON `tech_signatures` (`confidence`);--> statement-breakpoint
CREATE INDEX `detected_at_idx` ON `tech_signatures` (`detected_at`);--> statement-breakpoint
CREATE INDEX `domain_tech_idx` ON `tech_signatures` (`domain`,`tech_name`);