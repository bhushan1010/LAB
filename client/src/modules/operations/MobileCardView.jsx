import React, { useState } from 'react';
import { StatusChip } from '@shared/ui';
import {
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Clock,
  Printer,
  FileEdit,
  UserCheck,
} from 'lucide-react';

/**
 * MobileCardView - Responsive touch-friendly card list for Workflow Tracker on mobile viewports
 *
 * @param {Object} props
 * @param {Array} props.items - List of workflow items
 * @param {string} props.role - Active user role ('front-desk' | 'lab-tech' | 'doctor' | 'admin')
 * @param {Function} [props.onEditReport] - Open report in studio handler
 * @param {Function} [props.onOpenApproval] - Trigger doctor approval modal
 * @param {Function} [props.onNavigate] - Navigate to a specific view
 */
export function MobileCardView({
  items = [],
  role = 'front-desk',
  onEditReport,
  onOpenApproval,
  onNavigate,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (e, text) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (_) {}
  };

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 shadow-xs">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Samples Found</h3>
        <p className="text-xs text-slate-500 mt-1">Try clearing your search or stage filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const { visit, report, stage, isCancelled, cancellationReason } = item;
        const isCopied = copiedId === visit.visit_code;
        const isStat =
          visit.sample_type?.toUpperCase().includes('STAT') || visit.urgency === 'STAT';

        // Map internal stage to StatusChip status
        let chipStatus = 'REGISTERED';
        if (isCancelled) chipStatus = 'CANCELLED';
        else if (stage === 'approval') chipStatus = 'DOCTOR_APPROVAL';
        else if (stage === 'testing') chipStatus = 'TESTING';
        else if (stage === 'done') chipStatus = report?.printed_at ? 'PRINTED' : 'APPROVED';

        return (
          <div
            key={visit.id}
            id={`mobile-card-${visit.id}`}
            className={`p-4 rounded-xl border transition-all shadow-xs space-y-3 ${
              isCancelled
                ? 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800 bg-rose-50/20 dark:bg-rose-950/20 opacity-80'
                : isStat
                ? 'border-l-4 border-l-rose-600 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30'
                : stage === 'approval'
                ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]'
            }`}
          >
            {/* Top row: Visit Code, Copy, and StatusChip */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  VISIT:
                </span>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {visit.visit_code}
                </span>
                <button
                  type="button"
                  id={`mobile-copy-${visit.id}`}
                  onClick={(e) => handleCopy(e, visit.visit_code)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Copy visit ID"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div>
                <StatusChip status={chipStatus} size="sm" />
              </div>
            </div>

            {/* Middle row: Patient Information */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span
                  className={`font-bold text-sm tracking-wide ${
                    isCancelled
                      ? 'line-through text-slate-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {visit.patient_name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {visit.patient_uhid}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  {visit.sample_type || 'General Sample'}
                </span>
                {visit.ref_doctor && <span>Dr: {visit.ref_doctor}</span>}
                {visit.client_name && <span>• Clinic: {visit.client_name}</span>}
              </div>

              {isCancelled && (
                <div className="mt-2 p-2 bg-rose-950/20 border border-rose-900/40 rounded text-[11px] text-rose-300 font-mono">
                  Reason: {cancellationReason || 'Sample cancelled'}
                </div>
              )}
            </div>

            {/* Bottom row: Action Buttons */}
            {!isCancelled && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-[10px] text-slate-400 font-mono">
                  {report?.report_code ? `#${report.report_code}` : 'No Report Yet'}
                </div>

                <div className="flex items-center gap-2">
                  {/* Doctor Approval Action */}
                  {stage === 'approval' && ['doctor', 'admin'].includes(role) && onOpenApproval && (
                    <button
                      type="button"
                      onClick={() => onOpenApproval(item, 'approved')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  )}

                  {/* Lab Tech / Admin Edit in Studio */}
                  {role !== 'front-desk' && onEditReport && (
                    <button
                      type="button"
                      onClick={() => onEditReport(report || visit)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Studio</span>
                    </button>
                  )}

                  {/* Print Queue link if done */}
                  {stage === 'done' && onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('print-queue')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Queue</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MobileCardView;
