// app/HomeClient.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo, ArrowRight } from '@/components/icons';
import { useTheme } from '../context/ThemeContext';
import ScrollNav from '@/components/ScrollNav';
import DataTable from '@/components/DataTable';
import parse from 'html-react-parser';

// FIX: Changed props to be specific, removing the 'raw' prefix for clarity
export default function HomeClient({ navLinks, pageSections, competitiveAdvantageRows, tokenDistRows, securityRiskRows }: any) {
  const { darkMode, toggleTheme } = useTheme();
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        const initialTheme = savedTheme ? savedTheme === 'dark' : true;
        if (document.documentElement.classList.contains('dark') !== initialTheme) {
             toggleTheme();
        }
    }
  }, []);

  // --- HEADERS ARE HARDCODED, AS PER YOUR TEMPLATE ---
  const competitiveAdvantageHeaders = ['Feature', 'Ritardo Games', 'Meme Coin Trading', 'Online Poker / Prediction Markets'];
  const tokenDistHeaders = [
    { label: 'Category', showMobileLabel: false }, { label: 'Allocation' }, { label: 'Total Tokens' }, { label: 'Purpose and Vesting Schedule', showMobileLabel: false }
  ];
  const securityRiskHeaders = [
    { label: 'Key Risk', showMobileLabel: false }, { label: 'Mitigation Strategy', showMobileLabel: false }
  ];

  // --- ROWS ARE POPULATED FROM PROPS ---
  const parsedCARows = competitiveAdvantageRows.map((row: string[]) => row.map((cell: string) => parse(cell)));
  const parsedTDRows = tokenDistRows.map((row: string[]) => row.map((cell: string) => parse(cell)));
  const parsedSRRows = securityRiskRows.map((row: string[]) => row.map((cell: string) => parse(cell)));

  const renderSectionContent = (htmlContent: string) => {
    const parts = htmlContent.split(/(<!--dataTableIndex=\d+-->)/g);
    return parts.map((part, index) => {
      const match = part.match(/<!--dataTableIndex=(\d+)-->/);
      if (match) {
        const tableIndex = parseInt(match[1], 10);
        if (tableIndex === 0) return <DataTable key={`table-${index}`} headers={competitiveAdvantageHeaders} rows={parsedCARows} caption="" />;
        if (tableIndex === 1) return <DataTable key={`table-${index}`} headers={tokenDistHeaders} rows={parsedTDRows} breakpoint="md" caption="Total Supply: 1,000,000,000 $RTD" />;
        if (tableIndex === 2) return <DataTable key={`table-${index}`} headers={securityRiskHeaders} rows={parsedSRRows} caption="" />;
        return null;
      }
      return <React.Fragment key={index}>{parse(part)}</React.Fragment>;
    });
  };

  return (
    <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Litepaper</title>
        <link rel="icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

        <div className="w-full max-w-6xl p-8 text-text">         
          
          <section className="hero-section min-h-screen flex items-center justify-center">
            <div className="text-center max-w-4xl px-4">
              <div className='text-primary flex justify-center items-center'>
                <div className="w-full max-w-[500px] mx-10 mb-10"> 
                  <Logo/>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-7 text-text">Litepaper</h1>
              <p className="text-sm text-tex2 ">Version 1.0 - 18.08.2025</p>
              <p className="text-sm mt-2 mb-10"><a href="https://www.ritardo.games" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.ritardo.games</a></p>
              <p className="text-xs text-text2 italic mb-12 p-4 border border-gray-700 rounded-lg">
                Disclaimer: This Litepaper is for informational purposes only...
              </p>
              <button onClick={() => scrollToSection(navLinks[0]?.id || '')} className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-full text-lg font-medium transition-all duration-200 hover:scale-103">
                <ArrowRight className="inline-block mr-2 w-5 h-5" />
              </button>
            </div>            
          </section>
          
          {pageSections.map((section: any) => (
            <section key={section.id} id={section.id} className="py-16">
              <h2 className="text-3xl font-bold text-center mb-8">{section.title}</h2>
              {renderSectionContent(section.contentHtml)}
            </section>
          ))}

        </div>
      </main>
    </div>
  );
}