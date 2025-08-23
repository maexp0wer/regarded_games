'use client';

import { useState, useEffect, ReactNode } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo } from '@/components/svg';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import CardPlain from '@/components/CardPlain';
import ContactForm from '@/components/ContactForm';
import GenericModal from '@/components/GenericModal';
import Ritardo from '@/components/icons/Ritardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import FIM1 from '@/components/icons/FIM1.svg';

import ScrollNav from '@/components/ScrollNav'; // Import the new component
import { ArrowDownCircleIcon, ArrowDownIcon } from '@heroicons/react/16/solid';

export default function Home() {
  // Dark Mode State
  const { darkMode, toggleTheme } = useTheme();
  
  // Scroll Navigation
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  // Modal
  const [isRitardoModalOpen, setIsRitardoModalOpen] = useState(false);
  const openRitardoModal = () => setIsRitardoModalOpen(true);
  const closeRitardoModal = () => setIsRitardoModalOpen(false);

  const [isCarloModalOpen, setIsCarloModalOpen] = useState(false);
  const openCarloModal = () => setIsCarloModalOpen(true);
  const closeCarloModal = () => setIsCarloModalOpen(false);

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

  // Navigation Links
  const navLinks = [
    { id: 'sectionHero', label: 'Choose your Hero' },
    { id: 'sectionHow', label: 'How it works' },
    { id: 'sectionGame', label: 'Own the Game' },
    { id: 'sectionGenesisProgram', label: 'Genesis Program' }
  ];

  const openLitepaper = () => {
    // The third argument to window.open handles the 'noopener' and 'noreferrer'
    window.open('/litepaper', '_blank', 'noopener,noreferrer');
  };

  const openLitepaperToId = (elementId: string) => {
  // Construct the full URL with the hash
  const url = `/litepaper#${elementId}`;

  // This part remains exactly the same
  window.open(url, '_blank', 'noopener,noreferrer');
};

// The function from the previous answer
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };


  return (
    <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Ritardo Games</title>
        <link rel="icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      {/* Scroll Navigation Column (now a reusable component) */}
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
          <div className='text-primary flex justify-center items-center '>
            <Logo className='w-40 text-white'/>
          </div>

        
          {/* Hero Section */}
          <section className="hero-section min-h-screen flex items-center justify-center">
            <div className="text-center max-w-4xl px-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-2 text-primary">
                A War of Ideas.
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
                Fought On-Chain. 
              </h1>
              <h2 className="text-xl md:text-2xl mb-8">
                A perfect-information strategy game, where collective action battles economic power for real-money stakes.
              </h2>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => scrollToSection('sectionHero')}
                  className=" bg-card2 hover:bg-card3 text-text px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Learn More
                </button>
                
                <button 
                  onClick={openLitepaper}
                  className="bg-text hover:bg-text2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Read Litepaper
                </button>

                <button 
                  onClick={() => scrollToSection('sectionGenesisProgram')}
                  className=" bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Join the Game
                </button>
              </div>
            </div>
            
          </section>
          


          {/* Choose your Hero */}
          <section id="sectionHero" className="py-16 mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Choose Your Hero</h2>
            <div className="mx-auto">
              
              <div className="grid md:grid-cols-2 gap-8">
                
                <div className="flex flex-col items-center text-center bg-card p-8 rounded-xl shadow-md">
                  <Ritardo className="w-full h-auto max-h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 500 800" onClick={openRitardoModal}/>
                  <h3 className="text-xl font-bold m-8">Ritardo, the Capitalist</h3>
                  <p className='mr-4'>Play the game of accumulation. Use your capital to concentrate power, outmaneuver rivals, and push the economy towards a state of perfect inequality. Victory means the spoils go to the elite. The "Oligarchy" splits 100% of the prize pool in a brutal, winner-take-all fight for the top.</p>
                </div>
                

                <div className="flex flex-col items-center text-center bg-card p-8 rounded-xl shadow-md">
                    <Carlo className="w-full h-auto max-h-70 transition-transform duration-200 ease-in-out hover:scale-110 pt-8" viewBox="0 0 500 800" onClick={openCarloModal}/>
                    <h3 className="text-xl font-bold m-8">Carlo, the Socialist</h3>
                    <p className='ml-4'>Play the game of coordination. Organize with other players, resist the pull of capital, and drive the economy towards a state of perfect distribution. Victory means the spoils are shared. The "Solidarity Fund" caps the winnings of the rich and redistributes the surplus to reward those who sacrificed the most for the collective cause.</p>
                  </div>
                </div>
                           
            </div>
          </section>

          {/* How it Works */}
          <section id="sectionHow" className="py-16 mx-auto ">
            <h2 className="text-3xl font-semibold mb-12 text-center">How it Works</h2>
           

          </section>


          {/* More Than a Game */}
          <section id="sectionGame" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Own the Game.</h2>
            <div className="mx-auto">
              <p className='mb-10'>The modern financial market is a game rigged against the individual. Ritardo Games is built on a different foundation. It is a self-sustaining ecosystem owned and operated by its players, using the power of decentralization to create a fairer and more transparent world than the one it simulates.</p>
              
      
              
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={() => openLitepaperToId('sectionHero')}
              className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200">
              Read the Whitepaper
            </button>
          </div>
          </section>

          {/* Genesis Programm */}
          <section id="sectionGenesisProgram" className="py-16 mx-auto">

            <h2 className="text-3xl font-bold mb-8 text-center">Join the Genesis Program</h2>
            <h2 className="text-xl font-bold mb-8 text-center">Ritardo Games is a community-owned DAO. We're reserving a significant portion of the initial $RTD supply for our founding players. Your Contribution Score determines your share. Here's your quest board:</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Card 1: Community & Social */}

              </div>
              <div id='contactForm'>
                <h3 className='text-center text-xl mt-12 mb-4'>Ready to start your campaign?</h3>
            <ContactForm/>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}