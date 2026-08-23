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
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
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
        className={`w-full font-sans transition-all duration-150 outline-none rounded-[10px] text-[13.5px] h-[44px] min-h-[44px] ${
          Icon ? 'pl-10' : 'pl-3.5'
        } ${
          isPassword || suffix ? 'pr-11' : 'pr-3.5'
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

      {/* Password Visibility Toggle */}
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition focus:outline-none"
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
