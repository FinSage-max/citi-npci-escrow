/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07111f',
          900: '#0c1b2e',
          800: '#132844',
          700: '#1c3a5f',
        },
        mint: {
          300: '#7ddec4',
          400: '#3ecfad',
          500: '#17b894',
        },
        sand: {
          50: '#f4f7fb',
          100: '#e8eef6',
          200: '#d4deeb',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 50px rgba(7, 17, 31, 0.12)',
      },
    },
  },
  plugins: [],
};
