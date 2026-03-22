/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:  '#D4961A', // amber gold — main accent
          dark:     '#1A0E02', // dark mahogany — brand background
        },
        bar: {
          base:     '#0D0805', // near-black — page background
          surface:  '#1C1208', // dark brown — card/panel background
          elevated: '#2B1A0B', // lifted surface — dropdowns, modals
          border:   '#3D2810', // subtle border
          muted:    '#A89070', // secondary text
          text:     '#F0E6D3', // primary text (warm off-white)
          accent:   '#E07030', // call-to-action orange
          success:  '#4CAF50',
          error:    '#EF5350',
          warning:  '#FFC107',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        // Keep default breakpoints — the sidebar collapses below md (768px)
        'xs': '480px',
      },
    },
  },
  plugins: [],
}
