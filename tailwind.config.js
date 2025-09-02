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
          'DEFAULT': '#34d399', // Light Green
          'light': '#6ee7b7',
          'dark': '#059669',
        },
        'background': '#0a0a0a', // Near-black for body
        'primary': {
          'DEFAULT': '#1e1e1e', // Dark grey for main surfaces
          'light': '#2e2e2e',   // Lighter grey for hovers, inputs
          'dark': '#141414'     // Darker grey for title bar
        },
      }
    },
  },
  plugins: [],
}