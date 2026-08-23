import { AlertCircle } from 'lucide-react';

/**
 * FormField — Standard layout wrapper for FoodBridge form inputs.
 * Provides consistent vertical rhythm, labels, required indicators, helper text, and error messages.
 */
export const FormField = ({
  label,
  htmlFor,
  id,
  required = false,
  error,
  helperText,
  hint,
  className = '',
  style = {},
  children,
}) => {
  const targetId = htmlFor || id;
  const effectiveHelper = helperText || hint;

  return (
    <div className={`w-full ${className}`} style={{ marginBottom: 16, ...style }}>
      {/* Label */}
      {label && (
        <label
          htmlFor={targetId}
          className="block text-xs font-bold text-slate-700 dark:text-[#F5F7FA] mb-1.5 select-none"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Input / Control Slot */}
      {children}

      {/* Error Message */}
      {error ? (
        <p
          role="alert"
          className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1 flex items-center space-x-1"
        >
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : effectiveHelper ? (
        <p className="text-[11px] text-slate-500 dark:text-[#748296] mt-1 leading-normal">
          {effectiveHelper}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
