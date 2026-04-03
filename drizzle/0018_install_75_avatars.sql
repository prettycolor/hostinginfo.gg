-- Install 75 avatars from GitHub repo
-- Distribution: 15 per tier (default, common, rare, epic, legendary)

-- Clear existing avatars (if any)
DELETE FROM avatars;

-- DEFAULT TIER (15 avatars) - Level 0
INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active) VALUES
('Avatar 1', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_01.png', TRUE),
('Avatar 2', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_03.png', TRUE),
('Avatar 3', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_04.png', TRUE),
('Avatar 4', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_05.png', TRUE),
('Avatar 5', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_07.png', TRUE),
('Avatar 6', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_08.png', TRUE),
('Avatar 7', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_09.png', TRUE),
('Avatar 8', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_10.png', TRUE),
('Avatar 9', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_12.png', TRUE),
('Avatar 10', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_13.png', TRUE),
('Avatar 11', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_14.png', TRUE),
('Avatar 12', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2518667991_avatar_16.png', TRUE),
('Avatar 13', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2519522981_avatar_01.png', TRUE),
('Avatar 14', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2519522981_avatar_02.png', TRUE),
('Avatar 15', 'Classic style avatar', 'default', 0, '/avatars/default/shutterstock_2519522981_avatar_03.png', TRUE);

-- COMMON TIER (15 avatars) - Level 5
INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active) VALUES
('Avatar 16', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_04.png', TRUE),
('Avatar 17', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_05.png', TRUE),
('Avatar 18', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_06.png', TRUE),
('Avatar 19', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_07.png', TRUE),
('Avatar 20', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_08.png', TRUE),
('Avatar 21', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_09.png', TRUE),
('Avatar 22', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_10.png', TRUE),
('Avatar 23', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_11.png', TRUE),
('Avatar 24', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_12.png', TRUE),
('Avatar 25', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_13.png', TRUE),
('Avatar 26', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_14.png', TRUE),
('Avatar 27', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_15.png', TRUE),
('Avatar 28', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2519522981_avatar_16.png', TRUE),
('Avatar 29', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2525711475_avatar_01.png', TRUE),
('Avatar 30', 'Uncommon style avatar', 'common', 5, '/avatars/common/shutterstock_2525711475_avatar_02.png', TRUE);

-- RARE TIER (15 avatars) - Level 10
INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active) VALUES
('Avatar 31', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_03.png', TRUE),
('Avatar 32', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_04.png', TRUE),
('Avatar 33', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_05.png', TRUE),
('Avatar 34', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_06.png', TRUE),
('Avatar 35', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_07.png', TRUE),
('Avatar 36', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_08.png', TRUE),
('Avatar 37', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_09.png', TRUE),
('Avatar 38', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_10.png', TRUE),
('Avatar 39', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_11.png', TRUE),
('Avatar 40', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_12.png', TRUE),
('Avatar 41', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_13.png', TRUE),
('Avatar 42', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_14.png', TRUE),
('Avatar 43', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_15.png', TRUE),
('Avatar 44', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2525711475_avatar_16.png', TRUE),
('Avatar 45', 'Rare style avatar', 'rare', 10, '/avatars/rare/shutterstock_2537889383_avatar_01.png', TRUE);

-- EPIC TIER (15 avatars) - Level 20
INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active) VALUES
('Avatar 46', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_02.png', TRUE),
('Avatar 47', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_03.png', TRUE),
('Avatar 48', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_04.png', TRUE),
('Avatar 49', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_05.png', TRUE),
('Avatar 50', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_06.png', TRUE),
('Avatar 51', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_07.png', TRUE),
('Avatar 52', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_08.png', TRUE),
('Avatar 53', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_09.png', TRUE),
('Avatar 54', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_10.png', TRUE),
('Avatar 55', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_11.png', TRUE),
('Avatar 56', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_12.png', TRUE),
('Avatar 57', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_13.png', TRUE),
('Avatar 58', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_14.png', TRUE),
('Avatar 59', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_15.png', TRUE),
('Avatar 60', 'Epic style avatar', 'epic', 20, '/avatars/epic/shutterstock_2537889383_avatar_16.png', TRUE);

-- LEGENDARY TIER (15 avatars) - Level 50
INSERT INTO avatars (name, description, rarity, unlock_level, image_path, is_active) VALUES
('Avatar 61', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_01.png', TRUE),
('Avatar 62', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_02.png', TRUE),
('Avatar 63', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_03.png', TRUE),
('Avatar 64', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_04.png', TRUE),
('Avatar 65', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_06.png', TRUE),
('Avatar 66', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_07.png', TRUE),
('Avatar 67', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_08.png', TRUE),
('Avatar 68', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_09.png', TRUE),
('Avatar 69', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_10.png', TRUE),
('Avatar 70', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_11.png', TRUE),
('Avatar 71', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_12.png', TRUE),
('Avatar 72', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_13.png', TRUE),
('Avatar 73', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_14.png', TRUE),
('Avatar 74', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_15.png', TRUE),
('Avatar 75', 'Legendary style avatar', 'legendary', 50, '/avatars/legendary/shutterstock_2546236877_avatar_16.png', TRUE);
