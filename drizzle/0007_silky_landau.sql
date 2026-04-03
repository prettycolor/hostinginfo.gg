CREATE TABLE `item_unlock_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`current_progress` int NOT NULL DEFAULT 0,
	`required_progress` int NOT NULL,
	`progress_type` varchar(50) NOT NULL,
	`is_unlocked` boolean NOT NULL DEFAULT false,
	`unlocked_at` timestamp,
	`notification_sent` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `item_unlock_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`image_url` varchar(500) NOT NULL,
	`rarity` varchar(50) NOT NULL DEFAULT 'common',
	`category` varchar(100) NOT NULL,
	`level_required` int NOT NULL DEFAULT 1,
	`xp_required` int DEFAULT 0,
	`achievement_required` varchar(100),
	`unlock_conditions` text,
	`effects` text,
	`sort_order` int DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_item_key_unique` UNIQUE(`item_key`)
);
--> statement-breakpoint
CREATE TABLE `user_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`acquired_at` timestamp DEFAULT (now()),
	`acquired_from` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`is_equipped` boolean NOT NULL DEFAULT false,
	`is_new` boolean NOT NULL DEFAULT true,
	`times_used` int DEFAULT 0,
	`last_used_at` timestamp,
	`metadata` text,
	CONSTRAINT `user_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `item_unlock_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `item_id_idx` ON `item_unlock_progress` (`item_id`);--> statement-breakpoint
CREATE INDEX `user_item_unique` ON `item_unlock_progress` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `is_unlocked_idx` ON `item_unlock_progress` (`is_unlocked`);--> statement-breakpoint
CREATE INDEX `item_key_idx` ON `items` (`item_key`);--> statement-breakpoint
CREATE INDEX `rarity_idx` ON `items` (`rarity`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `items` (`category`);--> statement-breakpoint
CREATE INDEX `level_idx` ON `items` (`level_required`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_inventory` (`user_id`);--> statement-breakpoint
CREATE INDEX `item_id_idx` ON `user_inventory` (`item_id`);--> statement-breakpoint
CREATE INDEX `user_item_unique` ON `user_inventory` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `acquired_at_idx` ON `user_inventory` (`acquired_at`);