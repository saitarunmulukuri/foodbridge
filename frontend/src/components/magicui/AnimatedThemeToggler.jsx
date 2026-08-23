import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * AnimatedThemeToggler — Magic UI Theme Toggle Component.
 *
 * Provides a fluid animated transition between light and dark themes.
 * Utilizes the View Transitions API (when available) for ripple circular animations,
 * with smooth CSS icon transform morphing as a universal fallback.
 *
 * @param {string} className - Optional custom classes
 */
export function AnimatedThemeToggler({ className = '', ...props }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('foodbridge_theme');
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('foodbridge_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('foodbridge_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = (e) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    // View Transition API circular expansion (Chrome/Edge/Safari 18+)
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    ) {
      const x = e?.clientX ?? window.innerWidth / 2;
      const y = e?.clientY ?? window.innerHeight / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];
        document.documentElement.animate(
          {
            clipPath: nextTheme === 'dark' ? clipPath : [...clipPath].reverse(),
          },
          {
            duration: 400,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement:
              nextTheme === 'dark'
                ? '::view-transition-new(root)'
                : '::view-transition-old(root)',
          }
        );
      });
    } else {
      setTheme(nextTheme);
    }
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-full
        border border-slate-200 bg-[#F8F9FB] text-slate-700
        hover:bg-slate-100 hover:text-slate-900 active:scale-95
        dark:border-[#26313D] dark:bg-[#171E27] dark:text-[#F5F7FA] dark:hover:bg-[#1E2631] dark:hover:border-[#334050]
        transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A2F]
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      {...props}
    >
      {/* Sun Icon (Light Mode) */}
      <Sun
        size={16}
        strokeWidth={2.2}
        className={`
          transition-all duration-300 transform
          ${isDark ? '-rotate-90 scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100 text-amber-500'}
        `}
      />

      {/* Moon Icon (Dark Mode) */}
      <Moon
        size={15}
        strokeWidth={2.2}
        className={`
          transition-all duration-300 transform
          ${isDark ? 'rotate-0 scale-100 opacity-100 text-blue-400' : 'rotate-90 scale-0 opacity-0 absolute'}
        `}
      />
    </button>
  );
}

export default AnimatedThemeToggler;
