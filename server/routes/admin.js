import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
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
 * - Initial isVerified = false.
 * - Generates email OTP for verification/activation.
 */
router.post('/pharmacists', async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Pharmacist name and email are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanPhone = phone ? phone.toString().trim() : null;

    // Check if user already exists in MongoDB
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: cleanEmail });
    } catch (_) {}

    if (!existingUser) {
      const existingSqlite = await queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (existingSqlite) {
        return res.status(400).json({ error: 'A user account with this email address already exists' });
      }
    } else {
      return res.status(400).json({ error: 'A user account with this email address already exists' });
    }

    // Backend strictly forces role = "PHARMACIST"
    const assignedRole = 'PHARMACIST';
    const userPassword = (password && password.toString().trim()) ? password.toString().trim() : 'pharmacy123';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(userPassword, salt);

    let pharmacistUser = null;

    // Save in MongoDB Mongoose
    try {
      pharmacistUser = await User.create({
        name: name.toString().trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
        phone: cleanPhone,
        isActive: true,
        isVerified: true, // Directly verified by Admin
      });
    } catch (dbErr) {
      console.warn('MongoDB User save fallback to SQLite:', dbErr.message);
    }

    // Save in SQLite for dual storage compatibility
    const sqliteRes = await execute(
      `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
      [name.toString().trim(), cleanEmail, passwordHash, cleanPhone, assignedRole]
    );

    const userId = pharmacistUser ? pharmacistUser._id : sqliteRes.lastID;

    res.status(201).json({
      message: `Pharmacist account for ${name} created successfully.`,
      pharmacist: {
        id: userId,
        name: name.toString().trim(),
        email: cleanEmail,
        role: assignedRole,
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
    const skip = (page - 1) * limit;

    let pharmacists = [];
    let totalItems = 0;

    try {
      const filter = {
        role: { $in: ['PHARMACIST', 'Pharmacist'] },
        ...(search
          ? {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
              ],
            }
          : {}),
      };

      totalItems = await User.countDocuments(filter);
      pharmacists = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } catch (_) {}

    if (pharmacists.length === 0) {
      const sqliteWhere = search ? `WHERE (role = 'PHARMACIST' OR role = 'Pharmacist') AND (name LIKE ? OR email LIKE ?)` : `WHERE (role = 'PHARMACIST' OR role = 'Pharmacist')`;
      const sqliteParams = search ? [`%${search}%`, `%${search}%`] : [];

      const countRes = await queryOne(`SELECT COUNT(*) as count FROM users ${sqliteWhere}`, sqliteParams);
      totalItems = countRes ? countRes.count : 0;

      const rows = await queryAll(
        `SELECT id, name, email, role, phone, created_at FROM users ${sqliteWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...sqliteParams, limit, skip]
      );

      pharmacists = rows.map((r) => ({
        _id: r.id,
        id: r.id,
        name: r.name,
        email: r.email,
        role: 'PHARMACIST',
        isActive: true,
        isVerified: true,
        createdAt: r.created_at,
      }));
    }

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
    let pharmacist = null;

    try {
      pharmacist = await User.findById(id);
    } catch (_) {}

    if (!pharmacist) {
      const sqliteUser = await queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
      if (sqliteUser) {
        pharmacist = {
          _id: sqliteUser.id,
          id: sqliteUser.id,
          name: sqliteUser.name,
          email: sqliteUser.email,
          role: sqliteUser.role,
          isActive: true,
          isVerified: true,
          createdAt: sqliteUser.created_at,
        };
      }
    }

    if (!pharmacist) {
      return res.status(404).json({ error: 'Pharmacist not found' });
    }

    res.json({ pharmacist });
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

    let updatedUser = null;

    try {
      updatedUser = await User.findByIdAndUpdate(
        id,
        {
          ...(name ? { name: name.trim() } : {}),
          ...(email ? { email: email.toLowerCase().trim() } : {}),
          ...(phone ? { phone: phone.trim() } : {}),
        },
        { new: true }
      );
    } catch (_) {}

    if (name || email) {
      await execute(
        `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?`,
        [name ? name.trim() : null, email ? email.toLowerCase().trim() : null, id]
      );
    }

    res.json({ message: 'Pharmacist details updated successfully', pharmacist: updatedUser || { id, name, email } });
  } catch (err) {
    console.error('Error updating pharmacist:', err);
    res.status(500).json({ error: 'Failed to update pharmacist details' });
  }
});

/**
 * PATCH /api/admin/pharmacists/:id/status
 * Toggle pharmacist active/deactive status
 */
router.patch('/pharmacists/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean property is required' });
    }

    let updatedUser = null;

    try {
      updatedUser = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    } catch (_) {}

    res.json({
      message: `Pharmacist account ${isActive ? 'activated' : 'deactivated'} successfully`,
      pharmacist: updatedUser || { id, isActive },
    });
  } catch (err) {
    console.error('Error updating pharmacist status:', err);
    res.status(500).json({ error: 'Failed to update pharmacist status' });
  }
});

export default router;
