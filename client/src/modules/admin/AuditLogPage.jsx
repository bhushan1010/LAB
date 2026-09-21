import React, { useState, useEffect } from 'react';
import api from '@core/api';
import {
  ShieldAlert,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  QrCode,
  LogIn,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState('');
  const [reportCode, setReportCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (search) params.append('search', search);
      if (actor) params.append('actor', actor);
      if (reportCode) params.append('reportCode', reportCode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '100');

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.audit_logs || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const handleClearFilters = () => {
    setActionFilter('');
    setSearch('');
    setActor('');
    setReportCode('');
    setStartDate('');
    setEndDate('');
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionBadge = (action) => {
    if (!action) return null;

    if (action.includes('FORBIDDEN')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-rose-950/90 text-rose-300 border-rose-700">
          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> {action}
        </span>
      );
    }
    if (action.includes('FAILED')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-rose-950 text-rose-300 border-rose-800">
          <XCircle className="w-2.5 h-2.5 text-rose-400" /> {action}
        </span>
      );
    }
    if (action === 'LOGIN_SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-emerald-950 text-emerald-300 border-emerald-800">
          <LogIn className="w-2.5 h-2.5 text-emerald-400" /> {action}
        </span>
      );
    }
    if (action.includes('GENERATE_REPORT')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-emerald-950 text-emerald-300 border-emerald-800">
          <FileText className="w-2.5 h-2.5 text-emerald-400" /> {action}
        </span>
      );
    }
    if (action.includes('PRINT')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-sky-950 text-sky-300 border-sky-800">
          <Printer className="w-2.5 h-2.5 text-sky-400" /> {action}
        </span>
      );
    }
    if (action.includes('QR')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-indigo-950 text-indigo-300 border-indigo-800">
          <QrCode className="w-2.5 h-2.5 text-indigo-400" /> {action}
        </span>
      );
    }
    if (action.includes('USER')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-purple-950 text-purple-300 border-purple-800">
          <UserCheck className="w-2.5 h-2.5 text-purple-400" /> {action}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border bg-slate-800 text-slate-300 border-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2 font-sans">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            System Audit Trail & Compliance Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of user logins, authorization events, patient records, report generation, printing, sync, and public QR views
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#334155] transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl space-y-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Action Filter */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Event Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Events</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILED">Login Failed</option>
              <option value="AUTH_FORBIDDEN">Unauthorized (403)</option>
              <option value="CREATE_PATIENT">Patient Created</option>
              <option value="UPDATE_PATIENT">Patient Updated</option>
              <option value="CREATE_VISIT">Visit Created</option>
              <option value="UPDATE_VISIT">Visit Updated</option>
              <option value="CREATE_TEST_RESULT">Test Result Entered</option>
              <option value="UPDATE_TEST_RESULT">Test Result Edited</option>
              <option value="GENERATE_REPORT">Report Generated</option>
              <option value="PRINT_REPORT">Report Printed</option>
              <option value="SYNC_PUSH">Sync Completed</option>
              <option value="SYNC_FAILED">Sync Failed</option>
              <option value="PUBLIC_QR_VIEW">Public QR Verification</option>
              <option value="CREATE_USER">Staff Account Created</option>
              <option value="UPDATE_USER_ROLE">Staff Role Changed</option>
              <option value="UPDATE_USER_STATUS">Staff Status Changed</option>
            </select>
          </div>

          {/* Actor / User Filter */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Actor / User</label>
            <input
              type="text"
              placeholder="e.g. admin, labtech1"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Report Code Filter */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Report / Visit Code</label>
            <input
              type="text"
              placeholder="e.g. REP-154931, DEMO000001"
              value={reportCode}
              onChange={(e) => setReportCode(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Date Range Start */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-300 text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Date Range End */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-300 text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Search Button & Clear */}
          <div className="col-span-1 flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Filter
            </button>
            <button
              type="button"
              onClick={() => {
                handleClearFilters();
                setTimeout(() => loadLogs(), 0);
              }}
              className="px-2.5 py-2 bg-[#0f172a] hover:bg-[#334155] text-slate-300 rounded-lg font-medium border border-[#334155] transition cursor-pointer"
              title="Clear filters"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Global Keyword Search */}
        <div className="pt-2.5 border-t border-[#334155] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search all metadata (IP, user agent, changes, reason, payload)... Press Enter to search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTimeout(() => loadLogs(), 0);
              }}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 border-b border-[#334155] uppercase tracking-wider text-[10px] font-mono font-bold">
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-3">Device / IP</th>
                <th className="py-3 px-3">Target Entity</th>
                <th className="py-3 px-4">Quick Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleRow(log.id)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition ${
                          isExpanded ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td className="py-3 px-3 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          {log.user_full_name || log.username ? (
                            <div>
                              <div className="font-semibold text-slate-200">
                                {log.user_full_name || log.username}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{log.username} ({log.user_role})
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unauthenticated / Public</span>
                          )}
                        </td>

                        {/* Device / IP */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          <div>{log.client_device_id || 'LAN/WAN'}</div>
                          <div className="text-[10px] text-slate-500">{log.ip_address || '—'}</div>
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                          <span className="text-slate-400 uppercase text-[10px] font-bold">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-slate-500 ml-1 text-[10px]">
                              ({String(log.entity_id).length > 12 ? `${String(log.entity_id).slice(0, 10)}...` : log.entity_id})
                            </span>
                          )}
                        </td>

                        {/* Quick Summary */}
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-sm truncate">
                          {detailsStr.length > 60 ? `${detailsStr.slice(0, 60)}...` : detailsStr || '—'}
                        </td>
                      </tr>

                      {/* Expandable Metadata Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan="7" className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                Audit Event Detail #{log.id}
                              </span>
                              {log.user_agent && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  User-Agent: {log.user_agent}
                                </span>
                              )}
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                              <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(
                                  {
                                    id: log.id,
                                    action: log.action,
                                    timestamp: log.created_at,
                                    actor: {
                                      id: log.user_id,
                                      name: log.user_full_name,
                                      username: log.username,
                                      role: log.user_role,
                                    },
                                    network: {
                                      ip_address: log.ip_address,
                                      client_device_id: log.client_device_id,
                                      user_agent: log.user_agent,
                                    },
                                    entity: {
                                      type: log.entity_type,
                                      id: log.entity_id,
                                    },
                                    metadata: log.details,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
