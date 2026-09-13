const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../db');

// All audit routes are Admin-only
router.use(authenticate, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      actor,
      reportCode,
      startDate,
      endDate,
      search,
      limit = 100,
      offset = 0,
    } = req.query;

    let sql = `
      SELECT a.*, u.full_name as user_full_name, u.username, u.role as user_role
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      params.push(action);
      sql += ` AND a.action = $${params.length}`;
    }

    if (actor) {
      params.push(`%${actor}%`);
      sql += ` AND (u.username ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    if (reportCode) {
      params.push(`%${reportCode}%`);
      sql += ` AND (a.details->>'report_code' ILIKE $${params.length} OR a.details->>'visit_code' ILIKE $${params.length})`;
    }

    if (startDate) {
      params.push(new Date(startDate).toISOString());
      sql += ` AND a.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(new Date(endDate).toISOString());
      sql += ` AND a.created_at <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const pIdx = params.length;
      sql += ` AND (
        a.action ILIKE $${pIdx} OR
        u.username ILIKE $${pIdx} OR
        u.full_name ILIKE $${pIdx} OR
        a.ip_address ILIKE $${pIdx} OR
        a.client_device_id ILIKE $${pIdx} OR
        CAST(a.details AS TEXT) ILIKE $${pIdx}
      )`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await query(sql, params);

    // Apply memory filtering if query was handled in fallback memory store
    let filtered = rows;
    if (action) {
      filtered = filtered.filter((r) => r.action === action);
    }
    if (actor) {
      const q = actor.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.username?.toLowerCase().includes(q) ||
          r.user_full_name?.toLowerCase().includes(q)
      );
    }
    if (reportCode) {
      const q = reportCode.toLowerCase();
      filtered = filtered.filter((r) => {
        const detailsStr = typeof r.details === 'object' ? JSON.stringify(r.details) : String(r.details || '');
        return detailsStr.toLowerCase().includes(q);
      });
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() <= endMs);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => {
        const detailsStr = typeof r.details === 'object' ? JSON.stringify(r.details) : String(r.details || '');
        return (
          r.action?.toLowerCase().includes(q) ||
          r.username?.toLowerCase().includes(q) ||
          r.user_full_name?.toLowerCase().includes(q) ||
          r.ip_address?.toLowerCase().includes(q) ||
          r.client_device_id?.toLowerCase().includes(q) ||
          detailsStr.toLowerCase().includes(q)
        );
      });
    }

    const paginated = filtered.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    res.json({
      success: true,
      count: paginated.length,
      total: filtered.length,
      audit_logs: paginated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
