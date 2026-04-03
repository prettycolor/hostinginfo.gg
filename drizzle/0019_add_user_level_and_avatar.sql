-- Add level and avatar fields to users table
ALTER TABLE `users` ADD COLUMN `level` int NOT NULL DEFAULT 1;
ALTER TABLE `users` ADD COLUMN `total_xp` int NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `current_xp` int NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `xp_to_next_level` int NOT NULL DEFAULT 100;
ALTER TABLE `users` ADD COLUMN `selected_avatar_id` int;

-- Add index for avatar lookups
CREATE INDEX `selected_avatar_idx` ON `users` (`selected_avatar_id`);
