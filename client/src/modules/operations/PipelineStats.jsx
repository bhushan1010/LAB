import React from 'react';
import { Clock, FlaskConical, UserCheck, CheckCircle2, Layers, Flame } from 'lucide-react';

/**
 * PipelineStats - Visual pipeline stage breakdown for Workflow Tracker & Dashboard
 *
 * @param {Object} props
 * @param {Array} props.items - List of workflow items ({ stage, isCancelled, visit, report })
 * @param {string} props.currentStatusFilter - Active stage filter ID ('ALL', 'PRIORITY_IMP', 'registered', 'testing', 'approval', 'done')
 * @param {Function} props.onSelectFilter - Callback when a stage tile is selected
 */
export function PipelineStats({
  items = [],
  currentStatusFilter = 'ALL',
  onSelectFilter = () => {},
}) {
  const activeItems = items.filter((i) => !i.isCancelled);

  // Priority count: STAT / URGENT (check visit or report urgency/stat)
  const statCount = activeItems.filter(
    (i) => i.visit?.sample_type?.toUpperCase().includes('STAT') || i.visit?.urgency === 'STAT'
  ).length;
  const urgentCount = activeItems.filter(
    (i) => i.visit?.sample_type?.toUpperCase().includes('URGENT') || i.visit?.urgency === 'URGENT'
  ).length;
  const impTotal = statCount + urgentCount;

  // Counts mapped directly from Workflow Tracker's stage classification
  const registeredCount = activeItems.filter((i) => i.stage === 'registered').length;
  const testingCount = activeItems.filter((i) => i.stage === 'testing').length;
  const approvalCount = activeItems.filter((i) => i.stage === 'approval').length;
  const doneCount = activeItems.filter((i) => i.stage === 'done').length;
  const totalActive = activeItems.length;

  const stages = [
    {
      id: 'ALL',
      title: 'TOTAL ACTIVE',
      count: totalActive,
      icon: Layers,
      color: 'slate',
      badgeClass: 'bg-white dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-800',
      activeRing: 'ring-2 ring-slate-500 dark:ring-slate-300 bg-slate-100 dark:bg-slate-900',
      subtext: 'All active samples',
    },
    {
      id: 'PRIORITY_IMP',
      stageNum: '!',
      title: 'IMP / STAT FIRST',
      count: impTotal,
      icon: Flame,
      color: 'rose',
      badgeClass: 'bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-800',
      activeRing: 'ring-2 ring-rose-600 dark:ring-rose-400 bg-rose-100 dark:bg-rose-900/80 shadow-xs',
      isPriority: true,
      subtext: `${statCount} STAT • ${urgentCount} Urgent`,
    },
    {
      id: 'registered',
      stageNum: '1',
      title: 'STAGE 1 • INTAKE',
      count: registeredCount,
      icon: Clock,
      color: 'cyan',
      badgeClass: 'bg-sky-50 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
      activeRing: 'ring-2 ring-sky-600 dark:ring-sky-400 bg-sky-100 dark:bg-sky-950',
      subtext: 'Pending accessioning',
    },
    {
      id: 'testing',
      stageNum: '2',
      title: 'STAGE 2 • TESTING',
      count: testingCount,
      icon: FlaskConical,
      color: 'amber',
      badgeClass: 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
      activeRing: 'ring-2 ring-amber-600 dark:ring-amber-400 bg-amber-100 dark:bg-amber-950',
      subtext: 'Analyzer bench work',
    },
    {
      id: 'approval',
      stageNum: '3',
      title: 'STAGE 3 • MD APPROVAL',
      count: approvalCount,
      icon: UserCheck,
      color: 'indigo',
      badgeClass: 'bg-indigo-50 text-indigo-950 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800',
      activeRing: 'ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-100 dark:bg-indigo-950',
      subtext: 'Awaiting pathologist sign',
    },
    {
      id: 'done',
      stageNum: '4',
      title: 'STAGE 4 • DONE',
      count: doneCount,
      icon: CheckCircle2,
      color: 'emerald',
      badgeClass: 'bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
      activeRing: 'ring-2 ring-emerald-600 dark:ring-emerald-400 bg-emerald-100 dark:bg-emerald-950',
      subtext: 'Approved / Dispatched',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 my-4">
      {stages.map((stage) => {
        const Icon = stage.icon;
        const isSelected = currentStatusFilter === stage.id;
        return (
          <button
            key={stage.id}
            type="button"
            id={`stat-card-${stage.id.toLowerCase()}`}
            onClick={() => onSelectFilter(stage.id)}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between shadow-xs cursor-pointer ${
              stage.badgeClass
            } ${
              isSelected
                ? `${stage.activeRing} shadow-md scale-[1.01]`
                : 'hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                {stage.stageNum && (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                      stage.isPriority
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {stage.stageNum}
                  </span>
                )}
                <span
                  className={`truncate ${
                    stage.isPriority
                      ? 'text-rose-900 dark:text-rose-200 font-extrabold'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {stage.title}
                </span>
              </span>
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  stage.isPriority ? 'text-rose-600 dark:text-rose-400' : 'opacity-70'
                }`}
              />
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                  stage.isPriority
                    ? 'text-rose-900 dark:text-rose-100 font-extrabold'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {stage.count}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                {stage.subtext}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default PipelineStats;
