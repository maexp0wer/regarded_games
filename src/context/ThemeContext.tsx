// app/context/ThemeContext.tsx
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define the shape of the context data
interface ThemeContextProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

// Create the context with a default value (can be null or initial state)
// Provide a default function that does nothing initially.
const ThemeContext = createContext<ThemeContextProps | null>(null);

// Create a custom hook for easy consumption
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Create the Provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false); // Initial default

  // Your existing initialization logic
  useEffect(() => {
    let initialTheme;
    // Runs only on the client AFTER the inline script
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            initialTheme = savedTheme === 'dark';
        } else {
            // Default to dark (matches inline script logic)
            initialTheme = true;
        }

        // Set the React state to match the initial theme
        setDarkMode(initialTheme);

        // This line is technically redundant now if the inline script worked,
        // but it's harmless and ensures consistency.
        document.documentElement.classList.toggle('dark', initialTheme);
    }
  }, []); 

  // Your existing toggle logic
  const toggleTheme = () => {
    setDarkMode(prevMode => {
        const newMode = !prevMode;
        // Ensure this code runs only on the client
        if (typeof window !== 'undefined') {
            document.documentElement.classList.toggle('dark', newMode);
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
        }
        return newMode;
    });
  };

  // Provide the state and toggle function to children
  const value = { darkMode, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};