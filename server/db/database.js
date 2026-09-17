import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../pharmacy.db');

// Enable verbose mode for debugging
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

// Helper functions for Promise-based query execution
export const queryAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const execute = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export async function initDatabase() {
  // Enable Foreign Keys
  await execute('PRAGMA foreign_keys = ON');

  // 1. Create Tables
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Pharmacist',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // 2. Check if users table is empty and seed initial data
  const userCountRow = await queryOne('SELECT COUNT(*) as count FROM users');
  if (userCountRow.count === 0) {
    console.log('Seeding initial database data...');

    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const pharmacistPass = bcrypt.hashSync('pharmacy123', salt);

    await execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Dr. Rajesh Sharma', 'admin@pharma.com', adminPass, 'Admin']
    );
    await execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Pooja Nair', 'pharmacist@pharma.com', pharmacistPass, 'Pharmacist']
    );

    // Seed Medicines
    const insertMed = async (name, generic_name, category, unit, reorder_level) => {
      const res = await execute(
        'INSERT INTO medicines (name, generic_name, category, unit, reorder_level) VALUES (?, ?, ?, ?, ?)',
        [name, generic_name, category, unit, reorder_level]
      );
      return res.lastID;
    };

    const pcmId = await insertMed('Paracetamol 650mg', 'Acetaminophen', 'Analgesic & Antipyretic', 'Tablets', 50);
    const amoxId = await insertMed('Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 'Capsules', 30);
    const metId = await insertMed('Metformin 500mg', 'Metformin Hydrochloride', 'Anti-diabetic', 'Tablets', 40);
    const atorId = await insertMed('Atorvastatin 20mg', 'Atorvastatin Calcium', 'Cardiovascular', 'Tablets', 25);
    const cetId = await insertMed('Cetirizine 10mg', 'Cetirizine Dihydrochloride', 'Antihistamine', 'Tablets', 20);
    const aziId = await insertMed('Azithromycin 500mg', 'Azithromycin Dihydrate', 'Antibiotic', 'Tablets', 15);
    const omepId = await insertMed('Omeprazole 20mg', 'Omeprazole Magnesium', 'Gastrointestinal', 'Capsules', 30);
    const ibupId = await insertMed('Ibuprofen 400mg', 'Ibuprofen', 'Anti-inflammatory', 'Tablets', 35);

    // Date formatting helper
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

    // Paracetamol Batches (FEFO Test Suite)
    // Batch 1: Expiring in 12 days -> Oldest active expiry! FEFO choice #1
    await insertBatch(pcmId, 'PCM-2024-B1', 100, 45, addDays(-350), addDays(12), 4.50, 'Rack A-1', 'ACTIVE');
    // Batch 2: Expiring in 90 days -> FEFO choice #2
    await insertBatch(pcmId, 'PCM-2024-B2', 200, 150, addDays(-200), addDays(90), 4.50, 'Rack A-2', 'ACTIVE');
    // Batch 3: Expired 10 days ago -> Quarantined/EXPIRED, never dispensed!
    await insertBatch(pcmId, 'PCM-2023-EX1', 150, 60, addDays(-400), addDays(-10), 4.00, 'Quarantine-Q1', 'EXPIRED');

    // Amoxicillin Batches
    await insertBatch(amoxId, 'AMX-2024-B1', 80, 25, addDays(-180), addDays(25), 12.00, 'Rack B-1', 'ACTIVE');
    await insertBatch(amoxId, 'AMX-2024-B2', 120, 120, addDays(-90), addDays(180), 12.50, 'Rack B-2', 'ACTIVE');

    // Metformin Batches
    await insertBatch(metId, 'MET-2024-B1', 300, 210, addDays(-120), addDays(240), 6.00, 'Rack C-1', 'ACTIVE');

    // Atorvastatin Batches
    await insertBatch(atorId, 'ATV-2024-B1', 100, 15, addDays(-300), addDays(8), 18.00, 'Rack C-3', 'ACTIVE');
    await insertBatch(atorId, 'ATV-2023-EX2', 50, 50, addDays(-450), addDays(-25), 16.00, 'Quarantine-Q2', 'EXPIRED');

    // Cetirizine Batches
    await insertBatch(cetId, 'CET-2024-B1', 150, 110, addDays(-100), addDays(300), 3.00, 'Rack D-1', 'ACTIVE');

    // Azithromycin Batches
    await insertBatch(aziId, 'AZI-2024-B1', 60, 40, addDays(-150), addDays(40), 28.00, 'Rack D-4', 'ACTIVE');

    // Omeprazole Batches
    await insertBatch(omepId, 'OMP-2024-B1', 100, 85, addDays(-80), addDays(150), 9.50, 'Rack E-2', 'ACTIVE');

    // Ibuprofen Batches
    await insertBatch(ibupId, 'IBU-2024-B1', 200, 180, addDays(-60), addDays(365), 5.00, 'Rack E-5', 'ACTIVE');

    console.log('Database seeded successfully with initial FEFO sample dataset!');
  }
}

export default db;
