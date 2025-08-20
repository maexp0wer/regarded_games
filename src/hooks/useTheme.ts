// hooks/useTheme.ts
'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [darkMode, setDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme 
      ? savedTheme === 'dark'
      : systemPrefersDark;
    
    setDarkMode(initialTheme);
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [darkMode, isMounted]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return { darkMode, toggleTheme, isMounted };
}