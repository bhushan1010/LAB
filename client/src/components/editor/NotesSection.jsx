import React from 'react';
import { BookOpen, UserCheck } from 'lucide-react';

export default function NotesSection({
  interpretation,
  setInterpretation,
  signatory,
  setSignatory,
  labConfig,
  setLabConfig,
}) {
  const safeInterpretation = interpretation || { enabled: false, increasedIn: [], decreasedIn: [] };

  return (
    <div className="space-y-4">
      {/* Clinical Interpretation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            4. Clinical Interpretation & Notes
          </h3>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(safeInterpretation.enabled)}
              onChange={(e) => setInterpretation({ ...safeInterpretation, enabled: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>Include in Report</span>
          </label>
        </div>

        {safeInterpretation.enabled && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Increased In (one cause per line)
              </label>
              <textarea
                rows={Math.max(3, (safeInterpretation.increasedIn || []).length + 1)}
                value={(safeInterpretation.increasedIn || []).join('\n')}
                onChange={(e) =>
                  setInterpretation({
                    ...safeInterpretation,
                    increasedIn: e.target.value.split('\n'),
                  })
                }
                placeholder="Diabetes Mellitus&#10;Stress&#10;Acute pancreatitis"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-sans leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Decreased In (one cause per line)
              </label>
              <textarea
                rows={Math.max(3, (safeInterpretation.decreasedIn || []).length + 1)}
                value={(safeInterpretation.decreasedIn || []).join('\n')}
                onChange={(e) =>
                  setInterpretation({
                    ...safeInterpretation,
                    decreasedIn: e.target.value.split('\n'),
                  })
                }
                placeholder="Pancreatic disorders&#10;Malnutrition&#10;Endocrine disorders"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-sans leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Clinical Disclaimer Note</label>
              <textarea
                rows={Math.max(3, (interpretation.disclaimer || '').split('\n').length + 1)}
                value={interpretation.disclaimer}
                onChange={(e) =>
                  setInterpretation({ ...interpretation, disclaimer: e.target.value })
                }
                placeholder="Test result can vary as per timing of sample collection..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-sans leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* Doctor Signatory & Printing Options */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 text-xs">
        <div className="border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-rose-400" />
            5. Signatory & Print Mode
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Pathologist Name</label>
            <input
              type="text"
              value={signatory.name}
              onChange={(e) => setSignatory({ ...signatory, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Qualifications</label>
            <input
              type="text"
              value={signatory.qualifications}
              onChange={(e) => setSignatory({ ...signatory, qualifications: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Registration No.</label>
            <input
              type="text"
              value={signatory.reg_no}
              onChange={(e) => setSignatory({ ...signatory, reg_no: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
