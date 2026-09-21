import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Printer,
  UserCheck,
  Flame,
  FileText,
} from 'lucide-react';

/**
 * StatusChip - Clinical Status Indicator with 3-Tier Attention Hierarchy
 *
 * Tier 1 (Action Required / Alert / Error): Warm high-contrast rose / amber
 * Tier 2 (In-Progress / Intake / Testing): Cool blue / sky
 * Tier 3 (Resolved / Dispatched / Routine): Calm emerald / slate neutral
 *
 * @param {Object} props
 * @param {string} props.status - The status code or label (case-insensitive)
 * @param {'success'|'warning'|'error'|'info'|'neutral'} [props.type] - Explicit semantic variant override
 * @param {1|2|3} [props.tier] - Explicit clinical attention tier override
 * @param {string} [props.label] - Custom display label override
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Visual density size
 * @param {React.ElementType} [props.icon] - Custom icon component override
 * @param {string} [props.className] - Additional utility classes
 */
export function StatusChip({
  status = '',
  type: propType,
  tier: explicitTier,
  label,
  size = 'md',
  icon: CustomIcon,
  className = '',
  ...rest
}) {
  const norm = String(status || '').toUpperCase().trim().replace(/[- ]/g, '_');

  let tier = explicitTier || 3;
  let type = propType || 'neutral';
  let Icon = CustomIcon || FileText;
  let styleClasses = '';
  let iconClass = '';

  if (
    propType === 'error' ||
    norm === 'CRITICAL' ||
    norm === 'AUTH_FORBIDDEN' ||
    norm === 'FAILED' ||
    norm === 'ERROR' ||
    norm === 'CANCELLED' ||
    norm === 'CANCELED' ||
    norm === 'REJECTED' ||
    norm === 'EMERGENCY'
  ) {
    tier = 1;
    type = 'error';
    Icon = CustomIcon || (norm === 'AUTH_FORBIDDEN' ? ShieldAlert : norm === 'CRITICAL' ? AlertTriangle : norm.includes('CANCEL') ? XCircle : AlertCircle);
    styleClasses = 'bg-rose-600 text-white font-bold border border-rose-700 shadow-xs dark:bg-rose-600 dark:text-white dark:border-rose-700';
    iconClass = 'text-white';
  } else if (
    propType === 'warning' ||
    norm === 'DOCTOR_APPROVAL' ||
    norm === 'APPROVAL' ||
    norm === 'PENDING_APPROVAL' ||
    norm === 'APPROVAL_PENDING' ||
    norm === 'PENDING_PRINT' ||
    norm === 'HIGH' ||
    norm === 'STAT' ||
    norm === 'URGENT'
  ) {
    tier = 1;
    type = 'warning';
    Icon = CustomIcon || (norm === 'DOCTOR_APPROVAL' || norm === 'APPROVAL' || norm.includes('APPROVAL') ? UserCheck : norm.includes('PRINT') ? Printer : norm === 'STAT' || norm === 'URGENT' ? Flame : AlertTriangle);
    styleClasses = 'bg-amber-500 text-slate-950 font-bold border border-amber-600 shadow-xs dark:bg-amber-500 dark:text-slate-950 dark:border-amber-400';
    iconClass = 'text-slate-950';
  } else if (
    propType === 'info' ||
    norm === 'TESTING' ||
    norm === 'IN_TESTING' ||
    norm === 'IN_PROGRESS' ||
    norm === 'REGISTERED' ||
    norm === 'INTAKE' ||
    norm === 'SYNCED' ||
    norm === 'COLLECTED' ||
    norm === 'SAMPLE_COLLECTION' ||
    norm === 'LOW' ||
    norm === 'REVIEW' ||
    norm === 'DRAFT'
  ) {
    tier = 2;
    type = 'info';
    Icon = CustomIcon || (norm === 'TESTING' || norm === 'IN_TESTING' ? RotateCw : norm === 'SYNCED' ? CheckCircle2 : Clock);
    styleClasses = 'bg-sky-100 text-sky-900 border border-sky-300 font-semibold dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700';
    iconClass = 'text-sky-700 dark:text-sky-300';
  } else if (
    propType === 'success' ||
    norm === 'COMPLETED' ||
    norm === 'APPROVED' ||
    norm === 'DONE' ||
    norm === 'PRINTED' ||
    norm === 'DISPATCHED' ||
    norm === 'FINALIZED' ||
    norm === 'NORMAL' ||
    norm === 'LOGIN_SUCCESS'
  ) {
    tier = 3;
    type = 'success';
    Icon = CustomIcon || (norm === 'LOGIN_SUCCESS' ? ShieldCheck : norm === 'PRINTED' || norm === 'DISPATCHED' ? Printer : CheckCircle2);
    styleClasses = 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-medium dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800';
    iconClass = 'text-emerald-700 dark:text-emerald-300';
  } else {
    tier = explicitTier || 3;
    type = 'neutral';
    Icon = CustomIcon || FileText;
    styleClasses = 'bg-slate-100 text-slate-700 border border-slate-200 font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    iconClass = 'text-slate-500 dark:text-slate-400';
  }

  let displayLabel = label || status;
  if (!label) {
    if (norm === 'AUTH_FORBIDDEN') displayLabel = 'TIER 1 • ACCESS DENIED';
    else if (norm === 'CRITICAL') displayLabel = 'TIER 1 • CRITICAL';
    else if (norm === 'DOCTOR_APPROVAL' || norm === 'APPROVAL') displayLabel = 'STAGE 3 • MD APPROVAL';
    else if (norm === 'PENDING_PRINT') displayLabel = 'TIER 1 • PENDING PRINT';
    else if (norm === 'STAT') displayLabel = 'TIER 1 • STAT';
    else if (norm === 'URGENT') displayLabel = 'TIER 1 • URGENT';
    else if (norm === 'TESTING' || norm === 'IN_TESTING') displayLabel = 'STAGE 2 • TESTING';
    else if (norm === 'REGISTERED') displayLabel = 'STAGE 1 • REGISTERED';
    else if (norm === 'APPROVED' || norm === 'DONE') displayLabel = 'STAGE 4 • APPROVED';
    else if (norm === 'PRINTED') displayLabel = 'STAGE 4 • PRINTED';
    else if (norm === 'DISPATCHED') displayLabel = 'STAGE 4 • DISPATCHED';
    else if (norm === 'CANCELLED' || norm === 'CANCELED') displayLabel = 'CANCELLED';
    else if (norm === 'NORMAL') displayLabel = 'NORMAL';
    else if (!status) displayLabel = type.toUpperCase();
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5 gap-2'
      : 'text-xs px-2.5 py-1 gap-1.5';

  const iconSizes = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel} (Tier ${tier})`}
      className={`inline-flex items-center rounded-full tracking-wide uppercase whitespace-nowrap transition-colors select-none ${sizeClasses} ${styleClasses} ${className}`}
      data-tier={tier}
      data-type={type}
      {...rest}
    >
      <Icon aria-hidden="true" className={`${iconSizes} ${iconClass} shrink-0`} />
      <span className="leading-none">{displayLabel}</span>
    </span>
  );
}

export default StatusChip;
