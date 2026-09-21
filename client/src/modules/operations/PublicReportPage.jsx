import React, { useEffect, useState } from 'react';
import api from '@core/api';
import ReportPreview, { generatePdfBlob, downloadPdfBlob } from '@shared/report-document';
import { ShieldCheck, Download, Printer, AlertTriangle } from 'lucide-react';

export default function PublicReportPage() {
  const [token, setToken] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Extract token from URL (/report/:token or /reports/view/:token)
    const pathParts = window.location.pathname.split('/');
    const urlToken =
      pathParts[pathParts.length - 1] || new URLSearchParams(window.location.search).get('token');
    setToken(urlToken);

    if (!urlToken || urlToken.length < 16) {
      setError('Invalid or missing report verification token.');
      setLoading(false);
      return;
    }

    async function fetchPublicReport() {
      try {
        const res = await api.get(`/public/reports/${urlToken}`);
        if (res.data.success) {
          setReport(res.data.data);
        } else {
          setError(res.data.error || 'Unable to retrieve report');
        }
      } catch (err) {
        setError(
          err.response?.data?.error || 'Verification link expired or report not found.'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPublicReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const printableElem = document.getElementById('printable-report');
    if (!printableElem) return;
    setDownloading(true);
    try {
      const patientName = report?.patient?.full_name || 'Patient';
      const filename = `Official-Report-${patientName.replace(/\s+/g, '_')}.pdf`;
      const blob = await generatePdfBlob(printableElem, filename);
      downloadPdfBlob(blob, filename);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to compile PDF. You can also use the Print button to Save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Verifying authentic pathology report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Report Verification Failed</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Please ensure you have scanned the authentic QR code printed on the physical report.
          </div>
        </div>
      </div>
    );
  }

  // Parse and assemble report data matching ReportPreview's data structure
  let parsedInterpretation = {
    enabled: true,
    increasedIn: [
      'Diabetes Mellitus',
      'Stress (e.g., emotion, burns, shock, anesthesia)',
      'Acute pancreatitis',
      'Chronic pancreatitis',
      'Wernicke encephalopathy (vitamin B1 deficiency)',
      'Effect of drugs (e.g. corticosteroids, estrogens, alcohol, phenytoin, thiazides)',
    ],
    decreasedIn: [
      'Pancreatic disorders',
      'Extrapancreatic tumors',
      'Endocrine disorders',
      'Malnutrition',
      'Hypothalamic lesions',
      'Alcoholism',
      'Endocrine disorders',
    ],
    disclaimer:
      'Note : Test result can vary as per the timing of sample collection, duration of fasting, timing between collection and testing, timing of meal and type of diet taken, medication, physical activity before collection of sample etc. Test results needs to be correlated clinically.',
  };

  if (report.report?.interpretation) {
    try {
      const parsed = JSON.parse(report.report.interpretation);
      if (parsed && typeof parsed === 'object') {
        parsedInterpretation = parsed;
      }
    } catch {
      // Plain text interpretation
      parsedInterpretation.disclaimer = report.report.interpretation;
    }
  }

  // Extract department from tests or default
  const primaryDept =
    report.results_by_department?.[0]?.department ||
    report.test_results?.[0]?.department ||
    'DEPARTMENT OF BIOCHEMISTRY';

  const previewData = {
    labConfig: {
      name: 'SUNRISE',
      subtitle: 'Diagnostic & Research Centre (Demo)',
      address: '[Your Lab Address Here]',
      mobile: '0000000000',
      landline: '000-0000000',
      logoUrl: '/logo.png',
      showSideBadge: true,
      sideBadgeText: 'TEST REPORT',
    },
    patient: {
      title: report.patient.title || 'Mr.',
      full_name: report.patient.full_name,
      uhid: report.patient.uhid,
      age_years: parseInt(report.patient.age) || 45,
      gender: report.patient.gender,
      phone: report.patient.phone || '',
    },
    visit: {
      visit_code: report.visit.visit_code,
      ref_doctor: report.visit.ref_doctor,
      client_name: report.visit.client_name,
      client_code: report.visit.client_code,
      rch_id_mcts_id: report.visit.rch_id_mcts_id || '',
      sample_type: report.visit.sample_type,
      collected_at: report.visit.collected_at,
      reported_at: report.report.reported_at || '01/Sep/2026 03:59PM',
      status: report.report.status === 'final' ? 'Final Report' : report.report.status,
    },
    department: primaryDept,
    testResults: (report.test_results && report.test_results.length > 0)
      ? report.test_results
      : (report.results_by_department?.[0]?.tests || []),
    interpretation: parsedInterpretation,
    signatory: {
      name: 'Dr. SAMPLE SIGNATORY',
      doctorName: 'Dr. SAMPLE SIGNATORY',
      qualifications: 'MBBS, MD [Path]',
      degrees: 'MBBS, MD [Path]',
      reg_no: 'Reg. No. - 00000',
      regNo: '00000',
      designation: 'Consultant Pathologist',
      signatureNotice: '(Physical Doctor Signature & Stamp Area)',
    },
    barcode_value: report.report.barcode_value || 'F00000001',
    qr_token: token,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 flex flex-col items-center print:p-0 print:m-0 print:bg-white print:block">
      {/* Top Action Bar (hidden in print) */}
      <div className="w-full max-w-[210mm] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Official Authenticated Pathology Report
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-400">
              SUNRISE Diagnostic & Research Centre • Report #{report.report?.report_code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition shadow"
          >
            <Download className="w-4 h-4 text-sky-400" />
            {downloading ? 'Compiling PDF...' : 'Download PDF'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition"
          >
            <Printer className="w-4 h-4" /> Print A4 Sheet (Ctrl+P)
          </button>
        </div>
      </div>

      {/* The Pixel-Perfect A4 Report Sheet */}
      <div className="preview-scale-container shadow-2xl rounded-sm overflow-hidden print:shadow-none print:m-0 print:p-0 print:rounded-none">
        <ReportPreview data={previewData} />
      </div>

      {/* Mobile Notice */}
      <div className="mt-6 text-center text-xs text-slate-500 max-w-md no-print">
        This is an authentic diagnostic pathology report. It matches the physical document printed and signed at the laboratory.
      </div>
    </div>
  );
}
