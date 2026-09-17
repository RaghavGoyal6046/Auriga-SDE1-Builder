import express from 'express';
import { queryAll, syncExpiredBatches } from '../db/database.js';

const router = express.Router();

// GET /api/alerts/expiring (Risk breakdown for batches & low stock)
router.get('/expiring', async (req, res) => {
  try {
    await syncExpiredBatches();
    const today = new Date().toISOString().split('T')[0];

    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    const date30Str = d30.toISOString().split('T')[0];

    const d60 = new Date();
    d60.setDate(d60.getDate() + 60);
    const date60Str = d60.toISOString().split('T')[0];

    // 1. Expired Batches
    const expiredBatches = await queryAll(
      `SELECT b.*, m.name as medicine_name, m.unit
       FROM batches b
       JOIN medicines m ON b.medicine_id = m.id
       WHERE (b.expiry_date <= ? OR b.status = 'EXPIRED')
         AND b.available_quantity > 0
       ORDER BY b.expiry_date ASC`,
      [today]
    );

    // 2. Expiring in 30 Days (High Risk)
    const expiring30Batches = await queryAll(
      `SELECT b.*, m.name as medicine_name, m.unit
       FROM batches b
       JOIN medicines m ON b.medicine_id = m.id
       WHERE b.status = 'ACTIVE'
         AND b.expiry_date > ?
         AND b.expiry_date <= ?
         AND b.available_quantity > 0
       ORDER BY b.expiry_date ASC`,
      [today, date30Str]
    );

    // 3. Expiring in 60 Days (Warning)
    const expiring60Batches = await queryAll(
      `SELECT b.*, m.name as medicine_name, m.unit
       FROM batches b
       JOIN medicines m ON b.medicine_id = m.id
       WHERE b.status = 'ACTIVE'
         AND b.expiry_date > ?
         AND b.expiry_date <= ?
         AND b.available_quantity > 0
       ORDER BY b.expiry_date ASC`,
      [date30Str, date60Str]
    );

    // 4. Low Stock Medicines (Sellable stock <= reorder level)
    const lowStockMedicines = await queryAll(
      `SELECT 
         m.*,
         COALESCE(SUM(CASE WHEN b.expiry_date > '${today}' AND b.status = 'ACTIVE' THEN b.available_quantity ELSE 0 END), 0) as sellable_stock
       FROM medicines m
       LEFT JOIN batches b ON m.id = b.medicine_id
       GROUP BY m.id
       HAVING sellable_stock <= m.reorder_level`
    );

    res.json({
      summary: {
        expiredCount: expiredBatches.length,
        expiring30Count: expiring30Batches.length,
        expiring60Count: expiring60Batches.length,
        lowStockCount: lowStockMedicines.length
      },
      expiredBatches,
      expiring30Batches,
      expiring60Batches,
      lowStockMedicines
    });
  } catch (err) {
    console.error('Error fetching expiry alerts:', err);
    res.status(500).json({ error: 'Failed to fetch expiry risk alerts' });
  }
});

export default router;
