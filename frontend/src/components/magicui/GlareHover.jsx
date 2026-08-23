import { useState } from 'react';

/**
 * GlareHover — Magic UI component.
 * Sweeps a subtle diagonal physical light reflection across the card surface on pointer hover.
 *
 * @param {string} className - Extra CSS classes applied to the container
 * @param {number} duration - Glare animation duration in milliseconds (default: 600)
 * @param {number} opacity - Maximum opacity of the light reflection (default: 0.55)
 * @param {string} glareColor - CSS linear-gradient for the light beam
 * @param {boolean} playOnce - Reset and re-sweep on each mouse entry (default: true)
 * @param {React.ReactNode} children - Card content
 */
export function GlareHover({
  className = '',
  duration = 600,
  opacity = 0.55,
  glareColor = 'linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.45) 45%, rgba(255, 90, 47, 0.16) 50%, rgba(255, 255, 255, 0.45) 55%, transparent 80%)',
  playOnce = true,
  children,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [glareKey, setGlareKey] = useState(0);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (playOnce) {
      setGlareKey((k) => k + 1);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className={`relative overflow-hidden group ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}

      {/* Diagonal Glare Light Sweep Overlay */}
      <div
        key={glareKey}
        aria-hidden="true"
        style={{
          background: glareColor,
          opacity: isHovered ? opacity : 0,
          '--glare-duration': `${duration}ms`,
        }}
        className={`
          pointer-events-none absolute -inset-full h-[300%] w-[300%] -translate-x-[150%] -translate-y-[150%]
          transition-opacity duration-200
          ${isHovered ? 'animate-glare-sweep' : ''}
        `}
      />
    </div>
  );
}

export default GlareHover;
