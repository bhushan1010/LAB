const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { generateUhid, generateUniqueUhid } = require('../utils/tokens');
const { logAuditEvent } = require('../utils/audit');

const KNOWN_CLINIC_CODES = {
  'SAMPLE CLINIC': '0001',
  'MEDILINK MULTISPECIALITY': '4410',
  'SAMPLE SPECIALITY CLINIC': '8820',
  'SHISHU CHILD HEALTHCARE': '1205',
  'ROY WOMENS WELLNESS': '9012',
};

/**
 * Register / Create a Patient
 * POST /api/patients
 * Supports client-provided UUID for offline-first creation
 */
async function createPatient(req, res, next) {
  try {
    const {
      id = uuidv4(),
      uhid,
      title,
      full_name,
      age_years,
      age_months = 0,
      age_days = 0,
      gender,
      phone,
      email,
      address,
      client_name,
      client_code,
    } = req.body;

    // Validate phone server-side if provided
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const phoneClean = String(phone).trim();
      if (!/^\d+$/.test(phoneClean) || phoneClean.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be exactly 10 numeric digits with no letters, symbols, or spaces',
        });
      }
    }

    // Resolve client_code for client-based UHID generation
    let resolvedClientCode = (client_code && typeof client_code === 'string' && client_code.trim())
      ? client_code.trim().toUpperCase()
      : null;

    if (!resolvedClientCode && client_name && typeof client_name === 'string') {
      const trimmedClinic = client_name.trim();
      resolvedClientCode = KNOWN_CLINIC_CODES[trimmedClinic] || null;
      if (!resolvedClientCode) {
        try {
          const fallbackStore = require('../db/fallbackStore');
          const matchedVisit = fallbackStore?.visits?.find((v) => v.client_name === trimmedClinic);
          if (matchedVisit?.client_code) {
            resolvedClientCode = matchedVisit.client_code;
          }
        } catch (_) {}
      }
    }

    // Generate unique UHID if not already provided
    let finalUhid = uhid;
    if (!finalUhid) {
      const fallbackStore = require('../db/fallbackStore');
      const checkExists = async (candidate) => {
        if (fallbackStore?.patients?.some((p) => p.uhid === candidate)) {
          return true;
        }
        try {
          const { rows } = await query('SELECT id FROM patients WHERE uhid = $1', [candidate]);
          return rows && rows.length > 0;
        } catch (_) {
          return false;
        }
      };

      finalUhid = await generateUniqueUhid(
        { full_name, client_code: resolvedClientCode || 'WALK' },
        checkExists
      );
    }

    const { rows } = await query(
      `INSERT INTO patients (
        id, uhid, title, full_name, age_years, age_months, age_days, gender, phone, email, address, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        finalUhid,
        title || null,
        full_name,
        age_years !== undefined ? age_years : null,
        age_months || 0,
        age_days || 0,
        gender,
        phone || null,
        email || null,
        address || null,
        req.user.id,
      ]
    );

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CREATE_PATIENT',
      entityType: 'patient',
      entityId: rows[0].id,
      details: { uhid: rows[0].uhid, name: rows[0].full_name },
      ipAddress: req.clientIp,
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List Patients with search and pagination
 * GET /api/patients?search=...&limit=20&offset=0
 */
async function listPatients(req, res, next) {
  try {
    const search = req.query.search ? req.query.search.trim() : null;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);

    let sql = 'SELECT * FROM patients';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ' WHERE full_name ILIKE $1 OR uhid ILIKE $1 OR phone ILIKE $1';
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM patients';
    const countParams = search ? [`%${search}%`] : [];
    if (search) countSql += ' WHERE full_name ILIKE $1 OR uhid ILIKE $1 OR phone ILIKE $1';
    const countRes = await query(countSql, countParams);

    res.json({
      success: true,
      total: parseInt(countRes.rows[0].total, 10),
      limit,
      offset,
      patients: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Patient by ID with associated visits
 * GET /api/patients/:id
 */
async function getPatientById(req, res, next) {
  try {
    const { id } = req.params;

    const patientRes = await query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    const visitsRes = await query(
      `SELECT v.*, r.id as report_id, r.report_code, r.status as report_status, r.qr_token
       FROM visits v
       LEFT JOIN reports r ON r.visit_id = v.id
       WHERE v.patient_id = $1
       ORDER BY v.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      patient: {
        ...patientRes.rows[0],
        visits: visitsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Patient Demographics
 * PUT /api/patients/:id
 */
async function updatePatient(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      full_name,
      age_years,
      age_months,
      age_days,
      gender,
      phone,
      email,
      address,
    } = req.body;

    const { rows } = await query(
      `UPDATE patients
       SET title = COALESCE($1, title),
           full_name = COALESCE($2, full_name),
           age_years = COALESCE($3, age_years),
           age_months = COALESCE($4, age_months),
           age_days = COALESCE($5, age_days),
           gender = COALESCE($6, gender),
           phone = COALESCE($7, phone),
           email = COALESCE($8, email),
           address = COALESCE($9, address),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title,
        full_name,
        age_years,
        age_months,
        age_days,
        gender,
        phone,
        email,
        address,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'UPDATE_PATIENT',
      entityType: 'patient',
      entityId: id,
      details: req.body,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Patient (Admin only)
 * DELETE /api/patients/:id
 */
async function deletePatient(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await query('DELETE FROM patients WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'DELETE_PATIENT',
      entityType: 'patient',
      entityId: id,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPatient,
  listPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};
