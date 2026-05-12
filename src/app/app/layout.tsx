'use client';

import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './_components/Navbar';
import { DiscourseHandshake } from './_components/DiscourseHandshake';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-bg transition-colors duration-300">
        <DiscourseHandshake />
        <Navbar />
        <div className="mx-auto max-w-360 px-6 pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
