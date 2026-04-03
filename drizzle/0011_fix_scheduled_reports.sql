-- Fix scheduled_reports table to match schema.ts
-- Rename and add missing columns

ALTER TABLE `scheduled_reports` 
  CHANGE COLUMN `schedule` `frequency` varchar(50) NOT NULL,
  ADD COLUMN `format` varchar(20) NOT NULL DEFAULT 'pdf' AFTER `frequency`,
  CHANGE COLUMN `last_run_at` `last_run` timestamp,
  CHANGE COLUMN `next_run_at` `next_run` timestamp,
  MODIFY COLUMN `recipients` json;

-- Update indexes to match new column names
DROP INDEX `next_run_at_idx` ON `scheduled_reports`;
CREATE INDEX `next_run_idx` ON `scheduled_reports` (`next_run`);
