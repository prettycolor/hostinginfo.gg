-- Migration 0026: Attach intelligence scans to authenticated users
-- Created: 2026-03-02

ALTER TABLE `intelligence_scans`
  ADD COLUMN `user_id` INT NULL AFTER `id`,
  ADD INDEX `user_id_idx` (`user_id`),
  ADD INDEX `user_created_idx` (`user_id`, `created_at`);
