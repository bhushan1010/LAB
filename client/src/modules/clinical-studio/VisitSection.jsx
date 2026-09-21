import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export default function VisitSection({ visit, setVisit, barcodeValue, setBarcodeValue }) {
  const generateNewBarcode = () => {
    const num = Math.floor(10000000 + Math.random() * 90000000);
    setBarcodeValue(`F${num}`);
  };

  const generateNewVisitCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    setVisit({ ...visit, visit_code: `MIND${num}` });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          2. Visit & Specimen Details
        </h3>
      </div>

      <div className="grid grid-cols-6 gap-3 text-xs">
        {/* Visit Code */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 font-medium">Visit ID / Code *</label>
            <button
              type="button"
              onClick={generateNewVisitCode}
              className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
            </button>
          </div>
          <input
            type="text"
            required
            value={visit.visit_code}
            onChange={(e) => setVisit({ ...visit, visit_code: e.target.value })}
            placeholder="e.g. DEMO000001"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Barcode Value */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 font-medium">Sample Barcode *</label>
            <button
              type="button"
              onClick={generateNewBarcode}
              className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" /> New Code
            </button>
          </div>
          <input
            type="text"
            required
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            placeholder="e.g. F00000001"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Referring Doctor */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Referring Doctor</label>
          <input
            type="text"
            value={visit.ref_doctor}
            onChange={(e) => setVisit({ ...visit, ref_doctor: e.target.value })}
            placeholder="e.g. Dr. SAMPLE REFERRER"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Client Name / Center */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Client / Hospital Name</label>
          <input
            type="text"
            value={visit.client_name}
            onChange={(e) => setVisit({ ...visit, client_name: e.target.value })}
            placeholder="e.g. SAMPLE CLINIC"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Specimen / Sample Type */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Sample Type *</label>
          <input
            type="text"
            required
            value={visit.sample_type}
            onChange={(e) => setVisit({ ...visit, sample_type: e.target.value })}
            placeholder="e.g. FLOURIDE PLASMA (R)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Client Code */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Client Code</label>
          <input
            type="text"
            value={visit.client_code}
            onChange={(e) => setVisit({ ...visit, client_code: e.target.value })}
            placeholder="e.g. 6578"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Collected Timestamp */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Collected Timestamp</label>
          <input
            type="text"
            value={visit.collected_at}
            onChange={(e) => setVisit({ ...visit, collected_at: e.target.value })}
            placeholder="01/Sep/2026 02:23PM"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Reported Timestamp */}
        <div className="col-span-3">
          <label className="block text-slate-400 mb-1 font-medium">Reported Timestamp</label>
          <input
            type="text"
            value={visit.reported_at}
            onChange={(e) => setVisit({ ...visit, reported_at: e.target.value })}
            placeholder="01/Sep/2026 03:59PM"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>
    </div>
  );
}
