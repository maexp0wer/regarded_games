'use client';

import { useState, useEffect, ReactNode } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import './globals.css';
import { Logo, Zuhausi, Ritardo, Carlo } from '@/components/icons';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import ContactForm from '@/components/ContactForm';
import GenericModal from '@/components/GenericModal';

import ScrollNav from '@/components/ScrollNav'; // Import the new component
import DataTable from '@/components/DataTable'; // Adjust path if needed

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
    { id: 'sectionGame', label: 'More than a Game' },
    { id: 'sectionGetInvolved', label: 'Get Involved' }
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
            <Logo className='w-40'/>
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
                  onClick={() => scrollToSection('sectionGetInvolved')}
                  className=" bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Get Involved
                </button>
              </div>
            </div>
            
          </section>
          


          {/* Choose your Hero */}
          <section id="sectionHero" className="py-16 mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Choose Your Hero</h2>
            <div className="mx-auto">
              
              <div className="grid md:grid-cols-2 gap-8">
                
                <div className="flex flex-col items-center text-center">
                  <Ritardo className="h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 800 800" onClick={openRitardoModal}/>
                  <h3 className="text-xl font-bold m-8">Ritardo, the Capitalist</h3>
                  <p className='mr-4'>Play the game of accumulation. Use your capital to concentrate power, outmaneuver rivals, and push the economy towards a state of perfect inequality. Victory means the spoils go to the elite. The "Oligarchy" splits 100% of the prize pool in a brutal, winner-take-all fight for the top.</p>
                </div>
                <GenericModal
                  isOpen={isRitardoModalOpen}
                  onClose={closeRitardoModal}
                  title="Ritardo, the Capitalist"
                >
                  <div className="flex h-full flex-col items-center text-center text-text">
                    <div className="flex w-full flex-1 items-center justify-center min-h-0 p-2">

                      <Ritardo
                        className="h-auto w-auto max-w-full max-h-full md:max-h-70"
                        viewBox="0 0 800 800"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Ritardo, the Capitalist
                      </h3>
                      <p className="px-4 pb-2 text-text/90">
                        Operating from his mom's basement, Ritardo wields what he calls "weaponized autism" and his grandma's 401k. He sees the market as a live-action video game, where fundamentals are "boomer magic" and the only true indicator is meme-velocity. For Ritardo, the goal is to win big, or go home in a blaze of loss-porn glory.
                      </p>
                    </div>
                  </div>
                </GenericModal>

                <div className="flex flex-col items-center text-center">
                    <Carlo className="h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 1200 1200" onClick={openCarloModal}/>
                    <h3 className="text-xl font-bold m-8">Carlo, the Socialist</h3>
                    <p className='ml-4'>Play the game of coordination. Organize with other players, resist the pull of capital, and drive the economy towards a state of perfect distribution. Victory means the spoils are shared. The "Solidarity Fund" caps the winnings of the rich and redistributes the surplus to reward those who sacrificed the most for the collective cause.</p>
                  </div>
                </div>
                <GenericModal
                  isOpen={isCarloModalOpen}
                  onClose={closeCarloModal}
                  title="Carlo, the Socialist"
                >
                  <div className="flex h-full flex-col items-center text-center text-text">
                    <div className="flex w-full flex-1 items-center justify-center min-h-0 p-2">
                      <Carlo
                        className="h-auto w-auto max-w-full max-h-full md:max-h-100"
                        viewBox="0 0 1200 1200"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Carlo, the Socialist
                      </h3>
                      <p className="px-4 pb-2 text-text/90">
                        Karl is a barista who trades from his sticky breakroom table, fueled by burnt coffee and pure resentment. He analyzes the market through the "Lens of Historical Materialism," shorting companies he deems the most exploitative. For Karl, every trade is a moral crusade to prove the whole game is rigged.
                      </p>
                    </div>
                  </div>
                </GenericModal>              
            </div>
          </section>

          {/* How it Works */}
          <section id="sectionHow" className="py-16 mx-auto ">
            <h2 className="text-3xl font-semibold mb-12 text-center">How it Works</h2>
            <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<Zuhausi />}
                title="ENTER THE ARENA"
                description="Each season begins with an auction. Buy your in-game Fake Internet Money ($FIM) with $USDC to form the season's Prize Pool."
                onButtonClick={() => openLitepaperToId('sectionTheGame')}
                //buttonText="Learn more" // You could override the default if needed
              />
              <Card
                icon={<Zuhausi />}
                title="PLAY THE MARKET"
                description="For 3 Months, trade $FIM on our transparent, buy-side only order book. Every trade impacts the live Gini Coefficient. Choose your trades wisely—who you trade with is as important as the price."
                onButtonClick={() => openLitepaperToId('sectionPhase2')}
              />
              <Card
                icon={<Zuhausi />}
                title="CLAIM YOUR VICTORY"
                description="The first faction to reach their goal wins. The prize pool is distributed according to the winning ideology's rules."
                onButtonClick={() => openLitepaperToId('sectionWinningTheGame')}
              />
            </div>
          </section>


          {/* More Than a Game */}
          <section id="sectionGame" className="py-16 mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">More Than a Game</h2>
            <div className="mx-auto">
              

              <p className='mb-4'>The crypto space was meant to be a tool for economic collaboration, but it's become a casino rigged against the individual. We're changing that.</p>
              <p className='mb-4'>Ritardo Games is a DAO-governed ecosystem. The game is run by the players, for the players. Our governance token, Ritardo ($RTD), allows you to not only vote on the rules but also earn a share of the real yield generated by the game's prize pool. For a deep dive into our philosophy and technical architecture, read the full Whitepaper.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => openLitepaperToId('sectionTokenomics')}
              className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200">
              Discover our Tokenomics
              
            </button>
          </div>
          </section>

          {/* Get Involved */}
          <section id="sectionGetInvolved" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Get Involved</h2>
            <div className="mx-auto">
              <p className="mb-5">
              Community is central to the Ritardo Games DAO. Without you, this Project will not succeed. Therefore, 10% of the total Token supply will be given away before the initial 
              Token launch. You can take part in the giveaway by telling us why you are interested in Ritardo Games. The token will be evenly distributed to everyone that signs up for the Airdrop. 
              You will also be able to spread the word and get a reference code. If people join the giveaway by providing your code, your initial cut of the giveaway supply will 
              grow by 10%.</p>
            </div>
                      {/* <ContactForm/> */}
                      <ContactForm/>
            
          </section>
        </div>
      </main>
    </div>
  );
}