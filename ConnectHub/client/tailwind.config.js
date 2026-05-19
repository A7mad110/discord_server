/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8eaff',
          100: '#c8cbff',
          200: '#a5a9ff',
          300: '#8085ff',
          400: '#6369ff',
          500: '#5865F2',
          600: '#4752c4',
          700: '#3c45a5',
          800: '#2f3786',
          900: '#1e255c',
        },
        discord: {
          50: '#f0f1f3',
          100: '#d4d6db',
          200: '#b8bbc3',
          300: '#9ca0ab',
          400: '#808593',
          500: '#4e5058',
          600: '#3c3e45',
          700: '#2b2d33',
          800: '#1e1f22',
          900: '#111214',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
