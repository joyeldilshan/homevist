/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: "#C62828", light: "#FFEBEE", dark: "#8E0000" },
        surface:  { DEFAULT: "#111827", card: "#1a2235" },
        accent:   { green: "#10B981", blue: "#3B82F6", amber: "#F59E0B" },
      },
      fontFamily: {
        sans:  ["'DM Sans'", "sans-serif"],
        serif: ["'Playfair Display'", "serif"],
        mono:  ["'DM Mono'", "monospace"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: {
        red:   "0 0 20px rgba(198,40,40,0.3)",
        card:  "0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
