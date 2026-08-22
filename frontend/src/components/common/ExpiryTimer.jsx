/**
 * ExpiryTimer — Food freshness remaining-time indicator.
 *
 * Uses real donation `expiry_time` ISO string from the backend.
 * Renders nothing if:
 *   - expiryTime is missing
 *   - The donation is already in a terminal or completed backend state
 *   - The time has already passed
 *
 * Semantic urgency colors:
 *   < 2 hours: #F9735B (Urgent) + pulse animation
 *   < 4 hours: #F5B83D (Warning)
 *   Normal:    #16B981
 *
 * Visual upgrade: gradient bar, urgent pulse animation, richer typography.
 * Logic: UNCHANGED.
 */

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { TERMINAL_STATUSES, COMPLETED_STATUSES } from '../../constants/donationStatuses';

const URGENT_THRESHOLD_MS  = 2 * 60 * 60 * 1000; // 2 hours
const WARNING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
const TOTAL_WINDOW_MS      = 8 * 60 * 60 * 1000; // approx donation window for bar

function formatRemaining(ms) {
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m`;
}

function formatExpiresAt(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ExpiryTimer = ({
  expiryTime,
  donationStatus,
  showBar = true,
  compact = false,
}) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiryTime) return;
    const expiryDate = new Date(expiryTime);
    if (isNaN(expiryDate.getTime())) return;

    const update = () => {
      setRemaining(expiryDate.getTime() - Date.now());
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  if (!expiryTime) return null;
  const expiryDate = new Date(expiryTime);
  if (isNaN(expiryDate.getTime())) return null;

  // Guard: if donation is terminal or completed, do not show timer
  if (donationStatus && (TERMINAL_STATUSES.has(donationStatus) || COMPLETED_STATUSES.has(donationStatus))) {
    return null;
  }

  // Guard: countdown passed
  if (remaining <= 0) return null;

  const isUrgent  = remaining < URGENT_THRESHOLD_MS;
  const isWarning = remaining < WARNING_THRESHOLD_MS;

  const barPercent = Math.max(0, Math.min(100, (remaining / TOTAL_WINDOW_MS) * 100));
  const formatted  = formatRemaining(remaining);

  const textColor = isUrgent
    ? 'text-[#F9735B]'
    : isWarning
    ? 'text-[#F5B83D]'
    : 'text-[#16B981]';

  const barGradient = isUrgent
    ? 'linear-gradient(90deg, #EF6675, #F9735B)'
    : isWarning
    ? 'linear-gradient(90deg, #F5B83D, #f5ca6b)'
    : 'linear-gradient(90deg, #16B981, #22C997)';

  if (compact) {
    return (
      <div className={`flex items-center space-x-1.5 text-xs font-semibold ${textColor} ${isUrgent ? 'animate-urgent' : ''}`}>
        {isUrgent
          ? <AlertTriangle size={12} className="shrink-0" />
          : <Clock size={12} className="shrink-0" />
        }
        <span>{formatted} remaining</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between text-xs font-semibold ${textColor} ${isUrgent ? 'animate-urgent' : ''}`}>
        <div className="flex items-center space-x-1.5">
          {isUrgent
            ? <AlertTriangle size={13} className="shrink-0" />
            : <Clock size={13} className="shrink-0" />
          }
          <span>{formatted} remaining</span>
        </div>
        <span className="text-fb-text-muted font-normal text-[11px]">
          Expires {formatExpiresAt(expiryDate)}
        </span>
      </div>
      {showBar && (
        <div className="h-2 w-full bg-fb-elevated border border-fb-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barPercent}%`,
              background: barGradient,
              boxShadow: isUrgent ? '0 0 6px rgba(249,115,91,0.4)' : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
};
