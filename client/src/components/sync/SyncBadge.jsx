import React, { useState, useEffect } from 'react';
import { subscribeSyncStatus, syncPendingReports } from '../../services/syncWorker';
import { getQueuedReports } from '../../services/storage';
import { Cloud, CloudCheck, CloudOff, RefreshCw, X, FileText, Printer } from 'lucide-react';

export default function SyncBadge() {
  const [stats, setStats] = useState({ total: 0, synced: 0, unsynced: 0, failed: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queuedReports, setQueuedReports] = useState([]);
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStats) => {
      setStats(newStats);
    });
    return unsubscribe;
  }, []);

  const openDrawer = async () => {
    const reports = await getQueuedReports();
    setQueuedReports(reports);
    setDrawerOpen(true);
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    await syncPendingReports();
    const reports = await getQueuedReports();
    setQueuedReports(reports);
    setSyncingNow(false);
  };

  // Status color logic
  let badgeColor = 'bg-emerald-950/80 border-emerald-800 text-emerald-300';
  let Icon = CloudCheck;
  let label = 'All Synced';

  if (!navigator.onLine) {
    badgeColor = 'bg-amber-950/80 border-amber-800 text-amber-300';
    Icon = CloudOff;
    label = 'Offline Mode';
  } else if (stats.failed > 0) {
    badgeColor = 'bg-rose-950/80 border-rose-800 text-rose-300';
    Icon = CloudOff;
    label = `${stats.failed} Sync Failed`;
  } else if (stats.unsynced > 0) {
    badgeColor = 'bg-amber-950/80 border-amber-800 text-amber-300';
    Icon = Cloud;
    label = `${stats.unsynced} Queued`;
  }

  return (
    <>
      {/* Clickable Badge */}
      <button
        type="button"
        onClick={openDrawer}
        title="Open Local Sync Queue Drawer"
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer shadow-sm ${badgeColor}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </button>

      {/* Slide-out Queue Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    Local Storage & Sync Queue
                  </h3>
                  <p className="text-[11px] text-slate-400">IndexedDB Local Persistence Engine</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 my-4 text-center">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs font-bold text-white">{stats.total}</div>
                  <div className="text-[10px] text-slate-400">Total Local</div>
                </div>
                <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                  <div className="text-xs font-bold text-emerald-300">{stats.synced}</div>
                  <div className="text-[10px] text-emerald-400/80">Cloud Synced</div>
                </div>
                <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg">
                  <div className="text-xs font-bold text-amber-300">
                    {stats.unsynced + stats.failed}
                  </div>
                  <div className="text-[10px] text-amber-400/80">Queued / Retry</div>
                </div>
              </div>

              {/* Action Button: Manual Sync */}
              <button
                type="button"
                disabled={syncingNow || !navigator.onLine}
                onClick={handleManualSync}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition mb-4"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                {syncingNow ? 'Syncing to Cloud VPS...' : 'Force Sync Now'}
              </button>

              {/* Queued Reports List */}
              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {queuedReports.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No reports queued in local storage.
                  </div>
                ) : (
                  queuedReports.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {r.patient?.title} {r.patient?.full_name || 'Unnamed'}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                            r.sync_status === 'synced'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : r.sync_status === 'failed'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {r.sync_status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                        <span>{r.report_code || 'Report'}</span>
                        <span>{r.barcode_value}</span>
                      </div>

                      {r.last_sync_error && (
                        <div className="text-[10px] text-rose-400 italic">
                          Error: {r.last_sync_error}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 flex items-center justify-between">
                        <span>
                          {r.printed_at ? '🖨️ Printed' : '⏳ Pending Print'}
                        </span>
                        <span>
                          {new Date(r.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-[10px] text-slate-500 text-center pt-3 border-t border-slate-800">
              Offline-First: All reports persist in browser IndexedDB even if network drops.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
