const { query } = require('../db');

/**
 * Mask patient full name to protect patient privacy for external clinic logins.
 * Example: 'Mr. RAHUL DEMO' -> 'Mr. R*** D***'
 */
function maskPatientName(title, fullName) {
  if (!fullName) return 'Anonymous';
  const prefix = title ? `${title} ` : '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const name = parts[0];
    if (name.length <= 2) return `${prefix}${name[0]}***`;
    return `${prefix}${name[0]}***${name[name.length - 1]}`;
  }
  const maskedParts = parts.map((part) => {
    if (part.length <= 2) return `${part[0]}*`;
    return `${part[0]}***${part[part.length - 1]}`;
  });
  return `${prefix}${maskedParts.join(' ')}`;
}

/**
 * Resolve client-facing sample status:
 * 'Received' -> 'In Testing' -> 'Report Ready'
 */
function resolveClientStatus(visitStatus, reportStatus, printedAt) {
  if (reportStatus === 'final' || printedAt) {
    return 'Report Ready';
  }
  if (visitStatus === 'in-testing') {
    return 'In Testing';
  }
  return 'Received';
}

/**
 * Get sample tracking list & summary for an authenticated referring clinic (client role)
 * GET /api/reports/client-portal/samples
 * GET /api/reports?client_tracking=true
 */
async function getClientSamples(req, res, next) {
  try {
    const clientName = req.user?.client_name || req.user?.full_name;

    if (!clientName) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: No clinic affiliation linked to this client account',
      });
    }

    const { status, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const offset = parseInt(req.query.offset || '0', 10);

    // 1. Fetch visits strictly scoped to this client_name
    // CRITICAL: Query explicitly EXCLUDES test_results, result_value, reference_range, flags, interpretation, billing, and pricing!
    const sql = `
      SELECT 
        v.id as visit_id,
        v.visit_code,
        v.client_name,
        v.client_code,
        v.rch_id_mcts_id,
        v.sample_type,
        v.collected_at,
        v.created_at,
        v.status as visit_status,
        p.title as patient_title,
        p.full_name as patient_full_name,
        p.age_years,
        p.gender,
        r.status as report_status,
        r.printed_at as report_printed_at
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN reports r ON r.visit_id = v.id
      WHERE (v.client_name ILIKE $1 OR v.client_code ILIKE $1)
      ORDER BY v.created_at DESC
    `;

    let dbRows = [];
    try {
      const { rows } = await query(sql, [`%${clientName.trim()}%`]);
      dbRows = rows || [];
    } catch (_) {}

    // Fallback in-memory query processor when offline/demo mode is active
    if (dbRows.length === 0) {
      try {
        const fallbackStore = require('../db/fallbackStore');
        const cLower = clientName.toLowerCase().trim();
        const matchedVisits = (fallbackStore.visits || []).filter((v) =>
          (v.client_name || '').toLowerCase().includes(cLower) ||
          (v.client_code || '').toLowerCase().includes(cLower)
        );

        dbRows = matchedVisits.map((v) => {
          const patient = (fallbackStore.patients || []).find((p) => p.id === v.patient_id) || {};
          const report = (fallbackStore.reports || []).find((r) => r.visit_id === v.id) || {};
          return {
            visit_id: v.id,
            visit_code: v.visit_code,
            client_name: v.client_name,
            client_code: v.client_code,
            rch_id_mcts_id: v.rch_id_mcts_id,
            sample_type: v.sample_type,
            collected_at: v.collected_at,
            created_at: v.created_at,
            visit_status: v.status,
            patient_title: patient.title,
            patient_full_name: patient.full_name,
            age_years: patient.age_years,
            gender: patient.gender,
            report_status: report.status,
            report_printed_at: report.printed_at,
          };
        });
      } catch (_) {}
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;
    const totalCount = dbRows.length;

    const mappedSamples = dbRows.map((row) => {
      const createdAtMs = new Date(row.created_at || row.collected_at || now).getTime();
      if (createdAtMs >= startOfToday) countToday++;
      if (createdAtMs >= sevenDaysAgo) countWeek++;
      if (createdAtMs >= startOfMonth) countMonth++;

      const trackingStatus = resolveClientStatus(
        row.visit_status,
        row.report_status,
        row.report_printed_at
      );

      return {
        visit_code: row.visit_code,
        client_code: row.client_code || row.rch_id_mcts_id || null,
        patient: {
          masked_name: maskPatientName(row.patient_title, row.patient_full_name),
          age: row.age_years ? `${row.age_years}Y` : 'N/A',
          gender: row.gender || 'Unknown',
        },
        sample_type: row.sample_type || 'Diagnostic Sample',
        collected_at: row.collected_at || row.created_at,
        status: trackingStatus,
      };
    });

    // Apply optional client query filters
    let filtered = mappedSamples;
    if (status) {
      filtered = filtered.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.visit_code.toLowerCase().includes(q) ||
          (s.client_code && s.client_code.toLowerCase().includes(q))
      );
    }

    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      success: true,
      clinic_name: clientName,
      summary: {
        today: countToday,
        this_week: countWeek,
        this_month: countMonth,
        total: totalCount,
      },
      count: paginated.length,
      total_records: filtered.length,
      limit,
      offset,
      samples: paginated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getClientSamples,
  maskPatientName,
  resolveClientStatus,
};
