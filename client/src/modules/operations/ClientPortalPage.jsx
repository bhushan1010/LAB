import React, { useState, useEffect } from 'react';
import api from '@core/api';
import {
  Building2,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  Hourglass,
  FlaskConical,
  ShieldCheck,
  Filter,
  XCircle,
} from 'lucide-react';

export default function ClientPortalPage() {
  const [samples, setSamples] = useState([]);
  const [summary, setSummary] = useState({ today: 0, this_week: 0, this_month: 0, total: 0 });
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSamples = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports?client_tracking=true');
      if (res.data?.success) {
        setSamples(res.data.samples || []);
        setSummary(res.data.summary || { today: 0, this_week: 0, this_month: 0, total: 0 });
        setClinicName(res.data.clinic_name || 'Referring Clinic');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sample tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, []);

  const filteredSamples = samples.filter((s) => {
    const matchesStatus = !statusFilter || s.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      s.visit_code.toLowerCase().includes(q) ||
      (s.client_code && s.client_code.toLowerCase().includes(q)) ||
      (s.patient?.masked_name && s.patient.masked_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800 mb-1 font-mono">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Referring Clinic Partner Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight font-sans">
            {clinicName || 'Clinic Sample Tracking'}
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Live sample progression board • Privacy-protected view (clinical results and billing restricted)
          </p>
        </div>

        <button
          onClick={loadSamples}
          disabled={loading}
          className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Samples Today</div>
          <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{summary.today}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" /> Since midnight
          </div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400">This Week</div>
          <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{summary.this_week}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-400" /> Last 7 days
          </div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400">This Month</div>
          <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{summary.this_month}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-400" /> Current calendar month
          </div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Referrals</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{summary.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All-time sent samples</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1e293b] border border-[#334155] p-3.5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by visit code, TRF ref, or masked initials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-300 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0f172a] border border-[#334155] text-xs text-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Statuses ({samples.length})</option>
            <option value="Received">Received</option>
            <option value="In Testing">In Testing</option>
            <option value="Report Ready">Report Ready</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-[#0f172a] text-slate-400 border-b border-[#334155] uppercase tracking-wider text-[10px] font-mono font-bold">
              <th className="py-3 px-4">Visit / Sample Code</th>
              <th className="py-3 px-4">Clinic TRF Ref</th>
              <th className="py-3 px-4">Patient (Privacy Masked)</th>
              <th className="py-3 px-4">Sample Specimen</th>
              <th className="py-3 px-4">Collection Date</th>
              <th className="py-3 px-4 text-center">Processing Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60 font-mono">
            {filteredSamples.map((s) => (
              <tr key={s.visit_code} className="hover:bg-[#131b2e]/60 transition">
                <td className="py-3 px-4 font-bold text-slate-100 tracking-wider font-mono">
                  {s.visit_code}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {s.client_code || <span className="text-slate-600">—</span>}
                </td>
                <td className="py-3 px-4 font-sans">
                  <div className="font-semibold text-slate-200">{s.patient?.masked_name}</div>
                  <div className="text-[10px] text-slate-400">
                    {s.patient?.age} • {s.patient?.gender}
                  </div>
                </td>
                <td className="py-3 px-4 font-sans text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                    {s.sample_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                  {s.collected_at || '—'}
                </td>
                <td className="py-3 px-4 text-center font-sans">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        s.status === 'Cancelled'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : s.status === 'Report Ready'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : s.status === 'In Testing'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}
                    >
                      {s.status === 'Cancelled' ? (
                        <XCircle className="w-3 h-3 text-rose-400" />
                      ) : s.status === 'Report Ready' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Hourglass className="w-3 h-3" />
                      )}
                      {s.status}
                    </span>
                    {s.status === 'Cancelled' && s.client_facing_reason && (
                      <span className="text-[10px] text-rose-400/90 font-mono tracking-tight max-w-[200px] truncate" title={s.client_facing_reason}>
                        {s.client_facing_reason}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSamples.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-sans">
                  No sample records match your search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
