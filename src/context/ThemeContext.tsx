'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface ThemeContextProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ✅ FIX: Changed from 'export default' to 'export function' (Named Export)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Client-side initialization to match local storage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme ? savedTheme === 'dark' : systemDark;

      setDarkMode(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode((prevMode) => {
      const newMode = !prevMode;
      document.documentElement.classList.toggle('dark', newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  const value = { darkMode, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}