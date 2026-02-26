/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        surface: '#1a1d27',
        'surface-elevated': '#21242f',
        border: '#2a2d3a',
        accent: '#f59e0b',
        'accent-hover': '#d97706',
        success: '#22c55e',
        'success-hover': '#16a34a',
        danger: '#ef4444',
        'danger-hover': '#dc2626',
        muted: '#6b7280',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.25)',
        'glow-accent': '0 0 20px -4px rgba(255, 112, 112, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.2)' }, '100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' } },
      },
    },
  },
  plugins: [],
}
