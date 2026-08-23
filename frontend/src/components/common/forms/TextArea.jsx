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
        className={`w-full text-slate-900 placeholder:text-slate-400 font-sans transition-all duration-150 outline-none p-3.5 ${inputClassName}`}
        style={{
          borderRadius: 10,
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
          resize: 'vertical',
          minHeight: 80,
          ...inputStyle,
        }}
        onFocusCapture={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#FF5A36';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 90, 54, 0.15)';
          }
          if (onFocus) onFocus(e);
        }}
        onBlurCapture={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
          }
          if (onBlur) onBlur(e);
        }}
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
