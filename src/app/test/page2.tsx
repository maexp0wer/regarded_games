'use client';

import { useState, useEffect, ReactNode } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { MoonIcon, SunIcon, Token, Logo, Zuhausi, Ritardo, Carlo} from '@/components/icons';
import { useTheme } from '../../context/ThemeContext';


import ScrollNav from '@/components/ScrollNav'; // Import the new component
import DataTable from '@/components/DataTable'; // Adjust path if needed

export default function Home() {
  // Dark Mode State
  const { darkMode, toggleTheme } = useTheme();
  
  // Scroll Navigation
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  useEffect(() => {
    let initialTheme; // Declare without initial value
    // Ensure this code runs only on the client
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            initialTheme = savedTheme === 'dark';
        } else {
            initialTheme = true; // Default to dark mode
        }
        // This logic needs adjustment based on your useTheme implementation
        // For now, assuming toggleTheme sets the correct state based on document class
        if ((document.documentElement.classList.contains('dark')) !== initialTheme) {
             toggleTheme();
        }
    }
  }, []);

  // --- CONTENT FROM YOUR DOCUMENT ---

  // Navigation Links populated from your document's Table of Contents
  const navLinks = [
    { id: 'sectionExecutiveSummary', label: 'Executive Summary' },
    { id: 'sectionDAOOverview', label: 'DAO Overview' },
    { id: 'sectionMarketOpportunity', label: 'Market Opportunity' },
    { id: 'sectionTechnologyStack', label: 'Technology Stack' },
    { id: 'sectionTheGame', label: 'The Game' },
    { id: 'sectionTokenomics', label: 'Tokenomics' },
    { id: 'sectionRoadmap', label: 'Roadmap' },
    { id: 'sectionCommunity', label: 'Community Growth' },
    { id: 'sectionSecurity', label: 'Security & Risks' },
    { id: 'sectionContributors', label: 'Core Contributors' },
    { id: 'sectionJoin', label: 'Join the Game' }
  ];

  // Data for the Competitive Landscape Table
  const competitiveAdvantageHeaders = ['Feature', 'Ritardo Games', 'Meme Coin Trading', 'Online Poker / Prediction Markets'];
  const competitiveAdvantageRows = [
    ['Fairness', 'Provably Fair (On-chain, transparent rules)', 'Fundamentally Unfair (Asymmetric info, insider manipulation)', 'Generally Fair (But subject to bots, collusion, platform risk)'],
    ['Core Driver', 'Collective Strategy & Game Theory', 'Luck, Hype & Social Signaling', 'Individual Skill & Probability'],
    ['Strategic Depth', 'Macroeconomic (Influencing a whole system)', 'Non-existent (Pure speculation)', 'Microeconomic (Playing your hand/position)'],
    ['Transparency', 'Radical (All data is public on-chain)', 'Opaque (Insider wallets, hidden team actions)', 'Limited (Platform takes a cut, logic is centralized)'],
    ['Value Accrual', 'Real Yield for Governors ($RTD)', 'None, beyond price appreciation', 'Rake / Fees paid to a central company'],
  ];



  return (
    <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Ritardo Games - Litepaper</title>
        <link rel="icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      {/* Scroll Navigation Column */}
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
            <strong>Disclaimer:</strong> This Litepaper is for informational purposes only and does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation for any security or financial instrument. The information herein is not investment, legal, or tax advice. $RTD and $FIM are tokens with utility within the Ritardo Games ecosystem and are not intended to be investment products. Please conduct your own research and consult with professional advisors before participating. All forward-looking statements are subject to risks and uncertainties.
          </p>

          {/* 1. Executive Summary */}
          <section id="sectionExecutiveSummary" className="min-h-screen py-16">
            <h2 className="text-3xl font-bold text-center mb-8">1. Executive Summary</h2>
            <p className='mb-4'><strong>Mission:</strong> Ritardo Games is a decentralized strategy game built to settle the oldest debate in economics. We are transforming the rigged game of speculative trading into a fair, transparent, and provably skill-based contest between Capitalism and Socialism, fought on-chain.</p>
            <p className='mb-4'><strong>The Problem:</strong> The battle between the informed few and the hopeful many is as old as markets themselves. The decentralized financial ecosystem has accelerated this timeless dynamic to an extreme, creating a system where asymmetric information is weaponized to systematically turn retail participants into exit liquidity.</p>
            <p className='mb-4'><strong>Our Solution:</strong> We've built a perfect-information strategy game where collective action battles economic power for real-money stakes. The Ritardo Games ecosystem is powered by a sophisticated dual-token model that separates gameplay from governance and is engineered with unique mechanics to ensure a level playing field.</p>
            <h3 className="text-xl font-semibold mt-6 mb-4">The Ecosystem:</h3>
            <ul className="list-disc ml-8 space-y-2">
              <li><strong>Gameplay Token ($FIM - Fake Internet Money):</strong> Each season, players mint a new, non-transferable $FIM token by committing USDC in a Batch Auction, which fairly prices the token and forms the Prize Pool. For one quarter, players trade $FIM on a buy-side only exchange—a strategic marketplace designed to prevent manipulation—to influence the game's Gini Coefficient.</li>
              <li><strong>Governance Token ($RTD - Ritardo):</strong> This is the DAO's ownership token. Holders of $RTD govern the entire ecosystem, from the rules of the game to the management of the treasury.</li>
              <li><strong>Victory & Payout:</strong> The first ideology to achieve its goal wins the game. The Prize Pool is then distributed according to the winning philosophy: a winner-take-all "Oligarchy" payout for a Capitalist victory, or a redistributive "Solidarity Fund" payout for a Socialist victory.</li>
            </ul>
            <p className='mt-6 mb-4'><strong>Sustainable Yield for Governors:</strong> The USDC in the Prize Pool is not idle. It is deployed into blue-chip DeFi protocols to generate a stable yield. This yield—the DAO's revenue—is distributed to staked $RTD holders as a continuous stream, rewarding long-term governors with a sustainable return and eliminating the volatility of discrete "dividend" events.</p>
          </section>

          {/* 3. Market Opportunity */}
          <section id="sectionMarketOpportunity" className="py-16">
            <DataTable 
              headers={competitiveAdvantageHeaders} 
              rows={competitiveAdvantageRows} 
              caption=""
            />
          </section>



        </div>
      </main>
    </div>
  );
}