/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent': {
          'DEFAULT': '#34d399', // A nice, vibrant light green (Emerald 400)
          'light': '#6ee7b7',
          'dark': '#059669',
        },
        'charcoal': '#111827', // A very dark gray, almost black
        'primary': {
          'DEFAULT': '#1f2937', // Gray 800
          'light': '#374151',   // Gray 700
          'dark': '#111827'     // Gray 900
        },
      }
    },
  },
  plugins: [],
}