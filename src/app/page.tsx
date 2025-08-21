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
    { id: 'sectionGame', label: 'Own the Game' },
    { id: 'sectionBecomePlayer', label: 'Become a Player' }
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
                  onClick={() => scrollToSection('sectionBecomePlayer')}
                  className=" bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Become a Player
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

                <div className="flex flex-col items-center text-center bg-card p-8 rounded-xl shadow-md">
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
                        className="h-auto w-auto max-w-full max-h-full md:max-h-70"
                        viewBox="0 0 1200 1200"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Carlo, the Socialist
                      </h3>
                      <p className="px-4 pb-2 text-text/90">
                        Carlo is a barista who trades from his sticky breakroom table, fueled by burnt coffee and pure resentment. He analyzes the market through the "Lens of Historical Materialism," shorting companies he deems the most exploitative. For Karl, every trade is a moral crusade to prove the whole game is rigged.
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
                title="OUTPLAY THE MARKET"
                description="For 3 Months, trade $FIM to impact the live Gini Coefficient, which measures wealth inequality. Choose your trades wisely and coordinate with your peers—who you trade with is as important as the price."
                onButtonClick={() => openLitepaperToId('sectionPhase2')}
              />
              <Card
                icon={<Zuhausi />}
                title="CLAIM YOUR VICTORY"
                description="The first side to reach their goal wins. The prize pool is distributed according to the winning ideology's rules."
                onButtonClick={() => openLitepaperToId('sectionWinningTheGame')}
              />
            </div>
          </section>


          {/* More Than a Game */}
          <section id="sectionGame" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Own the Game.</h2>
            <div className="mx-auto">
              <p className='mb-10'>The modern financial market is a game rigged against the individual. Ritardo Games is built on a different foundation. It is a self-sustaining ecosystem owned and operated by its players, using the power of decentralization to create a fairer and more transparent world than the one it simulates.</p>
              
              
              </div>
              <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<Zuhausi />}
                title="A New Framework for Collaboration"
                description="The crypto space has the potential to be more than a casino; it can be a framework for global economic collaboration. Ritardo Games is a contribution to steering the narrative away from speculative excess and back towards that foundational purpose. By playing, you are not just competing; you are participating in a grand experiment about the future of coordination."
                onButtonClick={() => openLitepaperToId('sectionMarketOpportunity')}
              />
              <Card
                icon={<Zuhausi />}
                title="True Player Ownership through a DAO"
                description="Ritardo Games is a Decentralized Autonomous Organization (DAO). There is no central company that can change the rules or rig the outcome. All decisions—from game balance to treasury management—are made by the community of $RTD token holders. The players hold the power, permanently."
                onButtonClick={() => openLitepaperToId('sectionDAOOverview')}
              />
              <Card
                icon={<Zuhausi />}
                title="A Productive Treasury & Real Yield"
                description="The game's Prize Pool is put to work in blue-chip DeFi protocols, generating a stable yield. This revenue is the DAO's lifeblood, and it's streamed continuously to the staked $RTD holders. As the game grows, so do the rewards for its governors. Ownership is designed to be productive."
                onButtonClick={() => openLitepaperToId('sectionTokenomics')}
              />
              
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={() => openLitepaperToId('sectionHero')}
              className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200">
              Read the Whitepaper
            </button>
          </div>
          </section>

          {/* Get Involved */}
          <section id="sectionBecomePlayer" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Become a Founding Player</h2>
            <h2 className="text-xl font-bold mb-8 text-center">Ritardo Games is a community-owned ecosystem. The earliest and most dedicated contributors will be rewarded with a significant stake in its future.</h2>
            
            <div className="grid xl:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col bg-card2 rounded-xl shadow-md overflow-hidden h-full">
              
              <h3 className="text-xl font-semibold m-4 text-center">1. Secure Your Spot</h3>
              <div className="h-full bg-card flex justify-center">
              <div className="m-6 space-y-2">
                <p>Enter your email and wallet address below to join the waitlist. This is the first step to becoming eligible.</p>
                <p><strong>Reward: :</strong> Secures a base allocation of the airdrop pool.</p>
              </div>
              </div>
            </div>

            <div className="flex flex-col bg-card2 rounded-xl shadow-md overflow-hidden h-full">
              <h3 className="text-xl font-semibold m-4 text-center">2. Join the Community</h3>
              <div className="h-full bg-card flex justify-center">
              <div className="m-6 space-y-2">
                <p>Connect your Twitter and join our Discord. Participate in strategic discussions. The most insightful and helpful community members will be noticed.</p>
                <p><strong>Reward: :</strong> Secures a base allocation of the airdrop pool.</p>
              </div>
              </div>
            </div>

            <div className="flex flex-col bg-card2 rounded-xl shadow-md overflow-hidden h-full">
              <h3 className="text-xl font-semibold m-4 text-center">3. Spread the Word</h3>
              <div className="h-full bg-card flex justify-center">
              <div className="m-6 space-y-2">
                <p>During signup, you can create a unique referral code. Share it with other strategists, traders, and game theorists.</p>
                <p><strong>Reward: :</strong> For every person who signs up with your code, your allocation will grow. The more valuable the members you bring in, the more you earn.</p>
              </div>
              </div>
            </div>

            <div className="flex flex-col bg-card2 rounded-xl shadow-md overflow-hidden h-full">
              <h3 className="text-xl font-semibold m-4 text-center">4. Join the Testnet</h3>
              <div className="h-full bg-card flex justify-center">
              <div className="m-6 space-y-2">
                <p>Participate in our upcoming public Testnet on the Base network. Play the game, find bugs, and prove your strategic skill.</p>
                <p><strong>Reward: :</strong> The largest portion of the airdrop will be reserved for our most active and successful Testnet players. Your performance on the battlefield is the ultimate proof of your value to the DAO.</p>
              </div>
              </div>
            </div>
          </div>

            <ContactForm/>
            
          </section>
        </div>
      </main>
    </div>
  );
}