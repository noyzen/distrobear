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
          'DEFAULT': '#16a34a', // green-600
          'light': '#22c55e',   // green-500
          'dark': '#15803d',    // green-700
        },
        'background': '#0a0a0a', // Near-black for body
        'primary': {
          'DEFAULT': '#1e1e1e', // Dark grey for main surfaces
          'light': '#2e2e2e',   // Lighter grey for hovers, inputs
          'dark': '#141414'     // Darker grey for title bar
        },
        'charcoal': '#101010',
      }
    },
  },
  plugins: [],
}