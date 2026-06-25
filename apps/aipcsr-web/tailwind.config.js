/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          base: 'var(--color-bg-base)',
          panel: 'var(--color-bg-panel)',
          elevated: 'var(--color-bg-elevated)',
          inset: 'var(--color-bg-inset)',
          border: 'var(--color-border)',
          'border-muted': 'var(--color-border-muted)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
          accent: 'var(--color-accent)',
          'accent-glow': 'var(--color-accent-glow)',
          critical: 'var(--color-critical)',
          high: 'var(--color-high)',
          medium: 'var(--color-medium)',
          low: 'var(--color-low)',
          clean: 'var(--color-clean)',
          scanning: 'var(--color-scanning)',
          pending: 'var(--color-pending)',
          failed: 'var(--color-failed)',
          completed: 'var(--color-completed)',
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        shake: 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up': 'count-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
