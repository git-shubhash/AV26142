/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      width: {
        '78': '19.5rem', // 312px
      },
    },
  },
  plugins: [],
};
