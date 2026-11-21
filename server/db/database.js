import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Configuration
const MYSQL_HOST = process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || process.env.DB_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'pharmaexpiry';

let currentDbType = 'MYSQL'; // 'MYSQL' or 'SQLITE'
let mysqlPool = null;
let sqliteDb = null;

// SQLite initialization helper
function getSqliteDb() {
  if (!sqliteDb) {
    const dbPath = path.resolve(__dirname, '../../pharmacy.db');
    const sqlite = sqlite3.verbose();
    sqliteDb = new sqlite.Database(dbPath);
  }
  return sqliteDb;
}

/**
 * Universal Query All (returns Array of objects)
 */
export async function queryAll(sql, params = []) {
  if (currentDbType === 'MYSQL' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  }

  // SQLite execution
  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Universal Query One (returns Single object or null)
 */
export async function queryOne(sql, params = []) {
  if (currentDbType === 'MYSQL' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  // SQLite execution
  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/**
 * Universal Execute (for INSERT, UPDATE, DELETE)
 * Returns normalized object: { insertId, lastID, affectedRows, changes }
 */
export async function execute(sql, params = []) {
  if (currentDbType === 'MYSQL' && mysqlPool) {
    const [result] = await mysqlPool.query(sql, params);
    const insertId = result.insertId || 0;
    const affected = result.affectedRows || 0;
    return {
      insertId,
      lastID: insertId,
      affectedRows: affected,
      changes: affected
    };
  }

  // SQLite execution
  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else {
        const id = this.lastID || 0;
        const changes = this.changes || 0;
        resolve({
          insertId: id,
          lastID: id,
          affectedRows: changes,
          changes
        });
      }
    });
  });
}

/**
 * Initialize Database (Attempts MySQL first, falls back to SQLite if MySQL is unavailable)
 */
export async function initDatabase() {
  try {
    console.log(`🔌 Attempting connection to MySQL at ${MYSQL_HOST}:${MYSQL_PORT}...`);

    // 1. First connect to MySQL server without database to ensure DB exists
    const adminConn = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      connectTimeout: 4000
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await adminConn.end();

    // 2. Create connection pool to the database
    mysqlPool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    });

    // Test ping
    await mysqlPool.query('SELECT 1');
    currentDbType = 'MYSQL';

    console.log(`=======================================================`);
    console.log(`🐬 MySQL Connected Successfully: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);
    console.log(`=======================================================`);

    // 3. Create MySQL Tables
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'PHARMACIST',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        reset_otp VARCHAR(20) DEFAULT NULL,
        reset_otp_expiry DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255) DEFAULT NULL,
        category VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL DEFAULT 'Tablets',
        reorder_level INT NOT NULL DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        medicine_id INT NOT NULL,
        batch_number VARCHAR(100) NOT NULL UNIQUE,
        initial_quantity INT NOT NULL,
        available_quantity INT NOT NULL,
        mfg_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        shelf_location VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS dispense_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_no VARCHAR(100) NOT NULL UNIQUE,
        patient_name VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS dispense_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dispense_id INT NOT NULL,
        medicine_id INT NOT NULL,
        batch_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (dispense_id) REFERENCES dispense_records(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id),
        FOREIGN KEY (batch_id) REFERENCES batches(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS outbox (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        medicine_id INT DEFAULT NULL,
        medicine_name VARCHAR(255) NOT NULL,
        current_stock INT NOT NULL,
        reorder_level INT NOT NULL,
        payload TEXT DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        email VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'EMAIL_VERIFICATION',
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  } catch (err) {
    console.warn(`⚠️ MySQL Connection Notice: Could not connect to MySQL server (${err.message}).`);
    console.warn(`⚙️ Activating embedded database engine for seamless operation without interruption.`);
    currentDbType = 'SQLITE';

    const db = getSqliteDb();
    await execute('PRAGMA foreign_keys = ON');

    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'PHARMACIST',
        is_active INTEGER DEFAULT 1,
        is_verified INTEGER DEFAULT 0,
        reset_otp TEXT,
        reset_otp_expiry DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist on legacy tables
    try { await execute('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (_) {}
    try { await execute('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (_) {}
    try { await execute('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0'); } catch (_) {}
    try { await execute('ALTER TABLE users ADD COLUMN reset_otp TEXT'); } catch (_) {}
    try { await execute('ALTER TABLE users ADD COLUMN reset_otp_expiry DATETIME'); } catch (_) {}

    await execute(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        generic_name TEXT,
        category TEXT NOT NULL,
        unit TEXT DEFAULT 'Tablets',
        reorder_level INTEGER DEFAULT 20,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id INTEGER NOT NULL,
        batch_number TEXT UNIQUE NOT NULL,
        initial_quantity INTEGER NOT NULL,
        available_quantity INTEGER NOT NULL,
        mfg_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        unit_price REAL NOT NULL,
        shelf_location TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      )
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS dispense_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_no TEXT UNIQUE NOT NULL,
        patient_name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        dispensed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS dispense_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispense_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (dispense_id) REFERENCES dispense_records(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id),
        FOREIGN KEY (batch_id) REFERENCES batches(id)
      )
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        medicine_id INTEGER,
        medicine_name TEXT NOT NULL,
        current_stock INTEGER NOT NULL,
        reorder_level INTEGER NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        purpose TEXT DEFAULT 'EMAIL_VERIFICATION',
        attempts INTEGER DEFAULT 0,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Seed default dataset if database is newly initialized
  await seedInitialData();

  // Sync expired batches
  await syncExpiredBatches();
}

/**
 * Seed Initial FEFO Dataset
 */
async function seedInitialData() {
  const medCount = await queryOne('SELECT COUNT(*) as count FROM medicines');
  if (!medCount || medCount.count === 0) {
    console.log('🌱 Seeding initial FEFO medicines and batches dataset...');

    const insertMed = async (name, generic_name, category, unit, reorder_level) => {
      const res = await execute(
        'INSERT INTO medicines (name, generic_name, category, unit, reorder_level) VALUES (?, ?, ?, ?, ?)',
        [name, generic_name, category, unit, reorder_level]
      );
      return res.insertId || res.lastID;
    };

    const pcmId = await insertMed('Paracetamol 650mg', 'Acetaminophen', 'Analgesic & Antipyretic', 'Tablets', 50);
    const amoxId = await insertMed('Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 'Capsules', 30);
    const metId = await insertMed('Metformin 500mg', 'Metformin Hydrochloride', 'Anti-diabetic', 'Tablets', 40);
    const atorId = await insertMed('Atorvastatin 20mg', 'Atorvastatin Calcium', 'Cardiovascular', 'Tablets', 25);
    const cetId = await insertMed('Cetirizine 10mg', 'Cetirizine Dihydrochloride', 'Antihistamine', 'Tablets', 20);
    const aziId = await insertMed('Azithromycin 500mg', 'Azithromycin Dihydrate', 'Antibiotic', 'Tablets', 15);
    const omepId = await insertMed('Omeprazole 20mg', 'Omeprazole Magnesium', 'Gastrointestinal', 'Capsules', 30);
    const ibupId = await insertMed('Ibuprofen 400mg', 'Ibuprofen', 'Anti-inflammatory', 'Tablets', 35);
    const panId = await insertMed('Pantoprazole 40mg', 'Pantoprazole Sodium', 'Gastrointestinal', 'Tablets', 30);
    const augId = await insertMed('Augmentin 625mg', 'Amoxicillin & Potassium Clavulanate', 'Antibiotic', 'Tablets', 25);
    const telId = await insertMed('Telmisartan 40mg', 'Telmisartan', 'Cardiovascular', 'Tablets', 30);
    const cipId = await insertMed('Ciprofloxacin 500mg', 'Ciprofloxacin Hydrochloride', 'Antibiotic', 'Tablets', 20);
    const monId = await insertMed('Montelukast 10mg', 'Montelukast Sodium', 'Respiratory', 'Tablets', 20);
    const insId = await insertMed('Insulin Glargine 100 IU/ml', 'Insulin Glargine Recombinant', 'Anti-diabetic', 'Vials', 10);
    const vitId = await insertMed('Vitamin D3 60,000 IU', 'Cholecalciferol', 'Vitamins & Supplements', 'Capsules', 15);
    const doloId = await insertMed('Dolo 650mg', 'Paracetamol', 'Analgesic & Antipyretic', 'Tablets', 50);
    const ascId = await insertMed('Ascoril D Plus 100ml', 'Dextromethorphan + Chlorpheniramine', 'Respiratory', 'Bottles', 15);
    const lcmId = await insertMed('Levocetirizine + Montelukast', 'Levocetirizine & Montelukast', 'Antihistamine', 'Tablets', 25);
    const oflId = await insertMed('Ofloxacin Eye Drops 5ml', 'Ofloxacin Ophthalmic Solution', 'Ophthalmic', 'Drops', 15);
    const betId = await insertMed('Betadine Ointment 20g', 'Povidone-Iodine 5% w/w', 'Antiseptic & Topical', 'Tubes', 20);
    const amlId = await insertMed('Amlodipine 5mg', 'Amlodipine Besylate', 'Cardiovascular', 'Tablets', 30);
    const cefId = await insertMed('Ceftriaxone 1g Injection', 'Ceftriaxone Sodium Sterile', 'Antibiotic', 'Injections', 15);

    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return formatDate(d);
    };

    const insertBatch = async (medicine_id, batch_number, initial_quantity, available_quantity, mfg_date, expiry_date, unit_price, shelf_location, status = 'ACTIVE') => {
      await execute(
        `INSERT INTO batches (medicine_id, batch_number, initial_quantity, available_quantity, mfg_date, expiry_date, unit_price, shelf_location, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [medicine_id, batch_number, initial_quantity, available_quantity, mfg_date, expiry_date, unit_price, shelf_location, status]
      );
    };

    // 1. Paracetamol Batches (FEFO Core Demonstration)
    await insertBatch(pcmId, 'PCM-2024-B1', 100, 45, addDays(-350), addDays(12), 4.50, 'Rack A-1', 'ACTIVE');
    await insertBatch(pcmId, 'PCM-2024-B2', 200, 150, addDays(-200), addDays(90), 4.50, 'Rack A-2', 'ACTIVE');
    await insertBatch(pcmId, 'PCM-2025-B3', 250, 200, addDays(-80), addDays(300), 4.80, 'Rack A-3', 'ACTIVE');
    await insertBatch(pcmId, 'PCM-2023-EX1', 150, 60, addDays(-400), addDays(-10), 4.00, 'Quarantine-Q1', 'EXPIRED');

    // 2. Amoxicillin Batches
    await insertBatch(amoxId, 'AMX-2024-B1', 80, 25, addDays(-180), addDays(25), 12.00, 'Rack B-1', 'ACTIVE');
    await insertBatch(amoxId, 'AMX-2024-B2', 120, 120, addDays(-90), addDays(180), 12.50, 'Rack B-2', 'ACTIVE');
    await insertBatch(amoxId, 'AMX-2023-EX1', 70, 40, addDays(-450), addDays(-30), 11.50, 'Quarantine-Q1', 'EXPIRED');

    // 3. Metformin Batches
    await insertBatch(metId, 'MET-2024-B1', 300, 210, addDays(-120), addDays(45), 6.00, 'Rack C-1', 'ACTIVE');
    await insertBatch(metId, 'MET-2024-B2', 300, 300, addDays(-60), addDays(240), 6.00, 'Rack C-2', 'ACTIVE');
    await insertBatch(metId, 'MET-2025-B3', 200, 180, addDays(-20), addDays(400), 6.50, 'Rack C-2', 'ACTIVE');

    // 4. Atorvastatin Batches
    await insertBatch(atorId, 'ATV-2024-B1', 100, 15, addDays(-300), addDays(8), 18.00, 'Rack C-3', 'ACTIVE');
    await insertBatch(atorId, 'ATV-2024-B2', 150, 85, addDays(-100), addDays(150), 18.50, 'Rack C-4', 'ACTIVE');
    await insertBatch(atorId, 'ATV-2023-EX2', 50, 50, addDays(-450), addDays(-25), 16.00, 'Quarantine-Q2', 'EXPIRED');

    // 5. Cetirizine Batches
    await insertBatch(cetId, 'CET-2024-B1', 150, 30, addDays(-100), addDays(28), 3.00, 'Rack D-1', 'ACTIVE');
    await insertBatch(cetId, 'CET-2024-B2', 150, 110, addDays(-50), addDays(300), 3.00, 'Rack D-2', 'ACTIVE');

    // 6. Azithromycin Batches
    await insertBatch(aziId, 'AZI-2024-B1', 60, 40, addDays(-150), addDays(15), 28.00, 'Rack D-4', 'ACTIVE');
    await insertBatch(aziId, 'AZI-2024-B2', 100, 90, addDays(-70), addDays(110), 28.00, 'Rack D-5', 'ACTIVE');
    await insertBatch(aziId, 'AZI-2025-B3', 150, 120, addDays(-15), addDays(365), 29.50, 'Rack D-5', 'ACTIVE');

    // 7. Omeprazole Batches
    await insertBatch(omepId, 'OMP-2024-B1', 100, 35, addDays(-80), addDays(45), 9.50, 'Rack E-1', 'ACTIVE');
    await insertBatch(omepId, 'OMP-2024-B2', 100, 85, addDays(-40), addDays(150), 9.50, 'Rack E-2', 'ACTIVE');

    // 8. Ibuprofen Batches
    await insertBatch(ibupId, 'IBU-2024-B1', 100, 40, addDays(-60), addDays(22), 5.00, 'Rack E-4', 'ACTIVE');
    await insertBatch(ibupId, 'IBU-2024-B2', 200, 180, addDays(-20), addDays(365), 5.00, 'Rack E-5', 'ACTIVE');

    // 9. Pantoprazole Batches
    await insertBatch(panId, 'PAN-2024-B1', 80, 30, addDays(-120), addDays(14), 11.00, 'Rack E-3', 'ACTIVE');
    await insertBatch(panId, 'PAN-2024-B2', 150, 120, addDays(-50), addDays(120), 11.50, 'Rack E-3', 'ACTIVE');
    await insertBatch(panId, 'PAN-2025-B3', 250, 200, addDays(-10), addDays(330), 12.00, 'Rack E-4', 'ACTIVE');

    // 10. Augmentin Batches
    await insertBatch(augId, 'AUG-2024-B1', 60, 20, addDays(-160), addDays(8), 24.00, 'Rack B-3', 'ACTIVE');
    await insertBatch(augId, 'AUG-2024-B2', 100, 80, addDays(-80), addDays(90), 24.50, 'Rack B-4', 'ACTIVE');
    await insertBatch(augId, 'AUG-2023-EX', 50, 30, addDays(-360), addDays(-5), 22.00, 'Quarantine-Q1', 'EXPIRED');

    // 11. Telmisartan Batches
    await insertBatch(telId, 'TEL-2024-B1', 90, 25, addDays(-140), addDays(35), 8.50, 'Rack C-5', 'ACTIVE');
    await insertBatch(telId, 'TEL-2024-B2', 160, 140, addDays(-40), addDays(250), 8.50, 'Rack C-6', 'ACTIVE');

    // 12. Ciprofloxacin Batches
    await insertBatch(cipId, 'CIP-2024-B1', 70, 18, addDays(-150), addDays(18), 14.00, 'Rack B-5', 'ACTIVE');
    await insertBatch(cipId, 'CIP-2024-B2', 120, 95, addDays(-60), addDays(200), 14.50, 'Rack B-6', 'ACTIVE');

    // 13. Montelukast Batches
    await insertBatch(monId, 'MON-2024-B1', 80, 30, addDays(-100), addDays(40), 16.00, 'Rack D-3', 'ACTIVE');
    await insertBatch(monId, 'MON-2025-B2', 180, 150, addDays(-25), addDays(300), 16.50, 'Rack D-3', 'ACTIVE');

    // 14. Insulin Glargine Batches (Cold Storage)
    await insertBatch(insId, 'INS-2024-B1', 30, 10, addDays(-170), addDays(11), 380.00, 'Cold Storage-C1', 'ACTIVE');
    await insertBatch(insId, 'INS-2024-B2', 50, 40, addDays(-60), addDays(85), 385.00, 'Cold Storage-C1', 'ACTIVE');
    await insertBatch(insId, 'INS-2023-EX', 20, 15, addDays(-400), addDays(-20), 360.00, 'Cold Storage-Quarantine', 'EXPIRED');

    // 15. Vitamin D3 Batches
    await insertBatch(vitId, 'VIT-2024-B1', 100, 45, addDays(-110), addDays(50), 35.00, 'Rack F-1', 'ACTIVE');
    await insertBatch(vitId, 'VIT-2025-B2', 250, 200, addDays(-15), addDays(450), 36.00, 'Rack F-2', 'ACTIVE');

    // 16. Dolo 650mg Batches
    await insertBatch(doloId, 'DOLO-2024-B1', 80, 25, addDays(-180), addDays(9), 4.20, 'Rack A-4', 'ACTIVE');
    await insertBatch(doloId, 'DOLO-2024-B2', 200, 180, addDays(-70), addDays(110), 4.20, 'Rack A-4', 'ACTIVE');
    await insertBatch(doloId, 'DOLO-2025-B3', 300, 250, addDays(-10), addDays(380), 4.50, 'Rack A-5', 'ACTIVE');

    // 17. Ascoril D Plus Cough Syrup Batches
    await insertBatch(ascId, 'ASC-2024-B1', 50, 20, addDays(-140), addDays(22), 92.00, 'Rack E-6', 'ACTIVE');
    await insertBatch(ascId, 'ASC-2024-B2', 80, 70, addDays(-45), addDays(190), 95.00, 'Rack E-6', 'ACTIVE');

    // 18. Levocetirizine + Montelukast Batches
    await insertBatch(lcmId, 'LCM-2024-B1', 60, 25, addDays(-150), addDays(16), 19.00, 'Rack D-2', 'ACTIVE');
    await insertBatch(lcmId, 'LCM-2024-B2', 150, 130, addDays(-50), addDays(140), 19.50, 'Rack D-2', 'ACTIVE');

    // 19. Ofloxacin Eye Drops Batches
    await insertBatch(oflId, 'OFL-2024-B1', 40, 15, addDays(-170), addDays(7), 54.00, 'Rack G-1', 'ACTIVE');
    await insertBatch(oflId, 'OFL-2024-B2', 80, 60, addDays(-50), addDays(95), 55.00, 'Rack G-1', 'ACTIVE');
    await insertBatch(oflId, 'OFL-2023-EX', 30, 20, addDays(-390), addDays(-12), 50.00, 'Quarantine-Q2', 'EXPIRED');

    // 20. Betadine Ointment Batches
    await insertBatch(betId, 'BET-2024-B1', 50, 30, addDays(-130), addDays(28), 68.00, 'Rack G-3', 'ACTIVE');
    await insertBatch(betId, 'BET-2024-B2', 120, 110, addDays(-40), addDays(260), 70.00, 'Rack G-3', 'ACTIVE');

    // 21. Amlodipine Batches
    await insertBatch(amlId, 'AML-2024-B1', 80, 35, addDays(-120), addDays(45), 5.50, 'Rack C-7', 'ACTIVE');
    await insertBatch(amlId, 'AML-2024-B2', 200, 160, addDays(-30), addDays(320), 5.50, 'Rack C-7', 'ACTIVE');

    // 22. Ceftriaxone Injection Batches
    await insertBatch(cefId, 'CEF-2024-B1', 30, 12, addDays(-160), addDays(11), 65.00, 'Rack F-3', 'ACTIVE');
    await insertBatch(cefId, 'CEF-2024-B2', 100, 80, addDays(-40), addDays(160), 65.00, 'Rack F-4', 'ACTIVE');
    await insertBatch(cefId, 'CEF-2023-EX', 40, 25, addDays(-420), addDays(-40), 60.00, 'Quarantine-Q3', 'EXPIRED');

    console.log('✅ FEFO medicines (22 products) and 50+ batches seeded successfully!');
  }
  // Note: Users table is intentionally not seeded so the user can register
  // their own first Primary Admin account via /register.
}

/**
 * Automatically update any active batch whose expiry date has passed to 'EXPIRED'
 */
export async function syncExpiredBatches() {
  const today = new Date().toISOString().split('T')[0];
  try {
    await execute(
      `UPDATE batches SET status = 'EXPIRED' WHERE expiry_date <= ? AND status = 'ACTIVE'`,
      [today]
    );
  } catch (err) {
    console.warn('Sync expired batches notice:', err.message);
  }
}

export function getDatabaseType() {
  return currentDbType;
}

export default {
  queryAll,
  queryOne,
  execute,
  initDatabase,
  syncExpiredBatches,
  getDatabaseType
};
