import express from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/medicines/check-indate?name=Paracetamol (Quick In-Date Check)
router.get('/check-indate', async (req, res) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Medicine name query parameter is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const searchTerm = `%${name.trim()}%`;

    // Search matching medicines
    const medicine = await queryOne(
      `SELECT * FROM medicines WHERE name LIKE ? OR generic_name LIKE ? LIMIT 1`,
      [searchTerm, searchTerm]
    );

    if (!medicine) {
      return res.json({
        found: false,
        query: name,
        inDateAvailable: false,
        sellableStock: 0,
        message: `No medicine matching "${name}" was found in system records.`
      });
    }

    // Get active valid batches expiring in future
    const activeBatches = await queryAll(
      `SELECT * FROM batches 
       WHERE medicine_id = ? 
         AND status = 'ACTIVE' 
         AND expiry_date > ? 
         AND available_quantity > 0
       ORDER BY expiry_date ASC`,
      [medicine.id, today]
    );

    const sellableStock = activeBatches.reduce((acc, b) => acc + b.available_quantity, 0);
    const inDateAvailable = sellableStock > 0;

    res.json({
      found: true,
      query: name,
      medicine,
      inDateAvailable,
      sellableStock,
      earliestExpiryDate: activeBatches.length > 0 ? activeBatches[0].expiry_date : null,
      batchCount: activeBatches.length,
      nextBatchToDispense: activeBatches.length > 0 ? activeBatches[0] : null,
      message: inDateAvailable
        ? `YES! We have ${sellableStock} units of ${medicine.name} in date. Earliest expiring batch expires on ${activeBatches[0].expiry_date}.`
        : `NO. We do NOT have sellable in-date stock for ${medicine.name}.`
    });
  } catch (err) {
    console.error('Error checking in-date stock:', err);
    res.status(500).json({ error: 'Failed to perform in-date stock check' });
  }
});

// GET /api/medicines (With search, pagination, and sorting)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const category = req.query.category || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const sortBy = ['name', 'category', 'created_at'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'name';
    const order = req.query.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const today = new Date().toISOString().split('T')[0];
    const params = [];
    let whereClauses = [];

    if (search) {
      whereClauses.push('(m.name LIKE ? OR m.generic_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClauses.push('m.category = ?');
      params.push(category);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count for pagination
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM medicines m ${whereString}`,
      params
    );
    const totalItems = countResult.total;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Fetch medicines with sellable (in-date) stock and total stock
    const query = `
      SELECT 
        m.*,
        COALESCE(SUM(CASE WHEN b.expiry_date > '${today}' AND b.status = 'ACTIVE' THEN b.available_quantity ELSE 0 END), 0) as sellable_stock,
        COALESCE(SUM(CASE WHEN b.expiry_date <= '${today}' OR b.status != 'ACTIVE' THEN b.available_quantity ELSE 0 END), 0) as expired_stock,
        COUNT(CASE WHEN b.expiry_date > '${today}' AND b.status = 'ACTIVE' AND b.available_quantity > 0 THEN 1 END) as active_batches_count
      FROM medicines m
      LEFT JOIN batches b ON m.id = b.medicine_id
      ${whereString}
      GROUP BY m.id
      ORDER BY m.${sortBy} ${order}
      LIMIT ? OFFSET ?
    `;

    const medicines = await queryAll(query, [...params, limit, offset]);

    res.json({
      data: medicines,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching medicines:', err);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// GET /api/medicines/:id
router.get('/:id', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const medicine = await queryOne('SELECT * FROM medicines WHERE id = ?', [req.params.id]);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const batches = await queryAll(
      `SELECT * FROM batches WHERE medicine_id = ? ORDER BY expiry_date ASC`,
      [req.params.id]
    );

    const sellableStock = batches
      .filter((b) => b.expiry_date > today && b.status === 'ACTIVE')
      .reduce((acc, b) => acc + b.available_quantity, 0);

    const expiredStock = batches
      .filter((b) => b.expiry_date <= today || b.status !== 'ACTIVE')
      .reduce((acc, b) => acc + b.available_quantity, 0);

    res.json({
      medicine,
      batches,
      stockSummary: {
        sellableStock,
        expiredStock,
        totalStock: sellableStock + expiredStock
      }
    });
  } catch (err) {
    console.error('Error fetching medicine detail:', err);
    res.status(500).json({ error: 'Failed to fetch medicine detail' });
  }
});

// POST /api/medicines
router.post('/', authenticateToken, async (req, res) => {
  const { name, generic_name, category, unit, reorder_level } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  try {
    const result = await execute(
      `INSERT INTO medicines (name, generic_name, category, unit, reorder_level)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        generic_name ? generic_name.trim() : '',
        category.trim(),
        unit || 'Tablets',
        parseInt(reorder_level) || 20
      ]
    );

    const newMed = await queryOne('SELECT * FROM medicines WHERE id = ?', [result.lastID]);
    res.status(201).json(newMed);
  } catch (err) {
    console.error('Error creating medicine:', err);
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});

export default router;
