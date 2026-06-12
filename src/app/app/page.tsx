'use client';

import { useTheme } from '@/context/ThemeContext';


export default function Navbar() {
  const { darkMode } = useTheme();
  <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}></div>
}