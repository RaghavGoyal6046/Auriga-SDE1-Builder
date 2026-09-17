import express from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/batches (With search, pagination, filter, and sorting)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const statusFilter = req.query.status || 'ALL'; // ALL, ACTIVE, EXPIRED, EXPIRING_SOON
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const sortBy = ['expiry_date', 'available_quantity', 'mfg_date', 'unit_price', 'batch_number'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'expiry_date';
    const order = req.query.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const today = new Date().toISOString().split('T')[0];
    const target30Days = new Date();
    target30Days.setDate(target30Days.getDate() + 30);
    const date30DaysStr = target30Days.toISOString().split('T')[0];

    const params = [];
    let whereClauses = [];

    if (search) {
      whereClauses.push('(b.batch_number LIKE ? OR m.name LIKE ? OR m.generic_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (statusFilter === 'ACTIVE') {
      whereClauses.push("b.status = 'ACTIVE' AND b.expiry_date > ?");
      params.push(today);
    } else if (statusFilter === 'EXPIRED') {
      whereClauses.push("(b.status = 'EXPIRED' OR b.expiry_date <= ?)");
      params.push(today);
    } else if (statusFilter === 'EXPIRING_SOON') {
      whereClauses.push("b.status = 'ACTIVE' AND b.expiry_date > ? AND b.expiry_date <= ?");
      params.push(today, date30DaysStr);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM batches b JOIN medicines m ON b.medicine_id = m.id ${whereString}`,
      params
    );
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const query = `
      SELECT 
        b.*,
        m.name as medicine_name,
        m.generic_name,
        m.category,
        m.unit,
        CASE 
          WHEN b.expiry_date <= '${today}' THEN 'EXPIRED'
          WHEN b.expiry_date <= '${date30DaysStr}' THEN 'EXPIRING_SOON'
          ELSE 'HEALTHY'
        END as risk_level
      FROM batches b
      JOIN medicines m ON b.medicine_id = m.id
      ${whereString}
      ORDER BY b.${sortBy} ${order}
      LIMIT ? OFFSET ?
    `;

    const batches = await queryAll(query, [...params, limit, offset]);

    res.json({
      data: batches,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// POST /api/batches (Add new batch)
router.post('/', authenticateToken, async (req, res) => {
  const { medicine_id, batch_number, initial_quantity, mfg_date, expiry_date, unit_price, shelf_location } = req.body;

  if (!medicine_id || !batch_number || !initial_quantity || !expiry_date || !unit_price) {
    return res.status(400).json({ error: 'Medicine, batch number, initial quantity, expiry date, and unit price are required' });
  }

  try {
    // Check if batch number already exists
    const existing = await queryOne('SELECT id FROM batches WHERE batch_number = ?', [batch_number.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'A batch with this batch number already exists' });
    }

    const today = new Date().toISOString().split('T')[0];
    const initialQty = parseInt(initial_quantity);
    const status = expiry_date <= today ? 'EXPIRED' : 'ACTIVE';

    const result = await execute(
      `INSERT INTO batches (medicine_id, batch_number, initial_quantity, available_quantity, mfg_date, expiry_date, unit_price, shelf_location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(medicine_id),
        batch_number.trim().toUpperCase(),
        initialQty,
        initialQty,
        mfg_date || today,
        expiry_date,
        parseFloat(unit_price),
        shelf_location || 'General Rack',
        status
      ]
    );

    const newBatch = await queryOne(
      `SELECT b.*, m.name as medicine_name FROM batches b JOIN medicines m ON b.medicine_id = m.id WHERE b.id = ?`,
      [result.lastID]
    );

    res.status(201).json(newBatch);
  } catch (err) {
    console.error('Error adding batch:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// PUT /api/batches/:id/quarantine
router.put('/:id/quarantine', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await queryOne('SELECT * FROM batches WHERE id = ?', [id]);

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await execute("UPDATE batches SET status = 'QUARANTINED', shelf_location = 'Quarantine Bay' WHERE id = ?", [id]);

    res.json({ message: 'Batch successfully quarantined', batchId: id });
  } catch (err) {
    console.error('Error quarantining batch:', err);
    res.status(500).json({ error: 'Failed to quarantine batch' });
  }
});

export default router;
