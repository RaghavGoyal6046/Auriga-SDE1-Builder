import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'pharmaexpiry_secret_key_2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Reusable JWT Authentication Middleware
 * Reads Authorization: Bearer <token> header and attaches user to req.user
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    // Fetch user from MySQL/DB
    const dbUser = await queryOne(
      'SELECT id, name, email, role, phone, is_active, is_verified FROM users WHERE id = ?',
      [userId]
    );

    let user;
    if (dbUser) {
      user = {
        _id: dbUser.id,
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: (dbUser.role || 'PHARMACIST').toUpperCase(),
        phone: dbUser.phone,
        isActive: dbUser.is_active === 1 || dbUser.is_active === true || dbUser.is_active === '1',
        isVerified: dbUser.is_verified === 1 || dbUser.is_verified === true
      };
    } else {
      user = {
        _id: userId,
        id: userId,
        name: decoded.name || 'User',
        email: decoded.email,
        role: (decoded.role || 'PHARMACIST').toUpperCase(),
        isActive: true,
        isVerified: true
      };
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Access Denied: Your account has been deactivated. Please contact the administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Access Denied: Invalid or expired authentication token' });
  }
}

// Alias for authenticateToken
export const authenticate = authenticateToken;

/**
 * Require ADMIN Role Middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access Denied: Requires ADMIN privileges' });
  }
  next();
}

/**
 * Require Authenticated Active User Middleware
 */
export function requireAuthenticatedUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ error: 'Account is inactive' });
  }
  next();
}
