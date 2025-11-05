/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#1f2937',
        'border': '#374151',
        'critical': '#ef4444',
        'warning': '#f59e0b',
        'normal': '#22c55e',
        'accent': '#3b82f6',
      },
    },
  },
  plugins: [],
}