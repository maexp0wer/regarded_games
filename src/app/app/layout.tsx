'use client';

import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './_components/Navbar';
import { DiscourseHandshake } from './_components/DiscourseHandshake'; // Import here


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-bg transition-colors duration-300">
        {/* Silent SSO Handshake */}
        <DiscourseHandshake /> 
        
        <Navbar />
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}