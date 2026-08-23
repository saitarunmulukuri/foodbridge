import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FormField } from './FormField';

/**
 * Select — Standard FoodBridge dropdown component.
 * Supports string arrays or object arrays with `{ value, label }`, keyboard navigation, outside click, and custom trigger.
 */
export const Select = ({
  label,
  required = false,
  error,
  helperText,
  hint,
  id,
  name,
  placeholder = 'Select an option',
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
  triggerClassName = '',
  style = {},
  triggerStyle = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxRef = useRef(null);
  const selectId = id || name;

  // Normalize options into `{ value, label }` shape
  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value ?? '',
          label: opt.label ?? String(opt.value ?? ''),
        };
      }
      return {
        value: opt,
        label: String(opt),
      };
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || selectId,
          id: selectId,
          value: optionValue,
        },
      };
      onChange(syntheticEvent, optionValue);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIndex = normalizedOptions.findIndex(
          (opt) => String(opt.value) === String(value)
        );
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      } else if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
        handleSelect(normalizedOptions[highlightedIndex].value);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < normalizedOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(normalizedOptions.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : normalizedOptions.length - 1
        );
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectElement = (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ position: 'relative', zIndex: isOpen ? 50 : 1 }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        name={name}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={!!error}
        aria-required={required}
        className={`w-full flex items-center justify-between px-3.5 text-left font-sans transition-all duration-150 outline-none rounded-[10px] text-[13.5px] h-[44px] min-h-[44px] ${
          disabled
            ? 'bg-slate-50 dark:bg-[#11171F] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-[#26313D] cursor-not-allowed'
            : error
            ? 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border-red-500 ring-2 ring-red-500/20'
            : isOpen
            ? 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border border-[#FF5A2F] ring-2 ring-[#FF5A2F]/20'
            : 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border border-slate-200 dark:border-[#26313D] hover:border-slate-300 dark:hover:border-slate-600'
        } ${triggerClassName}`}
        style={{
          ...triggerStyle,
        }}
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400 dark:text-[#748296]' : 'text-slate-900 dark:text-[#F5F7FA]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 ml-2 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#FF5A2F]' : 'text-slate-400 dark:text-slate-500'
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="absolute top-[calc(100%+5px)] left-0 right-0 z-[999] bg-white dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] rounded-[10px] shadow-xl max-h-[220px] overflow-y-auto p-1 m-0 list-none"
        >
          {normalizedOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500 text-center">
              No options available
            </li>
          ) : (
            normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] font-bold'
                      : isHighlighted
                      ? 'bg-slate-50 dark:bg-[#1E2631] text-slate-900 dark:text-[#F5F7FA]'
                      : 'text-slate-700 dark:text-[#A5B1C2]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check size={14} className="text-[#FF5A2F] shrink-0 ml-2" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );

  if (label || error || helperText || hint) {
    return (
      <FormField
        label={label}
        htmlFor={selectId}
        required={required}
        error={error}
        helperText={helperText}
        hint={hint}
        className={className}
        style={style}
      >
        {selectElement}
      </FormField>
    );
  }

  return selectElement;
};

export default Select;
