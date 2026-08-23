import React from 'react';

/**
 * OrbitingCircles — Magic UI component for circular orbital animation.
 *
 * Distributes child elements evenly along an orbital path of a specified radius.
 * Rotates smoothly in 2D space while preserving child orientation (upright icons).
 *
 * @param {number} radius - Distance in pixels from the container center (default: 50)
 * @param {number} duration - Seconds for a complete 360-degree orbit (default: 20)
 * @param {number} delay - Animation delay offset in seconds (default: 0)
 * @param {boolean} reverse - Rotate counter-clockwise if true (default: false)
 * @param {boolean} path - Draw the subtle SVG orbital path circle (default: true)
 * @param {number} iconSize - Width & height of the icon container pill in pixels (default: 36)
 * @param {number} speed - Multiplier to speed up or slow down duration (default: 1)
 * @param {string} className - Additional CSS classes applied to each orbiting node
 * @param {React.ReactNode} children - Orbiting elements
 */
export function OrbitingCircles({
  className = '',
  children,
  reverse = false,
  duration = 20,
  delay = 0,
  radius = 50,
  path = true,
  iconSize = 36,
  speed = 1,
  ...props
}) {
  const calculatedDuration = duration / speed;
  const count = React.Children.count(children);

  return (
    <>
      {/* Subtle Orbital Path Circle */}
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <circle
            className="stroke-slate-200/80 stroke-1"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeDasharray="3 3"
          />
        </svg>
      )}

      {/* Orbiting Children */}
      {React.Children.map(children, (child, index) => {
        const angle = count > 0 ? (360 / count) * index : 0;
        return (
          <div
            style={{
              '--duration': `${calculatedDuration}s`,
              '--radius': `${radius}px`,
              '--angle': `${angle}deg`,
              '--icon-size': `${iconSize}px`,
              top: `calc(50% - (${iconSize}px / 2))`,
              left: `calc(50% - (${iconSize}px / 2))`,
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              animationDelay: `${delay}s`,
            }}
            className={`
              absolute flex transform-gpu items-center justify-center rounded-full
              border border-slate-200/90 dark:border-[#242D38] bg-white/95 dark:bg-[#171D25] shadow-sm
              ${reverse ? 'animate-orbit-reverse' : 'animate-orbit'}
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            {...props}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}

export default OrbitingCircles;
