/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5B7CFA",
          dark: "#4C6AF0",
          light: "#EEF2FF",
        },
        ink: {
          900: "#0b1020",
          800: "#131a33",
          700: "#1b2547",
        },
      },
      boxShadow: {
        soft: "0 10px 24px -8px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
