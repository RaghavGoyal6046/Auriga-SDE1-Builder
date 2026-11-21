import express from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, execute } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateAndSendOtp } from '../services/otpService.js';

const router = express.Router();

// Enforce authentication and ADMIN authorization on ALL /api/admin routes
router.use(authenticate, requireAdmin);

/**
 * POST /api/admin/pharmacists
 * Admin creates a new Pharmacist account.
 * Rules:
 * - Backend strictly sets role = "PHARMACIST".
 * - Frontend cannot control assigned role.
 */
router.post('/pharmacists', async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Pharmacist name and email are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanPhone = phone ? phone.toString().trim() : null;

    // Check if user already exists
    const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'A user account with this email address already exists' });
    }

    // Backend strictly forces role = "PHARMACIST"
    const assignedRole = 'PHARMACIST';
    const userPassword = (password && password.toString().trim()) ? password.toString().trim() : 'pharmacy123';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(userPassword, salt);

    const insertRes = await execute(
      `INSERT INTO users (name, email, password, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [name.toString().trim(), cleanEmail, passwordHash, cleanPhone, assignedRole]
    );

    const userId = insertRes.insertId || insertRes.lastID;

    res.status(201).json({
      message: `Pharmacist account for ${name} created successfully.`,
      pharmacist: {
        id: userId,
        name: name.toString().trim(),
        email: cleanEmail,
        role: assignedRole,
        phone: cleanPhone,
        isActive: true,
        isVerified: true,
      },
    });
  } catch (err) {
    console.error('Error creating pharmacist:', err);
    res.status(500).json({ error: 'Failed to create pharmacist account' });
  }
});

/**
 * GET /api/admin/pharmacists
 * List all Pharmacist accounts with search & pagination
 */
router.get('/pharmacists', async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const params = [];
    let whereClauses = ["role = 'PHARMACIST'"];

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereString = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await queryOne(`SELECT COUNT(*) as count FROM users ${whereString}`, params);
    const totalItems = countRes ? countRes.count : 0;

    const rows = await queryAll(
      `SELECT id, name, email, phone, role, is_active, is_verified, created_at 
       FROM users ${whereString} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const pharmacists = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: 'PHARMACIST',
      isActive: r.is_active === 1 || r.is_active === true || r.is_active === '1',
      isVerified: r.is_verified === 1 || r.is_verified === true || r.is_verified === '1',
      createdAt: r.created_at,
    }));

    res.json({
      pharmacists,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error('Error fetching pharmacists list:', err);
    res.status(500).json({ error: 'Failed to fetch pharmacists list' });
  }
});

/**
 * GET /api/admin/pharmacists/:id
 * Get single pharmacist details
 */
router.get('/pharmacists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await queryOne(
      'SELECT id, name, email, phone, role, is_active, is_verified, created_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Pharmacist not found' });
    }

    res.json({
      pharmacist: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active === 1 || user.is_active === true,
        isVerified: user.is_verified === 1 || user.is_verified === true,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Error fetching pharmacist details:', err);
    res.status(500).json({ error: 'Failed to fetch pharmacist details' });
  }
});

/**
 * PATCH /api/admin/pharmacists/:id
 * Update pharmacist profile details
 */
router.patch('/pharmacists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const existing = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pharmacist not found' });
    }

    await execute(
      `UPDATE users SET 
        name = COALESCE(?, name), 
        email = COALESCE(?, email),
        phone = COALESCE(?, phone)
       WHERE id = ?`,
      [name ? name.trim() : null, email ? email.toLowerCase().trim() : null, phone ? phone.trim() : null, id]
    );

    const updated = await queryOne('SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?', [id]);

    res.json({
      message: 'Pharmacist details updated successfully',
      pharmacist: updated,
    });
  } catch (err) {
    console.error('Error updating pharmacist:', err);
    res.status(500).json({ error: 'Failed to update pharmacist details' });
  }
});

/**
 * PATCH /api/admin/pharmacists/:id/status
 * Toggle pharmacist active/inactive status
 */
router.patch('/pharmacists/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean property is required' });
    }

    await execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);

    res.json({
      message: `Pharmacist account ${isActive ? 'activated' : 'deactivated'} successfully`,
      pharmacist: { id, isActive },
    });
  } catch (err) {
    console.error('Error updating pharmacist status:', err);
    res.status(500).json({ error: 'Failed to update pharmacist status' });
  }
});

/**
 * DELETE /api/admin/pharmacists/:id
 */
router.delete('/pharmacists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await queryOne('SELECT id, role FROM users WHERE id = ?', [id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot delete ADMIN user' });
    }

    await execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'Pharmacist account deleted successfully' });
  } catch (err) {
    console.error('Error deleting pharmacist:', err);
    res.status(500).json({ error: 'Failed to delete pharmacist account' });
  }
});

export default router;
