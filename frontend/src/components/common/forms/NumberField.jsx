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
          className="shrink-0 w-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF5A2F] hover:bg-slate-50 dark:hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none transition rounded-l-[10px] border border-r-0 border-slate-200 dark:border-[#242D38] bg-white dark:bg-[#171D25] h-[44px]"
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
        className={`w-full font-sans transition-all duration-150 outline-none px-3.5 text-[13.5px] h-[44px] min-h-[44px] ${
          showControls ? 'rounded-none text-center font-bold' : 'rounded-[10px]'
        } ${
          disabled
            ? 'bg-slate-50 dark:bg-[#11171F] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-[#26313D] cursor-not-allowed'
            : error
            ? 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border-red-500 ring-2 ring-red-500/20'
            : 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border border-slate-200 dark:border-[#26313D] placeholder-slate-400 dark:placeholder-[#748296] focus:border-[#FF5A2F] focus:ring-2 focus:ring-[#FF5A2F]/20'
        } ${inputClassName}`}
        style={{
          ...inputStyle,
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
          className="shrink-0 w-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF5A2F] hover:bg-slate-50 dark:hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none transition rounded-r-[10px] border border-l-0 border-slate-200 dark:border-[#242D38] bg-white dark:bg-[#171D25] h-[44px]"
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
