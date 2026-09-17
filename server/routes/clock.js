import express from 'express';
import { queryOne, queryAll, execute } from '../db/database.js';

const router = express.Router();

/**
 * Level 1 — T2 (Automation):
 * POST /clock (and /api/clock)
 * A daily job flags batches expiring within 7 days and quarantines expired ones; it reports counts.
 */
router.post('/', async (req, res) => {
  try {
    const targetDateStr = req.body?.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(targetDateStr);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD or ISO string.' });
    }

    const currentDateISO = targetDate.toISOString().split('T')[0];

    // Calculate 7 days ahead threshold
    const in7Days = new Date(targetDate);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysISO = in7Days.toISOString().split('T')[0];

    // 1. Quarantine expired active batches (expiry_date < currentDateISO)
    const expiredRes = await execute(
      `UPDATE batches SET status = 'EXPIRED' WHERE expiry_date < ? AND status = 'ACTIVE'`,
      [currentDateISO]
    );
    const quarantined_count = expiredRes.changes || 0;

    // 2. Count batches expiring within 7 days (expiry_date >= currentDateISO AND expiry_date <= in7DaysISO)
    const expiringSoonRes = await queryOne(
      `SELECT COUNT(*) as count FROM batches WHERE expiry_date >= ? AND expiry_date <= ? AND available_quantity > 0 AND status = 'ACTIVE'`,
      [currentDateISO, in7DaysISO]
    );
    const expiring_soon_count = expiringSoonRes ? expiringSoonRes.count : 0;

    // 3. Count healthy active batches (expiry_date > in7DaysISO)
    const healthyRes = await queryOne(
      `SELECT COUNT(*) as count FROM batches WHERE expiry_date > ? AND available_quantity > 0 AND status = 'ACTIVE'`,
      [in7DaysISO]
    );
    const healthy_count = healthyRes ? healthyRes.count : 0;

    // 4. Trigger Outbox Re-order Check for medicines whose sellable stock dropped
    const medicines = await queryAll('SELECT id, name, reorder_level FROM medicines');
    let reorderAlertsCreated = 0;

    for (const med of medicines) {
      const stockRes = await queryOne(
        `SELECT COALESCE(SUM(available_quantity), 0) as total FROM batches WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date >= ?`,
        [med.id, currentDateISO]
      );
      const currentStock = stockRes ? stockRes.total : 0;

      if (currentStock <= med.reorder_level) {
        // Check if pending alert already exists
        const existingAlert = await queryOne(
          `SELECT id FROM outbox WHERE medicine_id = ? AND status = 'PENDING' AND type = 'REORDER_ALERT'`,
          [med.id]
        );
        if (!existingAlert) {
          const payload = JSON.stringify({
            medicine_id: med.id,
            medicine_name: med.name,
            current_stock: currentStock,
            reorder_level: med.reorder_level,
            alert_date: currentDateISO
          });
          await execute(
            `INSERT INTO outbox (type, medicine_id, medicine_name, current_stock, reorder_level, payload, status)
             VALUES ('REORDER_ALERT', ?, ?, ?, ?, ?, 'PENDING')`,
            [med.id, med.name, currentStock, med.reorder_level, payload]
          );
          reorderAlertsCreated++;
        }
      }
    }

    res.json({
      date: currentDateISO,
      quarantined_count,
      expiring_soon_count,
      healthy_count,
      reorder_alerts_created: reorderAlertsCreated,
      message: `Daily automated job completed for ${currentDateISO}. Quarantined ${quarantined_count} expired batch(es), flagged ${expiring_soon_count} batch(es) expiring within 7 days.`
    });
  } catch (err) {
    console.error('Error running daily clock automation:', err);
    res.status(500).json({ error: 'Failed to execute daily clock job' });
  }
});

// GET /clock (View clock automation status)
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysISO = in7Days.toISOString().split('T')[0];

    const expired = await queryOne(`SELECT COUNT(*) as count FROM batches WHERE status = 'EXPIRED' OR expiry_date < ?`, [today]);
    const expiringSoon = await queryOne(`SELECT COUNT(*) as count FROM batches WHERE expiry_date >= ? AND expiry_date <= ? AND status = 'ACTIVE'`, [today, in7DaysISO]);
    const healthy = await queryOne(`SELECT COUNT(*) as count FROM batches WHERE expiry_date > ? AND status = 'ACTIVE'`, [in7DaysISO]);

    res.json({
      system_date: today,
      quarantined_count: expired ? expired.count : 0,
      expiring_soon_count: expiringSoon ? expiringSoon.count : 0,
      healthy_count: healthy ? healthy.count : 0
    });
  } catch (err) {
    console.error('Error fetching clock status:', err);
    res.status(500).json({ error: 'Failed to fetch clock status' });
  }
});

export default router;
