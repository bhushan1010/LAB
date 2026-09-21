import React, { useState, useEffect } from 'react';
import api from '@core/api';
import {
  Stethoscope,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  Mail,
  Receipt,
  Calculator,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function DoctorBillingPage() {
  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'default-rates' | 'custom-rates' | 'calc-preview'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Main state
  const [doctors, setDoctors] = useState([]);
  const [defaultRates, setDefaultRates] = useState({});
  const [doctorRates, setDoctorRates] = useState({});

  // Doctor Form Modal
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    clinic_name: '',
    phone: '',
    email: '',
    is_active: true,
  });

  // Default Rate Modal
  const [defaultRateModalOpen, setDefaultRateModalOpen] = useState(false);
  const [defaultRateForm, setDefaultRateForm] = useState({
    test_name: '',
    rate: '',
  });

  // Custom Rate Form
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [customRateForm, setCustomRateForm] = useState({
    test_name: '',
    rate: '',
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Live Bill Preview Tool
  const [previewDoctorId, setPreviewDoctorId] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [calculatedPreview, setCalculatedPreview] = useState(null);

  // Load config from backend
  const loadBillingConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports?action=get_billing_config');
      if (res.data?.success) {
        setDoctors(res.data.doctors || []);
        setDefaultRates(res.data.default_test_rates || {});
        setDoctorRates(res.data.doctor_test_rates || {});
        if (res.data.doctors?.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(res.data.doctors[0].id);
          setPreviewDoctorId(res.data.doctors[0].id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load billing configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingConfig();
  }, []);

  const showNotification = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  // --- Doctor CRUD ---
  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...doctorForm,
        id: editingDoctor ? editingDoctor.id : `doc-${Date.now()}`,
      };
      const res = await api.post('/reports/billing/print', {
        action: 'save_doctor',
        payload,
      });
      if (res.data?.success) {
        showNotification(
          editingDoctor ? `Updated doctor ${payload.name}` : `Added new doctor ${payload.name}`
        );
        setDoctorModalOpen(false);
        setEditingDoctor(null);
        setDoctorForm({ name: '', clinic_name: '', phone: '', email: '', is_active: true });
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save doctor');
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'delete_doctor',
        payload: { doctor_id: id },
      });
      if (res.data?.success) {
        showNotification(`Removed doctor ${name}`);
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete doctor');
    }
  };

  // --- Default Rates CRUD ---
  const handleSaveDefaultRate = async (e) => {
    e.preventDefault();
    if (!defaultRateForm.test_name || !defaultRateForm.rate) return;
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'save_default_rate',
        payload: {
          test_name: defaultRateForm.test_name.trim(),
          rate: parseFloat(defaultRateForm.rate),
        },
      });
      if (res.data?.success) {
        showNotification(`Set default rate for ${defaultRateForm.test_name}`);
        setDefaultRateModalOpen(false);
        setDefaultRateForm({ test_name: '', rate: '' });
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save default rate');
    }
  };

  const handleDeleteDefaultRate = async (testName) => {
    if (!window.confirm(`Remove standard rate for "${testName}"?`)) return;
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'delete_default_rate',
        payload: { test_name: testName },
      });
      if (res.data?.success) {
        showNotification(`Removed default rate for ${testName}`);
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove rate');
    }
  };

  // --- Doctor Custom Rates CRUD ---
  const handleSaveCustomRate = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !customRateForm.test_name || !customRateForm.rate) return;
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'save_doctor_rate',
        payload: {
          doctor_id: selectedDoctorId,
          test_name: customRateForm.test_name.trim(),
          rate: parseFloat(customRateForm.rate),
        },
      });
      if (res.data?.success) {
        showNotification(`Saved custom rate for ${customRateForm.test_name}`);
        setCustomRateForm({ test_name: '', rate: '' });
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save doctor custom rate');
    }
  };

  const handleDeleteCustomRate = async (docId, testName) => {
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'delete_doctor_rate',
        payload: { doctor_id: docId, test_name: testName },
      });
      if (res.data?.success) {
        showNotification(`Removed custom rate for ${testName}. Will now use standard default.`);
        loadBillingConfig();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove custom rate');
    }
  };

  // --- Bill Calculation Preview ---
  const runLiveCalculation = async () => {
    if (selectedTests.length === 0) {
      setCalculatedPreview(null);
      return;
    }
    try {
      const res = await api.post('/reports/billing/print', {
        action: 'calculate_bill',
        payload: {
          doctor_id: previewDoctorId || null,
          tests: selectedTests.map((t) => ({ test_name: t })),
        },
      });
      if (res.data?.success) {
        setCalculatedPreview(res.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    runLiveCalculation();
  }, [previewDoctorId, selectedTests]);

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Doctor Rates & Billing Management
          </h2>
          <p className="text-xs text-slate-400">
            Admin oversight: Configure referring doctor entities, baseline test pricing, and doctor-specific custom tariff overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {success && (
            <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {success}
            </span>
          )}
          <button
            type="button"
            onClick={loadBillingConfig}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'doctors'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          1. Referring Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('default-rates')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'default-rates'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          2. Standard Default Rates ({Object.keys(defaultRates).length})
        </button>
        <button
          onClick={() => setActiveTab('custom-rates')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'custom-rates'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          3. Doctor Custom Rates
        </button>
        <button
          onClick={() => setActiveTab('calc-preview')}
          className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'calc-preview'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Live Bill Calculator & Auditor
        </button>
      </div>

      {/* --- TAB 1: DOCTORS MANAGEMENT --- */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search doctors or clinics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => {
                setEditingDoctor(null);
                setDoctorForm({ name: '', clinic_name: '', phone: '', email: '', is_active: true });
                setDoctorModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Doctor Name</th>
                  <th className="py-3 px-4">Clinic / Hospital</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-center">Custom Tariffs</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {doctors
                  .filter(
                    (d) =>
                      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((doc) => {
                    const customCount = Object.keys(doctorRates[doc.id] || {}).length;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                            {doc.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {doc.id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {doc.clinic_name || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 space-y-0.5">
                          {doc.phone && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500" /> {doc.phone}
                            </div>
                          )}
                          {doc.email && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" /> {doc.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedDoctorId(doc.id);
                              setActiveTab('custom-rates');
                            }}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition"
                          >
                            {customCount} {customCount === 1 ? 'override' : 'overrides'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {doc.is_active ? (
                            <span className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-300 bg-rose-950/50 border border-rose-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingDoctor(doc);
                              setDoctorForm({
                                name: doc.name,
                                clinic_name: doc.clinic_name || '',
                                phone: doc.phone || '',
                                email: doc.email || '',
                                is_active: doc.is_active,
                              });
                              setDoctorModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                            title="Edit Doctor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                            title="Delete Doctor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: DEFAULT TEST RATES --- */}
      {activeTab === 'default-rates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Standard lab catalog rates. Any test without a doctor-specific tariff uses these rates as the default fallback.
            </p>
            <button
              onClick={() => {
                setDefaultRateForm({ test_name: '', rate: '' });
                setDefaultRateModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Add Standard Test Rate
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4 text-right">Default Rate (₹)</th>
                  <th className="py-3 px-4 text-center">Applied Overrides</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(defaultRates).map(([testName, rate]) => {
                  // Count how many doctors override this test
                  let overrideCount = 0;
                  Object.values(doctorRates).forEach((docMap) => {
                    if (docMap[testName] !== undefined) overrideCount++;
                  });

                  return (
                    <tr key={testName} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-white">{testName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₹{parseFloat(rate).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {overrideCount} doctor {overrideCount === 1 ? 'override' : 'overrides'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setDefaultRateForm({ test_name: testName, rate: rate.toString() });
                            setDefaultRateModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title="Edit Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDefaultRate(testName)}
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                          title="Remove Test Rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: DOCTOR CUSTOM RATES --- */}
      {activeTab === 'custom-rates' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold">Select Referring Doctor:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.clinic_name ? `(${d.clinic_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctorObj && (
              <div className="text-xs text-slate-400 flex items-center gap-4">
                <span>Clinic: <strong className="text-white">{selectedDoctorObj.clinic_name || 'N/A'}</strong></span>
                <span>Phone: <strong className="text-white">{selectedDoctorObj.phone || 'N/A'}</strong></span>
              </div>
            )}
          </div>

          {/* Add custom rate form */}
          <form
            onSubmit={handleSaveCustomRate}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Select Lab Test
              </label>
              <input
                type="text"
                list="testNamesList"
                placeholder="e.g. Plasma Glucose-Random"
                value={customRateForm.test_name}
                onChange={(e) => setCustomRateForm({ ...customRateForm, test_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                required
              />
              <datalist id="testNamesList">
                {Object.keys(defaultRates).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="w-36">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Custom Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customRateForm.rate}
                onChange={(e) => setCustomRateForm({ ...customRateForm, rate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div className="self-end">
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" /> Save Doctor Tariff
              </button>
            </div>
          </form>

          {/* Table of custom rates for selected doctor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4 text-center">Standard Baseline Rate</th>
                  <th className="py-3 px-4 text-center">Negotiated Doctor Rate</th>
                  <th className="py-3 px-4 text-center">Variance / Discount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(doctorRates[selectedDoctorId] || {}).map(([testName, customRate]) => {
                  const defaultRate = defaultRates[testName] !== undefined ? defaultRates[testName] : null;
                  const diff = defaultRate !== null ? customRate - defaultRate : null;
                  const pct = defaultRate ? ((diff / defaultRate) * 100).toFixed(0) : null;

                  return (
                    <tr key={testName} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-white">{testName}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {defaultRate !== null ? `₹${parseFloat(defaultRate).toFixed(2)}` : 'Unpriced'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{parseFloat(customRate).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {diff !== null ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                              diff < 0
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
                                : diff > 0
                                ? 'bg-amber-950/50 text-amber-300 border-amber-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {diff < 0 ? `${pct}% (Save ₹${Math.abs(diff)})` : diff > 0 ? `+${pct}%` : 'Same as default'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCustomRate(selectedDoctorId, testName)}
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                          title="Revert to Default Standard Rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {Object.keys(doctorRates[selectedDoctorId] || {}).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                      No custom rates set for this doctor. All tests automatically bill at standard default rates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: LIVE BILL CALCULATOR & AUDITOR --- */}
      {activeTab === 'calc-preview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Configure Test Scenario
            </h3>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Referring Doctor
              </label>
              <select
                value={previewDoctorId}
                onChange={(e) => setPreviewDoctorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">No Doctor Linked (Walk-in / Default)</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.clinic_name ? `(${d.clinic_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">
                Select Tests on Visit
              </label>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {Object.keys(defaultRates).map((t) => {
                  const isChecked = selectedTests.includes(t);
                  return (
                    <label
                      key={t}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTests([...selectedTests, t]);
                          } else {
                            setSelectedTests(selectedTests.filter((item) => item !== t));
                          }
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="flex-1 truncate">{t}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Calculated Billing Snapshot (Internal Staff Only)
              </span>
              {calculatedPreview && (
                <span className="text-lg font-mono font-black text-emerald-400">
                  Total: ₹{calculatedPreview.total_amount?.toFixed(2)}
                </span>
              )}
            </h3>

            {calculatedPreview?.billing_breakdown?.length > 0 ? (
              <div className="overflow-hidden border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-2.5 px-3">Test Parameter</th>
                      <th className="py-2.5 px-3 text-center">Applied Rate Source</th>
                      <th className="py-2.5 px-3 text-right">Applied Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {calculatedPreview.billing_breakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                          {item.test_name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              item.rate_source === 'doctor'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : item.rate_source === 'default'
                                ? 'bg-sky-950 text-sky-300 border-sky-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {item.rate_source === 'doctor'
                              ? '★ Doctor Tariff'
                              : item.rate_source === 'default'
                              ? 'Standard Default'
                              : 'Fallback (0.00)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          ₹{item.rate?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950/80 border-t border-slate-800">
                      <td colSpan={2} className="py-3 px-3 font-sans font-bold text-slate-300 text-right">
                        Final Calculated Total Bill:
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right text-sm">
                        ₹{calculatedPreview.total_amount?.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Select tests in the panel on the left to see the automatic rate resolution hierarchy in action.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingDoctor ? 'Edit Referring Doctor' : 'Add New Referring Doctor'}
            </h3>
            <form onSubmit={handleSaveDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Anil Sharma, MD"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Clinic / Hospital Name</label>
                <input
                  type="text"
                  placeholder="e.g. Care & Cure Diagnostic Center"
                  value={doctorForm.clinic_name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, clinic_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 ..."
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="doctor@clinic.com"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={doctorForm.is_active}
                  onChange={(e) => setDoctorForm({ ...doctorForm, is_active: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500"
                />
                Active referring practitioner
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Default Rate Modal */}
      {defaultRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Standard Default Test Rate</h3>
            <form onSubmit={handleSaveDefaultRate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Test Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Plasma Glucose-Random"
                  value={defaultRateForm.test_name}
                  onChange={(e) => setDefaultRateForm({ ...defaultRateForm, test_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Default Standard Rate (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={defaultRateForm.rate}
                  onChange={(e) => setDefaultRateForm({ ...defaultRateForm, rate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDefaultRateModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                >
                  Save Standard Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
