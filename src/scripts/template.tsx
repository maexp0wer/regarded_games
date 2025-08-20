'use client';

import { useEffect, } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo, ArrowRight} from '@/components/icons';
import { useTheme } from '@/context/ThemeContext';


import ScrollNav from '@/components/ScrollNav'; // Import the new component
import DataTable from '@/components/DataTable'; // Adjust path if needed




export default function Home() {
  // Dark Mode State
  const { darkMode, toggleTheme } = useTheme();
  
  // Scroll Navigation
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  const handleDownload = () => {
    // The path to the file in the public folder
    const fileUrl = '/documents/litepaper.pdf';
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = fileUrl;
    
    // Set the download attribute with the desired filename
    link.setAttribute('download', 'Litepaper - Ritardo Games.pdf');
    
    // Append the link to the body (required for Firefox)
    document.body.appendChild(link);
    
    // Programmatically click the link to trigger the download
    link.click();
    
    // Clean up and remove the link
    document.body.removeChild(link);
  };


  useEffect(() => {
    let initialTheme; // Declare without initial value
    // Ensure this code runs only on the client
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme) {
            // If a theme is saved, respect it
            initialTheme = savedTheme === 'dark';
        } else {
            // --- CHANGE IS HERE: If NO theme is saved, default to DARK ---
            initialTheme = true; // true means dark mode
        }

        toggleTheme();
        // Apply class immediately on load based on initial check
        document.documentElement.classList.toggle('dark', initialTheme);
    }
  }, []);

  // FIX 2: Add placeholder declarations for generated variables.
  // This satisfies TypeScript in the template file. The build script will inject the
  // real 'const' declarations below, which will be used at runtime.
  let navLinks: { id: string; label: string }[] = [];
  // Declare any potential table data variables as 'any' to suppress errors.
  // Add more if you anticipate more tables in your document.

  // --- GENERATED CONTENT START ---
  // The script will replace these comments with the actual const declarations.
  
  // <!-- NAV_LINKS_PLACEHOLDER -->

  // <!-- DATA_TABLES_PLACEHOLDER -->

  // --- GENERATED CONTENT END ---

  return (
    <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Ritardo Games - Litepaper</title>
        <link rel="icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      <ScrollNav
        navLinks={navLinks}
        activeSection={activeSection}
        isNavVisible={isNavVisible}
        scrollToSection={scrollToSection}
      />

      <main className={`transition-all duration-300 ${
        isNavVisible
          ? 'relative mx-auto 2xl:transform 2xl:-translate-x-[65px]'
          : 'relative mx-auto md:transform md:-translate-x-[65px]'
      }`}>
        <div className="w-full max-w-4xl p-8 text-text">          
          <div className='text-primary flex justify-center items-center'>
            <Logo/>
          </div>
          
          <div className="text-center my-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-2 text-primary">Litepaper</h1>
            <p className="text-sm text-gray-500">Version 1.0 - 18.08.2025</p>
            <p className="text-sm mt-2"><a href="https://www.ritardo.games" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.ritardo.games</a></p>
          </div>
          
          <p className="text-xs text-gray-400 italic mb-12 p-4 border border-gray-700 rounded-lg">
            <strong>Disclaimer:</strong> This Litepaper is for informational purposes only...
          </p>

          {/* <!-- SECTIONS_PLACEHOLDER --> */}

        </div>
      </main>
    </div>
  );
}