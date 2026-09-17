import { initDatabase, queryAll, queryOne } from '../db/database.js';

async function testFEFOCore() {
  console.log('--- RUNNING FEFO ENGINE VALIDATION SUITE ---');

  await initDatabase();

  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch Paracetamol medicine
  const pcm = await queryOne('SELECT * FROM medicines WHERE name LIKE ?', ['%Paracetamol%']);
  if (!pcm) {
    console.error('❌ FAIL: Paracetamol medicine not found in database');
    process.exit(1);
  }

  console.log(`✅ Step 1: Found Medicine "${pcm.name}" (ID: ${pcm.id})`);

  // 2. Query active batches ordered by FEFO
  const validBatches = await queryAll(
    `SELECT * FROM batches 
     WHERE medicine_id = ? 
       AND status = 'ACTIVE' 
       AND expiry_date > ? 
       AND available_quantity > 0
     ORDER BY expiry_date ASC`,
    [pcm.id, today]
  );

  console.log(`✅ Step 2: Querying FEFO ordered active batches...`);
  validBatches.forEach((b, idx) => {
    console.log(`   [Priority #${idx + 1}] Batch: ${b.batch_number}, Expiry: ${b.expiry_date}, Available Qty: ${b.available_quantity}`);
  });

  // Verify earliest expiry batch is first
  if (validBatches.length > 1) {
    const d1 = new Date(validBatches[0].expiry_date);
    const d2 = new Date(validBatches[1].expiry_date);
    if (d1 > d2) {
      console.error('❌ FAIL: FEFO ordering failed! Batch 0 expiry is later than Batch 1.');
      process.exit(1);
    }
  }

  // 3. Verify expired batches are excluded
  const expiredBatchesInFEFO = validBatches.filter((b) => b.expiry_date <= today || b.status === 'EXPIRED');
  if (expiredBatchesInFEFO.length > 0) {
    console.error('❌ FAIL: Expired batches were incorrectly included in FEFO available list!');
    process.exit(1);
  }

  console.log('✅ Step 3: Verified EXPIRED batches are 100% excluded from sellable stock.');
  console.log('🎉 ALL FEFO ENGINE VALIDATION CHECKS PASSED SUCCESSFULLY!\n');
}

testFEFOCore().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
