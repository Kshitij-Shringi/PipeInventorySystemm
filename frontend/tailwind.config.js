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
        'glow-accent': '0 0 20px -4px rgba(245, 158, 11, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
