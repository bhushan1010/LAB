import React from 'react';
import { Plus, Trash2, FlaskConical, Sparkles } from 'lucide-react';
import { DEFAULT_REPORT_DATA, CBC_PRESET, LIPID_PRESET } from '@shared/clinical-presets';

export default function TestResultsTable({
  department,
  setDepartment,
  testResults,
  setTestResults,
  onLoadPreset,
}) {
  const addRow = () => {
    const newTest = {
      id: `test-${Date.now()}`,
      test_name: '',
      result_value: '',
      unit: '',
      reference_range: '',
      method: '',
      flag: 'NORMAL',
    };
    setTestResults([...testResults, newTest]);
  };

  const removeRow = (index) => {
    if (testResults.length === 1) {
      // Clear the last row instead of deleting all
      setTestResults([
        {
          id: `test-${Date.now()}`,
          test_name: '',
          result_value: '',
          unit: '',
          reference_range: '',
          method: '',
          flag: 'NORMAL',
        },
      ]);
      return;
    }
    const updated = testResults.filter((_, i) => i !== index);
    setTestResults(updated);
  };

  const updateRow = (index, field, value) => {
    const updated = [...testResults];
    updated[index] = { ...updated[index], [field]: value };
    setTestResults(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-purple-400" />
          3. Freeform Test Parameters
        </h3>

        {/* Quick Presets Menu */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Quick Fill:</span>
          <button
            type="button"
            onClick={() => onLoadPreset(DEFAULT_REPORT_DATA)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 transition"
          >
            Glucose
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset(CBC_PRESET)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 transition"
          >
            CBC
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset(LIPID_PRESET)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 transition"
          >
            Lipid
          </button>
        </div>
      </div>

      {/* Department Name */}
      <div>
        <label className="block text-slate-400 text-xs mb-1 font-medium">Department Name</label>
        <input
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. DEPARTMENT OF BIOCHEMISTRY"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-semibold focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Test Rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span className="col-span-4">Test Name *</span>
          <span className="col-span-2 text-center">Result *</span>
          <span className="col-span-1 text-center">Unit</span>
          <span className="col-span-2 text-center">Ref. Range</span>
          <span className="col-span-2">Method</span>
          <span className="col-span-1 text-center">Del</span>
        </div>

        {testResults.map((test, index) => (
          <div key={test.id || index} className="grid grid-cols-12 gap-2 items-center text-xs">
            {/* Test Name */}
            <div className="col-span-4">
              <input
                type="text"
                required
                placeholder="e.g. Plasma Glucose-Random"
                value={test.test_name}
                onChange={(e) => updateRow(index, 'test_name', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Result Value */}
            <div className="col-span-2">
              <input
                type="text"
                required
                placeholder="e.g. 114"
                value={test.result_value}
                onChange={(e) => updateRow(index, 'result_value', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-bold text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Unit */}
            <div className="col-span-1">
              <input
                type="text"
                placeholder="mg/dl"
                value={test.unit}
                onChange={(e) => updateRow(index, 'unit', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1.5 text-white text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Bio Ref Range */}
            <div className="col-span-2">
              <input
                type="text"
                placeholder="60-140"
                value={test.reference_range}
                onChange={(e) => updateRow(index, 'reference_range', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Method */}
            <div className="col-span-2">
              <input
                type="text"
                placeholder="GOD-POD"
                value={test.method}
                onChange={(e) => updateRow(index, 'method', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Delete button */}
            <div className="col-span-1 flex justify-center">
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full py-2 border-2 border-dashed border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/20 text-xs font-semibold text-purple-400 rounded-lg flex items-center justify-center gap-1.5 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Another Test Parameter
      </button>
    </div>
  );
}
