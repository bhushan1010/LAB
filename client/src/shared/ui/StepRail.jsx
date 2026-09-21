import React from 'react';
import { Check } from 'lucide-react';

/**
 * StepRail - Clinical Multi-Step Wizard Progress Bar
 *
 * @param {Object} props
 * @param {Array<{id: number|string, label: string, sublabel?: string, icon?: React.ReactNode}>} props.steps - List of wizard steps
 * @param {number|string} props.currentStep - Active step identifier
 * @param {Function} [props.onSelectStep] - Callback triggered when a step item is selected
 * @param {string} [props.className] - Additional utility classes
 */
export function StepRail({
  steps = [],
  currentStep = 1,
  onSelectStep = () => {},
  className = '',
}) {
  return (
    <nav
      aria-label="Wizard Steps"
      className={`w-full overflow-x-auto pb-2 scrollbar-none ${className}`}
    >
      <ol className="flex items-center justify-between min-w-[580px] sm:min-w-0 border-b border-slate-200 dark:border-slate-800 pb-3">
        {steps.map((step, idx) => {
          const isCompleted = typeof step.id === 'number' && typeof currentStep === 'number'
            ? step.id < currentStep
            : idx < steps.findIndex((s) => s.id === currentStep);
          const isCurrent = step.id === currentStep;

          return (
            <li key={step.id} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => onSelectStep(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`group flex items-center gap-2.5 text-left transition-colors focus:outline-none cursor-pointer ${
                  isCurrent
                    ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                    : isCompleted
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-cyan-600 text-white ring-4 ring-cyan-100 dark:ring-cyan-950/60 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs tracking-tight line-clamp-1">
                    {step.label}
                  </span>
                  {step.sublabel && (
                    <span className="text-[10px] text-slate-400 font-normal hidden md:inline">
                      {step.sublabel}
                    </span>
                  )}
                </div>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-3 transition-colors ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default StepRail;
