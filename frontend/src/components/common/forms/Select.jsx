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
        className={`w-full flex items-center justify-between px-3.5 text-left font-sans transition-all duration-150 outline-none ${triggerClassName}`}
        style={{
          height: 44,
          minHeight: 44,
          borderRadius: 10,
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
          border: error
            ? '1.5px solid #EF4444'
            : isOpen
            ? '1.5px solid #FF5A36'
            : '1px solid #E2E8F0',
          color: selectedOption ? '#0F172A' : '#94A3B8',
          fontSize: 13.5,
          fontWeight: selectedOption ? 500 : 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: error
            ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
            : isOpen
            ? '0 0 0 3px rgba(255, 90, 54, 0.15)'
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          ...triggerStyle,
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 ml-2 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#FF5A36]' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            boxShadow:
              '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: 220,
            overflowY: 'auto',
            padding: 4,
            margin: 0,
            listStyle: 'none',
          }}
        >
          {normalizedOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-slate-400 text-center">
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
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-100"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255, 90, 54, 0.08)'
                      : isHighlighted
                      ? '#F8FAFC'
                      : 'transparent',
                    color: isSelected ? '#FF5A36' : '#1E293B',
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check size={14} className="text-[#FF5A36] shrink-0 ml-2" />
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
