/** @type {import('tailwindcss').Config} */
export default {
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
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          elevated: '#F8FAFC',
          hover: '#F1F5F9',
          border: '#E2E8F0',
          'border-strong': '#CBD5E1',
          primary: '#FF5A2F',
          'primary-hover': '#F04E25',
          'primary-pressed': '#E04420',
          'primary-soft': 'rgba(255, 90, 47, 0.08)',
          'primary-soft-strong': 'rgba(255, 90, 47, 0.14)',
          text: '#111827',
          'text-secondary': '#4B5563',
          'text-muted': '#9CA3AF',
          'text-disabled': '#D1D5DB',
          success: '#10B981',
          warning: '#F59E0B',
          info: '#3B82F6',
          urgent: '#EF4444',
          danger: '#EF4444',
          neutral: '#64748B',
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
