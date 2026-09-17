import express from 'express';
import { queryOne, queryAll, execute } from '../db/database.js';

const router = express.Router();

/**
 * Level 3 — T1 (Integrate Notification Service):
 * GET /outbox (and /api/outbox)
 * Returns notification messages dispatched when in-date stock for a medicine drops below threshold.
 */
router.get('/', async (req, res) => {
  try {
    const messages = await queryAll('SELECT * FROM outbox ORDER BY created_at DESC');
    res.json({
      total: messages.length,
      outbox: messages.map(m => ({
        id: m.id,
        type: m.type,
        medicine_id: m.medicine_id,
        medicine_name: m.medicine_name,
        current_stock: m.current_stock,
        reorder_level: m.reorder_level,
        payload: m.payload ? (typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload) : null,
        status: m.status,
        created_at: m.created_at
      }))
    });
  } catch (err) {
    console.error('Error fetching outbox notifications:', err);
    res.status(500).json({ error: 'Failed to fetch outbox notifications' });
  }
});

/**
 * POST /outbox (and /api/outbox)
 * Trigger manual scan or post a re-order alert to the outbox service.
 */
router.post('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const medicines = await queryAll('SELECT id, name, reorder_level FROM medicines');
    let alertsCreated = 0;

    for (const med of medicines) {
      const stockRes = await queryOne(
        `SELECT COALESCE(SUM(available_quantity), 0) as total FROM batches WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date >= ?`,
        [med.id, today]
      );
      const currentStock = stockRes ? stockRes.total : 0;

      if (currentStock <= med.reorder_level) {
        const payload = JSON.stringify({
          medicine_id: med.id,
          medicine_name: med.name,
          current_stock: currentStock,
          reorder_level: med.reorder_level,
          alert_date: today,
          message: `RE-ORDER ALERT: Sellable stock for ${med.name} (${currentStock} units) is at or below re-order threshold (${med.reorder_level} units).`
        });

        await execute(
          `INSERT INTO outbox (type, medicine_id, medicine_name, current_stock, reorder_level, payload, status)
           VALUES ('REORDER_ALERT', ?, ?, ?, ?, ?, 'PENDING')`,
          [med.id, med.name, currentStock, med.reorder_level, payload]
        );
        alertsCreated++;
      }
    }

    const messages = await queryAll('SELECT * FROM outbox ORDER BY created_at DESC');

    res.json({
      alerts_created: alertsCreated,
      message: `Outbox re-order scan completed. ${alertsCreated} alert(s) posted to notification outbox.`,
      outbox: messages.map(m => ({
        id: m.id,
        type: m.type,
        medicine_id: m.medicine_id,
        medicine_name: m.medicine_name,
        current_stock: m.current_stock,
        reorder_level: m.reorder_level,
        payload: m.payload ? (typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload) : null,
        status: m.status,
        created_at: m.created_at
      }))
    });
  } catch (err) {
    console.error('Error triggering outbox scan:', err);
    res.status(500).json({ error: 'Failed to trigger outbox scan' });
  }
});

// Helper function to check and create re-order alert for a specific medicine ID
export async function checkMedicineReorderOutbox(medicineId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const med = await queryOne('SELECT id, name, reorder_level FROM medicines WHERE id = ?', [medicineId]);
    if (!med) return;

    const stockRes = await queryOne(
      `SELECT COALESCE(SUM(available_quantity), 0) as total FROM batches WHERE medicine_id = ? AND status = 'ACTIVE' AND expiry_date >= ?`,
      [med.id, today]
    );
    const currentStock = stockRes ? stockRes.total : 0;

    if (currentStock <= med.reorder_level) {
      const payload = JSON.stringify({
        medicine_id: med.id,
        medicine_name: med.name,
        current_stock: currentStock,
        reorder_level: med.reorder_level,
        alert_date: today,
        message: `RE-ORDER ALERT: Sellable stock for ${med.name} (${currentStock} units) is at or below re-order threshold (${med.reorder_level} units).`
      });

      await execute(
        `INSERT INTO outbox (type, medicine_id, medicine_name, current_stock, reorder_level, payload, status)
         VALUES ('REORDER_ALERT', ?, ?, ?, ?, ?, 'PENDING')`,
        [med.id, med.name, currentStock, med.reorder_level, payload]
      );
    }
  } catch (err) {
    console.error('Error checking medicine reorder outbox:', err);
  }
}

export default router;
