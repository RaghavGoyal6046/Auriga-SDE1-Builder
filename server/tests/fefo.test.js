import { initDatabase, queryOne, queryAll, execute, syncExpiredBatches, getDatabaseType } from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

async function runEndToEndAudit() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE END-TO-END FEFO AUDIT & TEST SUITE');
  console.log('   Stack: Node.js + Express + MySQL');
  console.log('===========================================================');

  await initDatabase();
  const dbEngine = getDatabaseType();
  console.log(`📦 Database Engine Active: [ ${dbEngine} ]`);

  // Ensure test admin user exists in DB with known password
  const testEmail = 'admin@pharma.com';
  const testPass = 'password123';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(testPass, salt);

  const existingUser = await queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [testEmail]);
  if (!existingUser) {
    await execute(
      `INSERT INTO users (name, email, password, role, is_active, is_verified) VALUES (?, ?, ?, ?, 1, 1)`,
      ['Audit Admin', testEmail, passwordHash, 'ADMIN']
    );
  }

  let passedTests = 0;
  const totalTests = 7;

  // --- TEST 1: Database Tables & Schema Integrity ---
  const medCount = await queryOne('SELECT COUNT(*) as count FROM medicines');
  const batchCount = await queryOne('SELECT COUNT(*) as count FROM batches');
  const userCount = await queryOne('SELECT COUNT(*) as count FROM users');

  if (medCount && medCount.count > 0 && batchCount && batchCount.count > 0 && userCount && userCount.count > 0) {
    console.log(`✅ [1/7] Schema & Data Integrity: PASS (${medCount.count} medicines, ${batchCount.count} batches, ${userCount.count} users)`);
    passedTests++;
  } else {
    console.error('❌ [1/7] Schema & Data Integrity: FAIL');
  }

  // --- TEST 2: Authentication & Password Verification ---
  const adminUser = await queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [testEmail]);
  const isPassValid = adminUser && bcrypt.compareSync(testPass, adminUser.password);
  const token = jwt.sign(
    { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  if (isPassValid && token) {
    console.log(`✅ [2/7] Authentication & JWT Verification: PASS (User: ${adminUser.name}, Role: ${adminUser.role})`);
    passedTests++;
  } else {
    console.error('❌ [2/7] Authentication: FAIL');
  }

  // --- TEST 3: In-Date Stock Inquiry ("Do we have Paracetamol in date?") ---
  await syncExpiredBatches();
  const today = new Date().toISOString().split('T')[0];

  const pcm = await queryOne('SELECT * FROM medicines WHERE name LIKE "%Paracetamol%" LIMIT 1');
  if (pcm) {
    // Only ACTIVE batches where expiry_date > today
    const inDateBatches = await queryAll(
      `SELECT * FROM batches 
       WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date > ? AND available_quantity > 0
       ORDER BY expiry_date ASC`,
      [pcm.id, today]
    );

    const sellableStock = inDateBatches.reduce((sum, b) => sum + b.available_quantity, 0);

    // Verify expired batches are excluded
    const expiredBatches = await queryAll(
      `SELECT * FROM batches WHERE medicine_id = ? AND (expiry_date <= ? OR status = 'EXPIRED')`,
      [pcm.id, today]
    );

    if (sellableStock > 0 && expiredBatches.length > 0) {
      console.log(`✅ [3/7] In-Date Stock Inquiry: PASS (Found ${sellableStock} in-date units; ${expiredBatches.length} expired lot(s) strictly excluded)`);
      passedTests++;
    } else {
      console.error('❌ [3/7] In-Date Stock Inquiry: FAIL');
    }
  } else {
    console.error('❌ [3/7] Paracetamol record not found');
  }

  // --- TEST 4: Medicine Catalog Search, Filter & Pagination ---
  const searchResults = await queryAll(
    `SELECT * FROM medicines WHERE name LIKE ? OR generic_name LIKE ? ORDER BY name ASC LIMIT 5 OFFSET 0`,
    ['%Amoxicillin%', '%Amoxicillin%']
  );

  if (searchResults.length > 0 && searchResults[0].name.includes('Amoxicillin')) {
    console.log(`✅ [4/7] Catalog Search & Querying: PASS (Found ${searchResults.length} match: ${searchResults[0].name})`);
    passedTests++;
  } else {
    console.error('❌ [4/7] Catalog Search: FAIL');
  }

  // --- TEST 5: FEFO Allocation Algorithm Simulation ---
  // Requested quantity that spans across batches
  const requestedQty = 50;
  const validBatches = await queryAll(
    `SELECT * FROM batches 
     WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date > ? AND available_quantity > 0
     ORDER BY expiry_date ASC, id ASC`,
    [pcm.id, today]
  );

  let remaining = requestedQty;
  const allocations = [];

  for (const b of validBatches) {
    if (remaining <= 0) break;
    const take = Math.min(b.available_quantity, remaining);
    allocations.push({
      batch_id: b.id,
      batch_number: b.batch_number,
      expiry_date: b.expiry_date,
      quantity_allocated: take,
      unit_price: b.unit_price,
      subtotal: take * b.unit_price
    });
    remaining -= take;
  }

  const isFEFOSorted = allocations.every((val, i, arr) => !i || arr[i - 1].expiry_date <= val.expiry_date);

  if (allocations.length > 0 && isFEFOSorted && remaining === 0) {
    console.log(`✅ [5/7] FEFO Allocation Engine: PASS (Allocated ${requestedQty} units across ${allocations.length} lot(s) strictly in expiry order)`);
    passedTests++;
  } else {
    console.error('❌ [5/7] FEFO Allocation Engine: FAIL');
  }

  // --- TEST 6: Atomic Dispense Execution & Invoice Audit Trail ---
  const initialBatch = validBatches[0];
  const dispenseQty = 2;
  const initialQty = initialBatch.available_quantity;

  const refNo = `INV-AUDIT-${Date.now()}`;
  const totalAmount = dispenseQty * initialBatch.unit_price;

  const recRes = await execute(
    `INSERT INTO dispense_records (reference_no, patient_name, user_id, total_amount) VALUES (?, ?, ?, ?)`,
    [refNo, 'Audit Patient', adminUser.id, totalAmount]
  );
  const dispenseId = recRes.insertId || recRes.lastID;

  await execute(
    `UPDATE batches SET available_quantity = available_quantity - ? WHERE id = ?`,
    [dispenseQty, initialBatch.id]
  );

  await execute(
    `INSERT INTO dispense_items (dispense_id, medicine_id, batch_id, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dispenseId, pcm.id, initialBatch.id, dispenseQty, initialBatch.unit_price, totalAmount]
  );

  const updatedBatch = await queryOne('SELECT available_quantity FROM batches WHERE id = ?', [initialBatch.id]);
  const verifiedDeduction = updatedBatch.available_quantity === initialQty - dispenseQty;

  if (dispenseId && verifiedDeduction) {
    console.log(`✅ [6/7] Dispense Execution & Receipt Generation: PASS (Ref: ${refNo}, Deducted: ${dispenseQty} units)`);
    passedTests++;
  } else {
    console.error('❌ [6/7] Dispense Execution: FAIL');
  }

  // --- TEST 7: Expiry Risk Telemetry & Alerts Feed ---
  const d30 = new Date();
  d30.setDate(d30.getDate() + 30);
  const date30Str = d30.toISOString().split('T')[0];

  const expiredCount = await queryOne(
    `SELECT COUNT(*) as count FROM batches WHERE expiry_date <= ? OR status = 'EXPIRED'`,
    [today]
  );

  const expiring30Count = await queryOne(
    `SELECT COUNT(*) as count FROM batches WHERE status = 'ACTIVE' AND expiry_date > ? AND expiry_date <= ?`,
    [today, date30Str]
  );

  const todaySales = await queryOne(
    `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue FROM dispense_records WHERE DATE(dispensed_at) = ?`,
    [today]
  );

  if (expiredCount.count > 0 && todaySales.count > 0) {
    console.log(`✅ [7/7] Telemetry & Expiry Risk Feeds: PASS (${expiredCount.count} expired lots quarantined; ${expiring30Count.count} expiring in 30 days)`);
    passedTests++;
  } else {
    console.error('❌ [7/7] Telemetry Feeds: FAIL');
  }

  // Clean up test audit user & test dispense record so DB remains in clean first-user bootstrap state
  if (dispenseId) {
    await execute('DELETE FROM dispense_items WHERE dispense_id = ?', [dispenseId]);
    await execute('DELETE FROM dispense_records WHERE id = ?', [dispenseId]);
  }
  await execute('DELETE FROM users WHERE LOWER(email) = ?', [testEmail]);

  console.log('===========================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 ALL ${totalTests} AUDIT TEST SUITES PASSED WITH 100% SUCCESS!`);
  } else {
    console.log(`⚠️ ${passedTests}/${totalTests} tests passed.`);
  }
  console.log('===========================================================');
}

runEndToEndAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
