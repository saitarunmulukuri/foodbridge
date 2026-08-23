import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * FoodBridge Global Button Component (V2)
 *
 * Unified, accessible button system adhering to FoodBridge design tokens.
 *
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'icon'} variant - Visual hierarchy
 * @param {'sm' | 'md' | 'lg'} size - Standardized sizing (36px, 44px, 48px)
 * @param {'button' | 'submit' | 'reset'} type - Standard HTML button type
 * @param {boolean} disabled - Disabled interactive state
 * @param {boolean} loading - Displays spinner, disables click, sets aria-busy
 * @param {string} loadingText - Optional text override during loading state
 * @param {React.ReactNode | React.ComponentType} icon - Icon component or element
 * @param {'left' | 'right'} iconPosition - Placement of icon relative to children
 * @param {boolean} fullWidth - Expand to 100% container width
 * @param {string} to - If provided, renders as React Router Link
 * @param {string} href - If provided, renders as an anchor link
 * @param {string} aria-label - Accessible label (required for icon-only buttons)
 */
export const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  loadingText,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  to,
  href,
  onClick,
  children,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  ...restProps
}, ref) => {
  const isIconOnly = variant === 'icon' || (!children && Boolean(Icon));
  const effectiveDisabled = disabled || loading;

  // Sizing definitions
  const sizeStyles = {
    sm: {
      height: 36,
      minHeight: 36,
      padding: isIconOnly ? '0 8px' : '0 14px',
      fontSize: '12.5px',
      iconSize: 14,
      borderRadius: 8,
      gap: 6,
      minWidth: isIconOnly ? 36 : undefined,
    },
    md: {
      height: 44,
      minHeight: 44,
      padding: isIconOnly ? '0 11px' : '0 18px',
      fontSize: '13.5px',
      iconSize: 16,
      borderRadius: 10,
      gap: 8,
      minWidth: isIconOnly ? 44 : undefined,
    },
    lg: {
      height: 48,
      minHeight: 48,
      padding: isIconOnly ? '0 14px' : '0 24px',
      fontSize: '15px',
      iconSize: 18,
      borderRadius: 11,
      gap: 9,
      minWidth: isIconOnly ? 48 : undefined,
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // Base CSS classes
  const baseClasses = `
    inline-flex items-center justify-center font-medium font-sans
    select-none whitespace-nowrap outline-none
    transition-all duration-150 ease-out
    focus-visible:ring-2 focus-visible:ring-[#FF5A2F] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#090E13]
    ${fullWidth ? 'w-full' : ''}
    ${effectiveDisabled ? 'opacity-55 cursor-not-allowed pointer-events-none shadow-none' : 'cursor-pointer active:scale-[0.985]'}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#FF5A2F',
          color: '#FFFFFF',
          border: '1px solid transparent',
          boxShadow: effectiveDisabled ? 'none' : '0 2px 8px -1px rgba(255, 90, 47, 0.32), 0 1px 2px rgba(0, 0, 0, 0.04)',
          fontWeight: 600,
        };

      case 'secondary':
        return {
          backgroundColor: 'var(--fb-surface-elevated)',
          color: 'var(--fb-text)',
          border: '1px solid var(--fb-border)',
          boxShadow: effectiveDisabled ? 'none' : 'var(--shadow-sm)',
          fontWeight: 600,
        };

      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--fb-text-secondary)',
          border: '1px solid transparent',
          boxShadow: 'none',
          fontWeight: 600,
        };

      case 'danger':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          boxShadow: effectiveDisabled ? 'none' : '0 1px 2px 0 rgba(239, 68, 68, 0.05)',
          fontWeight: 600,
        };

      case 'success':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: effectiveDisabled ? 'none' : '0 1px 2px 0 rgba(22, 163, 74, 0.05)',
          fontWeight: 600,
        };

      case 'icon':
        return {
          backgroundColor: 'var(--fb-surface-elevated)',
          color: 'var(--fb-text-secondary)',
          border: '1px solid var(--fb-border)',
          boxShadow: effectiveDisabled ? 'none' : 'var(--shadow-sm)',
          fontWeight: 500,
        };

      default:
        return {
          backgroundColor: '#FF5A2F',
          color: '#FFFFFF',
          border: '1px solid transparent',
          fontWeight: 600,
        };
    }
  };

  const combinedStyles = {
    height: currentSize.height,
    minHeight: currentSize.minHeight,
    padding: currentSize.padding,
    fontSize: currentSize.fontSize,
    borderRadius: currentSize.borderRadius,
    gap: currentSize.gap,
    minWidth: currentSize.minWidth,
    ...getVariantStyles(),
    ...style,
  };

  // Render leading/trailing icon safely
  const renderIcon = (iconItem) => {
    if (!iconItem) return null;
    if (React.isValidElement(iconItem)) return iconItem;
    const IconComp = iconItem;
    return <IconComp size={currentSize.iconSize} className="shrink-0" />;
  };

  // Inner content layout
  const innerContent = (
    <>
      {loading ? (
        <Loader2 size={currentSize.iconSize} className="animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && renderIcon(Icon)
      )}

      {loading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children && <span>{children}</span>
      )}

      {!loading && Icon && iconPosition === 'right' && renderIcon(Icon)}
    </>
  );

  // If `to` is passed, render React Router Link
  if (to && !effectiveDisabled) {
    return (
      <Link
        ref={ref}
        to={to}
        className={baseClasses}
        style={combinedStyles}
        aria-label={ariaLabel}
        {...restProps}
      >
        {innerContent}
      </Link>
    );
  }

  // If `href` is passed, render external anchor
  if (href && !effectiveDisabled) {
    return (
      <a
        ref={ref}
        href={href}
        className={baseClasses}
        style={combinedStyles}
        aria-label={ariaLabel}
        {...restProps}
      >
        {innerContent}
      </a>
    );
  }

  // Standard Button element
  return (
    <button
      ref={ref}
      type={type}
      disabled={effectiveDisabled}
      onClick={effectiveDisabled ? undefined : onClick}
      className={baseClasses}
      style={combinedStyles}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...restProps}
    >
      {innerContent}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
