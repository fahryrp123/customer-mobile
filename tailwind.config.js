/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      keyframes: {
        floatUp: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        marqueeX: {
          '0%': { transform: 'translateX(-15px)' },
          '50%': { transform: 'translateX(15px)' },
          '100%': { transform: 'translateX(-15px)' },
        }
      },
      animation: {
        float: 'floatUp 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'marquee-x': 'marqueeX 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
