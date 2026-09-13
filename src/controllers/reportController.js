const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { query, withTransaction } = require('../db');
const { generateQrToken, generateBarcodeValue, generateReportCode } = require('../utils/tokens');
const { logAuditEvent } = require('../utils/audit');
const { getClientSamples } = require('./clientPortalController');

// Pre-seeded standard default test rates
const defaultRatesStore = {
  'Plasma Glucose-Random': 120.00,
  'Complete Blood Count (CBC)': 350.00,
  'Lipid Profile': 600.00,
  'Liver Function Test (LFT)': 550.00,
  'Kidney Function Test (KFT)': 500.00,
  'Thyroid Profile (T3, T4, TSH)': 450.00,
  'Urine Routine & Microscopic': 150.00,
  'HbA1c': 400.00,
};

// Pre-seeded doctors for demo & offline mode
const doctorsStore = [
  {
    id: 'doc-001',
    name: 'Dr. ANIL SHARMA, MD',
    clinic_name: 'Care & Cure Clinic',
    phone: '+91 98765 43210',
    email: 'dr.anil@carecure.in',
    is_active: true,
    created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
  },
  {
    id: 'doc-002',
    name: 'Dr. PRIYA DESHMUKH, MBBS',
    clinic_name: 'Sunrise Health Center',
    phone: '+91 98123 45678',
    email: 'dr.priya@sunrisehealth.org',
    is_active: true,
    created_at: new Date('2026-09-02T11:00:00Z').toISOString(),
    updated_at: new Date('2026-09-02T11:00:00Z').toISOString(),
  },
];

// Pre-seeded doctor-specific test rates (custom negotiated rates)
const doctorRatesStore = {
  'doc-001': {
    'Plasma Glucose-Random': 90.00, // Custom discounted rate (standard 120.00)
    'HbA1c': 320.00,                // Custom rate (standard 400.00)
  },
  'doc-002': {
    'Complete Blood Count (CBC)': 300.00, // Custom rate (standard 350.00)
  },
};

/**
 * Calculate per-doctor billing breakdown and total amount:
 * Hierarchy: Doctor custom rate -> Default test rate -> Fallback 0.00
 */
async function calculateBillForVisit(doctorId, tests = [], client = null) {
  let total_amount = 0.0;
  const billing_breakdown = [];

  for (const item of tests) {
    const testName = typeof item === 'string' ? item : item.test_name;
    if (!testName) continue;

    let rate = null;
    let rate_source = 'fallback';

    // 1. Doctor-specific rate check
    if (doctorId) {
      if (client && client.query) {
        try {
          await client.query('SAVEPOINT billing_doctor_rate');
          const docRateRes = await client.query(
            'SELECT rate FROM doctor_test_rates WHERE doctor_id = $1 AND test_name = $2',
            [doctorId, testName]
          );
          if (docRateRes && docRateRes.rows && docRateRes.rows.length > 0) {
            rate = parseFloat(docRateRes.rows[0].rate);
            rate_source = 'doctor';
          }
          await client.query('RELEASE SAVEPOINT billing_doctor_rate');
        } catch (_) {
          try { await client.query('ROLLBACK TO SAVEPOINT billing_doctor_rate'); } catch (_2) {}
        }
      }
      if (rate === null && doctorRatesStore[doctorId] && doctorRatesStore[doctorId][testName] !== undefined) {
        rate = parseFloat(doctorRatesStore[doctorId][testName]);
        rate_source = 'doctor';
      }
    }

    // 2. Default standard rate check
    if (rate === null) {
      if (client && client.query) {
        try {
          await client.query('SAVEPOINT billing_default_rate');
          const defRateRes = await client.query(
            'SELECT rate FROM default_test_rates WHERE test_name = $1',
            [testName]
          );
          if (defRateRes && defRateRes.rows && defRateRes.rows.length > 0) {
            rate = parseFloat(defRateRes.rows[0].rate);
            rate_source = 'default';
          }
          await client.query('RELEASE SAVEPOINT billing_default_rate');
        } catch (_) {
          try { await client.query('ROLLBACK TO SAVEPOINT billing_default_rate'); } catch (_2) {}
        }
      }
      if (rate === null && defaultRatesStore[testName] !== undefined) {
        rate = parseFloat(defaultRatesStore[testName]);
        rate_source = 'default';
      }
    }

    // 3. Unpriced test fallback
    if (rate === null || isNaN(rate)) {
      rate = 0.0;
      rate_source = 'fallback';
    }

    const itemRate = Number(rate.toFixed(2));
    total_amount += itemRate;
    billing_breakdown.push({
      test_name: testName,
      rate: itemRate,
      rate_source,
    });
  }

  return {
    total_amount: Number(total_amount.toFixed(2)),
    billing_breakdown,
  };
}

/**
 * Generate / Finalize a Report
 * POST /api/reports/generate
 */
async function generateReport(req, res, next) {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Client accounts are restricted to view-only status tracking',
      });
    }

    const {
      id = uuidv4(),
      visit_id,
      doctor_id = null,
      interpretation,
      status = 'final', // 'draft' | 'final'
      barcode_value = generateBarcodeValue('F'),
      report_code = generateReportCode(),
      pdf_storage_path = null,
      tests = null,
    } = req.body;

    const effectiveDeviceId = req.user.role === 'admin'
      ? (req.body.client_device_id || req.clientDeviceId || null)
      : (req.clientDeviceId || null);

    const qr_token = generateQrToken();
    const reported_at = status === 'final' ? new Date().toISOString() : null;

    const report = await withTransaction(async (client) => {
      // 1. Verify visit exists
      const visitCheck = await client.query('SELECT id, status, doctor_id, ref_doctor FROM visits WHERE id = $1', [visit_id]);
      if (visitCheck.rows.length === 0) {
        throw new Error('Visit not found');
      }

      const visitRow = visitCheck.rows[0];
      const activeDoctorId = doctor_id || visitRow.doctor_id || null;

      // 2. Fetch test results for this visit (excluding cancelled tests)
      let testList = [];
      try {
        const testsRes = await client.query(
          "SELECT test_name FROM test_results WHERE visit_id = $1 AND (status IS NULL OR status != 'cancelled')",
          [visit_id]
        );
        testList = testsRes.rows || [];
      } catch (_) {}

      if (testList.length === 0 && Array.isArray(tests)) {
        testList = tests.map((t) => (typeof t === 'string' ? { test_name: t } : t));
      }

      // 3. Compute billing snapshot
      const { total_amount, billing_breakdown } = await calculateBillForVisit(activeDoctorId, testList, client);

      // 4. Insert or update report record
      const reportRes = await client.query(
        `INSERT INTO reports (
          id, visit_id, report_code, barcode_value, qr_token, status, sync_status,
          client_device_id, interpretation, pdf_storage_path, reported_at, created_by,
          total_amount, billing_breakdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (report_code) DO UPDATE SET
          status = EXCLUDED.status,
          interpretation = EXCLUDED.interpretation,
          reported_at = EXCLUDED.reported_at,
          pdf_storage_path = EXCLUDED.pdf_storage_path,
          total_amount = EXCLUDED.total_amount,
          billing_breakdown = EXCLUDED.billing_breakdown,
          updated_at = NOW()
        RETURNING *`,
        [
          id,
          visit_id,
          report_code,
          barcode_value,
          qr_token,
          status,
          'synced',
          effectiveDeviceId,
          interpretation || null,
          pdf_storage_path,
          reported_at,
          req.user.id,
          total_amount,
          JSON.stringify(billing_breakdown),
        ]
      );

      // 5. Mark visit as completed if final report
      if (status === 'final') {
        await client.query(
          "UPDATE visits SET status = 'completed', updated_at = NOW() WHERE id = $1",
          [visit_id]
        );
      }

      const row = reportRes.rows[0] || {};
      return {
        ...row,
        total_amount: row.total_amount !== undefined ? parseFloat(row.total_amount) : total_amount,
        billing_breakdown: typeof row.billing_breakdown === 'string'
          ? JSON.parse(row.billing_breakdown)
          : (row.billing_breakdown || billing_breakdown),
      };
    });

    const publicViewUrl = `${config.app.clientBaseUrl}/reports/view/${report.qr_token}`;

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'GENERATE_REPORT',
      entityType: 'report',
      entityId: report.id,
      details: {
        report_code: report.report_code,
        barcode_value: report.barcode_value,
        visit_id,
        total_amount: report.total_amount,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      report: {
        ...report,
        public_view_url: publicViewUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Report by Report ID (Authorized staff only)
 * GET /api/reports/:id
 */
async function getReportById(req, res, next) {
  try {
    const { id } = req.params;

    // Reject client accounts from viewing internal/clinical report records
    if (req.user?.role === 'client') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Client accounts are restricted to view-only status tracking and cannot access clinical or financial report data',
      });
    }

    // Direct helper for billing configuration lookups if requested
    if (id === 'billing-config') {
      return res.json({
        success: true,
        doctors: doctorsStore,
        default_test_rates: defaultRatesStore,
        doctor_test_rates: doctorRatesStore,
      });
    }

    // Client portal direct access helper
    if (id === 'client-portal' || id === 'client-samples') {
      return getClientSamples(req, res, next);
    }

    const reportRes = await query('SELECT * FROM reports WHERE id = $1', [id]);
    if (reportRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    const report = reportRes.rows[0];

    // Ensure billing fields are cleanly formatted for staff inspection
    if (typeof report.billing_breakdown === 'string') {
      try {
        report.billing_breakdown = JSON.parse(report.billing_breakdown);
      } catch (_) {
        report.billing_breakdown = [];
      }
    }
    report.total_amount = parseFloat(report.total_amount || 0);

    // Fetch visit and patient data
    const visitRes = await query(
      `SELECT v.*, p.full_name as patient_name, p.title as patient_title, p.uhid as patient_uhid,
              p.age_years, p.age_months, p.age_days, p.gender as patient_gender, p.phone as patient_phone
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       WHERE v.id = $1`,
      [report.visit_id]
    );

    // Fetch test results (exclude cancelled tests unless report itself is cancelled)
    const resultsSql = report.status === 'cancelled'
      ? 'SELECT * FROM test_results WHERE visit_id = $1 ORDER BY department ASC, display_order ASC, created_at ASC'
      : "SELECT * FROM test_results WHERE visit_id = $1 AND (status IS NULL OR status != 'cancelled') ORDER BY department ASC, display_order ASC, created_at ASC";
    const resultsRes = await query(resultsSql, [report.visit_id]);

    const publicViewUrl = `${config.app.clientBaseUrl}/reports/view/${report.qr_token}`;

    res.json({
      success: true,
      report: {
        ...report,
        public_view_url: publicViewUrl,
        visit: visitRes.rows[0] || null,
        test_results: resultsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark report as printed / Handle billing actions
 * POST /api/reports/:id/print
 */
async function markReportPrinted(req, res, next) {
  try {
    const { id } = req.params;

    if (req.user?.role === 'client') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Client accounts cannot perform printing actions',
      });
    }

    // Intercept billing admin actions routed through /api/reports/billing/print
    if (id === 'billing') {
      const { action, payload } = req.body;
      if (action === 'save_doctor') {
        const existingIdx = doctorsStore.findIndex((d) => d.id === payload.id);
        const doctorRecord = {
          id: payload.id || `doc-${Date.now()}`,
          name: payload.name,
          clinic_name: payload.clinic_name || '',
          phone: payload.phone || '',
          email: payload.email || '',
          is_active: payload.is_active !== undefined ? payload.is_active : true,
          created_at: payload.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          doctorsStore[existingIdx] = doctorRecord;
        } else {
          doctorsStore.push(doctorRecord);
        }
        return res.json({ success: true, doctor: doctorRecord, doctors: doctorsStore });
      }

      if (action === 'delete_doctor') {
        const { doctor_id } = payload;
        const idx = doctorsStore.findIndex((d) => d.id === doctor_id);
        if (idx >= 0) doctorsStore.splice(idx, 1);
        delete doctorRatesStore[doctor_id];
        return res.json({ success: true, doctors: doctorsStore });
      }

      if (action === 'save_default_rate') {
        const { test_name, rate } = payload;
        defaultRatesStore[test_name] = parseFloat(rate);
        return res.json({ success: true, default_test_rates: defaultRatesStore });
      }

      if (action === 'delete_default_rate') {
        const { test_name } = payload;
        delete defaultRatesStore[test_name];
        return res.json({ success: true, default_test_rates: defaultRatesStore });
      }

      if (action === 'save_doctor_rate') {
        const { doctor_id, test_name, rate } = payload;
        if (!doctorRatesStore[doctor_id]) doctorRatesStore[doctor_id] = {};
        doctorRatesStore[doctor_id][test_name] = parseFloat(rate);
        return res.json({ success: true, doctor_test_rates: doctorRatesStore });
      }

      if (action === 'delete_doctor_rate') {
        const { doctor_id, test_name } = payload;
        if (doctorRatesStore[doctor_id]) {
          delete doctorRatesStore[doctor_id][test_name];
        }
        return res.json({ success: true, doctor_test_rates: doctorRatesStore });
      }

      if (action === 'calculate_bill') {
        const { doctor_id, tests } = payload;
        const result = await calculateBillForVisit(doctor_id, tests);
        return res.json({ success: true, ...result });
      }
    }

    const { rows } = await query(
      `UPDATE reports
       SET printed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'PRINT_REPORT',
      entityType: 'report',
      entityId: id,
      details: {
        report_code: rows[0].report_code,
        barcode_value: rows[0].barcode_value,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: 'Report marked as printed',
      printed_at: rows[0].printed_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all generated reports with filtering (Role-Scoped)
 * GET /api/reports?status=...&search=...&limit=50&offset=0
 */
async function listReports(req, res, next) {
  try {
    const role = req.user?.role || 'front-desk';

    // 1. REUSE REPORT-SCOPING PATTERN FOR CLIENT ROLE:
    // If authenticated user is a referring clinic (role 'client') or requests client_tracking,
    // automatically delegate to getClientSamples to strictly enforce client_name scoping,
    // patient PII masking, and total exclusion of clinical/financial results.
    if (role === 'client' || req.query.client_tracking === 'true') {
      return getClientSamples(req, res, next);
    }

    // Intercept billing config query
    if (req.query.action === 'get_billing_config') {
      return res.json({
        success: true,
        doctors: doctorsStore,
        default_test_rates: defaultRatesStore,
        doctor_test_rates: doctorRatesStore,
      });
    }

    const {
      status,
      search,
      sync_status,
      print_status,
      startDate,
      endDate,
      client_device_id,
      created_by,
    } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);

    let sql = `
      SELECT r.*, v.visit_code, v.collected_at, p.full_name as patient_name, p.uhid as patient_uhid, u.full_name as creator_name, u.username as creator_username
      FROM reports r
      JOIN visits v ON v.id = r.visit_id
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN users u ON u.id = r.created_by
      WHERE 1=1
    `;
    const params = [];

    // Role-based scoping: front-desk and lab-tech are scoped to their own reports or current workstation
    if (role !== 'admin' && role !== 'doctor' && req.query.workflow !== 'true') {
      const activeDeviceId = req.clientDeviceId || null;
      if (activeDeviceId) {
        params.push(req.user.id, activeDeviceId);
        sql += ` AND (r.created_by = $${params.length - 1} OR r.client_device_id = $${params.length})`;
      } else {
        params.push(req.user.id);
        sql += ` AND r.created_by = $${params.length}`;
      }
    } else {
      // Admin optional filters
      if (created_by) {
        params.push(created_by);
        sql += ` AND r.created_by = $${params.length}`;
      }
      if (client_device_id) {
        params.push(client_device_id);
        sql += ` AND r.client_device_id = $${params.length}`;
      }
    }

    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    } else if (req.query.show_cancelled !== 'true' || role !== 'admin') {
      sql += " AND (r.status IS NULL OR r.status != 'cancelled')";
    }

    if (sync_status) {
      params.push(sync_status);
      sql += ` AND r.sync_status = $${params.length}`;
    }

    if (print_status === 'printed') {
      sql += ` AND r.printed_at IS NOT NULL`;
    } else if (print_status === 'pending_print') {
      sql += ` AND r.printed_at IS NULL`;
    }

    if (startDate) {
      params.push(new Date(startDate).toISOString());
      sql += ` AND r.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(new Date(endDate).toISOString());
      sql += ` AND r.created_at <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      sql += ` AND (
        r.report_code ILIKE $${pIdx} OR
        r.barcode_value ILIKE $${pIdx} OR
        p.full_name ILIKE $${pIdx} OR
        p.uhid ILIKE $${pIdx} OR
        v.visit_code ILIKE $${pIdx}
      )`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);

    // Apply scoping & filtering in fallback memory mode if needed
    let filtered = rows;
    if (role !== 'admin' && role !== 'doctor' && req.query.workflow !== 'true') {
      const activeDeviceId = req.clientDeviceId || null;
      filtered = filtered.filter(
        (r) => r.created_by === req.user.id || (activeDeviceId && r.client_device_id === activeDeviceId)
      );
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    } else if (req.query.show_cancelled !== 'true' || role !== 'admin') {
      filtered = filtered.filter((r) => r.status !== 'cancelled');
    }
    if (sync_status) {
      filtered = filtered.filter((r) => r.sync_status === sync_status);
    }
    if (print_status === 'printed') {
      filtered = filtered.filter((r) => !!r.printed_at);
    } else if (print_status === 'pending_print') {
      filtered = filtered.filter((r) => !r.printed_at);
    }
    if (startDate) {
      const sMs = new Date(startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() >= sMs);
    }
    if (endDate) {
      const eMs = new Date(endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.created_at).getTime() <= eMs);
    }

    res.json({
      success: true,
      count: filtered.length,
      limit,
      offset,
      reports: filtered.map((r) => ({
        ...r,
        total_amount: parseFloat(r.total_amount || 0),
        billing_breakdown: typeof r.billing_breakdown === 'string'
          ? (() => { try { return JSON.parse(r.billing_breakdown); } catch (_) { return []; } })()
          : (r.billing_breakdown || []),
        public_view_url: `${config.app.clientBaseUrl}/reports/view/${r.qr_token}`,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel a Report / Sample (Soft Delete)
 * POST /api/reports/:id/cancel
 */
async function cancelReport(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
      });
    }

    // Only staff roles can cancel
    const allowedRoles = ['front-desk', 'lab-tech', 'admin'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions to cancel sample report',
      });
    }

    // 1. Fetch report to check print status
    const reportRes = await query('SELECT * FROM reports WHERE id = $1 OR report_code = $1', [id]);
    let report = reportRes.rows[0];

    // Fallback store lookup if needed
    const fallbackStore = require('../db/fallbackStore');
    if (!report && fallbackStore?.reports) {
      report = fallbackStore.reports.find((r) => r.id === id || r.report_code === id);
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // 2. GUARDRAL: Block cancellation if report has already been printed
    if (report.printed_at) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel sample: Report #${report.report_code} has already been physically printed. Retroactive cancellation of printed medical documents requires a formal laboratory amendment workflow.`,
      });
    }

    // 3. Update report status to 'cancelled'
    const nowIso = new Date().toISOString();
    await query(
      `UPDATE reports
       SET status = 'cancelled',
           cancellation_reason = $1,
           cancelled_at = NOW(),
           cancelled_by = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [reason.trim(), req.user.id, report.id]
    );

    // Also cascade status to associated test results for this visit
    await query(
      `UPDATE test_results
       SET status = 'cancelled',
           cancellation_reason = $1,
           cancelled_at = NOW(),
           cancelled_by = $2,
           updated_at = NOW()
       WHERE visit_id = $3`,
      [reason.trim(), req.user.id, report.visit_id]
    );

    // Update in fallback store
    if (fallbackStore?.reports) {
      const storeRep = fallbackStore.reports.find((r) => r.id === report.id);
      if (storeRep) {
        storeRep.status = 'cancelled';
        storeRep.cancellation_reason = reason.trim();
        storeRep.cancelled_at = nowIso;
        storeRep.cancelled_by = req.user.id;
      }
    }
    if (fallbackStore?.test_results) {
      fallbackStore.test_results
        .filter((t) => t.visit_id === report.visit_id)
        .forEach((t) => {
          t.status = 'cancelled';
          t.cancellation_reason = reason.trim();
          t.cancelled_at = nowIso;
          t.cancelled_by = req.user.id;
        });
    }

    report.status = 'cancelled';
    report.cancellation_reason = reason.trim();
    report.cancelled_at = nowIso;
    report.cancelled_by = req.user.id;

    // 4. Log non-blocking audit event
    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CANCEL_SAMPLE',
      entityType: 'report',
      entityId: report.id,
      details: {
        report_code: report.report_code,
        visit_id: report.visit_id,
        reason: reason.trim(),
        cancelled_by: req.user.username || req.user.id,
        role: req.user.role,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: `Sample report #${report.report_code} has been cancelled`,
      report,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Doctor Approval / Sign-off / Rejection (Stage 3)
 * POST /api/reports/:id/approve
 */
async function doctorApproval(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    // RBAC: Doctor or Admin
    if (!['doctor', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Doctor approval requires doctor or admin role',
      });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status is required and must be either 'approved' or 'rejected'",
      });
    }

    // 1. Fetch report
    const reportRes = await query('SELECT * FROM reports WHERE id = $1 OR report_code = $1', [id]);
    let report = reportRes.rows[0];

    const fallbackStore = require('../db/fallbackStore');
    if (!report && fallbackStore?.reports) {
      report = fallbackStore.reports.find((r) => r.id === id || r.report_code === id);
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    const nowIso = new Date().toISOString();
    const doctorName = req.user.full_name || req.user.username || 'Doctor';
    const doctorId = req.user.id;
    const approvalNote = note && typeof note === 'string' ? note.trim() : null;

    // 2. Update report in DB
    try {
      await query(
        `UPDATE reports
         SET doctor_approval_status = $1,
             approved_by_doctor_id = $2,
             approved_by_doctor_name = $3,
             approved_at = NOW(),
             approval_note = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [status, doctorId, doctorName, approvalNote, report.id]
      );
    } catch (_) {}

    // If rejected, route visit back to in_testing stage
    if (status === 'rejected') {
      try {
        await query(
          "UPDATE visits SET status = 'in_testing', updated_at = NOW() WHERE id = $1",
          [report.visit_id]
        );
      } catch (_) {}
    }

    // Update in fallback store
    if (fallbackStore?.reports) {
      const storeRep = fallbackStore.reports.find((r) => r.id === report.id);
      if (storeRep) {
        storeRep.doctor_approval_status = status;
        storeRep.approved_by_doctor_id = doctorId;
        storeRep.approved_by_doctor_name = doctorName;
        storeRep.approved_at = nowIso;
        storeRep.approval_note = approvalNote;
        storeRep.updated_at = nowIso;
      }
    }

    if (status === 'rejected' && fallbackStore?.visits) {
      const storeVisit = fallbackStore.visits.find((v) => v.id === report.visit_id);
      if (storeVisit) {
        storeVisit.status = 'in_testing';
        storeVisit.updated_at = nowIso;
      }
    }

    report.doctor_approval_status = status;
    report.approved_by_doctor_id = doctorId;
    report.approved_by_doctor_name = doctorName;
    report.approved_at = nowIso;
    report.approval_note = approvalNote;

    // 3. Log audit event
    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: status === 'approved' ? 'DOCTOR_APPROVAL' : 'DOCTOR_REJECTION',
      entityType: 'report',
      entityId: report.id,
      details: {
        report_code: report.report_code,
        visit_id: report.visit_id,
        status,
        approval_note: approvalNote,
        doctor_name: doctorName,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: status === 'approved'
        ? `Report #${report.report_code} approved by ${doctorName}`
        : `Report #${report.report_code} rejected back to testing`,
      report,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calculateBillForVisit,
  generateReport,
  getReportById,
  markReportPrinted,
  listReports,
  cancelReport,
  doctorApproval,
  doctorsStore,
  defaultRatesStore,
  doctorRatesStore,
};
