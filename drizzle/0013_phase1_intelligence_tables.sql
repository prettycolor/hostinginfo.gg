-- Phase 1: Intelligence Data Tables
-- Add DNS, IP, WHOIS, Technology, and URLScan tables

-- DNS Records table
CREATE TABLE `dns_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`record_type` varchar(10) NOT NULL,
	`value` text NOT NULL,
	`ttl` int,
	`priority` int,
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `dns_records_id` PRIMARY KEY(`id`)
);

CREATE INDEX `domain_idx` ON `dns_records` (`domain`);
CREATE INDEX `record_type_idx` ON `dns_records` (`record_type`);
CREATE INDEX `scanned_at_idx` ON `dns_records` (`scanned_at`);

-- IP Intelligence table
CREATE TABLE `ip_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`ip_version` int NOT NULL,
	`country` varchar(2),
	`country_name` varchar(100),
	`region` varchar(100),
	`city` varchar(100),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`timezone` varchar(50),
	`asn` varchar(20),
	`asn_organization` varchar(255),
	`isp` varchar(255),
	`organization` varchar(255),
	`is_proxy` boolean DEFAULT false,
	`is_vpn` boolean DEFAULT false,
	`is_tor` boolean DEFAULT false,
	`is_hosting` boolean DEFAULT false,
	`threat_level` varchar(20),
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ip_intelligence_id` PRIMARY KEY(`id`)
);

CREATE INDEX `domain_idx` ON `ip_intelligence` (`domain`);
CREATE INDEX `ip_address_idx` ON `ip_intelligence` (`ip_address`);
CREATE INDEX `asn_idx` ON `ip_intelligence` (`asn`);
CREATE INDEX `scanned_at_idx` ON `ip_intelligence` (`scanned_at`);

-- WHOIS Records table
CREATE TABLE `whois_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`registrar` varchar(255),
	`registrar_url` varchar(500),
	`registrar_iana_id` varchar(50),
	`created_date` timestamp,
	`updated_date` timestamp,
	`expiry_date` timestamp,
	`status` json,
	`registrant_name` varchar(255),
	`registrant_organization` varchar(255),
	`registrant_email` varchar(255),
	`registrant_country` varchar(2),
	`admin_name` varchar(255),
	`admin_email` varchar(255),
	`tech_name` varchar(255),
	`tech_email` varchar(255),
	`nameservers` json,
	`dnssec` varchar(50),
	`raw_whois` text,
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `whois_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `whois_records_domain_unique` UNIQUE(`domain`)
);

CREATE INDEX `domain_idx` ON `whois_records` (`domain`);
CREATE INDEX `expiry_date_idx` ON `whois_records` (`expiry_date`);
CREATE INDEX `registrar_idx` ON `whois_records` (`registrar`);
CREATE INDEX `scanned_at_idx` ON `whois_records` (`scanned_at`);

-- Technology Stack table
CREATE TABLE `technology_stack` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` varchar(100),
	`category` varchar(100) NOT NULL,
	`confidence` int NOT NULL,
	`detection_method` varchar(50),
	`icon` varchar(500),
	`website` varchar(500),
	`description` text,
	`has_known_vulnerabilities` boolean DEFAULT false,
	`is_outdated` boolean DEFAULT false,
	`is_eol` boolean DEFAULT false,
	`latest_version` varchar(100),
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `technology_stack_id` PRIMARY KEY(`id`)
);

CREATE INDEX `domain_idx` ON `technology_stack` (`domain`);
CREATE INDEX `category_idx` ON `technology_stack` (`category`);
CREATE INDEX `name_idx` ON `technology_stack` (`name`);
CREATE INDEX `scanned_at_idx` ON `technology_stack` (`scanned_at`);

-- URLScan Results table
CREATE TABLE `urlscan_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`scan_id` varchar(100) NOT NULL,
	`scan_url` varchar(500),
	`verdict` varchar(50),
	`score` int,
	`malware_detected` boolean DEFAULT false,
	`phishing_detected` boolean DEFAULT false,
	`suspicious_activity` boolean DEFAULT false,
	`categories` json,
	`tags` json,
	`ip_address` varchar(45),
	`asn` varchar(20),
	`country` varchar(2),
	`server` varchar(255),
	`tls_version` varchar(20),
	`tls_issuer` varchar(255),
	`tls_valid_from` timestamp,
	`tls_valid_to` timestamp,
	`total_requests` int,
	`total_domains` int,
	`total_ips` int,
	`screenshot_url` varchar(500),
	`raw_data` json,
	`scanned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `urlscan_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `urlscan_results_scan_id_unique` UNIQUE(`scan_id`)
);

CREATE INDEX `domain_idx` ON `urlscan_results` (`domain`);
CREATE INDEX `scan_id_idx` ON `urlscan_results` (`scan_id`);
CREATE INDEX `verdict_idx` ON `urlscan_results` (`verdict`);
CREATE INDEX `scanned_at_idx` ON `urlscan_results` (`scanned_at`);
