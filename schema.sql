-- ========================================================
-- PharmaTrace — MySQL Database Schema & Table Definitions
-- Target Database: MySQL 8.x / MariaDB 10.x
-- ========================================================

CREATE DATABASE IF NOT EXISTS `pharmaexpiry`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `pharmaexpiry`;

-- 1. Users Table (Role-based access: ADMIN, PHARMACIST)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'PHARMACIST',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `reset_otp` VARCHAR(20) DEFAULT NULL,
  `reset_otp_expiry` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Medicines Catalog Table
CREATE TABLE IF NOT EXISTS `medicines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'Tablets',
  `reorder_level` INT NOT NULL DEFAULT 20,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_med_name` (`name`),
  INDEX `idx_med_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Batches Table (Enforces FEFO: First-Expiry-First-Out)
CREATE TABLE IF NOT EXISTS `batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `medicine_id` INT NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL UNIQUE,
  `initial_quantity` INT NOT NULL,
  `available_quantity` INT NOT NULL,
  `mfg_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `shelf_location` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_batches_expiry` (`expiry_date`),
  INDEX `idx_batches_status` (`status`),
  INDEX `idx_batches_medicine` (`medicine_id`),
  CONSTRAINT `fk_batches_medicine`
    FOREIGN KEY (`medicine_id`)
    REFERENCES `medicines` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Dispense Records Table (Invoices / Outbound Transactions)
CREATE TABLE IF NOT EXISTS `dispense_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference_no` VARCHAR(100) NOT NULL UNIQUE,
  `patient_name` VARCHAR(255) NOT NULL,
  `user_id` INT NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `dispensed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_dispense_reference` (`reference_no`),
  INDEX `idx_dispense_date` (`dispensed_at`),
  CONSTRAINT `fk_dispense_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Dispense Items Table (Audit Trail for FEFO Deductions)
CREATE TABLE IF NOT EXISTS `dispense_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dispense_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `batch_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  INDEX `idx_dispense_items_batch` (`batch_id`),
  CONSTRAINT `fk_dispense_items_record`
    FOREIGN KEY (`dispense_id`)
    REFERENCES `dispense_records` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_dispense_items_med`
    FOREIGN KEY (`medicine_id`)
    REFERENCES `medicines` (`id`),
  CONSTRAINT `fk_dispense_items_batch`
    FOREIGN KEY (`batch_id`)
    REFERENCES `batches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Notification Outbox Table
CREATE TABLE IF NOT EXISTS `outbox` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(100) NOT NULL,
  `medicine_id` INT DEFAULT NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `current_stock` INT NOT NULL,
  `reorder_level` INT NOT NULL,
  `payload` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_outbox_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Verification OTP Table
CREATE TABLE IF NOT EXISTS `otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL DEFAULT 'EMAIL_VERIFICATION',
  `attempts` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otps_email_purpose` (`email`, `purpose`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
