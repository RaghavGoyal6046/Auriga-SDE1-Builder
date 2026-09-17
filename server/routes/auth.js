import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, queryAll, execute } from '../db/database.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/system-status (Check if initial setup / owner exists)
router.get('/system-status', async (req, res) => {
  try {
    const userCountRes = await queryOne('SELECT COUNT(*) as count FROM users');
    const adminCountRes = await queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'Admin'");
    
    res.json({
      userCount: userCountRes.count,
      hasAdmin: adminCountRes.count > 0,
      isFirstSetup: userCountRes.count === 0
    });
  } catch (err) {
    console.error('Error fetching system status:', err);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// GET /api/auth/users (List staff accounts - Admin only)
router.get('/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access Denied: Admin authorization required' });
  }

  try {
    const users = await queryAll('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// POST /api/auth/register (First setup = Admin, subsequent = Admin authorization required)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const userCountRes = await queryOne('SELECT COUNT(*) as count FROM users');
    let userRole = 'Pharmacist';

    // Case 1: First registration EVER -> Automatically becomes Admin (Pharmacy Owner)
    if (userCountRes.count === 0) {
      userRole = 'Admin';
    } else {
      // Case 2: Subsequent registration -> Requires Admin Bearer token authorization
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(403).json({
          error: 'Access Denied: Only an Admin (Pharmacy Owner) can add new Pharmacist or Owner accounts.'
        });
      }

      try {
        const decodedUser = jwt.verify(token, JWT_SECRET);
        if (decodedUser.role !== 'Admin') {
          return res.status(403).json({
            error: 'Access Denied: Only an Admin (Pharmacy Owner) can add new staff accounts.'
          });
        }
        userRole = role === 'Admin' ? 'Admin' : 'Pharmacist';
      } catch (tokenErr) {
        return res.status(403).json({ error: 'Invalid or expired Admin authorization token' });
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password.toString(), salt);

    const result = await execute(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [name.toString().trim(), cleanEmail, passwordHash, userRole]
    );

    const user = {
      id: result.lastID,
      name: name.toString().trim(),
      email: cleanEmail,
      role: userRole
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: userCountRes.count === 0
        ? 'First Pharmacy Owner (Admin) registered successfully'
        : `${userRole} account created successfully by Admin`,
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password.toString(), user.password.toString());
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
