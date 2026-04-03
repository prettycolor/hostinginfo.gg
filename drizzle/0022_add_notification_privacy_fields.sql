-- Add bio field for profile
ALTER TABLE `users` ADD COLUMN `bio` text;

-- Add password field (new field alongside passwordHash for backward compatibility)
ALTER TABLE `users` ADD COLUMN `password` varchar(255);

-- Copy existing password_hash to password field
UPDATE `users` SET `password` = `password_hash` WHERE `password_hash` IS NOT NULL;

-- Add notification preference fields to users table
ALTER TABLE `users` ADD COLUMN `email_notifications` boolean DEFAULT true;
ALTER TABLE `users` ADD COLUMN `scan_alerts` boolean DEFAULT true;
ALTER TABLE `users` ADD COLUMN `weekly_reports` boolean DEFAULT false;
ALTER TABLE `users` ADD COLUMN `marketing_emails` boolean DEFAULT false;

-- Add privacy settings fields to users table
ALTER TABLE `users` ADD COLUMN `profile_visibility` varchar(20) DEFAULT 'public';
ALTER TABLE `users` ADD COLUMN `show_email` boolean DEFAULT false;
ALTER TABLE `users` ADD COLUMN `show_stats` boolean DEFAULT true;
