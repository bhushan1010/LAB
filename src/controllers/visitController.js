const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { generateVisitCode } = require('../utils/tokens');
const { logAuditEvent } = require('../utils/audit');

/**
 * Register / Create a Visit (Encounter / Sample Intake)
 * POST /api/visits
 */
async function createVisit(req, res, next) {
  try {
    const {
      id = uuidv4(),
      patient_id,
      visit_code = generateVisitCode(),
      ref_doctor,
      client_name,
      client_code,
      rch_id_mcts_id,
      sample_type,
      collected_at = new Date().toISOString(),
      status = 'registered',
    } = req.body;

    const { rows } = await query(
      `INSERT INTO visits (
        id, patient_id, visit_code, ref_doctor, client_name, client_code, rch_id_mcts_id,
        sample_type, collected_at, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        patient_id,
        visit_code,
        ref_doctor || null,
        client_name || null,
        client_code || null,
        rch_id_mcts_id || null,
        sample_type || null,
        collected_at,
        status,
        req.user.id,
      ]
    );

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CREATE_VISIT',
      entityType: 'visit',
      entityId: rows[0].id,
      details: { visit_code: rows[0].visit_code, patient_id },
      ipAddress: req.clientIp,
    });

    res.status(201).json({
      success: true,
      message: 'Visit created successfully',
      visit: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List Visits with filtering & pagination
 * GET /api/visits?patient_id=...&status=...&search=...&limit=50&offset=0
 */
async function listVisits(req, res, next) {
  try {
    const { patient_id, status, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);

    let sql = `
      SELECT v.*, p.full_name as patient_name, p.uhid as patient_uhid, p.gender as patient_gender,
             r.id as report_id, r.report_code, r.barcode_value, r.status as report_status, r.qr_token,
             r.doctor_approval_status, r.approved_by_doctor_name, r.approved_at, r.approval_note, r.printed_at
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN reports r ON r.visit_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (patient_id) {
      params.push(patient_id);
      sql += ` AND v.patient_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND v.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (v.visit_code ILIKE $${params.length} OR p.full_name ILIKE $${params.length} OR p.uhid ILIKE $${params.length} OR v.ref_doctor ILIKE $${params.length})`;
    }

    sql += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);

    res.json({
      success: true,
      limit,
      offset,
      count: rows.length,
      visits: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Visit by ID with patient details, test results, and report
 * GET /api/visits/:id
 */
async function getVisitById(req, res, next) {
  try {
    const { id } = req.params;

    const visitRes = await query(
      `SELECT v.*, p.full_name as patient_name, p.title as patient_title, p.uhid as patient_uhid,
              p.age_years, p.age_months, p.age_days, p.gender as patient_gender, p.phone as patient_phone
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       WHERE v.id = $1`,
      [id]
    );

    if (visitRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found',
      });
    }

    const testsSql = req.query.show_cancelled === 'true' && req.user?.role === 'admin'
      ? 'SELECT * FROM test_results WHERE visit_id = $1 ORDER BY department ASC, display_order ASC, created_at ASC'
      : "SELECT * FROM test_results WHERE visit_id = $1 AND (status IS NULL OR status != 'cancelled') ORDER BY department ASC, display_order ASC, created_at ASC";

    const testResultsRes = await query(testsSql, [id]);

    const reportRes = await query('SELECT * FROM reports WHERE visit_id = $1', [id]);

    res.json({
      success: true,
      visit: {
        ...visitRes.rows[0],
        test_results: testResultsRes.rows,
        report: reportRes.rows[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Visit Status / Details
 * PUT /api/visits/:id
 */
async function updateVisit(req, res, next) {
  try {
    const { id } = req.params;
    const {
      ref_doctor,
      client_name,
      client_code,
      rch_id_mcts_id,
      sample_type,
      collected_at,
      status,
    } = req.body;

    const { rows } = await query(
      `UPDATE visits
       SET ref_doctor = COALESCE($1, ref_doctor),
           client_name = COALESCE($2, client_name),
           client_code = COALESCE($3, client_code),
           rch_id_mcts_id = COALESCE($4, rch_id_mcts_id),
           sample_type = COALESCE($5, sample_type),
           collected_at = COALESCE($6, collected_at),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        ref_doctor,
        client_name,
        client_code,
        rch_id_mcts_id,
        sample_type,
        collected_at,
        status,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'UPDATE_VISIT',
      entityType: 'visit',
      entityId: id,
      details: req.body,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Visit updated successfully',
      visit: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Visit (Admin only)
 * DELETE /api/visits/:id
 */
async function deleteVisit(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await query('DELETE FROM visits WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'DELETE_VISIT',
      entityType: 'visit',
      entityId: id,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Visit deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List Referring Clinics (Active client accounts) for selection dropdowns
 * GET /api/visits/referring-clinics
 * Accessible to front-desk, lab-tech, admin
 */
const CLINIC_CODES = {
  'SAMPLE CLINIC': '0001',
  'MEDILINK MULTISPECIALITY': '4410',
  'SAMPLE SPECIALITY CLINIC': '8820',
  'SHISHU CHILD HEALTHCARE': '1205',
  'ROY WOMENS WELLNESS': '9012',
};

async function listReferringClinics(req, res, next) {
  try {
    const { rows } = await query(
      "SELECT id, username, full_name, is_active, role FROM users WHERE role = 'client' AND is_active = true ORDER BY full_name ASC"
    );

    let clinics = (rows || [])
      .filter((u) => u.role === 'client' && u.is_active !== false)
      .map((u) => {
        const cName = u.client_name || u.full_name;
        return {
          id: u.id,
          username: u.username,
          client_name: cName,
          client_code: CLINIC_CODES[cName] || '0001',
        };
      });

    // Fallback store support if running in demo/offline mode
    if (clinics.length === 0) {
      try {
        const fallbackStore = require('../db/fallbackStore');
        if (fallbackStore && fallbackStore.users) {
          clinics = fallbackStore.users
            .filter((u) => u.role === 'client' && u.is_active !== false)
            .map((u) => {
              const cName = u.client_name || u.full_name;
              return {
                id: u.id,
                username: u.username,
                client_name: cName,
                client_code: CLINIC_CODES[cName] || '0001',
              };
            });
        }
      } catch (_) {}
    }

    res.json({
      success: true,
      count: clinics.length,
      clinics,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createVisit,
  listVisits,
  getVisitById,
  updateVisit,
  deleteVisit,
  listReferringClinics,
};

