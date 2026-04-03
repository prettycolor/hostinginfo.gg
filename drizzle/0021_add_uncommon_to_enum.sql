-- Add 'uncommon' to rarity ENUM
-- MySQL doesn't support ALTER ENUM directly, so we need to modify the column

ALTER TABLE avatars 
MODIFY COLUMN rarity ENUM('default', 'common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common';
