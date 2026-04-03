-- Phase 3 Task 4: WHOIS Historical Tracking
-- Tracks WHOIS record changes over time to detect ownership transfers,
-- registrar changes, nameserver updates, and suspicious modifications.

-- Table: whois_history
-- Stores historical snapshots of WHOIS records
CREATE TABLE IF NOT EXISTS `whois_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `snapshot_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Registration Information
  `registrar` VARCHAR(255),
  `registrar_iana_id` VARCHAR(50),
  `registrant_name` VARCHAR(255),
  `registrant_email` VARCHAR(255),
  `registrant_organization` VARCHAR(255),
  `registrant_country` VARCHAR(100),
  
  -- Important Dates
  `creation_date` TIMESTAMP,
  `expiration_date` TIMESTAMP,
  `updated_date` TIMESTAMP,
  
  -- Technical Details
  `nameservers` JSON,
  `status` JSON,
  `dnssec_enabled` BOOLEAN DEFAULT FALSE,
  `transfer_lock` BOOLEAN DEFAULT FALSE,
  
  -- Full WHOIS Data
  `raw_whois_data` JSON,
  
  -- Metadata
  `data_source` VARCHAR(50) DEFAULT 'whoisfreaks',
  `scan_id` VARCHAR(100),
  
  INDEX `idx_domain` (`domain`),
  INDEX `idx_snapshot_date` (`snapshot_date`),
  INDEX `idx_domain_date` (`domain`, `snapshot_date`),
  INDEX `idx_registrar` (`registrar`),
  INDEX `idx_registrant_email` (`registrant_email`),
  INDEX `idx_expiration_date` (`expiration_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: whois_changes
-- Tracks detected changes between WHOIS snapshots
CREATE TABLE IF NOT EXISTS `whois_changes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `change_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `change_type` VARCHAR(50) NOT NULL,
  `field_name` VARCHAR(100) NOT NULL,
  `old_value` TEXT,
  `new_value` TEXT,
  `severity` ENUM('critical', 'high', 'medium', 'low', 'info') DEFAULT 'info',
  `is_suspicious` BOOLEAN DEFAULT FALSE,
  `previous_snapshot_id` INT,
  `current_snapshot_id` INT,
  `notes` TEXT,
  
  INDEX `idx_domain` (`domain`),
  INDEX `idx_change_date` (`change_date`),
  INDEX `idx_change_type` (`change_type`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_suspicious` (`is_suspicious`),
  INDEX `idx_domain_date` (`domain`, `change_date`),
  
  FOREIGN KEY (`previous_snapshot_id`) REFERENCES `whois_history`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`current_snapshot_id`) REFERENCES `whois_history`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: whois_alerts
-- Stores alerts for significant WHOIS changes
CREATE TABLE IF NOT EXISTS `whois_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `alert_type` VARCHAR(50) NOT NULL,
  `severity` ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `change_ids` JSON,
  `triggered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acknowledged` BOOLEAN DEFAULT FALSE,
  `acknowledged_at` TIMESTAMP NULL,
  `acknowledged_by` VARCHAR(100),
  
  INDEX `idx_domain` (`domain`),
  INDEX `idx_alert_type` (`alert_type`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_triggered_at` (`triggered_at`),
  INDEX `idx_acknowledged` (`acknowledged`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
