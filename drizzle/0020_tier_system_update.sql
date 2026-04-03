-- Tier-Based Avatar System Update
-- Renames 'default' to 'common', adds 'uncommon' tier, sets unlock levels

-- Step 1: Rename 'default' rarity to 'common'
UPDATE avatars SET rarity = 'common' WHERE rarity = 'default';

-- Step 2: Update unlock levels for each tier
-- Common tier: Level 1 (IDs 76-90)
UPDATE avatars SET unlock_level = 1 WHERE id BETWEEN 76 AND 90;

-- Uncommon tier: Level 10 (IDs 91-105) - rename from 'common' to 'uncommon'
UPDATE avatars SET rarity = 'uncommon', unlock_level = 10 WHERE id BETWEEN 91 AND 105;

-- Rare tier: Level 25 (IDs 106-120)
UPDATE avatars SET unlock_level = 25 WHERE id BETWEEN 106 AND 120;

-- Epic tier: Level 50 (IDs 121-135)
UPDATE avatars SET unlock_level = 50 WHERE id BETWEEN 121 AND 135;

-- Legendary tier: Level 100 (IDs 136-150)
UPDATE avatars SET unlock_level = 100 WHERE id BETWEEN 136 AND 150;
