import express from 'express';
import { queryAll, queryOne } from '../db/database.js';

const router = express.Router();

// GET /api/dashboard/stats (High level telemetry)
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    const date30Str = d30.toISOString().split('T')[0];

    // Medicines count
    const medCount = await queryOne('SELECT COUNT(*) as count FROM medicines');
    // Batches count
    const batchCount = await queryOne('SELECT COUNT(*) as count FROM batches');

    // Sellable stock (in-date active batches)
    const sellableStockRes = await queryOne(
      `SELECT 
         COALESCE(SUM(available_quantity), 0) as total_units,
         COALESCE(SUM(available_quantity * unit_price), 0) as total_value
       FROM batches
       WHERE status = 'ACTIVE' AND expiry_date > ?`,
      [today]
    );

    // Expired stock
    const expiredStockRes = await queryOne(
      `SELECT 
         COALESCE(SUM(available_quantity), 0) as total_units,
         COALESCE(SUM(available_quantity * unit_price), 0) as total_value
       FROM batches
       WHERE status = 'EXPIRED' OR expiry_date <= ?`,
      [today]
    );

    // Batches expiring within 30 days
    const expiringSoonRes = await queryOne(
      `SELECT COUNT(*) as count FROM batches
       WHERE status = 'ACTIVE' AND expiry_date > ? AND expiry_date <= ?`,
      [today, date30Str]
    );

    // Today's Sales (matching today's date in UTC or local date)
    const todaySalesRes = await queryOne(
      `SELECT 
         COUNT(*) as count,
         COALESCE(SUM(total_amount), 0) as revenue
       FROM dispense_records
       WHERE date(dispensed_at) = date('now') OR date(dispensed_at) = ?`,
      [today]
    );

    // Recent Dispense Transactions (last 5)
    const recentDispenses = await queryAll(
      `SELECT dr.*, u.name as dispensed_by
       FROM dispense_records dr
       JOIN users u ON dr.user_id = u.id
       ORDER BY dr.dispensed_at DESC
       LIMIT 5`
    );

    res.json({
      medicinesCount: medCount?.count || 0,
      batchesCount: batchCount?.count || 0,
      sellableStock: {
        units: sellableStockRes?.total_units || 0,
        value: sellableStockRes?.total_value || 0
      },
      expiredStock: {
        units: expiredStockRes?.total_units || 0,
        value: expiredStockRes?.total_value || 0
      },
      expiringSoonCount: expiringSoonRes?.count || 0,
      todaySales: {
        count: todaySalesRes?.count || 0,
        revenue: todaySalesRes?.revenue || 0
      },
      recentDispenses: recentDispenses || []
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;
