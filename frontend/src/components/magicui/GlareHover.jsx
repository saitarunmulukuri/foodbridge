import { useState, useRef, useEffect } from 'react';

/**
 * GlareHover — Magic UI component.
 * Sweeps a subtle diagonal physical light reflection across the card surface on pointer hover.
 * Zero-flicker architecture: stable DOM nodes, dark-mode luminance adaptation, and touch immunity.
 *
 * @param {string} className - Extra CSS classes applied to the container
 * @param {number} duration - Glare animation duration in milliseconds (default: 600)
 * @param {number} opacity - Maximum opacity of the light reflection (default: 0.35)
 * @param {string} glareColor - Custom CSS linear-gradient for the light beam (optional)
 * @param {boolean} playOnce - Reset and re-sweep on each mouse entry (default: true)
 * @param {React.ReactNode} children - Card content
 */
export function GlareHover({
  className = '',
  duration = 600,
  opacity = 0.35,
  glareColor,
  playOnce = true,
  children,
  ...props
}) {
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (e) => {
    // Ignore touch interactions to prevent mobile tap flickering
    if (e?.pointerType === 'touch' || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches)) {
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAnimating(true);

    if (playOnce) {
      timeoutRef.current = setTimeout(() => {
        setAnimating(false);
      }, duration);
    }
  };

  const handleMouseLeave = (e) => {
    if (e?.pointerType === 'touch') return;
    if (!playOnce) {
      setAnimating(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden group ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}

      {/* Stable Diagonal Glare Light Sweep Overlay (zero-flicker, GPU accelerated) */}
      <div
        aria-hidden="true"
        style={{
          '--glare-duration': `${duration}ms`,
          ...(glareColor ? { background: glareColor } : {}),
        }}
        className={`
          pointer-events-none absolute -inset-full h-[300%] w-[300%]
          [transform:translate3d(-100%,-100%,0)_rotate(25deg)]
          transition-opacity duration-300 ease-out will-change-[transform,opacity]
          ${animating ? 'animate-glare-sweep opacity-35 dark:opacity-20' : 'opacity-0'}
          ${!glareColor ? 'bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.35)_45%,rgba(255,90,47,0.14)_50%,rgba(255,255,255,0.35)_55%,transparent_80%)] dark:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.06)_40%,rgba(255,90,47,0.18)_50%,rgba(255,140,100,0.08)_60%,transparent_80%)]' : ''}
        `}
      />
    </div>
  );
}

export default GlareHover;
