-- Migration 0027: Add reserved "Reserved Staff Avatar"
-- Created: 2026-03-03
--
-- This avatar is intentionally inactive so it never appears in the public
-- unlockable avatar list. It can still be assigned manually by setting
-- users.selected_avatar_id to this avatar's ID.

INSERT INTO `avatars` (`name`, `description`, `rarity`, `unlock_level`, `image_path`, `is_active`)
SELECT
  'Reserved Staff Avatar',
  'Reserved private avatar for manual assignment.',
  'legendary',
  9999,
  '/avatars/reserved/reserved-staff-avatar.png',
  FALSE
WHERE NOT EXISTS (
  SELECT 1
  FROM `avatars`
  WHERE `name` = 'Reserved Staff Avatar'
  LIMIT 1
);
