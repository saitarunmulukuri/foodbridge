/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        fb: {
          bg: 'var(--fb-bg)',
          surface: 'var(--fb-surface)',
          elevated: 'var(--fb-surface-elevated)',
          hover: 'var(--fb-surface-hover)',
          border: 'var(--fb-border)',
          'border-strong': 'var(--fb-border-strong)',
          primary: 'var(--fb-primary)',
          'primary-hover': 'var(--fb-primary-hover)',
          'primary-pressed': 'var(--fb-primary-pressed)',
          'primary-soft': 'var(--fb-primary-soft)',
          'primary-soft-strong': 'var(--fb-primary-soft-strong)',
          text: 'var(--fb-text)',
          'text-secondary': 'var(--fb-text-secondary)',
          'text-muted': 'var(--fb-text-muted)',
          'text-disabled': 'var(--fb-text-disabled)',
          success: 'var(--fb-success)',
          warning: 'var(--fb-warning)',
          info: 'var(--fb-info)',
          urgent: 'var(--fb-danger)',
          danger: 'var(--fb-danger)',
          neutral: 'var(--fb-neutral)',
        },
      },
      borderRadius: {
        'control': '6px',
        'btn': '6px',
        'card': '8px',
        'section': '8px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-elevated': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'glow-primary': 'none',
      },
    },
  },
  plugins: [],
}
