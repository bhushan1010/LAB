const { query } = require('../db');
const { logAuditEvent } = require('../utils/audit');

/**
 * Public (No-Auth) Endpoint: Fetch Report by QR Token
 * GET /api/public/reports/:qr_token
 * Hard security: accessed only via long, unguessable, 64-char crypto token
 */
async function getReportByQrToken(req, res, next) {
  try {
    const { qr_token } = req.params;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    if (!qr_token || qr_token.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR verification token format',
      });
    }

    // Fetch report by token
    const reportRes = await query(
      `SELECT r.id, r.report_code, r.barcode_value, r.qr_token, r.status,
              r.interpretation, r.reported_at, r.printed_at, r.created_at,
              r.visit_id
       FROM reports r
       WHERE r.qr_token = $1`,
      [qr_token]
    );

    if (reportRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or verification token is invalid',
      });
    }

    const report = reportRes.rows[0];

    // Restrict viewing if report is still draft
    if (report.status === 'draft') {
      return res.status(403).json({
        success: false,
        error: 'This report is currently in draft status and has not yet been finalized by the laboratory',
      });
    }

    // Fetch visit and patient details
    const visitRes = await query(
      `SELECT v.id, v.visit_code, v.ref_doctor, v.client_name, v.client_code,
              v.rch_id_mcts_id, v.sample_type, v.collected_at, v.status as visit_status,
              p.uhid, p.title, p.full_name, p.age_years, p.age_months, p.age_days, p.gender
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       WHERE v.id = $1`,
      [report.visit_id]
    );

    if (visitRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Associated visit record not found',
      });
    }

    const visit = visitRes.rows[0];

    // Fetch test results
    const resultsRes = await query(
      `SELECT id, department, test_name, result_value, unit,
              reference_range, method, flag, display_order
       FROM test_results
       WHERE visit_id = $1
       ORDER BY department ASC, display_order ASC, created_at ASC`,
      [report.visit_id]
    );

    // Group test results by department
    const departmentsMap = {};
    for (const test of resultsRes.rows) {
      if (!departmentsMap[test.department]) {
        departmentsMap[test.department] = [];
      }
      departmentsMap[test.department].push({
        test_name: test.test_name,
        result_value: test.result_value,
        unit: test.unit,
        reference_range: test.reference_range,
        method: test.method,
        flag: test.flag,
      });
    }

    const groupedResults = Object.keys(departmentsMap).map((dept) => ({
      department: dept,
      tests: departmentsMap[dept],
    }));

    // Log public verification event for tamper & audit tracking
    await logAuditEvent({
      userId: null,
      clientDeviceId: null,
      action: 'PUBLIC_QR_VIEW',
      entityType: 'report',
      entityId: report.id,
      details: {
        report_code: report.report_code,
        visit_code: visit.visit_code,
        user_agent: userAgent,
      },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      data: {
        report: {
          report_code: report.report_code,
          barcode_value: report.barcode_value,
          status: report.status,
          reported_at: report.reported_at,
          interpretation: report.interpretation,
        },
        patient: {
          uhid: visit.uhid,
          title: visit.title,
          full_name: visit.full_name,
          age: `${visit.age_years || 0} Y ${visit.age_months || 0} M ${visit.age_days || 0} D`,
          gender: visit.gender,
        },
        visit: {
          visit_code: visit.visit_code,
          ref_doctor: visit.ref_doctor,
          client_name: visit.client_name,
          client_code: visit.client_code,
          sample_type: visit.sample_type,
          collected_at: visit.collected_at,
        },
        results_by_department: groupedResults,
        test_results: resultsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReportByQrToken,
};
