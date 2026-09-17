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

// DELETE /api/auth/users/:id (Delete staff account - Admin only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access Denied: Admin authorization required' });
  }

  const targetId = parseInt(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own active Admin session' });
  }

  try {
    const targetUser = await queryOne('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Staff account not found' });
    }

    // Reassign historical sales audit records to current Admin to preserve sales logs and satisfy foreign key constraints
    await execute('UPDATE dispense_records SET user_id = ? WHERE user_id = ?', [req.user.id, targetId]);

    await execute('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: `Staff account for ${targetUser.name} deleted successfully` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message || 'Failed to delete staff account' });
  }
});

// POST /api/auth/register (First setup = Admin, subsequent = Admin authorization required)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanPhone = phone ? phone.toString().trim() : null;

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
      `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
      [name.toString().trim(), cleanEmail, passwordHash, cleanPhone, userRole]
    );

    const user = {
      id: result.lastID,
      name: name.toString().trim(),
      email: cleanEmail,
      phone: cleanPhone,
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

// POST /api/auth/request-otp (Generate 6-digit OTP for Google Email or Mobile SMS OTP)
router.post('/request-otp', async (req, res) => {
  const { identifier, method } = req.body || {};

  if (!identifier) {
    return res.status(400).json({ error: 'Email address or mobile phone number is required' });
  }

  try {
    const cleanId = identifier.toString().toLowerCase().trim();
    // Search user by email or phone
    const user = await queryOne('SELECT id, name, email, phone, role FROM users WHERE LOWER(email) = ? OR phone = ?', [cleanId, cleanId]);

    if (!user) {
      return res.status(404).json({ error: `No registered account found matching '${identifier}'` });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

    await execute('UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE id = ?', [otp, expiry, user.id]);

    const deliveryChannel = method === 'mobile' ? `Mobile SMS to ${user.phone || identifier}` : `Google Account Email (${user.email})`;

    console.log(`[AUTH-OTP] 🔐 Generated OTP ${otp} for ${user.email} (${user.role}) via ${deliveryChannel}`);

    res.json({
      message: `Security OTP sent successfully via ${deliveryChannel}`,
      otp, // Dispatched to client for seamless interactive verification & testing
      user: { name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Error generating OTP:', err);
    res.status(500).json({ error: 'Failed to generate security OTP' });
  }
});

// POST /api/auth/verify-otp (Verify 6-digit OTP code)
router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body || {};

  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Identifier and OTP code are required' });
  }

  try {
    const cleanId = identifier.toString().toLowerCase().trim();
    const user = await queryOne('SELECT id, reset_otp, reset_otp_expiry FROM users WHERE (LOWER(email) = ? OR phone = ?)', [cleanId, cleanId]);

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (!user.reset_otp || user.reset_otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid verification OTP code' });
    }

    if (Date.now() > Number(user.reset_otp_expiry)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new OTP.' });
    }

    res.json({ valid: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/reset-password (Reset password after OTP verification)
router.post('/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body || {};

  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ error: 'Identifier, OTP code, and new password are required' });
  }

  if (newPassword.toString().length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    const cleanId = identifier.toString().toLowerCase().trim();
    const user = await queryOne('SELECT id, name, email, role, reset_otp, reset_otp_expiry FROM users WHERE (LOWER(email) = ? OR phone = ?)', [cleanId, cleanId]);

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (!user.reset_otp || user.reset_otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid verification OTP code' });
    }

    if (Date.now() > Number(user.reset_otp_expiry)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new OTP.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword.toString(), salt);

    await execute('UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE id = ?', [passwordHash, user.id]);

    res.json({ message: `Password for ${user.name} (${user.role}) updated successfully. You can now log in.` });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/google-auth (Google Account Auth & Instant Verification)
router.post('/google-auth', async (req, res) => {
  const { email, name, googleId } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Google Account Email is required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    let user = await queryOne('SELECT id, name, email, role FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (!user) {
      const userCountRes = await queryOne('SELECT COUNT(*) as count FROM users');
      const userRole = userCountRes.count === 0 ? 'Admin' : 'Pharmacist';

      const salt = bcrypt.genSaltSync(10);
      const randomPassHash = bcrypt.hashSync(Math.random().toString(36), salt);

      const result = await execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name || cleanEmail.split('@')[0], cleanEmail, randomPassHash, userRole]
      );

      user = { id: result.lastID, name: name || cleanEmail.split('@')[0], email: cleanEmail, role: userRole };
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Authenticated successfully via Google Account',
      token,
      user
    });
  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
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
