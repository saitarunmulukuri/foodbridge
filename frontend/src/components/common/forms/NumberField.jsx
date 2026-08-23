import { forwardRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FormField } from './FormField';

/**
 * NumberField — Standard FoodBridge numeric input.
 * Supports standard typing, min/max limits, step, and optional increment/decrement +/- controls.
 */
export const NumberField = forwardRef(({
  label,
  required = false,
  error,
  helperText,
  hint,
  id,
  name,
  placeholder,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  readOnly = false,
  showControls = false,
  className = '',
  inputClassName = '',
  style = {},
  inputStyle = {},
  onFocus,
  onBlur,
  onKeyDown,
  ...restProps
}, ref) => {
  const inputId = id || name;

  const handleStepChange = (delta) => {
    if (disabled || readOnly) return;
    const currentNum = value === '' || value === null || value === undefined ? 0 : parseFloat(value);
    const stepNum = typeof step === 'number' ? step : (parseFloat(step) || 1);
    let nextNum = currentNum + delta * stepNum;

    if (min !== undefined && nextNum < parseFloat(min)) {
      nextNum = parseFloat(min);
    }
    if (max !== undefined && nextNum > parseFloat(max)) {
      nextNum = parseFloat(max);
    }

    // Format to avoid floating point precision issues
    const formatted = stepNum % 1 === 0 ? String(Math.round(nextNum)) : String(parseFloat(nextNum.toFixed(2)));

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || inputId,
          id: inputId,
          value: formatted,
        },
      };
      onChange(syntheticEvent, formatted);
    }
  };

  const inputElement = (
    <div className="relative w-full flex items-center">
      {/* Optional Decrement Button */}
      {showControls && (
        <button
          type="button"
          onClick={() => handleStepChange(-1)}
          disabled={disabled || readOnly || (min !== undefined && parseFloat(value) <= parseFloat(min))}
          aria-label="Decrease quantity"
          className="shrink-0 w-10 flex items-center justify-center text-slate-500 hover:text-[#FF5A36] hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition rounded-l-lg border border-r-0 border-slate-200"
          style={{ height: 44 }}
        >
          <Minus size={14} />
        </button>
      )}

      {/* Main Number Input */}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={!!error}
        aria-required={required}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`w-full text-slate-900 placeholder:text-slate-400 font-sans transition-all duration-150 outline-none px-3.5 ${
          showControls ? 'rounded-none text-center font-bold' : ''
        } ${inputClassName}`}
        style={{
          height: 44,
          minHeight: 44,
          borderRadius: showControls ? 0 : 10,
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
          border: error
            ? '1.5px solid #EF4444'
            : '1px solid #E2E8F0',
          fontSize: 13.5,
          color: disabled ? '#94A3B8' : '#0F172A',
          cursor: disabled ? 'not-allowed' : 'text',
          boxShadow: error
            ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          ...inputStyle,
        }}
        onFocusCapture={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#FF5A36';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 90, 54, 0.15)';
          }
        }}
        onBlurCapture={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
          }
        }}
        {...restProps}
      />

      {/* Optional Increment Button */}
      {showControls && (
        <button
          type="button"
          onClick={() => handleStepChange(1)}
          disabled={disabled || readOnly || (max !== undefined && parseFloat(value) >= parseFloat(max))}
          aria-label="Increase quantity"
          className="shrink-0 w-10 flex items-center justify-center text-slate-500 hover:text-[#FF5A36] hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition rounded-r-lg border border-l-0 border-slate-200"
          style={{ height: 44 }}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );

  if (label || error || helperText || hint) {
    return (
      <FormField
        label={label}
        htmlFor={inputId}
        required={required}
        error={error}
        helperText={helperText}
        hint={hint}
        className={className}
        style={style}
      >
        {inputElement}
      </FormField>
    );
  }

  return inputElement;
});

NumberField.displayName = 'NumberField';
export default NumberField;
