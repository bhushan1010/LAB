const { Pool } = require('pg');
const config = require('../config/env');
const fallbackStore = require('./fallbackStore');
const { v4: uuidv4 } = require('uuid');

const databaseUrl = process.env.DATABASE_URL || config.db.connectionString || null;

let pool = null;

if (databaseUrl) {
  // Cloud Postgres configuration (Tested against Neon and Supabase)
  // Both Neon and Supabase require SSL connections
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Tested against Neon & Supabase cloud PostgreSQL
    },
    max: config.db.maxPool || 10,
    idleTimeoutMillis: config.db.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.db.connectionTimeoutMillis || 10000,
  });

  pool.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      console.error('Unexpected error on idle PostgreSQL client:', err.message);
    }
  });
}

let postgresAvailable = databaseUrl ? null : false;

/**
 * In-memory fallback query processor when PostgreSQL is offline
 */
function handleFallbackQuery(text, params) {
  const sql = text.trim();

  if (sql.includes('FROM users WHERE username = $1') || sql.includes('FROM users WHERE LOWER(username) = LOWER($1)')) {
    const user = fallbackStore.users.find((u) => u.username?.toLowerCase() === params[0]?.toLowerCase());
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  if (sql.includes('FROM users WHERE id = $1')) {
    const user = fallbackStore.users.find((u) => u.id === params[0]);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  if (sql.startsWith('INSERT INTO users')) {
    const newUser = {
      id: uuidv4(),
      username: params[0],
      password_hash: params[1],
      full_name: params[2],
      role: params[3],
      assigned_workstation: params[4] || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fallbackStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }
  if (sql.startsWith('UPDATE users')) {
    const targetId = params[params.length - 1];
    const userIndex = fallbackStore.users.findIndex((u) => u.id === targetId);
    if (userIndex !== -1) {
      if (sql.includes('password_hash = $1')) {
        fallbackStore.users[userIndex].password_hash = params[0];
        fallbackStore.users[userIndex].role = params[1];
        fallbackStore.users[userIndex].is_active = params[2];
        if (params.length >= 5) {
          fallbackStore.users[userIndex].assigned_workstation = params[3];
        }
      } else if (sql.includes('assigned_workstation = $1')) {
        fallbackStore.users[userIndex].assigned_workstation = params[0];
      } else {
        fallbackStore.users[userIndex].role = params[0];
        fallbackStore.users[userIndex].is_active = params[1];
        if (params.length >= 4) {
          fallbackStore.users[userIndex].assigned_workstation = params[2];
        }
      }
      fallbackStore.users[userIndex].updated_at = new Date().toISOString();
      return { rows: [fallbackStore.users[userIndex]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('SELECT') && sql.includes('FROM users')) {
    return { rows: fallbackStore.users, rowCount: fallbackStore.users.length };
  }

  // 2. Patient queries
  if (sql.startsWith('INSERT INTO patients')) {
    const patient = {
      id: params[0] || uuidv4(),
      uhid: params[1],
      title: params[2],
      full_name: params[3],
      age_years: params[4],
      age_months: params[5] || 0,
      age_days: params[6] || 0,
      gender: params[7],
      phone: params[8],
      email: params[9],
      address: params[10],
      created_by: params[11],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fallbackStore.patients.unshift(patient);
    return { rows: [patient], rowCount: 1 };
  }
  if (sql.includes('FROM patients WHERE id = $1')) {
    const patient = fallbackStore.patients.find((p) => p.id === params[0]);
    return { rows: patient ? [patient] : [], rowCount: patient ? 1 : 0 };
  }
  if (sql.includes('FROM patients WHERE uhid = $1') || sql.includes('WHERE uhid = $1')) {
    const patient = fallbackStore.patients.find((p) => p.uhid === params[0]);
    return { rows: patient ? [patient] : [], rowCount: patient ? 1 : 0 };
  }
  if (sql.includes('SELECT COUNT(*) as total FROM patients')) {
    return { rows: [{ total: fallbackStore.patients.length }], rowCount: 1 };
  }
  if (sql.includes('FROM patients')) {
    let list = [...fallbackStore.patients];
    if (params[0] && typeof params[0] === 'string' && params[0].startsWith('%')) {
      const q = params[0].replaceAll('%', '').toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.uhid?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      );
    }
    return { rows: list, rowCount: list.length };
  }

  // 3. Visit queries
  if (sql.startsWith('INSERT INTO visits')) {
    const visit = {
      id: params[0] || uuidv4(),
      patient_id: params[1],
      visit_code: params[2],
      ref_doctor: params[3],
      client_name: params[4],
      client_code: params[5],
      rch_id_mcts_id: params[6],
      sample_type: params[7],
      collected_at: params[8] || new Date().toISOString(),
      status: params[9] || 'registered',
      created_by: params[10],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fallbackStore.visits.unshift(visit);
    return { rows: [visit], rowCount: 1 };
  }
  if (sql.includes('WHERE v.id = $1') || sql.includes('FROM visits WHERE id = $1')) {
    const visit = fallbackStore.visits.find((v) => v.id === params[0]);
    if (visit) {
      const patient = fallbackStore.patients.find((p) => p.id === visit.patient_id) || {};
      return {
        rows: [
          {
            ...visit,
            patient_name: patient.full_name || '',
            patient_title: patient.title || '',
            patient_uhid: patient.uhid || '',
            full_name: patient.full_name || '',
            title: patient.title || '',
            uhid: patient.uhid || '',
            age_years: patient.age_years || 0,
            age_months: patient.age_months || 0,
            age_days: patient.age_days || 0,
            gender: patient.gender || 'M',
            phone: patient.phone || '',
          },
        ],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('FROM visits')) {
    const list = fallbackStore.visits.map((v) => {
      const patient = fallbackStore.patients.find((p) => p.id === v.patient_id) || {};
      const report = fallbackStore.reports.find((r) => r.visit_id === v.id) || {};
      return {
        ...v,
        patient_name: patient.full_name || '',
        patient_title: patient.title || '',
        patient_uhid: patient.uhid || '',
        patient_gender: patient.gender || 'M',
        report_id: report.id || null,
        report_code: report.report_code || null,
        barcode_value: report.barcode_value || null,
        report_status: report.status || null,
        qr_token: report.qr_token || null,
        doctor_approval_status: report.doctor_approval_status || null,
        approved_by_doctor_name: report.approved_by_doctor_name || null,
        approved_at: report.approved_at || null,
        approval_note: report.approval_note || null,
        printed_at: report.printed_at || null,
      };
    });
    return { rows: list, rowCount: list.length };
  }
  if (sql.startsWith('UPDATE visits SET status =')) {
    const visit = fallbackStore.visits.find((v) => v.id === params[0]);
    if (visit) visit.status = 'completed';
    return { rows: visit ? [visit] : [], rowCount: visit ? 1 : 0 };
  }

  // 4. Test Results queries
  if (sql.startsWith('INSERT INTO test_results')) {
    const testResult = {
      id: params[0] || uuidv4(),
      visit_id: params[1],
      department: params[2],
      test_name: params[3],
      result_value: params[4],
      unit: params[5],
      reference_range: params[6],
      method: params[7],
      flag: params[8],
      display_order: params[9] || 0,
      created_by: params[10],
      created_at: new Date().toISOString(),
    };
    fallbackStore.test_results.push(testResult);
    return { rows: [testResult], rowCount: 1 };
  }
  if (sql.startsWith('UPDATE test_results')) {
    if (sql.includes("status = 'cancelled'")) {
      if (sql.includes('WHERE visit_id = $3')) {
        const tests = fallbackStore.test_results.filter((t) => t.visit_id === params[2]);
        tests.forEach((t) => {
          t.status = 'cancelled';
          t.cancellation_reason = params[0];
          t.cancelled_at = new Date().toISOString();
          t.cancelled_by = params[1];
        });
        return { rows: tests, rowCount: tests.length };
      }
      const test = fallbackStore.test_results.find((t) => t.id === params[2]);
      if (test) {
        test.status = 'cancelled';
        test.cancellation_reason = params[0];
        test.cancelled_at = new Date().toISOString();
        test.cancelled_by = params[1];
        return { rows: [test], rowCount: 1 };
      }
    }
  }
  if (sql.includes('FROM test_results') && sql.includes('visit_id = $1')) {
    let tests = fallbackStore.test_results.filter((t) => t.visit_id === params[0]);
    if (sql.includes("status != 'cancelled'")) {
      tests = tests.filter((t) => t.status !== 'cancelled');
    }
    return { rows: tests, rowCount: tests.length };
  }

  // 5. Reports queries
  if (sql.startsWith('UPDATE reports')) {
    const report = fallbackStore.reports.find((r) => r.id === params[params.length - 1] || r.report_code === params[params.length - 1]);
    if (report) {
      if (sql.includes('printed_at = NOW()')) {
        report.printed_at = new Date().toISOString();
      }
      if (sql.includes("status = 'cancelled'")) {
        report.status = 'cancelled';
        report.cancellation_reason = params[0];
        report.cancelled_at = new Date().toISOString();
        report.cancelled_by = params[1];
      }
      return { rows: [report], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.startsWith('INSERT INTO reports')) {
    const report = {
      id: params[0] || uuidv4(),
      visit_id: params[1],
      report_code: params[2],
      barcode_value: params[3],
      qr_token: params[4],
      status: params[5] || 'final',
      sync_status: 'synced',
      client_device_id: params[7],
      interpretation: params[8],
      pdf_storage_path: params[9],
      reported_at: params[10] || new Date().toISOString(),
      created_by: params[11],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fallbackStore.reports.unshift(report);
    return { rows: [report], rowCount: 1 };
  }
  if (sql.includes('FROM reports') && sql.includes('visit_id = $1')) {
    const report = fallbackStore.reports.find((r) => r.visit_id === params[0]);
    return { rows: report ? [report] : [], rowCount: report ? 1 : 0 };
  }
  if (sql.includes('FROM reports WHERE id = $1 OR report_code = $1') || sql.includes('FROM reports WHERE id = $1')) {
    const report = fallbackStore.reports.find((r) => r.id === params[0] || r.report_code === params[0]);
    return { rows: report ? [report] : [], rowCount: report ? 1 : 0 };
  }
  if (sql.includes('FROM reports r') && sql.includes('qr_token = $1')) {
    const report = fallbackStore.reports.find((r) => r.qr_token === params[0]);
    return { rows: report ? [report] : [], rowCount: report ? 1 : 0 };
  }
  if (sql.includes('FROM reports')) {
    const list = fallbackStore.reports.map((r) => {
      const visit = fallbackStore.visits.find((v) => v.id === r.visit_id) || {};
      const patient = fallbackStore.patients.find((p) => p.id === visit.patient_id) || {};
      return {
        ...r,
        visit_code: visit.visit_code || '',
        collected_at: visit.collected_at || '',
        patient_name: patient.full_name || '',
        patient_title: patient.title || '',
        patient_uhid: patient.uhid || '',
        sample_type: visit.sample_type || 'Specimen',
      };
    });
    return { rows: list, rowCount: list.length };
  }

  // 6. Audit logs queries
  if (sql.startsWith('INSERT INTO audit_logs')) {
    let parsedDetails = params[5];
    if (typeof parsedDetails === 'string') {
      try {
        parsedDetails = JSON.parse(parsedDetails);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    const log = {
      id: uuidv4(),
      user_id: params[0],
      client_device_id: params[1],
      action: params[2],
      entity_type: params[3],
      entity_id: params[4],
      details: parsedDetails,
      ip_address: params[6],
      user_agent: params[7] || null,
      created_at: new Date().toISOString(),
    };
    fallbackStore.audit_logs.unshift(log);
    return { rows: [log], rowCount: 1 };
  }

  if (sql.includes('FROM audit_logs')) {
    let list = fallbackStore.audit_logs.map((log) => {
      const u = fallbackStore.users.find((user) => user.id === log.user_id) || {};
      return {
        ...log,
        user_full_name: u.full_name || null,
        username: u.username || null,
        user_role: u.role || null,
      };
    });

    return { rows: list, rowCount: list.length };
  }

  // Default empty result
  return { rows: [], rowCount: 0 };
}

/**
 * Execute a parameterized query against PostgreSQL, with automatic offline fallback
 */
const query = async (text, params = []) => {
  if (!pool || postgresAvailable === false) {
    return handleFallbackQuery(text, params);
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    postgresAvailable = true;
    return res;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('ENOTFOUND')) {
      if (postgresAvailable !== false) {
        console.warn('⚠️  PostgreSQL is not reachable. Running in OFFLINE / DEMO STORAGE MODE.');
        postgresAvailable = false;
        fallbackStore.isOfflineMode = true;
      }
      return handleFallbackQuery(text, params);
    }
    console.error('Database query error:', { query: text, error: err.message });
    throw err;
  }
};

/**
 * Helper for running queries inside a transaction
 */
const withTransaction = async (callback) => {
  if (!pool || postgresAvailable === false) {
    const mockClient = {
      query: async (text, params) => handleFallbackQuery(text, params),
    };
    return callback(mockClient);
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('ENOTFOUND')) {
      postgresAvailable = false;
      fallbackStore.isOfflineMode = true;
      const mockClient = {
        query: async (text, params) => handleFallbackQuery(text, params),
      };
      return callback(mockClient);
    }
    throw err;
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Test connectivity
 */
const testConnection = async () => {
  const connUrl = process.env.DATABASE_URL || config.db.connectionString;
  if (!connUrl || !pool) {
    console.log('ℹ️  DATABASE_URL not set. Running in OFFLINE / DEMO STORAGE MODE (fallbackStore).');
    postgresAvailable = false;
    fallbackStore.isOfflineMode = true;
    return false;
  }

  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`✓ Connected to Cloud PostgreSQL DB "${res.rows[0].db_name}" at ${res.rows[0].current_time}`);
    postgresAvailable = true;
    fallbackStore.isOfflineMode = false;
    return true;
  } catch (err) {
    console.warn(`⚠️  Could not connect to PostgreSQL DB: ${err.message}. Falling back to OFFLINE / DEMO STORAGE MODE.`);
    postgresAvailable = false;
    fallbackStore.isOfflineMode = true;
    return false;
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection,
};
