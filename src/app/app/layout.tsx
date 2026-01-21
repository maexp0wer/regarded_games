'use client';

import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './_components/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();

  return (
    // This div ensures the entire DApp hierarchy inherits the .dark class
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[--color-bg] transition-colors duration-300">
        <Navbar />
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}