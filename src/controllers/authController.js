const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../db');
const { logAuditEvent } = require('../utils/audit');

// Pre-seed demo client clinic accounts in fallback store for seamless testing and offline demo
try {
  const fallbackStore = require('../db/fallbackStore');
  if (fallbackStore && fallbackStore.users) {
    if (!fallbackStore.users.some((u) => u.username === 'clinic_sample')) {
      fallbackStore.users.push({
        id: 'user-client-001',
        username: 'clinic_sample',
        // bcrypt hash for 'client123'
        password_hash: '$2a$10$81s2WrUJw2JpaJJRuR7/Muhk4LjSDky2yPKkG4jG0tEN/4FVoaLJm',
        full_name: 'SAMPLE CLINIC',
        role: 'client',
        is_active: true,
        client_name: 'SAMPLE CLINIC',
        created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      });
    }
    if (!fallbackStore.users.some((u) => u.username === 'clinic_medilink')) {
      fallbackStore.users.push({
        id: 'user-client-002',
        username: 'clinic_medilink',
        // bcrypt hash for 'client123'
        password_hash: '$2a$10$81s2WrUJw2JpaJJRuR7/Muhk4LjSDky2yPKkG4jG0tEN/4FVoaLJm',
        full_name: 'MEDILINK MULTISPECIALITY',
        role: 'client',
        is_active: true,
        client_name: 'MEDILINK MULTISPECIALITY',
        created_at: new Date('2026-09-02T10:00:00Z').toISOString(),
      });
    }
  }
} catch (_) {}

/**
 * Staff / Client Login
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const clientDeviceId = req.headers['x-client-device-id'] || null;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const { rows } = await query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE LOWER(username) = LOWER($1) ORDER BY (username = $1)::int DESC LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      await logAuditEvent({
        userId: null,
        clientDeviceId,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: username,
        details: { attempted_username: username, reason: 'User not found' },
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      await logAuditEvent({
        userId: user.id,
        clientDeviceId,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        details: { attempted_username: username, reason: 'Account deactivated' },
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(403).json({
        success: false,
        error: 'User account is deactivated. Contact an administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        clientDeviceId,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        details: { attempted_username: username, reason: 'Incorrect password' },
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const clientName = user.client_name || user.full_name;

    // Issue JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        clientName: user.role === 'client' ? clientName : null,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

      logAuditEvent({
        userId: user.id,
        clientDeviceId,
        action: 'LOGIN_SUCCESS',
        entityType: 'auth',
        entityId: user.id,
        details: {
          role: user.role,
          username: user.username,
        },
        ipAddress: clientIp,
        userAgent,
      }).catch((err) => {
        console.error('Non-blocking login audit log error:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          assigned_workstation: user.assigned_workstation,
        },
      });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
async function getProfile(req, res, next) {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register a new staff / client user (Admin only)
 * POST /api/auth/users
 */
async function createUser(req, res, next) {
  try {
    const { username, password, full_name, role, client_name, assigned_workstation } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'username, password, full_name, and role are required',
      });
    }

    if (!['front-desk', 'lab-tech', 'doctor', 'admin', 'client'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "role must be 'front-desk', 'lab-tech', 'doctor', 'admin', or 'client'",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const assignedWs = assigned_workstation || null;

    const { rows } = await query(
      `INSERT INTO users (username, password_hash, full_name, role, assigned_workstation)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, role, is_active, assigned_workstation, created_at`,
      [username, passwordHash, full_name, role, assignedWs]
    );

    const resolvedClientName = client_name || full_name;
    const createdUser = {
      ...(rows[0] || {
        id: `user-${Date.now()}`,
        username,
        full_name,
        role,
        assigned_workstation: assignedWs,
        is_active: true,
        created_at: new Date().toISOString(),
      }),
      assigned_workstation: rows[0]?.assigned_workstation !== undefined ? rows[0].assigned_workstation : assignedWs,
      client_name: role === 'client' ? resolvedClientName : null,
    };

    // Ensure it exists in fallbackStore if running offline
    try {
      const fallbackStore = require('../db/fallbackStore');
      if (fallbackStore && fallbackStore.users) {
        if (!fallbackStore.users.some((u) => u.username === username)) {
          fallbackStore.users.push({
            ...createdUser,
            password_hash: passwordHash,
          });
        }
      }
    } catch (_) {}

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: createdUser.id,
      details: {
        created_username: username,
        assigned_role: role,
        assigned_workstation: createdUser.assigned_workstation,
        client_name: createdUser.client_name,
      },
      ipAddress: req.clientIp,
    });

    res.status(201).json({
      success: true,
      message: `${role === 'client' ? 'Client' : 'Staff'} user created successfully`,
      user: createdUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all staff and client users (Admin only)
 * GET /api/auth/users
 */
async function listUsers(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT id, username, full_name, role, is_active, assigned_workstation, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      count: rows.length,
      users: rows.map((u) => ({
        ...u,
        assigned_workstation: u.assigned_workstation || null,
        client_name: u.role === 'client' ? (u.client_name || u.full_name) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update staff/client user role, active status, assigned workstation, or reset password (Admin only)
 * PUT /api/auth/users/:id
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, is_active, client_name, password, assigned_workstation } = req.body;

    const { rows: existing } = await query(
      'SELECT id, username, full_name, role, is_active, assigned_workstation FROM users WHERE id::text = $1 OR username = $1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const current = existing[0];
    const newRole = role !== undefined ? role : current.role;
    const newActive = is_active !== undefined ? Boolean(is_active) : current.is_active;
    const newWorkstation = assigned_workstation !== undefined ? (assigned_workstation || null) : current.assigned_workstation;

    if (role && !['front-desk', 'lab-tech', 'doctor', 'admin', 'client'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "role must be 'front-desk', 'lab-tech', 'doctor', 'admin', or 'client'",
      });
    }

    if (password !== undefined && (typeof password !== 'string' || password.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Password cannot be empty',
      });
    }

    let updatedRows = [];
    const isPasswordReset = Boolean(password && password.trim());

    if (isPasswordReset) {
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password.trim(), salt);

      const { rows } = await query(
        `UPDATE users
         SET password_hash = $1, role = $2, is_active = $3, assigned_workstation = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, username, full_name, role, is_active, assigned_workstation, updated_at`,
        [newHash, newRole, newActive, newWorkstation, current.id]
      );
      updatedRows = rows;

      // Sync into fallbackStore if running offline
      try {
        const fallbackStore = require('../db/fallbackStore');
        if (fallbackStore && fallbackStore.users) {
          const userObj = fallbackStore.users.find((u) => u.id === id || u.username === current.username);
          if (userObj) {
            userObj.password_hash = newHash;
            userObj.role = newRole;
            userObj.is_active = newActive;
            userObj.assigned_workstation = newWorkstation;
            userObj.updated_at = new Date().toISOString();
          }
        }
      } catch (_) {}

      // Log RESET_PASSWORD audit event (EXPLICITLY EXCLUDING PLAINTEXT PASSWORD)
      await logAuditEvent({
        userId: req.user.id,
        clientDeviceId: req.clientDeviceId,
        action: 'RESET_PASSWORD',
        entityType: 'user',
        entityId: id,
        details: {
          target_username: current.username,
          target_role: newRole,
          reset_by: req.user.username || 'admin',
        },
        ipAddress: req.clientIp,
        userAgent: req.headers['user-agent'] || null,
      });
    } else {
      const { rows } = await query(
        `UPDATE users
         SET role = $1, is_active = $2, assigned_workstation = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, username, full_name, role, is_active, assigned_workstation, updated_at`,
        [newRole, newActive, newWorkstation, current.id]
      );
      updatedRows = rows;

      // Sync into fallbackStore if running offline
      try {
        const fallbackStore = require('../db/fallbackStore');
        if (fallbackStore && fallbackStore.users) {
          const userObj = fallbackStore.users.find((u) => u.id === id || u.username === current.username);
          if (userObj) {
            userObj.role = newRole;
            userObj.is_active = newActive;
            userObj.assigned_workstation = newWorkstation;
            userObj.updated_at = new Date().toISOString();
          }
        }
      } catch (_) {}

      const changes = {};
      if (newRole !== current.role) changes.role = { from: current.role, to: newRole };
      if (newActive !== current.is_active) changes.is_active = { from: current.is_active, to: newActive };
      if (newWorkstation !== current.assigned_workstation) changes.assigned_workstation = { from: current.assigned_workstation, to: newWorkstation };

      let auditAction = 'UPDATE_USER_ROLE';
      if (newActive !== current.is_active) auditAction = 'UPDATE_USER_STATUS';
      else if (newWorkstation !== current.assigned_workstation) auditAction = 'UPDATE_USER_WORKSTATION';

      await logAuditEvent({
        userId: req.user.id,
        clientDeviceId: req.clientDeviceId,
        action: auditAction,
        entityType: 'user',
        entityId: id,
        details: {
          target_username: current.username,
          changes,
        },
        ipAddress: req.clientIp,
        userAgent: req.headers['user-agent'] || null,
      });
    }

    const updatedUser = updatedRows[0] || {
      ...current,
      role: newRole,
      is_active: newActive,
      assigned_workstation: newWorkstation,
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: isPasswordReset
        ? `Password for "${current.username}" has been successfully reset`
        : 'User updated successfully',
      user: {
        ...updatedUser,
        client_name: newRole === 'client' ? (client_name || updatedUser.full_name) : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  createUser,
  listUsers,
  updateUser,
};
