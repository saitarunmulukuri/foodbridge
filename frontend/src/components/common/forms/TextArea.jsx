import { forwardRef } from 'react';
import { FormField } from './FormField';

/**
 * TextArea — Standard FoodBridge multiline text input.
 * Used for descriptions, addresses, notes, and instructions.
 */
export const TextArea = forwardRef(({
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
  rows = 3,
  maxLength,
  disabled = false,
  readOnly = false,
  className = '',
  inputClassName = '',
  style = {},
  inputStyle = {},
  onFocus,
  onBlur,
  ...restProps
}, ref) => {
  const inputId = id || name;

  const textareaElement = (
    <div className="relative w-full">
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={!!error}
        aria-required={required}
        className={`w-full font-sans transition-all duration-150 outline-none p-3.5 rounded-[10px] text-[13.5px] min-h-[80px] ${
          disabled
            ? 'bg-slate-50 dark:bg-[#11171F] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-[#26313D] cursor-not-allowed'
            : error
            ? 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border-red-500 ring-2 ring-red-500/20'
            : 'bg-white dark:bg-[#171E27] text-slate-900 dark:text-[#F5F7FA] border border-slate-200 dark:border-[#26313D] placeholder-slate-400 dark:placeholder-[#748296] focus:border-[#FF5A2F] focus:ring-2 focus:ring-[#FF5A2F]/20'
        } ${inputClassName}`}
        style={{
          resize: 'vertical',
          ...inputStyle,
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        {...restProps}
      />
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
        {textareaElement}
      </FormField>
    );
  }

  return textareaElement;
});

TextArea.displayName = 'TextArea';
export default TextArea;
