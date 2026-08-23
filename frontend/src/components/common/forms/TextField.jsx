import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormField } from './FormField';

/**
 * TextField — Standard FoodBridge single-line text input.
 * Supports text, email, tel, password (with show/hide eye), search (with icon), prefix icons, and error states.
 */
export const TextField = forwardRef(({
  label,
  required = false,
  error,
  helperText,
  hint,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  icon: Icon,
  suffix,
  className = '',
  inputClassName = '',
  style = {},
  inputStyle = {},
  autoComplete,
  maxLength,
  pattern,
  autoFocus,
  onFocus,
  onBlur,
  onKeyDown,
  ...restProps
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = id || name;

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    const IconComp = Icon;
    return <IconComp size={16} />;
  };

  const inputElement = (
    <div className="relative w-full flex items-center">
      {/* Optional Leading Icon */}
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
          {renderIcon()}
        </div>
      )}

      {/* Main Input Control */}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={effectiveType}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        aria-invalid={!!error}
        aria-required={required}
        className={`w-full text-slate-900 placeholder:text-slate-400 font-sans transition-all duration-150 outline-none ${
          Icon ? 'pl-10' : 'pl-3.5'
        } ${
          isPassword || suffix ? 'pr-11' : 'pr-3.5'
        } ${inputClassName}`}
        style={{
          height: 44,
          minHeight: 44,
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

      {/* Password Visibility Toggle */}
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 transition focus:outline-none"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}

      {/* Optional Custom Suffix (non-password) */}
      {!isPassword && suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {suffix}
        </div>
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

TextField.displayName = 'TextField';
export default TextField;
