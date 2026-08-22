/**
 * StatusBadge — Cloudhub-style clean status pill.
 */
import { Clock, CheckCircle2, Truck, Check, AlertCircle, FileEdit, Send, Timer } from 'lucide-react';

const BADGE_CONFIG = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <FileEdit size={11} className="shrink-0" />,
    dot: null,
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Send size={11} className="shrink-0" />,
    dot: 'bg-amber-500',
  },
  PENDING_NGO: {
    label: 'Pending NGO',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <Clock size={11} className="shrink-0" />,
    dot: 'bg-[#FF5A2F]',
  },
  NGO_ACCEPTED: {
    label: 'NGO Accepted',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckCircle2 size={11} className="shrink-0" />,
    dot: 'bg-blue-500',
  },
  VOLUNTEER_PENDING: {
    label: 'Awaiting Driver',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: <Timer size={11} className="shrink-0" />,
    dot: 'bg-indigo-500',
  },
  PICKUP_IN_PROGRESS: {
    label: 'Pickup Active',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <Truck size={11} className="shrink-0" />,
    dot: 'bg-purple-500',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Check size={11} className="shrink-0" />,
    dot: null,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Check size={11} className="shrink-0" />,
    dot: null,
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertCircle size={11} className="shrink-0" />,
    dot: null,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertCircle size={11} className="shrink-0" />,
    dot: null,
  },
};

export const StatusBadge = ({ status }) => {
  const config = BADGE_CONFIG[status] ?? {
    label: status ?? 'Unknown',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: null,
    dot: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${config.className}`}
      style={{ whiteSpace: 'nowrap' }}
    >
      {config.dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      {!config.dot && config.icon && (
        <span className="shrink-0">{config.icon}</span>
      )}
      {config.label}
    </span>
  );
};
