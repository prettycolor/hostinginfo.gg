ALTER TABLE `users`
  ADD COLUMN `is_admin` boolean NOT NULL DEFAULT false,
  ADD COLUMN `is_disabled` boolean NOT NULL DEFAULT false,
  ADD COLUMN `disabled_at` timestamp NULL;

CREATE INDEX `is_admin_idx` ON `users` (`is_admin`);--> statement-breakpoint
CREATE INDEX `is_disabled_idx` ON `users` (`is_disabled`);--> statement-breakpoint

CREATE TABLE `password_reset_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL,
  `created_by_admin_id` int NULL,
  `created_at` timestamp DEFAULT (now()),
  CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `password_reset_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `password_reset_user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_token_hash_idx` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_reset_expires_at_idx` ON `password_reset_tokens` (`expires_at`);
