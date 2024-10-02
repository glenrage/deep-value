// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}', // Include Flowbite components
  ],
  theme: {
    extend: {
      colors: {
        spinner: {
          info: '#06b6d4', // Custom color for spinner
          success: '#22c55e',
          failure: '#ef4444',
          warning: '#f59e0b',
          pink: '#ec4899',
          purple: '#8b5cf6',
        },
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        spin: 'spin 1s linear infinite', // Set a smooth spin animation
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('flowbite/plugin'), // Add Flowbite plugin
  ],
};
