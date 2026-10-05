import PropTypes from 'prop-types';

/**
 * SegmentedControl — Accessible, animated segmented toggle control.
 * Inspired by modern pill tab switches with cubic-bezier micro-interactions.
 */
export const SegmentedControl = ({
  options = [],
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Segmented control',
  id,
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`fb-segmented-control ${
        size === 'sm' ? 'fb-segmented-control--sm' : ''
      } ${fullWidth ? 'fb-segmented-control--full' : ''} ${
        disabled ? 'fb-segmented-control--disabled' : ''
      } ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        const activeVariant = opt.activeVariant || 'default';

        return (
          <button
            key={String(opt.value)}
            id={opt.id}
            type="button"
            className={`fb-segmented-item ${
              isSelected
                ? `fb-segmented-item--active fb-segmented-item--${activeVariant}`
                : ''
            } ${opt.className || ''}`}
            onClick={() => {
              if (!isSelected && !disabled && !opt.disabled && onChange) {
                onChange(opt.value);
              }
            }}
            disabled={disabled || opt.disabled}
            aria-pressed={isSelected}
            title={opt.title}
            aria-label={
              opt.ariaLabel || (typeof opt.label === 'string' ? opt.label : undefined)
            }
          >
            {opt.statusDot && isSelected && (
              <span
                className={`fb-segmented-dot fb-segmented-dot--${
                  typeof opt.statusDot === 'string' ? opt.statusDot : 'green'
                }`}
                aria-hidden="true"
              />
            )}
            {Icon && (
              <Icon
                size={size === 'sm' ? 13 : 14}
                className={`fb-segmented-icon ${
                  isSelected ? 'fb-segmented-icon--active' : ''
                }`}
                aria-hidden="true"
              />
            )}
            <span className="fb-segmented-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

SegmentedControl.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.node.isRequired,
      icon: PropTypes.elementType,
      activeVariant: PropTypes.string,
      statusDot: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
      id: PropTypes.string,
      disabled: PropTypes.bool,
      title: PropTypes.string,
      ariaLabel: PropTypes.string,
      className: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
  id: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};

export default SegmentedControl;
