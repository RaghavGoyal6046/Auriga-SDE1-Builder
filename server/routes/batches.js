import express from 'express';
import { queryAll, queryOne, execute, syncExpiredBatches } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/batches (With search, pagination, filter, and sorting)
router.get('/', async (req, res) => {
  try {
    await syncExpiredBatches();

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

// Helper functions for Level 2 — T4 (Messy Data Parsing)
function parseMessyQuantity(val) {
  if (val === null || val === undefined) return null;
  const match = val.toString().match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1]);
  return isNaN(num) || num <= 0 ? null : num;
}

function parseMessyPrice(val) {
  if (val === null || val === undefined) return null;
  const match = val.toString().match(/([\d.]+)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) || num < 0 ? null : num;
}

function parseMessyDate(val) {
  if (!val) return null;
  const s = val.toString().trim();

  // Try ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Try DD/MM/YYYY or MM/DD/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1]);
    let p2 = parseInt(dmyMatch[2]);
    let year = parseInt(dmyMatch[3]);
    let month = p2;
    let day = p1;

    // Handle DD/MM vs MM/DD
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      day = p2;
      month = p1;
    }
    const mm = month < 10 ? `0${month}` : `${month}`;
    const dd = day < 10 ? `0${day}` : `${day}`;
    return `${year}-${mm}-${dd}`;
  }

  // Fallback to JS Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Level 2 — T4 (Messy Data Import):
 * POST /api/batches/import-messy (and /api/batches/import)
 * Parses messy batch list (nulls, '10 units', dd/mm/yyyy vs ISO, duplicates)
 * Returns { imported, deduped, rejected, details }
 */
const handleMessyImport = async (req, res) => {
  try {
    const rawBatches = req.body?.batches || req.body;
    if (!Array.isArray(rawBatches)) {
      return res.status(400).json({ error: 'Payload must be an array of batch objects or { batches: [...] }' });
    }

    let imported = 0;
    let deduped = 0;
    let rejected = 0;

    const imported_batches = [];
    const deduped_batches = [];
    const rejected_batches = [];

    const seenInPayload = new Set();
    const today = new Date().toISOString().split('T')[0];

    for (const rawItem of rawBatches) {
      if (!rawItem || typeof rawItem !== 'object') {
        rejected++;
        rejected_batches.push({ raw: rawItem, reason: 'Invalid object entry' });
        continue;
      }

      const rawBatchNo = rawItem.batch_number || rawItem.batchNo || rawItem.batch_code || rawItem.code;
      const rawMedName = rawItem.medicine_name || rawItem.medicine || rawItem.drug_name || rawItem.name;
      const rawQty = rawItem.quantity !== undefined ? rawItem.quantity : (rawItem.initial_quantity || rawItem.qty);
      const rawExpiry = rawItem.expiry_date || rawItem.expiry || rawItem.exp;
      const rawMfg = rawItem.mfg_date || rawItem.mfg || today;
      const rawPrice = rawItem.unit_price !== undefined ? rawItem.unit_price : (rawItem.price || 5.00);
      const rawShelf = rawItem.shelf_location || rawItem.shelf || 'Import Rack';

      // 1. Validate required batch number
      if (!rawBatchNo || !rawBatchNo.toString().trim()) {
        rejected++;
        rejected_batches.push({ raw: rawItem, reason: 'Missing or null batch_number' });
        continue;
      }

      const cleanBatchNo = rawBatchNo.toString().trim().toUpperCase();

      // 2. Validate medicine name
      if (!rawMedName || !rawMedName.toString().trim()) {
        rejected++;
        rejected_batches.push({ raw: rawItem, reason: 'Missing or null medicine_name' });
        continue;
      }
      const cleanMedName = rawMedName.toString().trim();

      // 3. Parse quantity ('10 units' -> 10)
      const parsedQty = parseMessyQuantity(rawQty);
      if (parsedQty === null) {
        rejected++;
        rejected_batches.push({ raw: rawItem, reason: `Unparseable quantity '${rawQty}'` });
        continue;
      }

      // 4. Parse expiry date ('dd/mm/yyyy' or ISO -> YYYY-MM-DD)
      const parsedExpiry = parseMessyDate(rawExpiry);
      if (!parsedExpiry) {
        rejected++;
        rejected_batches.push({ raw: rawItem, reason: `Unparseable expiry date '${rawExpiry}'` });
        continue;
      }

      // 5. Parse price ('$4.50' -> 4.50)
      const parsedPrice = parseMessyPrice(rawPrice) || 5.00;
      const parsedMfg = parseMessyDate(rawMfg) || today;

      // 6. Check deduplication (Payload duplicate or DB duplicate)
      if (seenInPayload.has(cleanBatchNo)) {
        deduped++;
        deduped_batches.push({ batch_number: cleanBatchNo, reason: 'Duplicate in payload' });
        continue;
      }
      seenInPayload.add(cleanBatchNo);

      const existingInDb = await queryOne('SELECT id FROM batches WHERE batch_number = ?', [cleanBatchNo]);
      if (existingInDb) {
        deduped++;
        deduped_batches.push({ batch_number: cleanBatchNo, reason: 'Batch already exists in database' });
        continue;
      }

      // 7. Find or Create Medicine Record in Database
      let medicine = await queryOne('SELECT id FROM medicines WHERE LOWER(name) = ? OR LOWER(generic_name) = ?', [cleanMedName.toLowerCase(), cleanMedName.toLowerCase()]);
      let medicineId = medicine ? medicine.id : null;

      if (!medicineId) {
        const medRes = await execute(
          `INSERT INTO medicines (name, generic_name, category, unit, reorder_level) VALUES (?, ?, ?, ?, ?)`,
          [cleanMedName, cleanMedName, 'Imported Catalog', 'Tablets', 20]
        );
        medicineId = medRes.lastID;
      }

      // 8. Insert Clean Batch Record
      const status = parsedExpiry <= today ? 'EXPIRED' : 'ACTIVE';
      const insertRes = await execute(
        `INSERT INTO batches (medicine_id, batch_number, initial_quantity, available_quantity, mfg_date, expiry_date, unit_price, shelf_location, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [medicineId, cleanBatchNo, parsedQty, parsedQty, parsedMfg, parsedExpiry, parsedPrice, rawShelf.toString().trim(), status]
      );

      imported++;
      imported_batches.push({
        id: insertRes.lastID,
        batch_number: cleanBatchNo,
        medicine_name: cleanMedName,
        quantity: parsedQty,
        expiry_date: parsedExpiry,
        unit_price: parsedPrice,
        status
      });
    }

    res.json({
      imported,
      deduped,
      rejected,
      details: {
        imported_batches,
        deduped_batches,
        rejected_batches
      }
    });
  } catch (err) {
    console.error('Error importing messy batch list:', err);
    res.status(500).json({ error: 'Failed to process messy batch import' });
  }
};

router.post('/import-messy', handleMessyImport);
router.post('/import', handleMessyImport);

export default router;

