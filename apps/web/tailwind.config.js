/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design system ASSISTCI (réf. : design/*.dc.html)
      colors: {
        canvas: 'var(--canvas)',
        white: '#ffffff',
        navy: {
          DEFAULT: 'var(--navy)',
          light: 'var(--navy-light)',
          faint: 'var(--navy-faint)',
        },
        line: 'var(--line)',
        input: 'var(--input)',
        muted: 'var(--muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
        },
        success: {
          bg: 'var(--success-bg)',
          text: 'var(--success-text)',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        ciGreen: {
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,42,67,.1)',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        badge: '8px',
      },
    },
  },
  plugins: [],
};