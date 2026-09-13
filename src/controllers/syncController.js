const crypto = require('crypto');
const { withTransaction, query } = require('../db');
const { logAuditEvent } = require('../utils/audit');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Normalizes input parts into a deterministic UUID v4.
 * Joins all non-empty parts with ':' so composite scopes (e.g. visit_id + test_name + local_id)
 * produce globally unique, collision-proof, yet retry-idempotent UUIDs.
 */
function toDeterministicUuid(...parts) {
  const clean = parts.filter((p) => p !== undefined && p !== null && p !== '').map((p) => String(p).trim());
  if (clean.length === 0) return null;
  if (clean.length === 1 && isValidUuid(clean[0])) return clean[0].toLowerCase();

  const hash = crypto.createHash('md5').update(clean.join(':')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function normalizeVisitStatus(status) {
  if (!status) return 'registered';
  const s = String(status).trim().toLowerCase();
  if (['final', 'final report', 'completed', 'complete'].includes(s)) return 'completed';
  if (['in-testing', 'testing', 'in testing', 'processing'].includes(s)) return 'in-testing';
  if (['collected', 'sample collected'].includes(s)) return 'collected';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  return 'registered';
}

function normalizeReportStatus(status) {
  if (!status) return 'final';
  const s = String(status).trim().toLowerCase();
  if (['final', 'final report', 'completed', 'complete'].includes(s)) return 'final';
  if (['draft', 'pending', 'registered'].includes(s)) return 'draft';
  if (['amended', 'updated'].includes(s)) return 'amended';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  return 'final';
}

function normalizeFlag(flag) {
  if (!flag) return null;
  const f = String(flag).trim().toUpperCase();
  return ['NORMAL', 'HIGH', 'LOW', 'CRITICAL'].includes(f) ? f : null;
}

function normalizeDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toIntOrNull(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = parseInt(val, 10);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Sync Endpoint (Offline-first push)
 * POST /api/sync/push
 * Clients push locally created or updated records to VPS server
 */
async function pushSync(req, res, next) {
  try {
    const {
      client_device_id = req.clientDeviceId || 'UNKNOWN-CLIENT',
      patients = [],
      visits = [],
      test_results = [],
      reports = [],
    } = req.body;

    const syncResult = await withTransaction(async (client) => {
      const syncedStats = {
        patients: 0,
        visits: 0,
        test_results: 0,
        reports: 0,
      };

      const idMap = new Map();

      // 1. Sync Patients (Composite-scoped UUID: client_device_id + uhid + local_id)
      for (const p of patients) {
        if (!p.full_name) continue;
        const targetUhid = p.uhid || ('UHID-' + Date.now());
        let normPatientId = isValidUuid(p.id) && !p.id.startsWith('11111111-')
          ? p.id.toLowerCase()
          : toDeterministicUuid(client_device_id, targetUhid, p.id || targetUhid);

        // Check for existing patient by resolved ID or UHID
        const existingPat = await client.query(
          'SELECT id FROM patients WHERE id = $1 OR uhid = $2 LIMIT 1',
          [normPatientId, targetUhid]
        );

        const ageYears = p.age_years !== undefined && p.age_years !== null && p.age_years !== ''
          ? parseInt(p.age_years, 10) : null;
        const ageMonths = toIntOrNull(p.age_months, 0);
        const ageDays = toIntOrNull(p.age_days, 0);
        const gender = ['M', 'F', 'Other'].includes(p.gender) ? p.gender : 'M';
        const createdBy = req.user?.id || null;

        if (existingPat.rows.length > 0) {
          normPatientId = existingPat.rows[0].id;
          await client.query(
            `UPDATE patients SET
              title = COALESCE($1, title),
              full_name = $2,
              age_years = $3,
              age_months = $4,
              age_days = $5,
              gender = $6,
              phone = COALESCE($7, phone),
              email = COALESCE($8, email),
              address = COALESCE($9, address),
              updated_at = NOW()
            WHERE id = $10`,
            [
              p.title || null,
              p.full_name,
              ageYears,
              ageMonths,
              ageDays,
              gender,
              p.phone || null,
              p.email || null,
              p.address || null,
              normPatientId,
            ]
          );
        } else {
          await client.query(
            `INSERT INTO patients (
              id, uhid, title, full_name, age_years, age_months, age_days,
              gender, phone, email, address, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), NOW())`,
            [
              normPatientId,
              targetUhid,
              p.title || null,
              p.full_name,
              ageYears,
              ageMonths,
              ageDays,
              gender,
              p.phone || null,
              p.email || null,
              p.address || null,
              createdBy,
              normalizeDate(p.created_at),
            ]
          );
        }

        if (p.id) idMap.set(p.id, normPatientId);
        idMap.set(targetUhid, normPatientId);
        syncedStats.patients++;
      }

      // 2. Sync Visits (Composite-scoped UUID: client_device_id + patient_id + visit_code + local_id)
      for (const v of visits) {
        const visitCode = v.visit_code || ('VIS-' + Date.now());

        // Resolve patient ID
        let resolvedPatientId = idMap.get(v.patient_id);
        if (!resolvedPatientId && v.patient_id) {
          resolvedPatientId = isValidUuid(v.patient_id) && !v.patient_id.startsWith('11111111-')
            ? v.patient_id.toLowerCase()
            : idMap.get(v.patient_id);
        }
        if (!resolvedPatientId && patients.length > 0) {
          const firstPat = patients[0];
          resolvedPatientId = idMap.get(firstPat.id) || idMap.get(firstPat.uhid);
        }
        if (!resolvedPatientId) {
          const fallbackPat = await client.query('SELECT id FROM patients ORDER BY created_at DESC LIMIT 1');
          resolvedPatientId = fallbackPat.rows[0]?.id;
        }
        if (!resolvedPatientId) continue;

        let normVisitId = isValidUuid(v.id) && !v.id.startsWith('22222222-')
          ? v.id.toLowerCase()
          : toDeterministicUuid(client_device_id, resolvedPatientId, visitCode, v.id || visitCode);

        // Check if visit already exists
        const existingVisit = await client.query(
          'SELECT id FROM visits WHERE id = $1 OR visit_code = $2 LIMIT 1',
          [normVisitId, visitCode]
        );

        const vStatus = normalizeVisitStatus(v.status);
        const collectedAt = normalizeDate(v.collected_at) || new Date().toISOString();
        const createdBy = req.user?.id || null;

        if (existingVisit.rows.length > 0) {
          normVisitId = existingVisit.rows[0].id;
          await client.query(
            `UPDATE visits SET
              ref_doctor = COALESCE($1, ref_doctor),
              client_name = COALESCE($2, client_name),
              client_code = COALESCE($3, client_code),
              rch_id_mcts_id = COALESCE($4, rch_id_mcts_id),
              sample_type = COALESCE($5, sample_type),
              collected_at = COALESCE($6, collected_at),
              status = $7,
              updated_at = NOW()
            WHERE id = $8`,
            [
              v.ref_doctor || null,
              v.client_name || null,
              v.client_code || null,
              v.rch_id_mcts_id || null,
              v.sample_type || null,
              collectedAt,
              vStatus,
              normVisitId,
            ]
          );
        } else {
          await client.query(
            `INSERT INTO visits (
              id, patient_id, visit_code, ref_doctor, client_name, client_code,
              rch_id_mcts_id, sample_type, collected_at, status, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), NOW())`,
            [
              normVisitId,
              resolvedPatientId,
              visitCode,
              v.ref_doctor || null,
              v.client_name || null,
              v.client_code || null,
              v.rch_id_mcts_id || null,
              v.sample_type || null,
              collectedAt,
              vStatus,
              createdBy,
              normalizeDate(v.created_at),
            ]
          );
        }

        if (v.id) idMap.set(v.id, normVisitId);
        idMap.set(visitCode, normVisitId);
        syncedStats.visits++;
      }

      // 3. Sync Test Results (Composite-scoped UUID: resolvedVisitId + test_name + local_id)
      for (const t of test_results) {
        if (!t.test_name) continue;

        // Resolve visit ID
        let resolvedVisitId = idMap.get(t.visit_id);
        if (!resolvedVisitId && t.visit_id) {
          resolvedVisitId = isValidUuid(t.visit_id) && !t.visit_id.startsWith('22222222-')
            ? t.visit_id.toLowerCase()
            : idMap.get(t.visit_id);
        }
        if (!resolvedVisitId && visits.length > 0) {
          resolvedVisitId = idMap.get(visits[0].id) || idMap.get(visits[0].visit_code);
        }
        if (!resolvedVisitId && reports.length > 0) {
          resolvedVisitId = idMap.get(reports[0].visit_id);
        }
        if (!resolvedVisitId) continue;

        // Scoped to parent visit + test name + local ID, preventing cross-visit template collision
        const normTestId = isValidUuid(t.id) && !t.id.startsWith('00000000-')
          ? t.id.toLowerCase()
          : toDeterministicUuid(resolvedVisitId, t.test_name, t.id || '1');

        const dept = t.department || (reports[0] && reports[0].department) || 'DEPARTMENT OF BIOCHEMISTRY';
        const flag = normalizeFlag(t.flag);
        const displayOrder = toIntOrNull(t.display_order, 0);
        const createdBy = req.user?.id || null;

        await client.query(
          `INSERT INTO test_results (
            id, visit_id, department, test_name, result_value, unit,
            reference_range, method, flag, display_order, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), NOW())
          ON CONFLICT (id) DO UPDATE SET
            department = EXCLUDED.department,
            test_name = EXCLUDED.test_name,
            result_value = EXCLUDED.result_value,
            unit = EXCLUDED.unit,
            reference_range = EXCLUDED.reference_range,
            method = EXCLUDED.method,
            flag = EXCLUDED.flag,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()`,
          [
            normTestId,
            resolvedVisitId,
            dept,
            t.test_name,
            String(t.result_value || ''),
            t.unit || null,
            t.reference_range || null,
            t.method || null,
            flag,
            displayOrder,
            createdBy,
            normalizeDate(t.created_at),
          ]
        );
        syncedStats.test_results++;
      }

      // 4. Sync Reports (Composite-scoped UUID: client_device_id + report_code + local_id)
      for (const r of reports) {
        if (!r.report_code || !r.qr_token) continue;

        // Resolve visit ID
        let resolvedVisitId = idMap.get(r.visit_id);
        if (!resolvedVisitId && visits.length > 0) {
          resolvedVisitId = idMap.get(visits[0].id) || idMap.get(visits[0].visit_code);
        }
        if (!resolvedVisitId) continue;

        let normReportId = isValidUuid(r.id)
          ? r.id.toLowerCase()
          : toDeterministicUuid(client_device_id, r.report_code, r.id || r.report_code);

        // Check existing report by ID, report_code, or qr_token
        const existingRep = await client.query(
          'SELECT id FROM reports WHERE id = $1 OR report_code = $2 OR qr_token = $3 LIMIT 1',
          [normReportId, r.report_code, r.qr_token]
        );
        if (existingRep.rows.length > 0) {
          normReportId = existingRep.rows[0].id;
        }

        const reportStatus = normalizeReportStatus(r.status);
        const interp = r.interpretation
          ? (typeof r.interpretation === 'string' ? r.interpretation : JSON.stringify(r.interpretation))
          : null;
        const createdBy = req.user?.id || null;

        await client.query(
          `INSERT INTO reports (
            id, visit_id, report_code, barcode_value, qr_token, status,
            sync_status, client_device_id, client_updated_at, synced_at,
            interpretation, pdf_storage_path, reported_at, printed_at, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'synced', $7, $8, NOW(), $9, $10, $11, $12, $13, COALESCE($14, NOW()), NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            sync_status = 'synced',
            client_device_id = EXCLUDED.client_device_id,
            client_updated_at = EXCLUDED.client_updated_at,
            synced_at = NOW(),
            interpretation = EXCLUDED.interpretation,
            pdf_storage_path = EXCLUDED.pdf_storage_path,
            reported_at = EXCLUDED.reported_at,
            printed_at = EXCLUDED.printed_at,
            updated_at = NOW()`,
          [
            normReportId,
            resolvedVisitId,
            r.report_code,
            r.barcode_value,
            r.qr_token,
            reportStatus,
            client_device_id,
            normalizeDate(r.updated_at) || new Date().toISOString(),
            interp,
            r.pdf_storage_path || null,
            normalizeDate(r.reported_at),
            normalizeDate(r.printed_at),
            createdBy,
            normalizeDate(r.created_at),
          ]
        );

        if (reportStatus === 'final') {
          await client.query(
            "UPDATE visits SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [resolvedVisitId]
          );
        }

        syncedStats.reports++;
      }

      return syncedStats;
    });

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: client_device_id,
      action: 'SYNC_PUSH',
      entityType: 'sync',
      details: {
        success: true,
        client_device_id,
        synced_counts: syncResult,
        report_codes: reports.map((r) => r.report_code || r.id),
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: 'Sync push completed successfully',
      client_device_id,
      server_timestamp: new Date().toISOString(),
      synced_counts: syncResult,
    });
  } catch (err) {
    await logAuditEvent({
      userId: req.user?.id || null,
      clientDeviceId: req.body?.client_device_id || req.clientDeviceId || null,
      action: 'SYNC_FAILED',
      entityType: 'sync',
      details: {
        success: false,
        error: err.message,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });
    next(err);
  }
}

/**
 * Health & sync status check for clients
 * GET /api/sync/status
 */
async function getSyncStatus(req, res, next) {
  try {
    const { rows: reportStats } = await query(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_reports,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_reports
      FROM reports
    `);

    res.json({
      success: true,
      server_time: new Date().toISOString(),
      client_device_id: req.clientDeviceId || null,
      stats: reportStats[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  pushSync,
  getSyncStatus,
};
