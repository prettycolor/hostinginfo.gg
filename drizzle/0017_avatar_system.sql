-- Avatar System Tables
-- Migration: 0017_avatar_system
-- Created: 2026-02-20

-- Table: avatars (metadata for all available avatars)
CREATE TABLE IF NOT EXISTS avatars (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rarity ENUM('default', 'common', 'rare', 'epic', 'legendary') NOT NULL,
  unlock_level INT NOT NULL DEFAULT 0,
  image_path VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rarity (rarity),
  INDEX idx_unlock_level (unlock_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_avatars (tracks which avatars each user has unlocked)
CREATE TABLE IF NOT EXISTS user_avatars (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  avatar_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (avatar_id) REFERENCES avatars(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_avatar (user_id, avatar_id),
  INDEX idx_user_id (user_id),
  INDEX idx_avatar_id (avatar_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add current_avatar column to users table
ALTER TABLE users 
ADD COLUMN current_avatar VARCHAR(50) DEFAULT 'default-1',
ADD FOREIGN KEY (current_avatar) REFERENCES avatars(id) ON DELETE SET NULL;

-- Seed default avatars (15 total: 3 per tier)
INSERT INTO avatars (id, name, description, rarity, unlock_level, image_path) VALUES
-- Default Tier (Level 0 - Free)
('default-1', 'Classic Blue', 'A timeless blue avatar', 'default', 0, '/avatars/default/avatar-1.png'),
('default-2', 'Simple Green', 'Clean and simple green design', 'default', 0, '/avatars/default/avatar-2.png'),
('default-3', 'Basic Red', 'Bold red starter avatar', 'default', 0, '/avatars/default/avatar-3.png'),

-- Common Tier (Level 5)
('common-1', 'Cyber Fox', 'A sleek digital fox', 'common', 5, '/avatars/common/avatar-4.png'),
('common-2', 'Tech Owl', 'Wise tech owl', 'common', 5, '/avatars/common/avatar-5.png'),
('common-3', 'Code Cat', 'Playful coding cat', 'common', 5, '/avatars/common/avatar-6.png'),

-- Rare Tier (Level 10)
('rare-1', 'Neon Wolf', 'Glowing neon wolf', 'rare', 10, '/avatars/rare/avatar-7.png'),
('rare-2', 'Pixel Dragon', 'Retro pixel dragon', 'rare', 10, '/avatars/rare/avatar-8.png'),
('rare-3', 'Holo Bear', 'Holographic bear', 'rare', 10, '/avatars/rare/avatar-9.png'),

-- Epic Tier (Level 20)
('epic-1', 'Quantum Phoenix', 'Majestic quantum phoenix', 'epic', 20, '/avatars/epic/avatar-10.png'),
('epic-2', 'Cyber Samurai', 'Futuristic samurai warrior', 'epic', 20, '/avatars/epic/avatar-11.png'),
('epic-3', 'Astro Knight', 'Space-faring knight', 'epic', 20, '/avatars/epic/avatar-12.png'),

-- Legendary Tier (Level 50)
('legendary-1', 'Infinity Guardian', 'Cosmic infinity guardian', 'legendary', 50, '/avatars/legendary/avatar-13.png'),
('legendary-2', 'Void Master', 'Master of the void', 'legendary', 50, '/avatars/legendary/avatar-14.png'),
('legendary-3', 'Eternal Flame', 'Eternal burning flame', 'legendary', 50, '/avatars/legendary/avatar-15.png');

-- Auto-unlock default avatars for all existing users
INSERT INTO user_avatars (user_id, avatar_id)
SELECT u.id, a.id
FROM users u
CROSS JOIN avatars a
WHERE a.rarity = 'default'
ON DUPLICATE KEY UPDATE unlocked_at = unlocked_at;
