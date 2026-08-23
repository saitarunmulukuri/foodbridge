/**
 * DateTimePicker — Custom FoodBridge Date & Time Picker Component.
 * Replaces native browser datetime-local input with a clean, branded popover.
 * Supports:
 * - 7-column calendar with month navigation and past-date disabling
 * - 12-hour AM/PM time selector with quick minute presets
 * - Human-readable trigger display with calendar icon
 * - Format parity with standard YYYY-MM-DDTHH:mm strings
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MINUTE_PRESETS = ['00', '15', '30', '45'];
const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

/**
 * Format Date object to YYYY-MM-DDTHH:mm
 */
const toISOStringLocal = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Format YYYY-MM-DDTHH:mm string to "23 Aug 2026, 12:30 PM"
 */
const formatDisplay = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${period}`;
};

/**
 * Parse an ISO datetime string into year, month, date, hour12, minute, period
 */
const parseDateTimeValue = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;

  const rawHours = d.getHours();
  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hour12 = String(rawHours % 12 || 12).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');

  return {
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour12,
    minute,
    period,
  };
};

export const DateTimePicker = ({
  id,
  name,
  value = '',
  onChange,
  label,
  required = false,
  minDate,
  minDateTime,
  error,
  helperText,
  placeholder = 'Select date & time',
  disabled = false,
  className = '',
}) => {
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  // Minimum allowed date boundary
  const effectiveMinDate = useMemo(() => {
    const boundary = minDateTime || minDate;
    if (!boundary) return null;
    const d = new Date(boundary);
    return isNaN(d.getTime()) ? null : d;
  }, [minDate, minDateTime]);

  // Internal selection state while the popover is open
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // Date object (at 00:00:00)
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('PM');

  // Synchronize internal state with external value when opening
  const initFromValue = useCallback(() => {
    const parsed = parseDateTimeValue(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setSelectedDate(parsed.date);
      setSelectedHour(parsed.hour12);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    } else {
      const now = new Date();
      // Round to next 15 minutes
      const minRemainder = now.getMinutes() % 15;
      if (minRemainder !== 0) {
        now.setMinutes(now.getMinutes() + (15 - minRemainder));
      }
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

      const rawH = now.getHours();
      setSelectedPeriod(rawH >= 12 ? 'PM' : 'AM');
      setSelectedHour(String(rawH % 12 || 12).padStart(2, '0'));
      setSelectedMinute(String(now.getMinutes()).padStart(2, '0'));
    }
  }, [value]);

  const handleToggleOpen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (disabled) return;
    if (isOpen) {
      handleClose();
    } else {
      initFromValue();
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const prevMonthDays = useMemo(() => {
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const result = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      result.push(daysInPrev - i);
    }
    return result;
  }, [viewYear, viewMonth, firstDayOfWeek]);

  const handlePrevMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isPastDate = (dayNum) => {
    if (!effectiveMinDate) return false;
    const target = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
    const minDayStart = new Date(
      effectiveMinDate.getFullYear(),
      effectiveMinDate.getMonth(),
      effectiveMinDate.getDate(),
      0, 0, 0
    );
    return target < minDayStart;
  };

  const isToday = (dayNum) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === dayNum
    );
  };

  const isSelectedDay = (dayNum) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === dayNum
    );
  };

  const handleSelectDay = (dayNum, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPastDate(dayNum)) return;
    setSelectedDate(new Date(viewYear, viewMonth, dayNum));
  };

  // Convert current temporary selection to string
  const currentConstructedValue = useMemo(() => {
    if (!selectedDate) return '';

    let hours24 = parseInt(selectedHour, 10);
    if (selectedPeriod === 'PM' && hours24 < 12) hours24 += 12;
    if (selectedPeriod === 'AM' && hours24 === 12) hours24 = 0;

    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours24,
      parseInt(selectedMinute, 10) || 0,
      0
    );

    return toISOStringLocal(finalDate);
  }, [selectedDate, selectedHour, selectedMinute, selectedPeriod]);

  // Apply selection
  const handleApply = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedDate) {
      handleClose();
      return;
    }

    const isoStr = currentConstructedValue;

    if (onChange) {
      // Support both event-style `e.target` and direct string arguments
      const syntheticEvent = {
        target: {
          name: name || id,
          id,
          value: isoStr,
        },
      };
      onChange(syntheticEvent, isoStr);
    }
    handleClose();
  };

  // Clear value
  const handleClear = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedDate(null);
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id,
          id,
          value: '',
        },
      };
      onChange(syntheticEvent, '');
    }
    handleClose();
  };

  // Quick Today button — automatically commits current date & time and closes popover
  const handleToday = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = new Date();
    // Round to next 15 minutes
    const minRemainder = now.getMinutes() % 15;
    if (minRemainder !== 0) {
      now.setMinutes(now.getMinutes() + (15 - minRemainder));
    }
    now.setSeconds(0, 0);

    const isoStr = toISOStringLocal(now);

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id,
          id,
          value: isoStr,
        },
      };
      onChange(syntheticEvent, isoStr);
    }
    handleClose();
  };

  const displayString = formatDisplay(value);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{ minWidth: 200, position: 'relative', zIndex: isOpen ? 999 : 1 }}
    >
      {/* Optional Form Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {/* ── Custom Trigger Input Button ── */}
      <button
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full h-11 min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-[13.5px] font-medium outline-none transition-all duration-150 cursor-pointer ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-[#242D38]'
            : error
            ? 'bg-white dark:bg-[#171D25] border-2 border-red-500 text-slate-900 dark:text-[#F5F7FA]'
            : isOpen
            ? 'bg-white dark:bg-[#171D25] border-2 border-[#FF5A2F] text-slate-900 dark:text-[#F5F7FA] shadow-[0_0_0_3px_rgba(255,90,47,0.15)]'
            : 'bg-white dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] text-slate-900 dark:text-[#F5F7FA] hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span className={`truncate ${!displayString ? 'text-slate-400 dark:text-[#7F8A99] font-normal' : 'text-slate-900 dark:text-[#F5F7FA]'}`}>
          {displayString || placeholder}
        </span>
        <CalendarIcon
          size={16}
          className={`shrink-0 ml-2 transition-colors duration-150 ${isOpen ? 'text-[#FF5A2F]' : 'text-slate-400 dark:text-[#7F8A99]'}`}
        />
      </button>

      {/* Helper / Error Text */}
      {error ? (
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 flex items-center space-x-1 font-semibold">
          <AlertCircle size={11} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[10px] text-slate-400 dark:text-[#7F8A99] mt-1">{helperText}</p>
      ) : null}

      {/* ── Custom Popover ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Date and time picker"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-[320px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#11171F] rounded-2xl border border-slate-200 dark:border-[#26313D] shadow-2xl p-4 flex flex-col gap-3 animate-fade-in-up"
        >
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-slate-600 dark:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-bold text-sm text-slate-900 dark:text-[#F5F7FA] tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-slate-600 dark:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 7-Column Days of Week */}
          <div className="grid grid-cols-7 text-center gap-0.5">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] py-1"
              >
                {d}
              </div>
            ))}

            {/* Leading empty days from prev month */}
            {prevMonthDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-700 opacity-40 select-none"
              >
                {d}
              </div>
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const dayNum = idx + 1;
              const disabledDay = isPastDate(dayNum);
              const selected = isSelectedDay(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  disabled={disabledDay}
                  className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#FF5A2F] text-white font-bold shadow-sm'
                      : today
                      ? 'border border-[#FF5A2F] text-[#FF5A2F] hover:bg-orange-50 dark:hover:bg-orange-500/15'
                      : disabledDay
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-700 dark:text-[#F5F7FA] hover:bg-orange-50 dark:hover:bg-orange-500/15 hover:text-[#FF5A2F]'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* ── Time Selector Section ── */}
          <div className="border-t border-slate-100 dark:border-[#26313D] pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-[#A5B1C2] uppercase tracking-wider">
                <Clock size={12} className="text-[#FF5A2F]" />
                <span>Time Selection</span>
              </div>

              {/* AM / PM Segmented Control */}
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                {['AM', 'PM'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      selectedPeriod === p
                        ? 'bg-[#FF5A2F] text-white'
                        : 'text-slate-500 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour & Minute Pickers */}
            <div className="grid grid-cols-2 gap-2">
              {/* Hour Dropdown */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 dark:text-[#748296] mb-1 uppercase tracking-wider">
                  Hour
                </label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full h-8.5 px-2 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] text-xs font-semibold outline-none cursor-pointer"
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h} className="bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA]">
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Dropdown */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 dark:text-[#748296] mb-1 uppercase tracking-wider">
                  Minute
                </label>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full h-8.5 px-2 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] text-xs font-semibold outline-none cursor-pointer"
                >
                  {MINUTE_PRESETS.map((m) => (
                    <option key={m} value={m} className="bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA]">
                      :{m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Selection Summary Banner ── */}
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] text-[11.5px] flex items-center justify-between">
            <span className="text-slate-400 dark:text-[#748296] font-medium">Selected:</span>
            <span className="font-bold text-slate-900 dark:text-[#F5F7FA]">
              {selectedDate
                ? `${selectedDate.getDate()} ${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}, ${selectedHour}:${selectedMinute} ${selectedPeriod}`
                : 'None'}
            </span>
          </div>

          {/* ── Footer Actions ── */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-slate-600 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA] text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#171E27] text-[#FF5A2F] text-xs font-semibold cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-500/15 transition-colors"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1 rounded-lg bg-[#FF5A2F] hover:bg-[#E04420] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
