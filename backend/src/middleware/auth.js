const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');

/**
 * Authenticate JWT token from Authorization header.
 * Supports a special 'system' user for internal cron job calls.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Special system user for cron jobs — bypass DB lookup
    if (decoded.userId === 'system') {
      req.user = { id: 'system', name: 'System', email: 'system@internal', role: decoded.role || 'super_admin' };
      return next();
    }

    // Fetch user from DB
    const result = await db.query(
      'SELECT id, name, email, role, phone FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional auth - sets req.user if token present, but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    if (decoded.userId === 'system') {
      req.user = { id: 'system', name: 'System', email: 'system@internal', role: 'super_admin' };
      return next();
    }

    const result = await db.query(
      'SELECT id, name, email, role, phone FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
    next();
  } catch {
    next();
  }
};

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, optionalAuth, authorize };
