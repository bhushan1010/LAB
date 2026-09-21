import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, Plus, Loader2 } from 'lucide-react';
import api from '@core/api';
import { DEMO_PRESETS } from '@shared/clinical-presets';
import { getQueuedReports } from '@core/offline';

export default function PatientSection({ patient, setPatient, onSelectPatient, onNewPatient }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const searchContainerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (queryText = '') => {
    const q = queryText.trim().toLowerCase();
    setSearching(true);
    try {
      const results = [];
      const seenUhids = new Set();

      // 1. Check presets
      DEMO_PRESETS.forEach((item) => {
        const pt = item.preset.patient;
        if (
          !q ||
          pt.full_name?.toLowerCase().includes(q) ||
          pt.uhid?.toLowerCase().includes(q) ||
          pt.phone?.includes(q) ||
          item.label.toLowerCase().includes(q)
        ) {
          if (!seenUhids.has(pt.uhid)) {
            seenUhids.add(pt.uhid);
            results.push({
              ...pt,
              _preset: item.preset,
              _label: item.label,
              _dept: item.dept || item.preset.department?.replace('DEPARTMENT OF ', ''),
            });
          }
        }
      });

      // 2. Check local IndexedDB queued reports
      try {
        const local = await getQueuedReports();
        local.forEach((r) => {
          const pt = r.patient;
          if (pt && pt.uhid && !seenUhids.has(pt.uhid)) {
            if (
              !q ||
              pt.full_name?.toLowerCase().includes(q) ||
              pt.uhid?.toLowerCase().includes(q) ||
              pt.phone?.includes(q)
            ) {
              seenUhids.add(pt.uhid);
              results.push({
                ...pt,
                _localReport: r,
                _label: `${pt.full_name} (${r.report_code || 'Local'})`,
                _dept: r.department?.replace('DEPARTMENT OF ', '') || 'Saved',
              });
            }
          }
        });
      } catch (err) {
        console.warn('IDB lookup warning:', err);
      }

      // 3. Search server API if online
      if (navigator.onLine && q) {
        try {
          const res = await api.get(`/patients?search=${encodeURIComponent(q)}`);
          if (res.data.success && res.data.patients) {
            res.data.patients.forEach((pt) => {
              if (!seenUhids.has(pt.uhid)) {
                seenUhids.add(pt.uhid);
                results.push({
                  ...pt,
                  _label: `${pt.title || ''} ${pt.full_name}`,
                  _dept: 'Database Record',
                });
              }
            });
          }
        } catch (apiErr) {
          console.warn('API patient search error:', apiErr);
        }
      }

      setSearchResults(results);
      setSearchOpen(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const selectPatient = async (p) => {
    setSearching(true);
    try {
      // 1. If p has direct preset reference
      if (p._preset) {
        if (onSelectPatient) {
          onSelectPatient({
            ...p._preset,
            patient: {
              ...p._preset.patient,
              ...p,
            },
          });
        }
        setSearchOpen(false);
        return;
      }

      // 2. If p has direct local report reference
      if (p._localReport) {
        if (onSelectPatient) {
          onSelectPatient(p._localReport);
        }
        setSearchOpen(false);
        return;
      }

      // 3. Check matching DEMO_PRESETS
      const matchedPreset = DEMO_PRESETS.find((item) => {
        const pt = item.preset.patient;
        return (
          (p.id && pt.id === p.id) ||
          (p.uhid && pt.uhid?.toLowerCase() === p.uhid.toLowerCase()) ||
          (p.full_name && pt.full_name?.toLowerCase() === p.full_name.toLowerCase())
        );
      })?.preset;

      if (matchedPreset) {
        if (onSelectPatient) {
          onSelectPatient({
            ...matchedPreset,
            patient: {
              ...matchedPreset.patient,
              ...p,
            },
          });
        }
        setSearchOpen(false);
        return;
      }

      // 4. Check local IndexedDB reports
      try {
        const localReports = await getQueuedReports();
        const matchedLocal = localReports.find(
          (r) =>
            (p.id && r.patient?.id === p.id) ||
            (p.uhid && r.patient?.uhid?.toLowerCase() === p.uhid.toLowerCase())
        );
        if (matchedLocal) {
          if (onSelectPatient) {
            onSelectPatient(matchedLocal);
          }
          setSearchOpen(false);
          return;
        }
      } catch (idbErr) {
        console.warn('IDB lookup warning:', idbErr);
      }

      // 5. Query server API if online
      if (navigator.onLine && p.id) {
        try {
          const res = await api.get(`/patients/${p.id}`);
          if (res.data.success && res.data.patient) {
            const pData = res.data.patient;
            const visits = pData.visits || [];
            if (visits.length > 0) {
              const latestVisit = visits[0];
              if (latestVisit.report_id) {
                const repRes = await api.get(`/reports/${latestVisit.report_id}`);
                if (repRes.data.success && repRes.data.report) {
                  const r = repRes.data.report;
                  if (onSelectPatient) {
                    onSelectPatient({
                      patient: {
                        id: pData.id,
                        uhid: pData.uhid,
                        title: pData.title || 'Mr.',
                        full_name: pData.full_name,
                        age_years: pData.age_years || '',
                        age_months: pData.age_months || 0,
                        age_days: pData.age_days || 0,
                        gender: pData.gender || 'M',
                        phone: pData.phone || '',
                      },
                      visit: {
                        id: latestVisit.id,
                        visit_code: latestVisit.visit_code,
                        ref_doctor: latestVisit.ref_doctor || 'Dr. SAMPLE REFERRER',
                        client_name: latestVisit.client_name || 'SAMPLE CLINIC',
                        client_code: latestVisit.client_code || '0001',
                        rch_id_mcts_id: latestVisit.rch_id_mcts_id || '',
                        sample_type: latestVisit.sample_type || 'SERUM',
                        collected_at: latestVisit.collected_at
                          ? new Date(latestVisit.collected_at).toLocaleString('en-IN')
                          : new Date().toLocaleString('en-IN'),
                        reported_at: latestVisit.reported_at
                          ? new Date(latestVisit.reported_at).toLocaleString('en-IN')
                          : new Date().toLocaleString('en-IN'),
                        status: latestVisit.status || 'Final Report',
                      },
                      barcode_value: r.barcode_value || 'F' + Date.now().toString().slice(-8),
                      qr_token: r.qr_token,
                      department: r.test_results?.[0]?.department
                        ? `DEPARTMENT OF ${r.test_results[0].department.toUpperCase()}`
                        : 'DEPARTMENT OF BIOCHEMISTRY',
                      testResults:
                        r.test_results && r.test_results.length > 0
                          ? r.test_results.map((tr) => ({
                              id: tr.id,
                              test_name: tr.test_name,
                              result_value: tr.result_value,
                              unit: tr.unit || '',
                              reference_range: tr.reference_range || '',
                              method: tr.method || '',
                              flag: tr.flag || 'NORMAL',
                            }))
                          : [
                              {
                                id: `test-${Date.now()}-1`,
                                test_name: '',
                                result_value: '',
                                unit: '',
                                reference_range: '',
                                method: '',
                                flag: 'NORMAL',
                              },
                            ],
                      interpretation: r.interpretation
                        ? typeof r.interpretation === 'string'
                          ? JSON.parse(r.interpretation)
                          : r.interpretation
                        : {
                            enabled: false,
                            increasedIn: [],
                            decreasedIn: [],
                            disclaimer: '',
                          },
                    });
                  }
                  setSearchOpen(false);
                  return;
                }
              }
            }
          }
        } catch (apiErr) {
          console.warn('API lookup error for patient:', apiErr);
        }
      }

      // 6. If patient has no prior visits or reports (new encounter for existing patient)
      if (onSelectPatient) {
        onSelectPatient({
          patient: {
            id: p.id,
            uhid: p.uhid,
            title: p.title || 'Mr.',
            full_name: p.full_name,
            age_years: p.age_years || '',
            age_months: p.age_months || 0,
            age_days: p.age_days || 0,
            gender: p.gender || 'M',
            phone: p.phone || '',
          },
          visit: {
            id: 'visit-' + Date.now(),
            visit_code: 'DEMO' + Date.now().toString().slice(-6),
            ref_doctor: 'Dr. SAMPLE REFERRER',
            client_name: 'SAMPLE CLINIC',
            client_code: '0001',
            rch_id_mcts_id: '',
            sample_type: 'WHOLE BLOOD EDTA / SERUM',
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
              id: 'test-' + Date.now() + '-1',
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
        });
      } else {
        setPatient({
          id: p.id,
          uhid: p.uhid,
          title: p.title || 'Mr.',
          full_name: p.full_name,
          age_years: p.age_years || '',
          age_months: p.age_months || 0,
          age_days: p.age_days || 0,
          gender: p.gender || 'M',
          phone: p.phone || '',
        });
      }
    } finally {
      setSearching(false);
      setSearchOpen(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-400" />
          1. Patient Demographics
        </h3>
        <div className="flex items-center gap-2">
          {patient.id && (
            <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <Check className="w-3 h-3" /> Existing Patient
            </span>
          )}
          {onNewPatient && (
            <button
              type="button"
              onClick={onNewPatient}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full transition flex items-center gap-1 font-medium"
              title="Start a new patient encounter from scratch"
            >
              <Plus className="w-3 h-3 text-emerald-400" /> New Patient
            </button>
          )}
        </div>
      </div>

      {/* Search Bar for Existing Patient */}
      <div className="relative" ref={searchContainerRef}>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient by Name, UHID, Phone, or Test Profile..."
              value={searchQuery}
              onFocus={() => {
                if (!searchOpen) performSearch(searchQuery);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                performSearch(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition flex items-center gap-1"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchOpen && (
          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
            {searchResults.length > 0 ? (
              searchResults.map((p, idx) => (
                <div
                  key={p.id || p.uhid || idx}
                  onClick={() => selectPatient(p)}
                  className="p-2.5 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{p.title} {p.full_name}</span>
                      {p._dept && (
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-normal">
                          {p._dept}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      UHID: <span className="font-mono text-slate-300">{p.uhid}</span> {p.phone ? `| Phone: ${p.phone}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {p.age_years ? `${p.age_years} Y` : ''} / {p.gender}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-slate-400 text-center">
                {searching ? 'Searching records...' : `No patient records found for "${searchQuery}"`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-6 gap-3 text-xs">
        <div className="col-span-1">
          <label className="block text-slate-400 mb-1 font-medium">Title</label>
          <select
            value={patient.title}
            onChange={(e) => setPatient({ ...patient, title: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="Mr.">Mr.</option>
            <option value="Mrs.">Mrs.</option>
            <option value="Ms.">Ms.</option>
            <option value="Master">Master</option>
            <option value="Baby">Baby</option>
            <option value="Dr.">Dr.</option>
          </select>
        </div>

        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Full Name *</label>
          <input
            type="text"
            required
            value={patient.full_name}
            onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
            placeholder="e.g. RAHUL DEMO"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-slate-400 mb-1 font-medium">UHID / MR No</label>
          <input
            type="text"
            value={patient.uhid}
            onChange={(e) => setPatient({ ...patient, uhid: e.target.value })}
            placeholder="0001-PP26-4821 or WALK-AA26-8192"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-slate-400 mb-1 font-medium">Age (Years)</label>
          <input
            type="number"
            min="0"
            max="130"
            value={patient.age_years}
            onChange={(e) => setPatient({ ...patient, age_years: parseInt(e.target.value) || '' })}
            placeholder="e.g. 45"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-slate-400 mb-1 font-medium">Gender *</label>
          <select
            value={patient.gender}
            onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="M">Male (M)</option>
            <option value="F">Female (F)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-slate-400 mb-1 font-medium flex justify-between items-center">
            <span>Phone</span>
            <span className="text-[10px] text-slate-500">10 digits</span>
          </label>
          <input
            type="tel"
            maxLength={10}
            value={patient.phone}
            onChange={(e) => {
              const numeric = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPatient({ ...patient, phone: numeric });
              if (numeric && numeric.length !== 10) {
                setPhoneError(`Must be 10 digits (${numeric.length}/10)`);
              } else {
                setPhoneError('');
              }
            }}
            placeholder="10-digit Mobile"
            className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 text-white focus:outline-none font-mono text-xs ${
              phoneError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
            }`}
          />
          {phoneError && (
            <span className="text-[10px] text-rose-400 font-medium block mt-1">
              {phoneError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
