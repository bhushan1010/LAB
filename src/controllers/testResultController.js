const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../db');
const { logAuditEvent } = require('../utils/audit');
const { calculateBillForVisit } = require('./reportController');

/**
 * Create a single freeform test result
 * POST /api/test-results
 */
async function createTestResult(req, res, next) {
  try {
    const {
      id = uuidv4(),
      visit_id,
      department,
      test_name,
      result_value,
      unit,
      reference_range,
      method,
      flag,
      display_order = 0,
    } = req.body;

    const { rows } = await query(
      `INSERT INTO test_results (
        id, visit_id, department, test_name, result_value, unit,
        reference_range, method, flag, display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        visit_id,
        department,
        test_name,
        String(result_value),
        unit || null,
        reference_range || null,
        method || null,
        flag || null,
        display_order,
        req.user.id,
      ]
    );

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CREATE_TEST_RESULT',
      entityType: 'test_result',
      entityId: rows[0].id,
      details: { visit_id, test_name, result_value },
      ipAddress: req.clientIp,
    });

    res.status(201).json({
      success: true,
      message: 'Test result entered successfully',
      test_result: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk create / replace freeform test results for a visit
 * POST /api/test-results/bulk
 * Useful for lab techs entering multiple tests at once
 */
async function bulkCreateTestResults(req, res, next) {
  try {
    const { visit_id, results } = req.body;

    if (!visit_id || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'visit_id and a non-empty results array are required',
      });
    }

    const insertedRows = await withTransaction(async (client) => {
      const rows = [];
      let order = 0;
      for (const item of results) {
        if (!item.department || !item.test_name || item.result_value === undefined) {
          throw new Error('Each result item must include department, test_name, and result_value');
        }

        const itemId = item.id || uuidv4();
        const res = await client.query(
          `INSERT INTO test_results (
            id, visit_id, department, test_name, result_value, unit,
            reference_range, method, flag, display_order, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            department = EXCLUDED.department,
            test_name = EXCLUDED.test_name,
            result_value = EXCLUDED.result_value,
            unit = EXCLUDED.unit,
            reference_range = EXCLUDED.reference_range,
            method = EXCLUDED.method,
            flag = EXCLUDED.flag,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()
          RETURNING *`,
          [
            itemId,
            visit_id,
            item.department,
            item.test_name,
            String(item.result_value),
            item.unit || null,
            item.reference_range || null,
            item.method || null,
            item.flag || null,
            item.display_order !== undefined ? item.display_order : order++,
            req.user.id,
          ]
        );
        rows.push(res.rows[0]);
      }

      // Update visit status to 'in-testing' if currently 'registered' or 'collected'
      await client.query(
        `UPDATE visits SET status = 'in-testing', updated_at = NOW()
         WHERE id = $1 AND status IN ('registered', 'collected')`,
        [visit_id]
      );

      return rows;
    });

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'BULK_CREATE_TEST_RESULTS',
      entityType: 'visit',
      entityId: visit_id,
      details: { count: insertedRows.length },
      ipAddress: req.clientIp,
    });

    res.status(201).json({
      success: true,
      message: `Successfully entered ${insertedRows.length} test result(s)`,
      test_results: insertedRows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all test results for a specific visit
 * GET /api/test-results?visit_id=...
 */
async function listByVisit(req, res, next) {
  try {
    const { visit_id, show_cancelled } = req.query;
    if (!visit_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_id query parameter is required',
      });
    }

    const sql = show_cancelled === 'true' && req.user?.role === 'admin'
      ? 'SELECT * FROM test_results WHERE visit_id = $1 ORDER BY department ASC, display_order ASC, created_at ASC'
      : "SELECT * FROM test_results WHERE visit_id = $1 AND (status IS NULL OR status != 'cancelled') ORDER BY department ASC, display_order ASC, created_at ASC";

    const { rows } = await query(sql, [visit_id]);

    res.json({
      success: true,
      count: rows.length,
      test_results: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a test result
 * PUT /api/test-results/:id
 */
async function updateTestResult(req, res, next) {
  try {
    const { id } = req.params;
    const {
      department,
      test_name,
      result_value,
      unit,
      reference_range,
      method,
      flag,
      display_order,
    } = req.body;

    const { rows } = await query(
      `UPDATE test_results
       SET department = COALESCE($1, department),
           test_name = COALESCE($2, test_name),
           result_value = COALESCE($3, result_value),
           unit = COALESCE($4, unit),
           reference_range = COALESCE($5, reference_range),
           method = COALESCE($6, method),
           flag = COALESCE($7, flag),
           display_order = COALESCE($8, display_order),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        department,
        test_name,
        result_value !== undefined ? String(result_value) : null,
        unit,
        reference_range,
        method,
        flag,
        display_order,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test result not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'UPDATE_TEST_RESULT',
      entityType: 'test_result',
      entityId: id,
      details: req.body,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Test result updated successfully',
      test_result: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a test result
 * DELETE /api/test-results/:id
 */
async function deleteTestResult(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await query('DELETE FROM test_results WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test result not found',
      });
    }

    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'DELETE_TEST_RESULT',
      entityType: 'test_result',
      entityId: id,
      ipAddress: req.clientIp,
    });

    res.json({
      success: true,
      message: 'Test result deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

const CLIENT_FACING_REASONS = [
  'Specimen unsuitable for testing',
  'Insufficient sample volume',
  'Collection cancelled',
  'Other — see lab',
];

/**
 * Cancel a single test result (Soft Delete)
 * POST /api/test-results/:id/cancel
 */
async function cancelTestResult(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, client_facing_reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
      });
    }

    const allowedRoles = ['front-desk', 'lab-tech', 'doctor', 'admin'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions to cancel test result',
      });
    }

    // 1. Fetch test result
    const testRes = await query('SELECT * FROM test_results WHERE id = $1', [id]);
    let testItem = testRes.rows[0];

    const fallbackStore = require('../db/fallbackStore');
    if (!testItem && fallbackStore?.test_results) {
      testItem = fallbackStore.test_results.find((t) => t.id === id);
    }

    if (!testItem) {
      return res.status(404).json({
        success: false,
        error: 'Test result not found',
      });
    }

    // 2. GUARDRAL: Check if associated report is already printed
    const reportRes = await query('SELECT * FROM reports WHERE visit_id = $1', [testItem.visit_id]);
    let report = reportRes.rows[0];
    if (!report && fallbackStore?.reports) {
      report = fallbackStore.reports.find((r) => r.visit_id === testItem.visit_id);
    }

    if (report && report.printed_at) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel test: Report #${report.report_code} has already been printed. Printed medical documents cannot be retroactively cancelled.`,
      });
    }

    // Check if visit is linked to a referring clinic
    const visitRes = await query('SELECT * FROM visits WHERE id = $1', [testItem.visit_id]);
    let visit = visitRes.rows[0];
    if (!visit && fallbackStore?.visits) {
      visit = fallbackStore.visits.find((v) => v.id === testItem.visit_id);
    }

    const hasClientPortal = !!(visit && (visit.client_name || visit.client_code));
    if (hasClientPortal) {
      if (!client_facing_reason || !CLIENT_FACING_REASONS.includes(client_facing_reason.trim())) {
        return res.status(400).json({
          success: false,
          error: `Client-facing reason is required for samples linked to a referring clinic. Must be one of: ${CLIENT_FACING_REASONS.join(', ')}`,
        });
      }
    } else if (client_facing_reason && !CLIENT_FACING_REASONS.includes(client_facing_reason.trim())) {
      return res.status(400).json({
        success: false,
        error: `Invalid client-facing reason. Must be one of: ${CLIENT_FACING_REASONS.join(', ')}`,
      });
    }

    const clientReason = client_facing_reason ? client_facing_reason.trim() : null;
    const nowIso = new Date().toISOString();

    // 3. Mark test as cancelled
    await query(
      `UPDATE test_results
       SET status = 'cancelled',
           cancellation_reason = $1,
           client_facing_reason = $2,
           cancelled_at = NOW(),
           cancelled_by = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [reason.trim(), clientReason, req.user.id, testItem.id]
    );

    if (fallbackStore?.test_results) {
      const storeTest = fallbackStore.test_results.find((t) => t.id === testItem.id);
      if (storeTest) {
        storeTest.status = 'cancelled';
        storeTest.cancellation_reason = reason.trim();
        storeTest.client_facing_reason = clientReason;
        storeTest.cancelled_at = nowIso;
        storeTest.cancelled_by = req.user.id;
      }
    }

    testItem.status = 'cancelled';
    testItem.cancellation_reason = reason.trim();
    testItem.client_facing_reason = clientReason;
    testItem.cancelled_at = nowIso;
    testItem.cancelled_by = req.user.id;

    // 4. Billing recalculation if report exists
    let updatedReport = null;
    if (report) {
      // Find remaining active tests for this visit
      let remainingTests = [];
      try {
        const remRes = await query(
          "SELECT test_name FROM test_results WHERE visit_id = $1 AND (status IS NULL OR status != 'cancelled')",
          [testItem.visit_id]
        );
        remainingTests = remRes.rows || [];
      } catch (_) {
        if (fallbackStore?.test_results) {
          remainingTests = fallbackStore.test_results.filter(
            (t) => t.visit_id === testItem.visit_id && t.status !== 'cancelled'
          );
        }
      }

      if (remainingTests.length > 0) {
        // Recalculate bill excluding cancelled test
        const activeDoctorId = report.doctor_id || visit?.doctor_id || null;
        const newBilling = await calculateBillForVisit(activeDoctorId, remainingTests);

        await query(
          `UPDATE reports
           SET total_amount = $1,
               billing_breakdown = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newBilling.total_amount, JSON.stringify(newBilling.billing_breakdown), report.id]
        );

        if (fallbackStore?.reports) {
          const storeRep = fallbackStore.reports.find((r) => r.id === report.id);
          if (storeRep) {
            storeRep.total_amount = newBilling.total_amount;
            storeRep.billing_breakdown = newBilling.billing_breakdown;
          }
        }
        report.total_amount = newBilling.total_amount;
        report.billing_breakdown = newBilling.billing_breakdown;
        updatedReport = report;
      } else {
        // All tests cancelled -> entire report and visit become cancelled with zeroed bill
        await query(
          `UPDATE reports
           SET status = 'cancelled',
               cancellation_reason = $1,
               client_facing_reason = $2,
               total_amount = 0.00,
               cancelled_at = NOW(),
               cancelled_by = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [reason.trim(), clientReason, req.user.id, report.id]
        );

        await query(
          `UPDATE visits
           SET status = 'cancelled',
               cancellation_reason = $1,
               client_facing_reason = $2,
               cancelled_at = NOW(),
               cancelled_by = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [reason.trim(), clientReason, req.user.id, testItem.visit_id]
        );

        if (fallbackStore?.reports) {
          const storeRep = fallbackStore.reports.find((r) => r.id === report.id);
          if (storeRep) {
            storeRep.status = 'cancelled';
            storeRep.cancellation_reason = reason.trim();
            storeRep.client_facing_reason = clientReason;
            storeRep.total_amount = 0.00;
            storeRep.cancelled_at = nowIso;
            storeRep.cancelled_by = req.user.id;
          }
        }
        if (fallbackStore?.visits) {
          const storeVis = fallbackStore.visits.find((v) => v.id === testItem.visit_id);
          if (storeVis) {
            storeVis.status = 'cancelled';
            storeVis.cancellation_reason = reason.trim();
            storeVis.client_facing_reason = clientReason;
            storeVis.cancelled_at = nowIso;
            storeVis.cancelled_by = req.user.id;
          }
        }
        report.status = 'cancelled';
        report.total_amount = 0.00;
        updatedReport = report;
      }
    }

    // 5. Log non-blocking audit event
    await logAuditEvent({
      userId: req.user.id,
      clientDeviceId: req.clientDeviceId,
      action: 'CANCEL_SAMPLE',
      entityType: 'test_result',
      entityId: testItem.id,
      details: {
        test_name: testItem.test_name,
        visit_id: testItem.visit_id,
        reason: reason.trim(),
        client_facing_reason: clientReason,
        cancelled_by: req.user.username || req.user.id,
        role: req.user.role,
        remaining_bill: updatedReport ? updatedReport.total_amount : undefined,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      message: `Test '${testItem.test_name}' has been cancelled`,
      test_result: testItem,
      report: updatedReport,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTestResult,
  bulkCreateTestResults,
  listByVisit,
  updateTestResult,
  deleteTestResult,
  cancelTestResult,
};
