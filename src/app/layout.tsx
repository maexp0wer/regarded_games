// app/layout.tsx
import { ThemeProvider } from '../context/ThemeContext';
import './globals.css';
import type { Metadata } from 'next';
import { Exo_2, Orbitron } from 'next/font/google'; // 1. Import the fonts


const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['900'], // Specify the weights used in your SVG
  variable: '--font-orbitron', // Define a CSS variable name
});
// --- Define the script content with JSDoc type hint ---
const blockingThemeScript = `
(function() {
  try {
    /**
     * Applies the theme class to the document element.
     * @param {string} theme The theme name ('dark' or 'light').
     */
    function applyTheme(theme) {
      // No change needed inside the function body itself
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      applyTheme(savedTheme); // savedTheme is inherently a string or null
    } else {
      applyTheme('dark'); // Default to dark ('dark' is a string)
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: blockingThemeScript,
          }}
        />
        <ThemeProvider>
           {children}
        </ThemeProvider>
        <div id="modal-root"></div>
      </body>
    </html>
  )
}

