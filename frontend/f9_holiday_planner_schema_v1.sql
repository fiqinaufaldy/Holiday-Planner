-- Holiday Planner / Fairway Nine
-- Database: u363659030_f9_operations
-- Run this script only after selecting the dedicated f9_operations database.
-- No starter trips or default PINs are inserted.

CREATE TABLE IF NOT EXISTS `f9_planner_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `display_name` VARCHAR(120) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `pin_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('master','admin') NOT NULL DEFAULT 'admin',
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `idx_role_status` (`role`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `f9_planner_trips` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(120) NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `destination` VARCHAR(190) NOT NULL DEFAULT '',
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `cover` TEXT NULL,
  `status` ENUM('active','archived') NOT NULL DEFAULT 'active',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`),
  KEY `idx_status_dates` (`status`,`start_date`,`end_date`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_f9_planner_trip_creator`
    FOREIGN KEY (`created_by`) REFERENCES `f9_planner_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `f9_planner_trip_access` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `trip_id` BIGINT UNSIGNED NOT NULL,
  `pin_hash` VARCHAR(255) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_trip_access` (`trip_id`),
  CONSTRAINT `fk_f9_planner_access_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `f9_planner_trips` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `f9_planner_admin_trips` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` BIGINT UNSIGNED NOT NULL,
  `trip_id` BIGINT UNSIGNED NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_trip` (`admin_user_id`,`trip_id`),
  KEY `idx_trip_id` (`trip_id`),
  CONSTRAINT `fk_f9_planner_admin_user`
    FOREIGN KEY (`admin_user_id`) REFERENCES `f9_planner_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_f9_planner_admin_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `f9_planner_trips` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `f9_planner_trip_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `trip_id` BIGINT UNSIGNED NOT NULL,
  `item_type` VARCHAR(40) NOT NULL,
  `title` VARCHAR(190) NOT NULL DEFAULT '',
  `data` LONGTEXT NOT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trip_type_id` (`trip_id`,`item_type`,`id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_f9_planner_item_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `f9_planner_trips` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_f9_planner_item_creator`
    FOREIGN KEY (`created_by`) REFERENCES `f9_planner_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `f9_planner_activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_user_id` BIGINT UNSIGNED NULL,
  `trip_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL DEFAULT '',
  `entity_id` BIGINT UNSIGNED NULL,
  `details` LONGTEXT NULL,
  `ip_hash` CHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actor_created` (`actor_user_id`,`created_at`),
  KEY `idx_trip_created` (`trip_id`,`created_at`),
  CONSTRAINT `fk_f9_planner_log_user`
    FOREIGN KEY (`actor_user_id`) REFERENCES `f9_planner_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_f9_planner_log_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `f9_planner_trips` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
