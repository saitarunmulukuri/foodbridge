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

  const handleToggle = (e) => {
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
          className="block text-xs font-bold text-slate-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* ── Visible Trigger Field ── */}
      <button
        type="button"
        id={id}
        name={name}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{
          width: '100%',
          height: 44,
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 10,
          background: disabled ? '#F8FAFC' : '#FFFFFF',
          border: error
            ? '1.5px solid #EF4444'
            : isOpen
            ? '1.5px solid #FF5A36'
            : '1px solid #E2E8F0',
          color: displayString ? '#111827' : '#94A3B8',
          fontSize: 13.5,
          fontWeight: displayString ? 500 : 400,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(255, 90, 54, 0.15), 0 1px 2px rgba(0, 0, 0, 0.05)'
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 150ms ease',
        }}
      >
        <span className="truncate">
          {displayString || placeholder}
        </span>
        <CalendarIcon
          size={16}
          style={{
            color: isOpen ? '#FF5A36' : '#64748B',
            flexShrink: 0,
            marginLeft: 8,
            transition: 'color 150ms ease',
          }}
        />
      </button>

      {/* Helper / Error Text */}
      {error ? (
        <p className="text-[10px] text-red-600 mt-1 flex items-center space-x-1 font-semibold">
          <AlertCircle size={11} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>
      ) : null}

      {/* ── Custom Popover ── */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Date and time picker"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            boxShadow:
              '0 20px 40px -4px rgba(0, 0, 0, 0.18), 0 8px 16px -2px rgba(0, 0, 0, 0.08)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'fb-fade-in 150ms ease-out',
          }}
        >
          {/* Month Header Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <ChevronLeft size={16} />
            </button>

            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: '#0F172A',
                letterSpacing: '-0.01em',
              }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 7-Column Days of Week */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              gap: 2,
            }}
          >
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94A3B8',
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}

            {/* Leading empty days from prev month */}
            {prevMonthDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: '#CBD5E1',
                  opacity: 0.5,
                }}
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
                  style={{
                    height: 32,
                    borderRadius: 8,
                    border: selected
                      ? 'none'
                      : today
                      ? '1.5px solid #FF5A36'
                      : '1px solid transparent',
                    background: selected
                      ? '#FF5A36'
                      : 'transparent',
                    color: selected
                      ? '#FFFFFF'
                      : disabledDay
                      ? '#CBD5E1'
                      : '#1E293B',
                    fontWeight: selected ? 700 : today ? 600 : 500,
                    fontSize: 12.5,
                    cursor: disabledDay ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 120ms ease',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = '#FFF4F2';
                      e.currentTarget.style.color = '#FF5A36';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected && !disabledDay) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#1E293B';
                    }
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* ── Time Selector Section ── */}
          <div
            style={{
              borderTop: '1px solid #F1F5F9',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Clock size={12} style={{ color: '#FF5A36' }} />
                <span>Time Selection</span>
              </div>

              {/* AM / PM Segmented Control */}
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 6,
                  padding: 2,
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                }}
              >
                {['AM', 'PM'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: selectedPeriod === p ? '#FF5A36' : 'transparent',
                      color: selectedPeriod === p ? '#FFFFFF' : '#64748B',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Hour & Minute Pickers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {/* Hour Dropdown */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#94A3B8',
                    marginBottom: 3,
                  }}
                >
                  Hour
                </label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Dropdown */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#94A3B8',
                    marginBottom: 3,
                  }}
                >
                  Minute
                </label>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {MINUTE_PRESETS.map((m) => (
                    <option key={m} value={m}>
                      :{m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Selection Summary Banner ── */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: 11.5,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#94A3B8', fontWeight: 500 }}>Selected:</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>
              {selectedDate
                ? `${selectedDate.getDate()} ${SHORT_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}, ${selectedHour}:${selectedMinute} ${selectedPeriod}`
                : 'None'}
            </span>
          </div>

          {/* ── Footer Actions ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.color = '#0F172A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleToday}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#FF5A36',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FFF5F3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={handleApply}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#FF5A36',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(255, 90, 54, 0.25)',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E04A28')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF5A36')}
            >
              <Check size={13} strokeWidth={2.5} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fb-fade-in {
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
