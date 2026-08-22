/**
 * FoodJourney — Visual food redistribution lifecycle stepper.
 * Cloudhub style: Clean light node indicators, coral-orange active pulse.
 */

import { Check, AlertCircle } from 'lucide-react';

const STATUS_STAGE_MAP = {
  DRAFT:              0,
  SUBMITTED:          1,
  PENDING_NGO:        2,
  NGO_ACCEPTED:       3,
  VOLUNTEER_PENDING:  4,
  PICKUP_IN_PROGRESS: 5,
  DELIVERED:          6,
  COMPLETED:          6,
};

const NORMAL_STAGES = [
  { id: 'created',   label: 'Created',      shortLabel: 'Created'   },
  { id: 'submitted', label: 'Submitted',    shortLabel: 'Submitted' },
  { id: 'matching',  label: 'Smart Match',  shortLabel: 'Match'     },
  { id: 'ngo',       label: 'NGO Accepted', shortLabel: 'NGO'       },
  { id: 'volunteer', label: 'Volunteer',    shortLabel: 'Volunteer' },
  { id: 'pickup',    label: 'Pickup',       shortLabel: 'Pickup'    },
  { id: 'delivered', label: 'Delivered',    shortLabel: 'Delivered' },
];

const TERMINAL_STAGES = [
  { id: 'created',   label: 'Created',   shortLabel: 'Created'   },
  { id: 'submitted', label: 'Submitted', shortLabel: 'Submitted' },
  { id: 'terminal',  label: null,        shortLabel: null, isTerminal: true },
];

const TERMINAL_LABEL = {
  EXPIRED:   'Donation expired',
  CANCELLED: 'Donation cancelled',
};

export const FoodJourney = ({ status, orientation = 'horizontal', compact = false }) => {
  const isTerminal = status === 'EXPIRED' || status === 'CANCELLED';

  // ── Terminal path ──────────────────────────────────────────────────────────
  if (isTerminal) {
    const terminalLabel = TERMINAL_LABEL[status] ?? 'Donation ended';

    if (orientation === 'vertical') {
      return (
        <div className="space-y-0">
          {TERMINAL_STAGES.map((stage, i) => {
            const isLast = i === TERMINAL_STAGES.length - 1;
            if (stage.isTerminal) {
              return (
                <div key={stage.id} className="flex items-start">
                  <div className="flex flex-col items-center mr-3.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-red-50 text-red-600 border-2 border-red-500 shadow-sm">
                      <AlertCircle size={14} />
                    </div>
                  </div>
                  <div className="pb-0 pt-1">
                    <span className="text-xs font-bold text-red-600">{terminalLabel}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">This donation was not matched before its expiry time.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={stage.id} className="flex items-start">
                <div className="flex flex-col items-center mr-3.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-500 text-white shadow-sm">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  {!isLast && <div className="w-0.5 h-7 my-0.5 bg-slate-200" />}
                </div>
                <div className="pb-5 pt-1">
                  <span className="text-xs font-bold text-emerald-600">
                    {compact ? stage.shortLabel : stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Horizontal terminal
    return (
      <div className="flex items-start w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TERMINAL_STAGES.map((stage, i) => {
          const isLast = i === TERMINAL_STAGES.length - 1;
          if (stage.isTerminal) {
            return (
              <div key={stage.id} className="flex items-start">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-red-50 text-red-600 border-2 border-red-500 shadow-sm">
                    <AlertCircle size={13} />
                  </div>
                  <span className="text-[10px] mt-1.5 font-bold whitespace-nowrap text-red-600 text-center">
                    {compact ? 'Expired' : terminalLabel}
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div key={stage.id} className="flex items-start min-w-0 flex-1">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-500 text-white shadow-sm">
                  <Check size={13} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] mt-1.5 font-bold whitespace-nowrap text-emerald-600">
                  {compact ? stage.shortLabel : stage.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mt-3.5 mx-2 h-0.5 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Normal path ────────────────────────────────────────────────────────────
  const activeStage = STATUS_STAGE_MAP[status] ?? 0;

  if (orientation === 'vertical') {
    return (
      <div className="space-y-0">
        {NORMAL_STAGES.map((stage, i) => {
          const isDone   = i < activeStage;
          const isActive = i === activeStage;
          const isFuture = i > activeStage;
          const isLast   = i === NORMAL_STAGES.length - 1;

          return (
            <div key={stage.id} className="flex items-start">
              {/* Node */}
              <div className="flex flex-col items-center mr-3.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all
                    ${isDone   ? 'bg-emerald-500 text-white shadow-sm' : ''}
                    ${isActive ? 'bg-orange-50 text-[#FF5A2F] border-2 border-[#FF5A2F]' : ''}
                    ${isFuture ? 'bg-slate-100 text-slate-400 border border-slate-200' : ''}
                  `}
                >
                  {isDone   ? <Check size={14} strokeWidth={2.5} /> : null}
                  {isActive ? <span className="w-2 h-2 rounded-full bg-[#FF5A2F]" /> : null}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 h-7 my-0.5 rounded-full ${
                      isDone ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className={`pb-5 pt-1 ${isLast ? 'pb-0' : ''}`}>
                <span
                  className={`text-xs font-bold
                    ${isDone   ? 'text-emerald-700' : ''}
                    ${isActive ? 'text-[#FF5A2F]'  : ''}
                    ${isFuture ? 'text-slate-400 font-medium' : ''}
                  `}
                >
                  {compact ? stage.shortLabel : stage.label}
                </span>
                {isActive && (
                  <p className="text-[10px] text-[#FF5A2F] mt-0.5 font-medium">Current</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="flex items-start w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {NORMAL_STAGES.map((stage, i) => {
        const isDone   = i < activeStage;
        const isActive = i === activeStage;
        const isFuture = i > activeStage;
        const isLast   = i === NORMAL_STAGES.length - 1;

        return (
          <div key={stage.id} className="flex items-start min-w-0" style={{ flex: isLast ? 'none' : '1' }}>
            <div className="flex flex-col items-center">
              {/* Node */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all
                  ${isDone   ? 'bg-emerald-500 text-white shadow-sm' : ''}
                  ${isActive ? 'bg-orange-50 text-[#FF5A2F] border-2 border-[#FF5A2F]' : ''}
                  ${isFuture ? 'bg-slate-100 text-slate-400 border border-slate-200' : ''}
                `}
              >
                {isDone   ? <Check size={13} strokeWidth={2.5} /> : null}
                {isActive ? <span className="w-2 h-2 rounded-full bg-[#FF5A2F]" /> : null}
              </div>
              {/* Label */}
              <span
                className={`text-[11px] mt-1.5 whitespace-nowrap font-bold
                  ${isDone   ? 'text-emerald-700' : ''}
                  ${isActive ? 'text-[#FF5A2F]'  : ''}
                  ${isFuture ? 'text-slate-400 font-medium' : ''}
                `}
              >
                {compact ? stage.shortLabel : stage.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 mt-3.5 mx-2 h-0.5 rounded-full ${
                  isDone ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
