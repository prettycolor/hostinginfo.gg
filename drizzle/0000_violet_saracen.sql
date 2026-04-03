CREATE TABLE `whois_api_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year_month` varchar(7) NOT NULL,
	`query_count` int NOT NULL DEFAULT 0,
	`last_query_at` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whois_api_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `whois_api_usage_year_month_unique` UNIQUE(`year_month`)
);
