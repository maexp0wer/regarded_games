/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Your custom animation configuration
      keyframes: {
        'subtle-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
   typography: {
        DEFAULT: {
          css: {
            // CRITICAL: Remove all table-related styling from the prose class
            table: null,
            thead: null,
            'thead th': null,
            tbody: null,
            'tbody tr': null,
            'tbody tr:nth-child(even)': null,
            'tbody td': null,
            'tfoot td': null,
            'tfoot th': null,
            
            // Also ensure we don't interfere with complex table-like lists or blockquotes
            li: {
              // Resetting li to avoid complex list-style conflicts if they appear in your cells
              '&::marker': {
                content: '""',
              }
            }
          },
        },
      },
};

export default config;