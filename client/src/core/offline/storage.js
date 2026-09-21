/**
 * IndexedDB Local-First Persistence Service for Lab Reports
 * Stores full report documents, metadata, and compiled PDF blobs offline.
 */

const DB_NAME = 'LabReportLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'reports_queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('report_code', 'report_code', { unique: false });
        store.createIndex('barcode_value', 'barcode_value', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReportLocal(report) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      ...report,
      sync_status: report.sync_status || 'unsynced',
      sync_attempts: report.sync_attempts || 0,
      last_sync_error: report.last_sync_error || null,
      created_at: report.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

// Helper to identify and purge stale legacy records created before the synthetic ID fix
function isStaleLegacyRecord(r) {
  if (!r) return false;
  const uhid = (r.patient?.uhid || r.patient_uhid || '').toUpperCase();
  const barcode = (r.barcode_value || '').toUpperCase();
  const visitCode = (r.visit?.visit_code || r.visit_code || '').toUpperCase();
  const reportCode = (r.report_code || '').toUpperCase();

  // Check against old real-data pattern fragments
  const patientName = (r.patient?.full_name || r.patient_name || '').toUpperCase();
  if (patientName.includes('POP SINGH')) return true;
  if (barcode.startsWith('F1246364') || barcode.includes('12463644')) return true;
  if (/26206[4-8]/.test(visitCode) || /26206[4-8]/.test(uhid) || /26206[4-8]/.test(reportCode)) return true;
  if (uhid.startsWith('AIND.0000262053') || uhid.startsWith('AIND.')) return true;
  if (reportCode === 'REP-022868' || reportCode === 'REP-022068') return true;

  return false;
}

export async function getQueuedReports() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      const clean = [];
      for (const r of all) {
        if (isStaleLegacyRecord(r)) {
          // Purge stale record from IndexedDB permanently
          store.delete(r.id);
        } else {
          clean.push(r);
        }
      }
      // Sort newest first
      clean.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      resolve(clean);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getReportById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getReportByBarcode(barcode) {
  const reports = await getQueuedReports();
  const cleanBarcode = barcode.trim().toUpperCase();
  return (
    reports.find(
      (r) =>
        r.barcode_value?.toUpperCase() === cleanBarcode ||
        r.visit?.visit_code?.toUpperCase() === cleanBarcode ||
        r.patient?.uhid?.toUpperCase() === cleanBarcode
    ) || null
  );
}

export async function updateReportSyncStatus(id, sync_status, last_error = null) {
  const report = await getReportById(id);
  if (!report) return null;

  report.sync_status = sync_status;
  report.last_sync_error = last_error;
  if (sync_status === 'synced') {
    report.synced_at = new Date().toISOString();
  } else if (sync_status === 'failed') {
    report.sync_attempts = (report.sync_attempts || 0) + 1;
  }

  return saveReportLocal(report);
}

export async function markReportPrintedLocal(id) {
  const report = await getReportById(id);
  if (!report) return null;

  report.printed_at = new Date().toISOString();
  return saveReportLocal(report);
}

export async function deleteReportLocal(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncStats() {
  const reports = await getQueuedReports();
  return {
    total: reports.length,
    synced: reports.filter((r) => r.sync_status === 'synced').length,
    unsynced: reports.filter((r) => r.sync_status === 'unsynced' || r.sync_status === 'syncing')
      .length,
    failed: reports.filter((r) => r.sync_status === 'failed').length,
  };
}
