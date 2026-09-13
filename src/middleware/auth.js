const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../db');
const { logAuditEvent } = require('../utils/audit');

/**
 * Middleware: Verify JWT and attach user object to request
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed Authorization header with Bearer token',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired token',
      });
    }

    // Check user active status in database and retrieve assigned_workstation
    const { rows } = await query(
      'SELECT id, username, full_name, role, is_active, assigned_workstation FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account is deactivated or no longer exists',
      });
    }

    req.user = {
      ...rows[0],
      client_name: rows[0].client_name || decoded.clientName || rows[0].full_name,
    };

    // Authoritative server-side workstation assignment sourced from the user's DB record
    const assignedWorkstation = rows[0].assigned_workstation || null;
    req.user.assigned_workstation = assignedWorkstation;

    const clientHeaderDeviceId = req.headers['x-client-device-id'];

    if (rows[0].role === 'admin') {
      // Admin requests retain full ability to set/override device ID dynamically
      req.clientDeviceId = clientHeaderDeviceId || assignedWorkstation || 'LAN-PC-01';
    } else {
      // Non-admin roles (front-desk, lab-tech, doctor, client):
      // Authoritative server-side workstation lock: sourced directly from DB record.
      // Client-supplied headers and payload bodies are completely ignored.
      req.clientDeviceId = assignedWorkstation;
    }

    req.clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Role-based Access Control
 * @param  {...string} allowedRoles Roles that can access the route ('admin', 'lab-tech', 'front-desk', 'client')
 */
function authorize(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log failed authorization attempt
      await logAuditEvent({
        userId: req.user.id,
        clientDeviceId: req.clientDeviceId,
        action: 'AUTH_FORBIDDEN',
        entityType: 'route',
        entityId: req.originalUrl,
        details: {
          user_role: req.user.role,
          required_roles: allowedRoles,
          method: req.method,
          path: req.originalUrl,
        },
        ipAddress: req.clientIp,
        userAgent: req.headers['user-agent'] || null,
      });

      return res.status(403).json({
        success: false,
        error: `Forbidden: Role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
