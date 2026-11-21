-- ========================================================
-- PharmaTrace — Complete MySQL Database & Sample Dataset
-- Target: MySQL 8.x / MariaDB / MySQL Workbench / phpMyAdmin
-- ========================================================

CREATE DATABASE IF NOT EXISTS `pharmaexpiry`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `pharmaexpiry`;

-- Disable foreign key checks for clean recreation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `otps`;
DROP TABLE IF EXISTS `outbox`;
DROP TABLE IF EXISTS `dispense_items`;
DROP TABLE IF EXISTS `dispense_records`;
DROP TABLE IF EXISTS `batches`;
DROP TABLE IF EXISTS `medicines`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE `users` (
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
CREATE TABLE `medicines` (
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

-- 3. Batches Table (FEFO Core Table)
CREATE TABLE `batches` (
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

-- 4. Dispense Records Table
CREATE TABLE `dispense_records` (
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

-- 5. Dispense Items Table
CREATE TABLE `dispense_items` (
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

-- 6. Outbox Table
CREATE TABLE `outbox` (
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

-- 7. OTPs Table
CREATE TABLE `otps` (
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

-- ========================================================
-- SEED DATASET: MEDICINES (22 Products Across Therapeutic Classes)
-- ========================================================

INSERT INTO `medicines` (`id`, `name`, `generic_name`, `category`, `unit`, `reorder_level`) VALUES
(1, 'Paracetamol 650mg', 'Acetaminophen', 'Analgesic & Antipyretic', 'Tablets', 50),
(2, 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 'Capsules', 30),
(3, 'Metformin 500mg', 'Metformin Hydrochloride', 'Anti-diabetic', 'Tablets', 40),
(4, 'Atorvastatin 20mg', 'Atorvastatin Calcium', 'Cardiovascular', 'Tablets', 25),
(5, 'Cetirizine 10mg', 'Cetirizine Dihydrochloride', 'Antihistamine', 'Tablets', 20),
(6, 'Azithromycin 500mg', 'Azithromycin Dihydrate', 'Antibiotic', 'Tablets', 15),
(7, 'Omeprazole 20mg', 'Omeprazole Magnesium', 'Gastrointestinal', 'Capsules', 30),
(8, 'Ibuprofen 400mg', 'Ibuprofen', 'Anti-inflammatory', 'Tablets', 35),
(9, 'Pantoprazole 40mg', 'Pantoprazole Sodium', 'Gastrointestinal', 'Tablets', 30),
(10, 'Augmentin 625mg', 'Amoxicillin & Potassium Clavulanate', 'Antibiotic', 'Tablets', 25),
(11, 'Telmisartan 40mg', 'Telmisartan', 'Cardiovascular', 'Tablets', 30),
(12, 'Ciprofloxacin 500mg', 'Ciprofloxacin Hydrochloride', 'Antibiotic', 'Tablets', 20),
(13, 'Montelukast 10mg', 'Montelukast Sodium', 'Respiratory', 'Tablets', 20),
(14, 'Insulin Glargine 100 IU/ml', 'Insulin Glargine Recombinant', 'Anti-diabetic', 'Vials', 10),
(15, 'Vitamin D3 60,000 IU', 'Cholecalciferol', 'Vitamins & Supplements', 'Capsules', 15),
(16, 'Dolo 650mg', 'Paracetamol', 'Analgesic & Antipyretic', 'Tablets', 50),
(17, 'Ascoril D Plus 100ml', 'Dextromethorphan + Chlorpheniramine', 'Respiratory', 'Bottles', 15),
(18, 'Levocetirizine + Montelukast', 'Levocetirizine & Montelukast', 'Antihistamine', 'Tablets', 25),
(19, 'Ofloxacin Eye Drops 5ml', 'Ofloxacin Ophthalmic Solution', 'Ophthalmic', 'Drops', 15),
(20, 'Betadine Ointment 20g', 'Povidone-Iodine 5% w/w', 'Antiseptic & Topical', 'Tubes', 20),
(21, 'Amlodipine 5mg', 'Amlodipine Besylate', 'Cardiovascular', 'Tablets', 30),
(22, 'Ceftriaxone 1g Injection', 'Ceftriaxone Sodium Sterile', 'Antibiotic', 'Injections', 15);

-- ========================================================
-- SEED DATASET: BATCHES (50+ Lots with Dynamic Relative Dates for FEFO)
-- ========================================================

INSERT INTO `batches` (`medicine_id`, `batch_number`, `initial_quantity`, `available_quantity`, `mfg_date`, `expiry_date`, `unit_price`, `shelf_location`, `status`) VALUES
-- 1. Paracetamol Batches
(1, 'PCM-2024-B1', 100, 45, DATE_SUB(CURDATE(), INTERVAL 350 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 4.50, 'Rack A-1', 'ACTIVE'),
(1, 'PCM-2024-B2', 200, 150, DATE_SUB(CURDATE(), INTERVAL 200 DAY), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 4.50, 'Rack A-2', 'ACTIVE'),
(1, 'PCM-2025-B3', 250, 200, DATE_SUB(CURDATE(), INTERVAL 80 DAY), DATE_ADD(CURDATE(), INTERVAL 300 DAY), 4.80, 'Rack A-3', 'ACTIVE'),
(1, 'PCM-2023-EX1', 150, 60, DATE_SUB(CURDATE(), INTERVAL 400 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 4.00, 'Quarantine-Q1', 'EXPIRED'),

-- 2. Amoxicillin Batches
(2, 'AMX-2024-B1', 80, 25, DATE_SUB(CURDATE(), INTERVAL 180 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 12.00, 'Rack B-1', 'ACTIVE'),
(2, 'AMX-2024-B2', 120, 120, DATE_SUB(CURDATE(), INTERVAL 90 DAY), DATE_ADD(CURDATE(), INTERVAL 180 DAY), 12.50, 'Rack B-2', 'ACTIVE'),
(2, 'AMX-2023-EX1', 70, 40, DATE_SUB(CURDATE(), INTERVAL 450 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY), 11.50, 'Quarantine-Q1', 'EXPIRED'),

-- 3. Metformin Batches
(3, 'MET-2024-B1', 300, 210, DATE_SUB(CURDATE(), INTERVAL 120 DAY), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 6.00, 'Rack C-1', 'ACTIVE'),
(3, 'MET-2024-B2', 300, 300, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 240 DAY), 6.00, 'Rack C-2', 'ACTIVE'),
(3, 'MET-2025-B3', 200, 180, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 400 DAY), 6.50, 'Rack C-2', 'ACTIVE'),

-- 4. Atorvastatin Batches
(4, 'ATV-2024-B1', 100, 15, DATE_SUB(CURDATE(), INTERVAL 300 DAY), DATE_ADD(CURDATE(), INTERVAL 8 DAY), 18.00, 'Rack C-3', 'ACTIVE'),
(4, 'ATV-2024-B2', 150, 85, DATE_SUB(CURDATE(), INTERVAL 100 DAY), DATE_ADD(CURDATE(), INTERVAL 150 DAY), 18.50, 'Rack C-4', 'ACTIVE'),
(4, 'ATV-2023-EX2', 50, 50, DATE_SUB(CURDATE(), INTERVAL 450 DAY), DATE_SUB(CURDATE(), INTERVAL 25 DAY), 16.00, 'Quarantine-Q2', 'EXPIRED'),

-- 5. Cetirizine Batches
(5, 'CET-2024-B1', 150, 30, DATE_SUB(CURDATE(), INTERVAL 100 DAY), DATE_ADD(CURDATE(), INTERVAL 28 DAY), 3.00, 'Rack D-1', 'ACTIVE'),
(5, 'CET-2024-B2', 150, 110, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_ADD(CURDATE(), INTERVAL 300 DAY), 3.00, 'Rack D-2', 'ACTIVE'),

-- 6. Azithromycin Batches
(6, 'AZI-2024-B1', 60, 40, DATE_SUB(CURDATE(), INTERVAL 150 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 28.00, 'Rack D-4', 'ACTIVE'),
(6, 'AZI-2024-B2', 100, 90, DATE_SUB(CURDATE(), INTERVAL 70 DAY), DATE_ADD(CURDATE(), INTERVAL 110 DAY), 28.00, 'Rack D-5', 'ACTIVE'),
(6, 'AZI-2025-B3', 150, 120, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 29.50, 'Rack D-5', 'ACTIVE'),

-- 7. Omeprazole Batches
(7, 'OMP-2024-B1', 100, 35, DATE_SUB(CURDATE(), INTERVAL 80 DAY), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 9.50, 'Rack E-1', 'ACTIVE'),
(7, 'OMP-2024-B2', 100, 85, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_ADD(CURDATE(), INTERVAL 150 DAY), 9.50, 'Rack E-2', 'ACTIVE'),

-- 8. Ibuprofen Batches
(8, 'IBU-2024-B1', 100, 40, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 22 DAY), 5.00, 'Rack E-4', 'ACTIVE'),
(8, 'IBU-2024-B2', 200, 180, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 5.00, 'Rack E-5', 'ACTIVE'),

-- 9. Pantoprazole Batches
(9, 'PAN-2024-B1', 80, 30, DATE_SUB(CURDATE(), INTERVAL 120 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 11.00, 'Rack E-3', 'ACTIVE'),
(9, 'PAN-2024-B2', 150, 120, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_ADD(CURDATE(), INTERVAL 120 DAY), 11.50, 'Rack E-3', 'ACTIVE'),
(9, 'PAN-2025-B3', 250, 200, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 330 DAY), 12.00, 'Rack E-4', 'ACTIVE'),

-- 10. Augmentin Batches
(10, 'AUG-2024-B1', 60, 20, DATE_SUB(CURDATE(), INTERVAL 160 DAY), DATE_ADD(CURDATE(), INTERVAL 8 DAY), 24.00, 'Rack B-3', 'ACTIVE'),
(10, 'AUG-2024-B2', 100, 80, DATE_SUB(CURDATE(), INTERVAL 80 DAY), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 24.50, 'Rack B-4', 'ACTIVE'),
(10, 'AUG-2023-EX', 50, 30, DATE_SUB(CURDATE(), INTERVAL 360 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 22.00, 'Quarantine-Q1', 'EXPIRED'),

-- 11. Telmisartan Batches
(11, 'TEL-2024-B1', 90, 25, DATE_SUB(CURDATE(), INTERVAL 140 DAY), DATE_ADD(CURDATE(), INTERVAL 35 DAY), 8.50, 'Rack C-5', 'ACTIVE'),
(11, 'TEL-2024-B2', 160, 140, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_ADD(CURDATE(), INTERVAL 250 DAY), 8.50, 'Rack C-6', 'ACTIVE'),

-- 12. Ciprofloxacin Batches
(12, 'CIP-2024-B1', 70, 18, DATE_SUB(CURDATE(), INTERVAL 150 DAY), DATE_ADD(CURDATE(), INTERVAL 18 DAY), 14.00, 'Rack B-5', 'ACTIVE'),
(12, 'CIP-2024-B2', 120, 95, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 200 DAY), 14.50, 'Rack B-6', 'ACTIVE'),

-- 13. Montelukast Batches
(13, 'MON-2024-B1', 80, 30, DATE_SUB(CURDATE(), INTERVAL 100 DAY), DATE_ADD(CURDATE(), INTERVAL 40 DAY), 16.00, 'Rack D-3', 'ACTIVE'),
(13, 'MON-2025-B2', 180, 150, DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_ADD(CURDATE(), INTERVAL 300 DAY), 16.50, 'Rack D-3', 'ACTIVE'),

-- 14. Insulin Glargine Batches (Cold Storage)
(14, 'INS-2024-B1', 30, 10, DATE_SUB(CURDATE(), INTERVAL 170 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY), 380.00, 'Cold Storage-C1', 'ACTIVE'),
(14, 'INS-2024-B2', 50, 40, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 85 DAY), 385.00, 'Cold Storage-C1', 'ACTIVE'),
(14, 'INS-2023-EX', 20, 15, DATE_SUB(CURDATE(), INTERVAL 400 DAY), DATE_SUB(CURDATE(), INTERVAL 20 DAY), 360.00, 'Cold Storage-Quarantine', 'EXPIRED'),

-- 15. Vitamin D3 Batches
(15, 'VIT-2024-B1', 100, 45, DATE_SUB(CURDATE(), INTERVAL 110 DAY), DATE_ADD(CURDATE(), INTERVAL 50 DAY), 35.00, 'Rack F-1', 'ACTIVE'),
(15, 'VIT-2025-B2', 250, 200, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 450 DAY), 36.00, 'Rack F-2', 'ACTIVE'),

-- 16. Dolo 650mg Batches
(16, 'DOLO-2024-B1', 80, 25, DATE_SUB(CURDATE(), INTERVAL 180 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 4.20, 'Rack A-4', 'ACTIVE'),
(16, 'DOLO-2024-B2', 200, 180, DATE_SUB(CURDATE(), INTERVAL 70 DAY), DATE_ADD(CURDATE(), INTERVAL 110 DAY), 4.20, 'Rack A-4', 'ACTIVE'),
(16, 'DOLO-2025-B3', 300, 250, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 380 DAY), 4.50, 'Rack A-5', 'ACTIVE'),

-- 17. Ascoril D Plus Cough Syrup Batches
(17, 'ASC-2024-B1', 50, 20, DATE_SUB(CURDATE(), INTERVAL 140 DAY), DATE_ADD(CURDATE(), INTERVAL 22 DAY), 92.00, 'Rack E-6', 'ACTIVE'),
(17, 'ASC-2024-B2', 80, 70, DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_ADD(CURDATE(), INTERVAL 190 DAY), 95.00, 'Rack E-6', 'ACTIVE'),

-- 18. Levocetirizine + Montelukast Batches
(18, 'LCM-2024-B1', 60, 25, DATE_SUB(CURDATE(), INTERVAL 150 DAY), DATE_ADD(CURDATE(), INTERVAL 16 DAY), 19.00, 'Rack D-2', 'ACTIVE'),
(18, 'LCM-2024-B2', 150, 130, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_ADD(CURDATE(), INTERVAL 140 DAY), 19.50, 'Rack D-2', 'ACTIVE'),

-- 19. Ofloxacin Eye Drops Batches
(19, 'OFL-2024-B1', 40, 15, DATE_SUB(CURDATE(), INTERVAL 170 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 54.00, 'Rack G-1', 'ACTIVE'),
(19, 'OFL-2024-B2', 80, 60, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_ADD(CURDATE(), INTERVAL 95 DAY), 55.00, 'Rack G-1', 'ACTIVE'),
(19, 'OFL-2023-EX', 30, 20, DATE_SUB(CURDATE(), INTERVAL 390 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), 50.00, 'Quarantine-Q2', 'EXPIRED'),

-- 20. Betadine Ointment Batches
(20, 'BET-2024-B1', 50, 30, DATE_SUB(CURDATE(), INTERVAL 130 DAY), DATE_ADD(CURDATE(), INTERVAL 28 DAY), 68.00, 'Rack G-3', 'ACTIVE'),
(20, 'BET-2024-B2', 120, 110, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_ADD(CURDATE(), INTERVAL 260 DAY), 70.00, 'Rack G-3', 'ACTIVE'),

-- 21. Amlodipine Batches
(21, 'AML-2024-B1', 80, 35, DATE_SUB(CURDATE(), INTERVAL 120 DAY), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 5.50, 'Rack C-7', 'ACTIVE'),
(21, 'AML-2024-B2', 200, 160, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 320 DAY), 5.50, 'Rack C-7', 'ACTIVE'),

-- 22. Ceftriaxone Injection Batches
(22, 'CEF-2024-B1', 30, 12, DATE_SUB(CURDATE(), INTERVAL 160 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY), 65.00, 'Rack F-3', 'ACTIVE'),
(22, 'CEF-2024-B2', 100, 80, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_ADD(CURDATE(), INTERVAL 160 DAY), 65.00, 'Rack F-4', 'ACTIVE'),
(22, 'CEF-2023-EX', 40, 25, DATE_SUB(CURDATE(), INTERVAL 420 DAY), DATE_SUB(CURDATE(), INTERVAL 40 DAY), 60.00, 'Quarantine-Q3', 'EXPIRED');
