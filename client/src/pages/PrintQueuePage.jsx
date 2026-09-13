import React, { useState, useEffect } from 'react';
import { getQueuedReports, markReportPrintedLocal, updateReportSyncStatus } from '../services/storage';
import { syncPendingReports } from '../services/syncWorker';
import { DEMO_PRESETS, DEFAULT_REPORT_DATA } from '../data/presets';
import { generatePdfBlob, downloadPdfBlob, downloadPdfFromElement } from '../services/pdfGenerator';
import ReportPreview from '../components/preview/ReportPreview';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Printer,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  X,
  Eye,
  Loader2,
  Ban,
  AlertOctagon,
  XCircle,
} from 'lucide-react';

export default function PrintQueuePage({ onEditReport }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [previewModalReport, setPreviewModalReport] = useState(null);
  const [modalDownloading, setModalDownloading] = useState(false);

  // Phase 8: Cancellation state
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelModalReport, setCancelModalReport] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Close preview modal on Escape key or after print dialog closes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewModalReport) {
        setPreviewModalReport(null);
      }
    };
    const handleAfterPrint = () => {
      setPreviewModalReport(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [previewModalReport]);

  // Helper to ensure every report has full properties, lab branding, and clinical fields
  const ensureFullReport = (r) => {
    if (!r) return DEFAULT_REPORT_DATA;

    const matchedPreset = DEMO_PRESETS.find(
      (d) =>
        d.preset.barcode_value === r.barcode_value ||
        d.preset.qr_token === r.qr_token ||
        (d.preset.patient?.uhid && d.preset.patient.uhid.toLowerCase() === (r.patient?.uhid || r.patient_uhid || '').toLowerCase()) ||
        (d.preset.patient?.full_name && d.preset.patient.full_name.toLowerCase() === (r.patient?.full_name || r.patient_name || '').toLowerCase())
    )?.preset;

    let parsedInterpretation = r.interpretation;
    if (typeof parsedInterpretation === 'string') {
      try {
        parsedInterpretation = JSON.parse(parsedInterpretation);
      } catch {
        parsedInterpretation = null;
      }
    }

    return {
      labConfig: r.labConfig || matchedPreset?.labConfig || DEFAULT_REPORT_DATA.labConfig,
      patient: {
        id: r.patient?.id || r.patient_id || matchedPreset?.patient?.id || '',
        title: r.patient?.title || matchedPreset?.patient?.title || 'Mr.',
        full_name: r.patient?.full_name || r.patient_name || matchedPreset?.patient?.full_name || 'Patient',
        uhid: r.patient?.uhid || r.patient_uhid || matchedPreset?.patient?.uhid || '',
        age_years: r.patient?.age_years ?? matchedPreset?.patient?.age_years ?? '',
        age_months: r.patient?.age_months ?? matchedPreset?.patient?.age_months ?? 0,
        age_days: r.patient?.age_days ?? matchedPreset?.patient?.age_days ?? 0,
        gender: r.patient?.gender || matchedPreset?.patient?.gender || 'M',
        phone: r.patient?.phone || matchedPreset?.patient?.phone || '',
      },
      visit: {
        id: r.visit?.id || r.visit_id || matchedPreset?.visit?.id || '',
        visit_code: r.visit?.visit_code || r.visit_code || matchedPreset?.visit?.visit_code || '',
        ref_doctor: r.visit?.ref_doctor || matchedPreset?.visit?.ref_doctor || 'Dr. SAMPLE REFERRER',
        client_name: r.visit?.client_name || matchedPreset?.visit?.client_name || 'SAMPLE CLINIC',
        client_code: r.visit?.client_code || matchedPreset?.visit?.client_code || '0001',
        rch_id_mcts_id: r.visit?.rch_id_mcts_id || matchedPreset?.visit?.rch_id_mcts_id || '',
        sample_type: r.visit?.sample_type || r.sample_type || matchedPreset?.visit?.sample_type || 'SERUM',
        collected_at: r.visit?.collected_at || r.collected_at || matchedPreset?.visit?.collected_at || new Date().toLocaleString('en-IN'),
        reported_at: r.visit?.reported_at || r.reported_at || matchedPreset?.visit?.reported_at || new Date().toLocaleString('en-IN'),
        status: r.visit?.status || matchedPreset?.visit?.status || 'Final Report',
      },
      department: r.department || matchedPreset?.department || 'DEPARTMENT OF BIOCHEMISTRY',
      testResults: Array.isArray(r.testResults) && r.testResults.length > 0
        ? r.testResults
        : (matchedPreset?.testResults || DEFAULT_REPORT_DATA.testResults),
      interpretation: parsedInterpretation || matchedPreset?.interpretation || DEFAULT_REPORT_DATA.interpretation,
      signatory: r.signatory || matchedPreset?.signatory || DEFAULT_REPORT_DATA.signatory,
      id: r.id,
      report_code: r.report_code || 'REP-' + Date.now().toString().slice(-6),
      barcode_value: r.barcode_value || matchedPreset?.barcode_value || 'F00000001',
      qr_token: r.qr_token || matchedPreset?.qr_token || '',
      sync_status: r.sync_status || 'synced',
      status: r.status || 'final',
      cancellation_reason: r.cancellation_reason || null,
      cancelled_at: r.cancelled_at || null,
      cancelled_by: r.cancelled_by || null,
      printed_at: r.printed_at || null,
      created_by: r.created_by || null,
      creator_name: r.creator_name || r.creator_username || null,
      client_device_id: r.client_device_id || null,
      created_at: r.created_at || new Date().toISOString(),
      pdfBlob: r.pdfBlob || null,
    };
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      // 1. Load local reports first (works offline!)
      const localList = await getQueuedReports();
      let normalizedLocal = localList.map(ensureFullReport);
      if (!showCancelled) {
        normalizedLocal = normalizedLocal.filter((r) => r.status !== 'cancelled');
      }
      setReports(normalizedLocal);

      // 2. If online, also merge with server reports
      if (navigator.onLine) {
        try {
          const queryParam = showCancelled ? '?limit=50&show_cancelled=true' : '?limit=50';
          const res = await api.get(`/reports${queryParam}`);
          if (res.data.success && res.data.reports) {
            const serverMap = new Map(res.data.reports.map((r) => [r.id, r]));
            let merged = normalizedLocal.map((local) => {
              const sRep = serverMap.get(local.id);
              return sRep ? ensureFullReport({ ...local, ...sRep }) : local;
            });
            for (const sRep of res.data.reports) {
              if (!merged.some((m) => m.id === sRep.id)) {
                merged.push(ensureFullReport(sRep));
              }
            }
            if (!showCancelled) {
              merged = merged.filter((r) => r.status !== 'cancelled');
            }
            setReports(merged);
          }
        } catch (serverErr) {
          console.warn('Server reports fetch error:', serverErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [showCancelled]);

  // Isolated print utility: prints a DOM node using a detached hidden iframe
  const printElementInIframe = (element) => {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        resolve();
        return;
      }

      // Gather existing stylesheets & style tags to ensure 1:1 Tailwind & fonts
      let styleTagsHtml = '';
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((tag) => {
        styleTagsHtml += tag.outerHTML;
      });

      // Write isolated HTML document into iframe
      iframeDoc.open();
      iframeDoc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lab Report</title>
  ${styleTagsHtml}
  <style>
    @page { size: A4 portrait; margin: 0mm !important; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #printable-report {
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
    }
  </style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>`);
      iframeDoc.close();

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        setPreviewModalReport(null);
        try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        } catch {
          // Ignore
        }
        resolve();
      };

      // Listen for print completion or cancellation on the iframe window
      iframe.contentWindow?.addEventListener('afterprint', cleanup);

      // Wait 350ms for styles, fonts, and images to settle before triggering print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print():', err);
          window.print();
        }

        // Fallback cleanup timer in case afterprint does not fire in some browsers
        setTimeout(cleanup, 2000);
      }, 350);
    });
  };

  const handlePrintReport = async (report) => {
    const full = ensureFullReport(report);
    // 1. Mark local print timestamp
    await markReportPrintedLocal(full.id);

    // 2. If online, notify backend API
    if (navigator.onLine && full.id) {
      api.post(`/reports/${full.id}/print`).catch(() => {});
    }

    // 3. Mount report into preview state so #printable-report is rendered
    setPreviewModalReport(full);
    setActionMessage(`Printing Report #${full.report_code}...`);

    // 4. Trigger print via isolated hidden iframe once rendered
    setTimeout(async () => {
      const printable = document.getElementById('printable-report');
      if (printable) {
        await printElementInIframe(printable);
      } else {
        window.print();
      }
    }, 300);

    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleForceSync = async (reportId) => {
    setActionMessage('Syncing report to server...');
    await syncPendingReports();
    await loadReports();
    setActionMessage('Sync completed.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleDownloadAnyReport = async (rep) => {
    const full = ensureFullReport(rep);
    if (full.pdfBlob) {
      downloadPdfBlob(
        full.pdfBlob,
        `Report-${full.patient?.full_name?.replace(/\s+/g, '_') || 'Lab'}.pdf`
      );
      setActionMessage('PDF downloaded successfully.');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }

    setPreviewModalReport(full);
    setModalDownloading(true);
    setActionMessage('Compiling high-resolution A4 PDF...');

    setTimeout(async () => {
      const elem = document.getElementById('printable-report');
      try {
        await downloadPdfFromElement(
          elem,
          `Report-${full.patient?.full_name?.replace(/\s+/g, '_') || 'Lab'}.pdf`
        );
        setActionMessage('PDF downloaded successfully.');
      } catch (err) {
        console.error('Download error:', err);
        alert('Could not compile PDF: ' + err.message);
      } finally {
        setModalDownloading(false);
        setTimeout(() => setActionMessage(''), 3000);
      }
    }, 350);
  };

  const handleInitiateCancel = (rep) => {
    const full = ensureFullReport(rep);
    if (full.printed_at) {
      alert(
        `Cannot cancel sample: Report #${full.report_code} has already been physically printed. Retroactive cancellation of printed medical documents requires a formal laboratory amendment workflow.`
      );
      return;
    }
    setCancelModalReport(full);
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await api.post(`/reports/${cancelModalReport.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res.data.success) {
        setActionMessage(`Report #${cancelModalReport.report_code} cancelled successfully.`);
        setCancelModalReport(null);
        setCancelReason('');
        await loadReports();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setCancelError(err.response?.data?.error || err.message || 'Failed to cancel report');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filters
  const [syncFilter, setSyncFilter] = useState('');
  const [printFilter, setPrintFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Multi-parameter filter
  const filtered = reports.filter((r) => {
    // Exclude cancelled reports unless showCancelled toggle is on
    if (!showCancelled && r.status === 'cancelled') {
      return false;
    }

    // 1. Keyword search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        r.report_code?.toLowerCase().includes(q) ||
        r.barcode_value?.toLowerCase().includes(q) ||
        r.patient?.full_name?.toLowerCase().includes(q) ||
        r.patient?.uhid?.toLowerCase().includes(q) ||
        r.visit?.visit_code?.toLowerCase().includes(q) ||
        r.creator_name?.toLowerCase().includes(q) ||
        r.client_device_id?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Sync status filter
    if (syncFilter && r.sync_status !== syncFilter) {
      return false;
    }

    // 3. Print status filter
    if (printFilter === 'printed' && !r.printed_at) {
      return false;
    }
    if (printFilter === 'pending_print' && !!r.printed_at) {
      return false;
    }

    // 4. Date range filters
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      if (new Date(r.created_at).getTime() < startMs) return false;
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000; // end of day
      if (new Date(r.created_at).getTime() > endMs) return false;
    }

    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            Print History & Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, re-print, and track physical sign-off status across all generated reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {actionMessage && (
            <span className="text-xs bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-lg animate-pulse font-medium">
              {actionMessage}
            </span>
          )}
          <button
            type="button"
            onClick={loadReports}
            className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#334155] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl space-y-3 text-xs no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="col-span-2 relative">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Search Records</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patient Name, UHID, Visit ID, Barcode, Staff..."
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Sync Status Filter */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Sync Status</label>
            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">All Sync States</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending Sync</option>
              <option value="failed">Failed Sync</option>
            </select>
          </div>

          {/* Print Status Filter */}
          <div className="col-span-1">
            <label className="block text-slate-300 text-[10px] uppercase font-mono font-bold mb-1">Print Status</label>
            <select
              value={printFilter}
              onChange={(e) => setPrintFilter(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">All Print States</option>
              <option value="printed">Printed</option>
              <option value="pending_print">Pending Print</option>
            </select>
          </div>

          {/* Clear Button */}
          <div className="col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSyncFilter('');
                setPrintFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full py-2 px-3 bg-[#0f172a] hover:bg-[#334155] text-slate-300 font-semibold rounded-lg border border-[#334155] transition text-center cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="pt-2.5 border-t border-[#334155] grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-2 flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase font-mono font-bold whitespace-nowrap">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-sky-500 flex-1 font-mono"
            />
            <span className="text-slate-400 text-[10px] uppercase font-mono font-bold whitespace-nowrap">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-sky-500 flex-1 font-mono"
            />
          </div>
          <div className="col-span-2 flex items-center justify-end gap-3 text-[11px] text-slate-400">
            {isAdmin && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-2.5 py-1 rounded-lg hover:bg-rose-950/70 transition">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="rounded border-[#334155] text-rose-500 focus:ring-rose-500/40"
                />
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Show Cancelled</span>
              </label>
            )}
            <div className="font-mono">
              Showing <strong className="text-slate-100 mx-1">{filtered.length}</strong> of {reports.length} total reports
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-xl no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 border-b border-[#334155] uppercase tracking-wider text-[10px] font-mono font-bold">
                <th className="py-3 px-4">Report Code / Barcode</th>
                <th className="py-3 px-4">Patient / UHID</th>
                <th className="py-3 px-4">Visit / Specimen</th>
                <th className="py-3 px-4">Created By / Device</th>
                <th className="py-3 px-4 text-center">Sync Status</th>
                <th className="py-3 px-4 text-center">Physical Print</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No reports match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((rep) => (
                  <tr
                    key={rep.id}
                    onClick={() => setPreviewModalReport(ensureFullReport(rep))}
                    className="hover:bg-slate-800/60 cursor-pointer transition group"
                    title="Click to view full A4 report preview"
                  >
                    {/* Report Code / Barcode */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono group-hover:text-sky-400 transition flex items-center gap-1.5">
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-sky-400 transition" />
                        {rep.report_code}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Barcode: {rep.barcode_value}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {rep.patient?.title} {rep.patient?.full_name || 'Unnamed'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rep.patient?.uhid}
                      </div>
                    </td>

                    {/* Visit */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-300">
                        {rep.visit?.visit_code || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {rep.visit?.sample_type || 'Specimen'}
                      </div>
                    </td>

                    {/* Created By & Workstation */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">
                        {rep.creator_name || 'Staff User'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        {rep.client_device_id || 'Local Client'}
                      </div>
                    </td>

                    {/* Sync Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                          rep.sync_status === 'synced'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : rep.sync_status === 'failed'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {rep.sync_status}
                      </span>
                    </td>

                    {/* Physical Print Status */}
                    <td className="py-3 px-4 text-center">
                      {rep.status === 'cancelled' ? (
                        <span
                          className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full flex items-center justify-center gap-1 font-bold"
                          title={rep.cancellation_reason ? `Reason: ${rep.cancellation_reason}` : 'Cancelled Sample'}
                        >
                          <Ban className="w-3 h-3 text-rose-400" /> Cancelled
                        </span>
                      ) : rep.printed_at ? (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Printed
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-800/80 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> Pending Print
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(rep.created_at).toLocaleDateString()}
                      <div className="text-[9px] text-slate-500">
                        {new Date(rep.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handlePrintReport(rep)}
                          title="Re-Print Report (Opens existing report directly)"
                          className="px-2 py-1 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1 text-[11px] font-medium"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>

                        {onEditReport && (
                          <button
                            type="button"
                            onClick={() => onEditReport(ensureFullReport(rep))}
                            title="Open in Studio"
                            className="p-1.5 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {rep.sync_status !== 'synced' && (
                          <button
                            type="button"
                            onClick={() => handleForceSync(rep.id)}
                            title={rep.sync_status === 'failed' ? 'Retry Failed Cloud Sync' : 'Trigger Cloud Sync'}
                            className="px-2 py-1 bg-amber-950/80 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-800/80 rounded-lg transition flex items-center gap-1 text-[11px] font-bold"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadAnyReport(rep)}
                          title="Download A4 PDF Report"
                          className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {rep.qr_token && (
                          <a
                            href={`/report/${rep.qr_token}`}
                            target="_blank"
                            rel="noreferrer"
                            title="View Online Patient QR Link"
                            className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Sample Cancellation Action */}
                        {rep.status === 'cancelled' ? (
                          <span
                            className="text-[10px] text-rose-400/80 italic font-medium px-1 select-none"
                            title={rep.cancellation_reason ? `Reason: ${rep.cancellation_reason}` : 'Cancelled'}
                          >
                            Cancelled
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInitiateCancel(rep)}
                            title={rep.printed_at ? 'Cannot cancel: Report already printed' : 'Cancel Sample (Soft Delete)'}
                            className={`p-1.5 rounded-lg transition ${
                              rep.printed_at
                                ? 'bg-slate-800/40 text-slate-600 hover:text-rose-400'
                                : 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-transparent hover:border-rose-900/50'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Cancellation Confirmation Modal */}
      {cancelModalReport && (
        <div
          onClick={() => setCancelModalReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer no-print"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                Cancel Sample / Report #{cancelModalReport.report_code}
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalReport(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient & Sample Snapshot */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-200">
                  {cancelModalReport.patient?.title} {cancelModalReport.patient?.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UHID:</span>
                <span className="font-mono text-slate-300">{cancelModalReport.patient?.uhid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Specimen / Barcode:</span>
                <span className="font-mono text-slate-300">
                  {cancelModalReport.visit?.sample_type || 'Specimen'} • {cancelModalReport.barcode_value}
                </span>
              </div>
            </div>

            {/* Warning note */}
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-4 h-4" /> Soft Delete Confirmation
              </p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                Cancelling this sample will mark it as cancelled, exclude it from active queues, and log a permanent audit record.
              </p>
            </div>

            {/* Cancellation Form */}
            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">
                  Cancellation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError('');
                  }}
                  placeholder="e.g. Sample hemolyzed during handling, patient requested cancellation, redraw scheduled..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {cancelError && (
                <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-900 px-3 py-2 rounded-lg">
                  {cancelError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalReport(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Keep Sample
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/20 transition"
                >
                  {cancelLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden/Modal Print Preview Sheet (Ensures #printable-report exists when window.print() or download is invoked from this page) */}
      {previewModalReport && (
        <div
          onClick={() => setPreviewModalReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 print:p-0 print:static print:bg-white cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible cursor-default"
          >
            {/* Modal action bar (hidden during print) */}
            <div className="flex items-center justify-between no-print border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-sky-400" />
                  Print Preview: #{previewModalReport.report_code}
                </h3>
                <p className="text-xs text-slate-400">
                  {previewModalReport.patient?.full_name} • Barcode: {previewModalReport.barcode_value}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={modalDownloading}
                  onClick={() => handleDownloadAnyReport(previewModalReport)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                >
                  {modalDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  {modalDownloading ? 'Compiling...' : 'Download PDF'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet (Ctrl+P)
                </button>

                {onEditReport && (
                  <button
                    type="button"
                    onClick={() => {
                      const rep = previewModalReport;
                      setPreviewModalReport(null);
                      onEditReport(ensureFullReport(rep));
                    }}
                    className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Edit in Studio
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewModalReport(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable A4 Report Canvas */}
            <div className="flex justify-center print:m-0 print:p-0">
              <ReportPreview data={previewModalReport} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
