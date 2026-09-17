import express from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: Calculate FEFO allocation for a medicine and quantity
async function calculateFEFOAllocation(medicineId, requestedQty) {
  const today = new Date().toISOString().split('T')[0];

  const medicine = await queryOne('SELECT * FROM medicines WHERE id = ?', [medicineId]);
  if (!medicine) {
    throw new Error(`Medicine ID ${medicineId} not found`);
  }

  // FEFO rule: Only ACTIVE, non-expired batches ordered by earliest expiry_date first!
  const validBatches = await queryAll(
    `SELECT * FROM batches 
     WHERE medicine_id = ? 
       AND status = 'ACTIVE' 
       AND expiry_date > ? 
       AND available_quantity > 0
     ORDER BY expiry_date ASC, id ASC`,
    [medicineId, today]
  );

  let remainingToFulfill = requestedQty;
  const allocations = [];

  for (const batch of validBatches) {
    if (remainingToFulfill <= 0) break;

    const takeQty = Math.min(batch.available_quantity, remainingToFulfill);
    const subtotal = takeQty * batch.unit_price;

    allocations.push({
      batch_id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      shelf_location: batch.shelf_location,
      unit_price: batch.unit_price,
      quantity_allocated: takeQty,
      batch_available_before: batch.available_quantity,
      batch_available_after: batch.available_quantity - takeQty,
      subtotal
    });

    remainingToFulfill -= takeQty;
  }

  const totalAllocated = requestedQty - remainingToFulfill;
  const isFulfilled = remainingToFulfill === 0;

  return {
    medicine,
    requestedQty,
    allocatedQty: totalAllocated,
    unfulfilledQty: Math.max(0, remainingToFulfill),
    isFulfilled,
    allocations,
    totalPrice: allocations.reduce((acc, a) => acc + a.subtotal, 0)
  };
}

// POST /api/dispense/preview (Simulate FEFO allocation before confirming)
router.post('/preview', authenticateToken, async (req, res) => {
  const { items } = req.body; // Array of { medicine_id, quantity }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Valid items array is required' });
  }

  try {
    const previewResults = [];
    let grandTotal = 0;
    let hasShortage = false;

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
      }

      const plan = await calculateFEFOAllocation(item.medicine_id, qty);
      if (!plan.isFulfilled) {
        hasShortage = true;
      }

      grandTotal += plan.totalPrice;
      previewResults.push(plan);
    }

    res.json({
      previewResults,
      grandTotal,
      hasShortage,
      canDispense: !hasShortage
    });
  } catch (err) {
    console.error('FEFO preview error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate FEFO preview' });
  }
});

// POST /api/dispense (Execute FEFO stock deduction and record sale)
router.post('/', authenticateToken, async (req, res) => {
  const { patient_name, items } = req.body;

  if (!patient_name || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Patient name and items array are required' });
  }

  try {
    // 1. Verify availability for all items using FEFO engine
    const plans = [];
    let grandTotal = 0;

    for (const item of items) {
      const qty = parseInt(item.quantity);
      const plan = await calculateFEFOAllocation(item.medicine_id, qty);

      if (!plan.isFulfilled) {
        return res.status(400).json({
          error: `Insufficient sellable in-date stock for ${plan.medicine.name}. Requested: ${qty}, Available: ${plan.allocatedQty}`
        });
      }

      grandTotal += plan.totalPrice;
      plans.push(plan);
    }

    // 2. Generate unique reference invoice number
    const refNo = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Create Dispense Record
    const recordResult = await execute(
      `INSERT INTO dispense_records (reference_no, patient_name, user_id, total_amount)
       VALUES (?, ?, ?, ?)`,
      [refNo, patient_name.trim(), req.user.id, grandTotal]
    );

    const dispenseId = recordResult.lastID;
    const itemRecords = [];

    // 4. Atomic Deductions and Dispense Items creation
    for (const plan of plans) {
      for (const alloc of plan.allocations) {
        // Deduct stock from batch
        await execute(
          `UPDATE batches SET available_quantity = available_quantity - ? WHERE id = ?`,
          [alloc.quantity_allocated, alloc.batch_id]
        );

        // Insert dispense item record
        const itemResult = await execute(
          `INSERT INTO dispense_items (dispense_id, medicine_id, batch_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dispenseId, plan.medicine.id, alloc.batch_id, alloc.quantity_allocated, alloc.unit_price, alloc.subtotal]
        );

        itemRecords.push({
          id: itemResult.lastID,
          medicine_name: plan.medicine.name,
          batch_number: alloc.batch_number,
          expiry_date: alloc.expiry_date,
          quantity: alloc.quantity_allocated,
          unit_price: alloc.unit_price,
          subtotal: alloc.subtotal
        });
      }
    }

    res.status(201).json({
      message: 'Dispense transaction completed successfully',
      receipt: {
        dispenseId,
        reference_no: refNo,
        patient_name: patient_name.trim(),
        dispensed_by: req.user.name,
        dispensed_at: new Date().toISOString(),
        total_amount: grandTotal,
        items: itemRecords
      }
    });
  } catch (err) {
    console.error('Dispense execution error:', err);
    res.status(500).json({ error: 'Failed to process dispense transaction' });
  }
});

// GET /api/dispense/history (Audit log with search & pagination)
router.get('/history', async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const params = [];
    let whereClauses = [];

    if (search) {
      whereClauses.push('(dr.reference_no LIKE ? OR dr.patient_name LIKE ? OR u.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM dispense_records dr JOIN users u ON dr.user_id = u.id ${whereString}`,
      params
    );
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const records = await queryAll(
      `SELECT dr.*, u.name as dispensed_by 
       FROM dispense_records dr
       JOIN users u ON dr.user_id = u.id
       ${whereString}
       ORDER BY dr.dispensed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Fetch items for each record
    for (const record of records) {
      record.items = await queryAll(
        `SELECT di.*, m.name as medicine_name, b.batch_number, b.expiry_date
         FROM dispense_items di
         JOIN medicines m ON di.medicine_id = m.id
         JOIN batches b ON di.batch_id = b.id
         WHERE di.dispense_id = ?`,
        [record.id]
      );
    }

    res.json({
      data: records,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching dispense history:', err);
    res.status(500).json({ error: 'Failed to fetch dispense history' });
  }
});

export default router;
