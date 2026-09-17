import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { JWT_SECRET, JWT_EXPIRES_IN, authenticateToken } from '../middleware/auth.js';
import { loginRateLimiter, otpRateLimiter } from '../middleware/security.js';
import { generateAndSendOtp, verifyOtpCode } from '../services/otpService.js';

const router = express.Router();

/**
 * Helper to count total registered users across MongoDB and SQLite
 */
async function getTotalUserCount() {
  let count = 0;
  try {
    count = await User.countDocuments();
  } catch (_) {}

  if (count === 0) {
    const sqliteCount = await queryOne('SELECT COUNT(*) as count FROM users');
    count = sqliteCount ? sqliteCount.count : 0;
  }
  return count;
}

/**
 * GET /api/auth/setup-status
 * Indicates whether initial first-user admin setup is required.
 */
router.get('/setup-status', async (req, res) => {
  try {
    const userCount = await getTotalUserCount();
    const isFirstSetup = userCount === 0;

    res.json({
      isFirstSetup,
      hasAdmin: !isFirstSetup,
      userCount,
      message: isFirstSetup
        ? 'Initial setup required. The first user to register will automatically become ADMIN.'
        : 'Initial admin setup completed. Public registration is disabled.',
    });
  } catch (err) {
    console.error('Error fetching setup status:', err);
    res.status(500).json({ error: 'Failed to fetch initial setup status' });
  }
});

/**
 * POST /api/auth/register
 * Rules:
 * - If 0 users exist: Allow public registration. First user automatically receives role: "ADMIN".
 * - If users exist: Reject public registration with "Public registration is disabled. Please contact the administrator."
 * - Backend strictly controls assigned role. Client cannot choose role.
 */
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();
    const cleanPhone = phone ? phone.toString().trim() : null;
    const userCount = await getTotalUserCount();

    // Check if public registration is disabled
    if (userCount > 0) {
      return res.status(403).json({
        error: 'Public registration is disabled. Only an authenticated ADMIN can add new staff accounts. Please contact the pharmacy administrator.',
      });
    }

    // First User Bootstrapping: Backend strictly sets role to ADMIN
    const assignedRole = 'ADMIN';

    // Check existing email
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: cleanEmail });
    } catch (_) {}

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password.toString(), salt);

    let mongoUser = null;
    try {
      mongoUser = await User.create({
        name: name.toString().trim(),
        email: cleanEmail,
        passwordHash,
        phone: cleanPhone,
        role: assignedRole,
        isActive: true,
        isVerified: true, // First Admin is automatically verified
      });
    } catch (dbErr) {
      console.warn('MongoDB User save fallback to SQLite:', dbErr.message);
    }

    // Save in SQLite for dual storage fallback
    const sqliteRes = await execute(
      `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
      [name.toString().trim(), cleanEmail, passwordHash, cleanPhone, assignedRole]
    );

    const userId = mongoUser ? mongoUser._id : sqliteRes.lastID;

    const userPayload = {
      id: userId,
      userId,
      name: name.toString().trim(),
      email: cleanEmail,
      role: assignedRole,
      isActive: true,
      isVerified: true,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'First Pharmacy Owner (ADMIN) registered successfully!',
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user, checks account status, verifies password, and issues JWT.
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const cleanEmail = email.toString().toLowerCase().trim();

    // 1. Find user in MongoDB
    let user = null;
    try {
      user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    } catch (_) {}

    // 2. Fallback SQLite lookup
    let isMatch = false;
    let userId = null;
    let userRole = 'PHARMACIST';
    let userName = '';
    let isActive = true;
    let isVerified = true;

    if (user) {
      userId = user._id;
      userName = user.name;
      userRole = user.role;
      isActive = user.isActive;
      isVerified = user.isVerified;

      if (!isActive) {
        return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
      }

      isMatch = user.comparePassword(password);
    } else {
      const sqliteUser = await queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (!sqliteUser || !sqliteUser.password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      userId = sqliteUser.id;
      userName = sqliteUser.name;
      userRole = sqliteUser.role.toUpperCase();
      isActive = true;
      isVerified = true;

      isMatch = bcrypt.compareSync(password.toString(), sqliteUser.password.toString());
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (isVerified === false) {
      return res.status(403).json({
        error: 'Your account email is not yet verified. Please enter the verification OTP code sent to your email.',
        requiresVerification: true,
        email: cleanEmail,
      });
    }

    // Update lastLoginAt
    try {
      if (user) {
        user.lastLoginAt = new Date();
        await user.save();
      }
    } catch (_) {}

    const userPayload = {
      id: userId,
      userId,
      name: userName,
      email: cleanEmail,
      role: userRole,
      isActive,
      isVerified,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful',
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user details (excluding passwordHash, OTP, secrets).
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      isVerified: user.isVerified !== false,
      createdAt: user.createdAt || new Date().toISOString(),
    },
  });
});

/**
 * POST /api/auth/request-otp
 * Generates and sends a 6-digit email OTP.
 */
router.post('/request-otp', otpRateLimiter, async (req, res) => {
  const { email, identifier, purpose } = req.body || {};
  const targetEmail = (email || identifier || '').toString().toLowerCase().trim();

  if (!targetEmail) {
    return res.status(400).json({ error: 'Registered email address is required' });
  }

  try {
    let user = null;
    try {
      user = await User.findOne({ email: targetEmail });
    } catch (_) {}

    const otpRes = await generateAndSendOtp(
      targetEmail,
      purpose || 'EMAIL_VERIFICATION',
      user ? user._id : null,
      user ? user.name : ''
    );

    res.json({
      message: `Verification OTP dispatched to ${targetEmail}`,
      expiresAt: otpRes.expiresAt,
      otp: otpRes.rawOtp, // For local dev testing convenience
    });
  } catch (err) {
    console.error('Error requesting OTP:', err);
    res.status(500).json({ error: 'Failed to dispatch verification OTP' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies 6-digit OTP code and activates account.
 */
router.post('/verify-otp', async (req, res) => {
  const { email, identifier, otp, newPassword, purpose } = req.body || {};
  const targetEmail = (email || identifier || '').toString().toLowerCase().trim();

  if (!targetEmail || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const result = await verifyOtpCode(targetEmail, otp, purpose || 'EMAIL_VERIFICATION');

    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    // Find and verify User in MongoDB
    let user = null;
    try {
      user = await User.findOne({ email: targetEmail }).select('+passwordHash');
      if (user) {
        user.isVerified = true;
        user.isActive = true;
        if (newPassword) {
          const salt = bcrypt.genSaltSync(10);
          user.passwordHash = bcrypt.hashSync(newPassword.toString(), salt);
        }
        await user.save();
      }
    } catch (_) {}

    // Update SQLite if applicable
    if (newPassword) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword.toString(), salt);
      await execute('UPDATE users SET password = ? WHERE LOWER(email) = ?', [passwordHash, targetEmail]);
    }

    res.json({
      message: 'Email verified successfully! You can now log in.',
      verified: true,
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

export default router;

