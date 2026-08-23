
/**
 * BorderBeam — Magic UI component.
 * Creates an animated glowing beam that travels seamlessly around a container's border.
 *
 * @param {number} size - Beam width/size in pixels (default: 150)
 * @param {number} duration - Seconds for a complete perimeter cycle (default: 8)
 * @param {number} anchor - Offset anchor position in percent (default: 90)
 * @param {number} borderWidth - Border stroke width in pixels (default: 1.5)
 * @param {string} colorFrom - Gradient start color (default: "#FF5A2F")
 * @param {string} colorTo - Gradient end color (default: "#FFA726")
 * @param {number} delay - Animation start delay in seconds (default: 0)
 * @param {string} className - Extra CSS classes
 */
export function BorderBeam({
  className = '',
  size = 150,
  duration = 8,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#FF5A2F',
  colorTo = '#FFA726',
  delay = 0,
  ...props
}) {
  return (
    <div
      style={{
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--anchor': `${anchor}%`,
        '--border-width': `${borderWidth}px`,
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--delay': `-${delay}s`,
      }}
      className={`
        pointer-events-none absolute inset-0 rounded-[inherit]
        border-beam-container ${className}
      `.replace(/\s+/g, ' ').trim()}
      aria-hidden="true"
      {...props}
    />
  );
}

export default BorderBeam;
