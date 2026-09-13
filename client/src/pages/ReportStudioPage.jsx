import React, { useState, useCallback, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import PatientSection from '../components/editor/PatientSection';
import VisitSection from '../components/editor/VisitSection';
import TestResultsTable from '../components/editor/TestResultsTable';
import NotesSection from '../components/editor/NotesSection';
import ReportPreview from '../components/preview/ReportPreview';
import { DEFAULT_REPORT_DATA, DEMO_PRESETS } from '../data/presets';
import { saveReportLocal, getReportByBarcode } from '../services/storage';
import { generatePdfBlob, downloadPdfBlob, downloadPdfFromElement } from '../services/pdfGenerator';
import { syncPendingReports } from '../services/syncWorker';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import api from '../api/client';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Sparkles,
  QrCode,
  Printer,
  Download,
  CheckCircle2,
  ScanLine,
  X,
  FileText,
  Plus,
  Loader2,
} from 'lucide-react';

export default function ReportStudioPage({ currentView = 'studio', onNavigate, initialReportData = null }) {
  const [reportData, setReportData] = useState(initialReportData || DEFAULT_REPORT_DATA);
  const [zoom, setZoom] = useState(85);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [lastSavedPdfBlob, setLastSavedPdfBlob] = useState(null);
  const [publicUrl, setPublicUrl] = useState(
    initialReportData?.qr_token
      ? `${window.location.origin}/report/${initialReportData.qr_token}`
      : `${window.location.origin}/report/${DEFAULT_REPORT_DATA.qr_token}`
  );

  // Close save modal on Escape key or after print dialog closes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && saveModalOpen) {
        setSaveModalOpen(false);
      }
    };
    const handleAfterPrint = () => {
      setSaveModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [saveModalOpen]);

  // Sync state whenever initialReportData changes (e.g. clicked "Open in Studio" from Print Queue)
  useEffect(() => {
    if (initialReportData) {
      setReportData(initialReportData);
      if (initialReportData.qr_token) {
        setPublicUrl(`${window.location.origin}/report/${initialReportData.qr_token}`);
      }
    }
  }, [initialReportData]);

  // Update helper functions
  const setPatient = (patient) => setReportData((prev) => ({ ...prev, patient }));
  const setVisit = (visit) => setReportData((prev) => ({ ...prev, visit }));
  const setBarcodeValue = (barcode_value) => setReportData((prev) => ({ ...prev, barcode_value }));
  const setDepartment = (department) => setReportData((prev) => ({ ...prev, department }));
  const setTestResults = (testResults) => setReportData((prev) => ({ ...prev, testResults }));
  const setInterpretation = (interpretation) => setReportData((prev) => ({ ...prev, interpretation }));
  const setSignatory = (signatory) => setReportData((prev) => ({ ...prev, signatory }));
  const setLabConfig = (labConfig) => setReportData((prev) => ({ ...prev, labConfig }));

  // Hardware barcode scanner hook: auto-detect rapid scanner input
  const handleBarcodeScan = useCallback(async (scannedBarcode) => {
    setStatusMessage(`Scanning barcode: ${scannedBarcode}...`);
    
    // 1. Try to find an existing report in local IndexedDB
    const existing = await getReportByBarcode(scannedBarcode);
    if (existing) {
      setReportData(existing);
      if (existing.qr_token) {
        setPublicUrl(`${window.location.origin}/report/${existing.qr_token}`);
      }
      setStatusMessage(`Found local record for Barcode: ${scannedBarcode}`);
      setTimeout(() => setStatusMessage(''), 4000);
      return;
    }

    // 2. Or check if it matches a preset or set as the new barcode
    setBarcodeValue(scannedBarcode);
    setStatusMessage(`Barcode ${scannedBarcode} applied to active sample`);
    setTimeout(() => setStatusMessage(''), 4000);
  }, []);

  useBarcodeScanner(handleBarcodeScan);

  const handleLoadPreset = (preset) => {
    setReportData(preset);
    setPublicUrl(`${window.location.origin}/report/${preset.qr_token}`);
    setStatusMessage(`Loaded Demo: ${preset.patient.title} ${preset.patient.full_name} (${preset.department.replace('DEPARTMENT OF ', '')})`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Quick fill handler: updates ONLY department and testResults without touching patient/visit data
  const handleQuickFillTests = (preset) => {
    if (!preset) return;
    setReportData((prev) => ({
      ...prev,
      department: preset.department || prev.department,
      testResults: Array.isArray(preset.testResults)
        ? JSON.parse(JSON.stringify(preset.testResults))
        : prev.testResults,
    }));
    const panelName = preset.department ? preset.department.replace('DEPARTMENT OF ', '') : 'Test';
    setStatusMessage(`Applied ${panelName} test parameters`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleSelectPatient = (newRecord) => {
    setReportData((prev) => ({
      ...prev,
      ...newRecord,
      labConfig: prev.labConfig,
    }));
    if (newRecord.qr_token) {
      setPublicUrl(`${window.location.origin}/report/${newRecord.qr_token}`);
    }
    setStatusMessage(
      `Loaded Record: ${newRecord.patient?.title || ''} ${newRecord.patient?.full_name || ''} (${newRecord.department?.replace('DEPARTMENT OF ', '') || 'General'})`
    );
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleNewPatient = () => {
    const newRecord = {
      ...reportData,
      patient: {
        id: '',
        uhid: 'DEMO.' + Math.floor(100000 + Math.random() * 900000),
        title: 'Mr.',
        full_name: '',
        age_years: '',
        age_months: 0,
        age_days: 0,
        gender: 'M',
        phone: '',
      },
      visit: {
        id: 'visit-' + Date.now(),
        visit_code: 'DEMO' + Date.now().toString().slice(-6),
        ref_doctor: 'Dr. SAMPLE REFERRER',
        client_name: 'SAMPLE CLINIC',
        client_code: '0001',
        rch_id_mcts_id: '',
        sample_type: 'WHOLE BLOOD EDTA',
        collected_at: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        reported_at: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'Final Report',
      },
      barcode_value: 'F' + Date.now().toString().slice(-8),
      department: 'DEPARTMENT OF BIOCHEMISTRY',
      testResults: [
        {
          id: 'test-' + Date.now(),
          test_name: '',
          result_value: '',
          unit: '',
          reference_range: '',
          method: '',
          flag: 'NORMAL',
        },
      ],
      interpretation: {
        enabled: false,
        increasedIn: [],
        decreasedIn: [],
        disclaimer: '',
      },
    };
    setReportData(newRecord);
    setStatusMessage('Started new patient record with fresh visit');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDirectPdf = async () => {
    setDownloadingPdf(true);
    setStatusMessage('Compiling A4 PDF document...');
    try {
      if (lastSavedPdfBlob) {
        downloadPdfBlob(
          lastSavedPdfBlob,
          `Report-${reportData.patient?.full_name?.replace(/\s+/g, '_') || 'Lab'}.pdf`
        );
      } else {
        const elem = document.getElementById('printable-report');
        await downloadPdfFromElement(
          elem,
          `Report-${reportData.patient?.full_name?.replace(/\s+/g, '_') || 'Lab'}.pdf`
        );
      }
      setStatusMessage('PDF Downloaded Successfully!');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveAndFinalize = async () => {
    // Client-side validation
    if (!reportData.patient.full_name?.trim()) {
      alert('Validation Error: Patient Full Name is required.');
      return;
    }
    if (!reportData.visit.visit_code?.trim()) {
      alert('Validation Error: Visit ID / Code is required.');
      return;
    }
    if (reportData.testResults.length === 0 || !reportData.testResults[0].test_name?.trim()) {
      alert('Validation Error: At least one test parameter with name and result is required.');
      return;
    }

    setSaving(true);
    setStatusMessage('Generating PDF & saving locally...');

    try {
      let finalReportRecord = { ...reportData };

      // Step A: Attempt server synchronization if online
      if (navigator.onLine) {
        try {
          // 1. Create or get patient
          let patientId = reportData.patient.id;
          if (!patientId || patientId.startsWith('11111111')) {
            const patientRes = await api.post('/patients', {
              title: reportData.patient.title,
              full_name: reportData.patient.full_name,
              uhid: reportData.patient.uhid,
              age_years: reportData.patient.age_years || null,
              gender: reportData.patient.gender,
              phone: reportData.patient.phone || null,
            });
            patientId = patientRes.data.patient.id;
            finalReportRecord.patient = { ...finalReportRecord.patient, id: patientId };
          }

          // 2. Create visit
          let visitId = reportData.visit.id;
          const visitRes = await api.post('/visits', {
            patient_id: patientId,
            visit_code: reportData.visit.visit_code,
            ref_doctor: reportData.visit.ref_doctor,
            client_name: reportData.visit.client_name,
            client_code: reportData.visit.client_code,
            sample_type: reportData.visit.sample_type,
            collected_at: new Date().toISOString(),
            status: 'completed',
          });
          visitId = visitRes.data.visit.id;
          finalReportRecord.visit = { ...finalReportRecord.visit, id: visitId };

          // 3. Save test results in bulk
          await api.post('/test-results/bulk', {
            visit_id: visitId,
            results: reportData.testResults.map((t, idx) => ({
              department: reportData.department,
              test_name: t.test_name,
              result_value: t.result_value,
              unit: t.unit,
              reference_range: t.reference_range,
              method: t.method,
              flag: t.flag,
              display_order: idx + 1,
            })),
          });

          // 4. Generate report with barcode & unguessable QR token
          const reportRes = await api.post('/reports/generate', {
            visit_id: visitId,
            barcode_value: reportData.barcode_value,
            interpretation: reportData.interpretation.enabled
              ? JSON.stringify(reportData.interpretation)
              : null,
            status: 'final',
          });

          const generated = reportRes.data.report;
          finalReportRecord.id = generated.id;
          finalReportRecord.qr_token = generated.qr_token;
          finalReportRecord.report_code = generated.report_code;
          finalReportRecord.sync_status = 'synced';
        } catch (apiErr) {
          console.warn('Server sync failed during save, switching to offline-first local queue:', apiErr.message);
          finalReportRecord.sync_status = 'unsynced';
        }
      } else {
        finalReportRecord.sync_status = 'unsynced';
      }

      // Step B: Ensure ID and tokens exist even if completely offline
      if (!finalReportRecord.id || finalReportRecord.id.startsWith('demo-')) {
        finalReportRecord.id = 'loc-' + Date.now();
      }
      if (!finalReportRecord.report_code) {
        finalReportRecord.report_code = 'REP-' + Date.now().toString().slice(-6);
      }

      // Step C: Compile A4 PDF Blob client-side
      const printableElem = document.getElementById('printable-report');
      let pdfBlob = null;
      if (printableElem) {
        try {
          pdfBlob = await generatePdfBlob(
            printableElem,
            `Report-${finalReportRecord.patient.full_name.replace(/\s+/g, '_')}.pdf`
          );
          setLastSavedPdfBlob(pdfBlob);
        } catch (pdfErr) {
          console.warn('Client PDF generation warning:', pdfErr);
        }
      }

      // Step D: Store in local IndexedDB (zero data loss guarantee)
      await saveReportLocal({
        ...finalReportRecord,
        pdfBlob,
        updated_at: new Date().toISOString(),
      });

      setReportData(finalReportRecord);
      const onlineUrl = `${window.location.origin}/report/${finalReportRecord.qr_token}`;
      setPublicUrl(onlineUrl);

      // Step E: Trigger background sync
      syncPendingReports();

      setStatusMessage(`Report Saved Successfully! (${finalReportRecord.sync_status.toUpperCase()})`);
      setSaveModalOpen(true);
    } catch (err) {
      console.error('Save error:', err);
      alert(`Save Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden print:bg-white print:block print:h-auto print:min-h-0 print:m-0 print:p-0">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={onNavigate}
        onPrint={handlePrint}
        onSave={handleSaveAndFinalize}
        saving={saving}
        statusMessage={statusMessage}
      />

      {/* Main Split-Pane Studio */}
      <div className="flex-1 flex overflow-hidden print:block print:overflow-visible print:m-0 print:p-0">
        {/* Left Side: Scrollable Editor Form (45% width) */}
        <div className="w-[45%] border-r border-[#334155] bg-[#0b1326] p-6 overflow-y-auto h-[calc(100vh-53px)] space-y-6 no-print">
          {/* Quick Demo Case Selector */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Select Demo Case for Representation:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">5 Diagnostic Profiles</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PRESETS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadPreset(item.preset)}
                  className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-sky-500/15 border border-[#334155] hover:border-sky-500/40 text-slate-300 hover:text-sky-300 rounded-lg text-xs font-medium transition shadow-xs cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Public QR View Card */}
          {publicUrl && (
            <div className="p-3 bg-[#1e293b] border border-emerald-500/40 rounded-xl text-xs text-slate-200 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block">Active Online QR Token View:</span>
                  <span className="text-[11px] font-mono text-emerald-400 block truncate max-w-xs">
                    {publicUrl}
                  </span>
                </div>
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shrink-0 shadow transition"
              >
                View Online <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Section 1: Patient Details */}
          <PatientSection
            patient={reportData.patient}
            setPatient={setPatient}
            onSelectPatient={handleSelectPatient}
            onNewPatient={handleNewPatient}
          />

          {/* Section 2: Visit & Barcode Details */}
          <VisitSection
            visit={reportData.visit}
            setVisit={setVisit}
            barcodeValue={reportData.barcode_value}
            setBarcodeValue={setBarcodeValue}
          />

          {/* Section 3: Test Results Table */}
          <TestResultsTable
            department={reportData.department}
            setDepartment={setDepartment}
            testResults={reportData.testResults}
            setTestResults={setTestResults}
            onLoadPreset={handleQuickFillTests}
          />

          {/* Section 4 & 5: Interpretation & Signatory */}
          <NotesSection
            interpretation={reportData.interpretation}
            setInterpretation={setInterpretation}
            signatory={reportData.signatory}
            setSignatory={setSignatory}
            labConfig={reportData.labConfig}
            setLabConfig={setLabConfig}
          />
        </div>

        {/* Right Side: Live A4 Report Preview (55% width) - Fixed/Pinned Container */}
        <div className="w-[55%] bg-[#080d1a] p-6 overflow-y-auto h-[calc(100vh-53px)] flex flex-col items-center relative print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
          {/* Zoom controls bar */}
          <div className="sticky top-0 z-20 bg-[#1e293b]/95 backdrop-blur border border-[#334155] rounded-full px-4 py-1.5 flex items-center gap-3 text-xs text-slate-300 shadow-xl mb-4 no-print">
            <span className="text-[11px] text-sky-400 font-mono font-semibold uppercase tracking-wider">
              A4 Live Preview
            </span>
            <div className="h-3 w-px bg-[#334155]" />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              title="Zoom Out"
              className="p-1 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs w-10 text-center font-bold text-slate-200">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(130, z + 10))}
              title="Zoom In"
              className="p-1 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(85)}
              title="Reset Zoom"
              className="p-1 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scaled A4 Sheet Container */}
          <div
            className="preview-scale-container print:transform-none print:m-0 print:p-0"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
          >
            <ReportPreview data={reportData} />
          </div>
        </div>
      </div>

      {/* Post-Save Modal Dialog */}
      {saveModalOpen && (
        <div
          onClick={() => setSaveModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 no-print cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-4 cursor-default text-left"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">Report Finalized & Queued</h3>
                  <p className="text-xs text-slate-400">
                    Code: <span className="font-mono font-bold text-sky-400">{reportData.report_code}</span> • Status:{' '}
                    <span className="font-mono uppercase text-emerald-400 font-bold">{reportData.sync_status}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0f172a] transition cursor-pointer"
                title="Close dialog (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient & Report Brief */}
            <div className="text-xs text-slate-300 leading-relaxed bg-[#0f172a] p-3 rounded-xl border border-[#334155] space-y-1">
              <div className="font-medium text-slate-100 flex items-center justify-between">
                <span>{reportData.patient?.title || ''} {reportData.patient?.full_name}</span>
                <span className="font-mono text-emerald-400 font-semibold">{reportData.visit?.visit_code}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                The report has been safely saved. Choose an action below or click outside to return to editing:
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Download A4 PDF */}
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={handleDownloadDirectPdf}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compiling & Downloading PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download A4 PDF File
                  </>
                )}
              </button>

              {/* 2. Print A4 Sheet Now */}
              <button
                type="button"
                onClick={() => {
                  setSaveModalOpen(false);
                  window.print();
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print A4 Sheet Now (Ctrl+P)
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* 3. Open Online Report */}
                {reportData.qr_token && (
                  <a
                    href={`${window.location.origin}/report/${reportData.qr_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 bg-[#0f172a] hover:bg-[#131b2e] text-slate-200 hover:text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 border border-[#334155] transition text-center cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> View Online
                  </a>
                )}

                {/* 4. Go to Print Queue */}
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSaveModalOpen(false);
                      onNavigate('print-queue');
                    }}
                    className="py-2 bg-[#0f172a] hover:bg-[#131b2e] text-slate-200 hover:text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 border border-[#334155] transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" /> Print Queue
                  </button>
                )}
              </div>

              {/* 5. Start Next Patient */}
              <button
                type="button"
                onClick={() => {
                  setSaveModalOpen(false);
                  handleNewPatient();
                }}
                className="w-full py-2 bg-[#0f172a] hover:bg-[#131b2e] text-slate-300 hover:text-white font-medium rounded-lg text-xs flex items-center justify-center gap-2 border border-[#334155] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" /> Start Next Patient Report
              </button>

              {/* 6. Close & Continue Editing */}
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="w-full py-2 bg-transparent hover:bg-[#0f172a] text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close & Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
