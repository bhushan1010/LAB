import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getQueuedReports, getSyncStats } from '../services/storage';
import api from '../api/client';
import {
  Users,
  Calendar,
  FlaskConical,
  Printer,
  Cloud,
  Shield,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserPlus,
  Play,
  RefreshCw,
  Sparkles,
  ClipboardList,
  Building2,
} from 'lucide-react';

/* =========================================================================
   1. FRONT-DESK DASHBOARD SUB-COMPONENT
   ========================================================================= */
function FrontDeskDashboard({ onNavigate, syncStats, recentReports, user }) {
  const [quickPatient, setQuickPatient] = useState({
    title: 'Mr.',
    full_name: '',
    age_years: '',
    gender: 'M',
    phone: '',
    sample_type: 'EDTA WHOLE BLOOD',
    client_name: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch active referring clinic accounts for dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadClinics() {
      setLoadingClinics(true);
      try {
        const res = await api.get('/visits/referring-clinics');
        if (isMounted && res.data.success) {
          setClinics(res.data.clinics || []);
        }
      } catch (err) {
        console.warn('Could not load referring clinics:', err.message);
      } finally {
        if (isMounted) setLoadingClinics(false);
      }
    }
    loadClinics();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    const numeric = rawVal.replace(/\D/g, '').slice(0, 10);
    setQuickPatient((prev) => ({ ...prev, phone: numeric }));

    if (numeric && numeric.length !== 10) {
      setPhoneError(`Must be exactly 10 digits (${numeric.length}/10)`);
    } else {
      setPhoneError('');
    }
  };

  const handleQuickRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Inline phone validation check before submitting
    if (quickPatient.phone && quickPatient.phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 numeric digits');
      return;
    }

    setSubmitting(true);

    try {
      const selectedClinic = clinics.find((c) => c.client_name === quickPatient.client_name);
      const clientCode = selectedClinic?.client_code || null;
      const clientName = quickPatient.client_name ? quickPatient.client_name.trim() : null;

      // 1. Create Patient (passes client details so UHID is generated with clinic code or WALK)
      const patRes = await api.post('/patients', {
        title: quickPatient.title,
        full_name: quickPatient.full_name,
        age_years: quickPatient.age_years ? parseInt(quickPatient.age_years, 10) : null,
        gender: quickPatient.gender,
        phone: quickPatient.phone || null,
        client_name: clientName,
        client_code: clientCode,
      });

      if (patRes.data.success) {
        const newPatient = patRes.data.patient;
        // 2. Automatically Create Visit for intake with referring clinic if selected
        const visitRes = await api.post('/visits', {
          patient_id: newPatient.id,
          sample_type: quickPatient.sample_type,
          client_name: clientName,
          client_code: clientCode,
          status: 'registered',
        });

        if (visitRes.data.success) {
          const clinicTag = clientName ? ` [Clinic: ${clientName} (${clientCode || '0001'})]` : ' [Direct Walk-In]';
          setSuccessMsg(
            `Registered ${newPatient.full_name} (UHID: ${newPatient.uhid}, Visit: ${visitRes.data.visit.visit_code})${clinicTag}`
          );
          setQuickPatient({
            title: 'Mr.',
            full_name: '',
            age_years: '',
            gender: 'M',
            phone: '',
            sample_type: 'EDTA WHOLE BLOOD',
            client_name: '',
          });
          setPhoneError('');
          setTimeout(() => setSuccessMsg(''), 6000);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Front-Desk Quick KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Workstation Print Queue</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-[#334155] flex items-center justify-center text-sky-400">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{recentReports.length}</div>
          <div className="text-[11px] text-slate-400">Ready for patient pickup/sign-off</div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Pending Physical Print</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {recentReports.filter((r) => !r.printed_at).length}
          </div>
          <div className="text-[11px] text-amber-400/80">Awaiting hard-copy printing</div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Cloud Synced</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{syncStats.synced}</div>
          <div className="text-[11px] text-emerald-400/80">Available online via patient QR</div>
        </div>
      </div>

      {/* Main Front-Desk Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Intake Registration Form */}
        <div className="lg:col-span-5 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
          <div className="border-b border-[#334155] pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Quick Walk-In Registration & Sample Intake
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Register new patient demographics and generate initial visit encounter
            </p>
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleQuickRegister} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">Title</label>
                <select
                  value={quickPatient.title}
                  onChange={(e) => setQuickPatient({ ...quickPatient, title: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Master">Master</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-300 text-[11px] font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Patient Name"
                  value={quickPatient.full_name}
                  onChange={(e) => setQuickPatient({ ...quickPatient, full_name: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">Age</label>
                <input
                  type="number"
                  placeholder="Yrs"
                  value={quickPatient.age_years}
                  onChange={(e) => setQuickPatient({ ...quickPatient, age_years: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">Gender</label>
                <select
                  value={quickPatient.gender}
                  onChange={(e) => setQuickPatient({ ...quickPatient, gender: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1 flex justify-between items-center">
                  <span>Phone</span>
                  <span className="text-[9px] text-slate-500">10 digits</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit Mobile"
                  value={quickPatient.phone}
                  onChange={handlePhoneChange}
                  className={`w-full bg-[#0f172a] border rounded-lg px-2.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none font-mono text-xs ${
                    phoneError ? 'border-rose-500 focus:border-rose-500' : 'border-[#334155] focus:border-sky-500'
                  }`}
                />
                {phoneError && (
                  <span className="text-[10px] text-rose-400 font-medium block mt-1">
                    {phoneError}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">Sample Type</label>
                <select
                  value={quickPatient.sample_type}
                  onChange={(e) => setQuickPatient({ ...quickPatient, sample_type: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-[11px] cursor-pointer"
                >
                  <option value="EDTA WHOLE BLOOD">EDTA WHOLE BLOOD</option>
                  <option value="SERUM">SERUM</option>
                  <option value="FLOURIDE PLASMA (R)">FLOURIDE PLASMA (R)</option>
                  <option value="URINE">URINE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-sky-400" />
                    Referring Clinic
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal">Optional</span>
                </label>
                <select
                  value={quickPatient.client_name}
                  onChange={(e) => setQuickPatient({ ...quickPatient, client_name: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-2 text-slate-100 focus:border-sky-500 focus:outline-none text-[11px] cursor-pointer"
                >
                  <option value="">-- None (Direct Walk-In) --</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id || clinic.username} value={clinic.client_name}>
                      {clinic.client_name} ({clinic.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg shadow-md transition mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Registering...' : 'Register & Create Visit'}</span>
            </button>
          </form>
        </div>

        {/* Front-Desk Print Queue Summary */}
        <div className="lg:col-span-7 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400" />
                Your Workstation Print Queue
              </h3>
              <p className="text-[11px] text-slate-400">Reports ready for physical printing</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('print-queue')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition"
            >
              Open Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#334155]/60">
            {recentReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No reports in queue. Check back when lab testing completes.
              </div>
            ) : (
              recentReports.slice(0, 5).map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs hover:bg-[#131b2e]/60 px-2 rounded-lg transition">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {r.patient?.title} {r.patient?.full_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      #{r.report_code} • Barcode: {r.barcode_value}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.printed_at ? (
                      <span className="text-[9px] uppercase font-bold font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-md">
                        Printed
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold font-mono text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md">
                        Needs Print
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('print-queue')}
                      className="px-2.5 py-1 bg-[#0f172a] hover:bg-sky-500 hover:text-slate-950 text-slate-300 rounded-lg transition text-[11px] font-semibold flex items-center gap-1 border border-[#334155]"
                    >
                      <Printer className="w-3 h-3" /> Print
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. LAB-TECH DASHBOARD SUB-COMPONENT
   ========================================================================= */
function LabTechDashboard({ onNavigate, syncStats, recentReports }) {
  const [pendingVisits, setPendingVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  useEffect(() => {
    async function loadVisits() {
      try {
        const res = await api.get('/visits?status=registered');
        if (res.data.success) {
          setPendingVisits(res.data.visits || []);
        }
      } catch (err) {
        console.warn('Visits fetch error:', err);
      } finally {
        setLoadingVisits(false);
      }
    }
    loadVisits();
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards for Lab Tech */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Pending Testing Visits</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{pendingVisits.length}</div>
          <div className="text-[11px] text-amber-400/80">Samples awaiting result entry</div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Your Finalized Reports</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{recentReports.length}</div>
          <div className="text-[11px] text-emerald-400/80">Entered on this workstation</div>
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Auto-Sync Status</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{syncStats.synced} Synced</div>
          <div className="text-[11px] text-slate-400">
            {syncStats.failed > 0 ? `${syncStats.failed} failed syncs` : 'All reports in cloud'}
          </div>
        </div>
      </div>

      {/* Main Lab Tech Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visits Awaiting Test Results */}
        <div className="lg:col-span-7 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Work Queue: Samples Awaiting Result Entry
              </h3>
              <p className="text-[11px] text-slate-400">
                Incoming patient visits registered at front-desk ready for analysis
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
            >
              Open Studio <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#334155]/60">
            {loadingVisits ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono animate-pulse">
                Loading testing queue...
              </div>
            ) : pendingVisits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                All registered samples tested! Open Report Studio to enter manual tests.
              </div>
            ) : (
              pendingVisits.map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between text-xs hover:bg-[#131b2e]/60 px-2 rounded-lg transition">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {v.patient_name || 'Patient'} ({v.patient_uhid || 'UHID'})
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Visit: {v.visit_code} • Sample: {v.sample_type || 'SERUM'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('studio')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" /> Enter Results
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Launchpad & Recent Reports */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Studio Launch */}
          <div className="bg-[#1e293b] border border-emerald-900/60 rounded-xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Report Studio Quick Start
            </h3>
            <p className="text-xs text-slate-300">
              Launch directly with standard clinical test templates:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="p-2.5 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] text-slate-200 rounded-lg text-left font-medium transition cursor-pointer"
              >
                Biochemistry
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="p-2.5 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] text-slate-200 rounded-lg text-left font-medium transition cursor-pointer"
              >
                Hematology (CBC)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="p-2.5 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] text-slate-200 rounded-lg text-left font-medium transition cursor-pointer"
              >
                Lipid Profile
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="p-2.5 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] text-slate-200 rounded-lg text-left font-medium transition cursor-pointer"
              >
                Pediatric LFT
              </button>
            </div>
          </div>

          {/* Quick link to Print Queue */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-100">Physical Print History</div>
              <div className="text-[11px] text-slate-400">View and reprint test reports</div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('print-queue')}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-[#334155] text-sky-400 rounded-lg font-semibold border border-[#334155] transition cursor-pointer"
            >
              Print Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. ADMIN DASHBOARD SUB-COMPONENT
   ========================================================================= */
function AdminDashboard({ onNavigate, syncStats, recentReports }) {
  const [auditFeed, setAuditFeed] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    async function loadAuditTrail() {
      try {
        const res = await api.get('/audit-logs?limit=8');
        if (res.data.success) {
          setAuditFeed(res.data.audit_logs || []);
        }
      } catch (err) {
        console.warn('Failed to load admin audit feed:', err);
      } finally {
        setLoadingAudit(false);
      }
    }
    loadAuditTrail();
  }, []);

  return (
    <div className="space-y-6">
      {/* System-Wide Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total System Reports */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">System Total Reports</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{recentReports.length}</div>
          <div className="text-[11px] text-slate-400">Across LAN & Remote Workstations</div>
        </div>

        {/* Sync Failure Alert Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Sync Attention Required</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{syncStats.failed}</div>
          <div className="text-[11px] flex items-center justify-between">
            <span className="text-rose-400/80">Failed sync attempts</span>
            {syncStats.failed > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('print-queue')}
                className="text-rose-300 hover:text-white font-bold underline text-[10px]"
              >
                Review & Retry
              </button>
            )}
          </div>
        </div>

        {/* Cloud Synced Reports */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Public QR Verifications</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{syncStats.synced}</div>
          <div className="text-[11px] text-emerald-400/80">Live QR reports available</div>
        </div>

        {/* Workstation Fleet */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Workstation Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">7 Connected</div>
          <div className="text-[11px] text-sky-400/80">5 Reception/Lab + 2 Remote WAN</div>
        </div>
      </div>

      {/* Main Admin Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Staff Activity Stream (Direct from Audit Log) */}
        <div className="lg:col-span-8 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Live Staff Activity Feed (Audit Log)
              </h3>
              <p className="text-[11px] text-slate-400">
                Real-time security and operational events across all workstations
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
            >
              Full Audit Trail <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#334155]/60">
            {loadingAudit ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono animate-pulse">
                Streaming audit logs...
              </div>
            ) : auditFeed.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No recent activity recorded yet.
              </div>
            ) : (
              auditFeed.map((log) => {
                const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs hover:bg-[#131b2e]/60 px-2 rounded-lg transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                            log.action?.includes('FORBIDDEN') || log.action?.includes('FAILED')
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              : log.action?.includes('SUCCESS') || log.action?.includes('GENERATE')
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-100">
                          {log.user_full_name || log.username || 'Public/Guest'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({log.client_device_id || log.ip_address || 'LAN'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono max-w-lg truncate">
                        {detailsStr}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono text-right whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Admin Control Links */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-[#334155] pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Administrative Controls
              </h3>
              <p className="text-[11px] text-slate-400">Security & fleet management shortcuts</p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className="w-full p-3 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-purple-500/50 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  <div>
                    <div>Staff & Client Accounts</div>
                    <div className="text-[10px] text-slate-400 font-normal">Manage credentials & access</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('audit')}
                className="w-full p-3 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-amber-500/50 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <div>
                    <div>Compliance & Audit Trail</div>
                    <div className="text-[10px] text-slate-400 font-normal">Review immutable activity logs</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('print-queue')}
                className="w-full p-3 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-sky-500/50 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-sky-400" />
                  <div>
                    <div>System-Wide Print Queue</div>
                    <div className="text-[10px] text-slate-400 font-normal">Monitor all generated reports</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="w-full p-3 bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-emerald-500/50 rounded-xl text-left flex items-center justify-between text-xs font-semibold text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div>Report Studio</div>
                    <div className="text-[10px] text-slate-400 font-normal">Design and verify A4 formats</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. MAIN DASHBOARD PAGE (Role Dispatcher)
   ========================================================================= */
export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [syncStats, setSyncStats] = useState({ total: 0, synced: 0, unsynced: 0, failed: 0 });
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    getSyncStats().then(setSyncStats);
    getQueuedReports().then((reps) => setRecentReports(reps));
  }, []);

  const role = user?.role || 'front-desk';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Universal Welcome Header */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
            Node Portal • {role.toUpperCase()}
          </span>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight mt-2">
            Welcome back, {user?.full_name || 'Staff Member'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Connected to LabTrack LIMS • Active Workstation: {localStorage.getItem('lab_device_id') || 'LAN-PC-01'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {role !== 'front-desk' && (
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" /> Open Report Studio
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('print-queue')}
            className="px-4 py-2 bg-[#0f172a] hover:bg-[#334155] text-slate-200 text-xs font-semibold rounded-lg border border-[#334155] transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Print Queue
          </button>
        </div>
      </div>

      {/* Render Role-Specific View */}
      {role === 'front-desk' && (
        <FrontDeskDashboard
          onNavigate={onNavigate}
          syncStats={syncStats}
          recentReports={recentReports}
          user={user}
        />
      )}

      {role === 'lab-tech' && (
        <LabTechDashboard
          onNavigate={onNavigate}
          syncStats={syncStats}
          recentReports={recentReports}
          user={user}
        />
      )}

      {role === 'admin' && (
        <AdminDashboard
          onNavigate={onNavigate}
          syncStats={syncStats}
          recentReports={recentReports}
          user={user}
        />
      )}
    </div>
  );
}
