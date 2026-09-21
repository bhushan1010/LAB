import React, { useState } from 'react';
import { StatusChip, StepRail, ThemeToggle, useTheme, SyncBadge } from '@shared/ui';
import { ArrowLeft, Beaker, ShieldAlert, Sparkles } from 'lucide-react';

export default function UiPreview() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(2);

  const demoSteps = [
    { id: 1, label: 'Patient Demographics', sublabel: 'UHID & Intake' },
    { id: 2, label: 'Accessioning & Visit', sublabel: 'Sample Tube Barcode' },
    { id: 3, label: 'Clinical Parameters', sublabel: 'Biochemistry / CBC' },
    { id: 4, label: 'Pathologist Review', sublabel: 'Verification & Stamp' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080e1d] text-slate-900 dark:text-slate-100 p-6 md:p-10 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                Phase 1 Preview
              </span>
              <span className="text-xs text-slate-500 font-mono">@shared/ui</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Design Tokens & Primitives Testbed
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Isolated visual verification for StatusChip, StepRail, ThemeToggle, and CSS priority tokens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SyncBadge />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <a
              href="#/dashboard"
              className="p-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </a>
          </div>
        </div>

        {/* Section 1: StepRail */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                StepRail Component (Interactive)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any step below to test state transitions, checkmark badges, and active rings.
              </p>
            </div>
            <div className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Active Step: {currentStep} / {demoSteps.length}
            </div>
          </div>

          <div className="py-2">
            <StepRail
              steps={demoSteps}
              currentStep={currentStep}
              onSelectStep={(stepId) => setCurrentStep(Number(stepId))}
            />
          </div>

          <div className="flex items-center gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep <= 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition"
            >
              Previous Step
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(demoSteps.length, prev + 1))}
              disabled={currentStep >= demoSteps.length}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition"
            >
              Next Step
            </button>
          </div>
        </div>

        {/* Section 2: StatusChip - 3-Tier Clinical Attention Hierarchy */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              StatusChip Component (3-Tier Clinical Attention Hierarchy)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying visual contrast, icon mapping, and size density across all clinical lifecycle states.
            </p>
          </div>

          {/* Tier 1 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">
                Tier 1 • Urgent Action Required & Critical Alerts
              </span>
              <span className="text-[10px] text-slate-400 font-mono">(Warm high-contrast rose & amber)</span>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <StatusChip status="DOCTOR_APPROVAL" />
              <StatusChip status="CRITICAL" />
              <StatusChip status="STAT" />
              <StatusChip status="PENDING_PRINT" />
              <StatusChip status="CANCELLED" />
              <StatusChip status="AUTH_FORBIDDEN" />
            </div>
          </div>

          {/* Tier 2 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
                Tier 2 • In-Progress & Intake Workflows
              </span>
              <span className="text-[10px] text-slate-400 font-mono">(Cool clinical sky & cyan)</span>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <StatusChip status="REGISTERED" />
              <StatusChip status="TESTING" />
              <StatusChip status="IN_TESTING" />
              <StatusChip status="SYNCED" />
              <StatusChip status="DRAFT" />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Tier 3 • Resolved & Routine Dispatches
              </span>
              <span className="text-[10px] text-slate-400 font-mono">(Calm emerald & neutral slate)</span>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <StatusChip status="APPROVED" />
              <StatusChip status="PRINTED" />
              <StatusChip status="DISPATCHED" />
              <StatusChip status="NORMAL" />
              <StatusChip status="LOGIN_SUCCESS" />
              <StatusChip status="ROUTINE" />
            </div>
          </div>

          {/* Sizes */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              Density Sizes (sm, md, lg)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status="DOCTOR_APPROVAL" size="sm" />
              <StatusChip status="DOCTOR_APPROVAL" size="md" />
              <StatusChip status="DOCTOR_APPROVAL" size="lg" />
            </div>
          </div>
        </div>

        {/* Section 3: Theme Infrastructure */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Theme Infrastructure Verification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Active Theme</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 capitalize">
                {theme} Mode {isDark ? '🌙' : '☀️'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">HTML Root Class</div>
              <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                {isDark ? '<html class="dark">' : '<html class="">'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Storage Sync Key</div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-1">
                localStorage['labtrack_theme']
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
