/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'smarthotels-gold': '#D4AF37',
        'smarthotels-gold-light': '#F4E4BC',
        'smarthotels-gold-dark': '#B8941F',
        'smarthotels-marble': '#F8F9FA',
        'smarthotels-marble-dark': '#E9ECEF',
        'smarthotels-text': '#2C3E50',
        'smarthotels-text-light': '#6C757D',
        'smarthotels-success': '#28A745',
        'smarthotels-warning': '#FFC107',
        'smarthotels-danger': '#DC3545',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'smarthotels': '0 4px 6px -1px rgba(212, 175, 55, 0.1), 0 2px 4px -1px rgba(212, 175, 55, 0.06)',
        'smarthotels-lg': '0 10px 15px -3px rgba(212, 175, 55, 0.1), 0 4px 6px -2px rgba(212, 175, 55, 0.05)',
      },
    },
  },
  plugins: [],
}
