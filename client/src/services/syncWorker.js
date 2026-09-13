import api from '../api/client';
import { getQueuedReports, updateReportSyncStatus, getSyncStats } from './storage';

let isSyncing = false;
const listeners = new Set();

export function subscribeSyncStatus(callback) {
  listeners.add(callback);
  // Initial broadcast
  getSyncStats().then(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  getSyncStats().then((stats) => {
    listeners.forEach((cb) => {
      try {
        cb(stats);
      } catch (err) {
        console.warn('Sync listener error:', err);
      }
    });
  });
}

/**
 * Perform a push sync of all unsynced or failed reports in IndexedDB
 */
export async function syncPendingReports() {
  if (isSyncing) return;
  if (!navigator.onLine) {
    notifyListeners();
    return;
  }

  const reports = await getQueuedReports();
  const pending = reports.filter(
    (r) => r.sync_status === 'unsynced' || r.sync_status === 'failed'
  );

  if (pending.length === 0) {
    notifyListeners();
    return;
  }

  isSyncing = true;
  notifyListeners();

  const deviceId = localStorage.getItem('lab_device_id') || 'LAN-PC-01';

  // Mark pending as 'syncing'
  for (const r of pending) {
    await updateReportSyncStatus(r.id, 'syncing');
  }
  notifyListeners();

  try {
    // Build batch payload matching Phase 1 /api/sync/push format
    const batchPayload = {
      client_device_id: deviceId,
      patients: pending.map((r) => r.patient).filter(Boolean),
      visits: pending.map((r) => r.visit).filter(Boolean),
      test_results: pending.flatMap((r) => r.testResults || []),
      reports: pending.map((r) => ({
        id: r.id,
        visit_id: r.visit?.id,
        report_code: r.report_code,
        barcode_value: r.barcode_value,
        qr_token: r.qr_token,
        status: r.visit?.status || 'final',
        interpretation: r.interpretation ? JSON.stringify(r.interpretation) : null,
        printed_at: r.printed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };

    const res = await api.post('/sync/push', batchPayload);

    if (res.data.success) {
      for (const r of pending) {
        await updateReportSyncStatus(r.id, 'synced');
      }
    }
  } catch (err) {
    console.warn('Cloud sync push failed (will retry with backoff):', err.message);
    for (const r of pending) {
      await updateReportSyncStatus(
        r.id,
        'failed',
        err.response?.data?.error || err.message || 'Network timeout'
      );
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

/**
 * Initialize background sync service
 */
export function startBackgroundSync(intervalMs = 30000) {
  // 1. Sync on network reconnection
  window.addEventListener('online', () => {
    console.log('Network online: triggering automatic cloud sync...');
    syncPendingReports();
  });

  window.addEventListener('offline', () => {
    console.log('Network offline: reports will queue locally in IndexedDB.');
    notifyListeners();
  });

  // 2. Periodic heartbeat sync (every 30 seconds)
  const timer = setInterval(() => {
    syncPendingReports();
  }, intervalMs);

  // Initial trigger
  syncPendingReports();

  return () => clearInterval(timer);
}
