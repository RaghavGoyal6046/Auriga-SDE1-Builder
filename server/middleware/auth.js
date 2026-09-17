import jwt from 'jsonwebtoken';
import User from '../models/User.js';
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

    // 1. Check MongoDB User if available
    let user = null;
    try {
      user = await User.findById(decoded.userId || decoded.id).select('+passwordHash');
    } catch (_) {}

    // 2. Fallback to SQLite query if MongoDB user not found
    if (!user) {
      const sqliteUser = await queryOne('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.userId || decoded.id]);
      if (sqliteUser) {
        user = {
          _id: sqliteUser.id,
          id: sqliteUser.id,
          name: sqliteUser.name,
          email: sqliteUser.email,
          role: sqliteUser.role,
          isActive: true,
          isVerified: true
        };
      }
    }

    if (!user) {
      // Use decoded token info as fallback
      user = {
        _id: decoded.userId || decoded.id,
        id: decoded.userId || decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        isActive: true,
        isVerified: true
      };
    }

    // Check account active status
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Access Denied: Your account has been deactivated. Contact Admin.' });
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
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'Admin')) {
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
  if (req.user.isActive === false) {
    return res.status(403).json({ error: 'Account is inactive' });
  }
  next();
}
