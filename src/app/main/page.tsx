'use client';

import { useState, useEffect, ReactNode } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo } from '@/components/icons/svg';
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
                
                <div className="flex flex-col items-center text-center bg-card p-8 rounded-xl shadow-md max-h-screen">
                  <Ritardo className="w-full h-auto max-h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 500 800" onClick={openRitardoModal}/>
                  <h3 className="text-xl font-bold m-8">Ritardo, the Capitalist</h3>
                  <p className='text-sm'>Play the game of accumulation. Use your capital to concentrate power, outmaneuver rivals, and push the economy towards a state of perfect inequality. Victory means the spoils go to the elite. The "Oligarchy" splits 100% of the prize pool in a brutal, winner-take-all fight for the top.</p>
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
                        viewBox="0 0 500 800"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Ritardo, the Capitalist
                      </h3>
                      <p className="px-4 p-2 text-text/90">
                        Operating from his mom's basement, Ritardo wields what he calls "weaponized autism" and his grandma's 401k. He sees the market as a live-action video game, where fundamentals are "boomer magic" and the only true indicator is meme-velocity. For Ritardo, the goal is to win big, or go home in a blaze of loss-porn glory.
                      </p>
                    </div>
                  </div>
                </GenericModal>

                <div className="flex flex-col items-center text-center bg-card p-8 rounded-xl shadow-md max-h-screen">
                  <Carlo className="w-full h-auto max-h-70  transition-transform duration-200 ease-in-out hover:scale-110 pt-8" viewBox="0 0 500 800" onClick={openCarloModal}/>
                  <h3 className="text-xl font-bold m-8">Carlo, the Socialist</h3>
                  <p className='text-sm'>Play the game of coordination. Organize with other players, resist the pull of capital, and drive the economy towards a state of perfect distribution. Victory means the spoils are shared. The "Solidarity Fund" caps the winnings of the rich and redistributes the surplus to reward those who sacrificed the most for the collective cause.</p>
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
                        viewBox="0 0 500 800"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Carlo, the Socialist
                      </h3>
                      <p className="px-4 p-2 text-text/90">
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
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="ENTER THE ARENA"
                description="Each season begins with an auction. Buy your in-game Fake Internet Money ($FIM) with $USDC to form the season's Prize Pool."
                onButtonClick={() => openLitepaperToId('sectionTheGame')}
                //buttonText="Learn more" // You could override the default if needed
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="OUTPLAY THE MARKET"
                description="For 3 Months, trade $FIM to impact the live Gini Coefficient, which measures wealth inequality. Choose your trades wisely and coordinate with your peers—who you trade with is as important as the price."
                onButtonClick={() => openLitepaperToId('sectionPhase2')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
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
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="A New Framework for Collaboration"
                description="The crypto space has the potential to be more than a casino; it can be a framework for global economic collaboration. Ritardo Games is a contribution to steering the narrative away from speculative excess and back towards that foundational purpose. By playing, you are not just competing; you are participating in a grand experiment about the future of coordination."
                onButtonClick={() => openLitepaperToId('sectionMarketOpportunity')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="True Player Ownership through a DAO"
                description="Ritardo Games is a Decentralized Autonomous Organization (DAO). There is no central company that can change the rules or rig the outcome. All decisions—from game balance to treasury management—are made by the community of Ritardo ($RTD) token holders. The players hold the power, permanently."
                onButtonClick={() => openLitepaperToId('sectionDAOOverview')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="A Productive Treasury & Real Yield"
                description="The game's Prize Pool is put to work in blue-chip DeFi protocols, generating a stable yield. This revenue is the DAO's lifeblood, and is distributed among the staked $RTD holders. As the game grows, so do the rewards for its governors. Ownership is designed to be productive."
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

          {/* Genesis Programm */}
          <section id="sectionGenesisProgram" className="py-16 mx-auto">

            <h2 className="text-3xl font-bold mb-8 text-center">Join the Genesis Program</h2>
            <h2 className="text-xl font-bold mb-8 text-center">Ritardo Games is a community-owned DAO. We're reserving a significant portion of the initial $RTD supply for our founding players. Your Contribution Score determines your share. Here's your quest board:</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Card 1: Community & Social */}
        <CardPlain
          icon={<Ritardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Join the Community"
          description={
            <>
              <p className="text-sm">
                Earn your base score and a multiplier for being an active, strategic
                voice in our Discord and on social media.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Join the Program: 100 Points</li>
                <li>Valued Contributor Bonus: Up to 400 extra Points (5x Multiplier)</li>
              </ul>
              <p className="my-4 font-semibold">Max Possible Score: 500 Points</p>
              </>
            }
          actions={
              <button 
                onClick={() => scrollToId('contactForm')}
                className="w-full lg:w-2/3 bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
                Join now
              </button>
          }
        />

        {/* Card 2: Ecosystem Growth */}
        <CardPlain
          icon={<Ritardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Spread the Word"
          description={
            <>
              <p className="text-sm">
                Use your unique referral code to bring other high-quality players
                into the ecosystem. You're rewarded for the engaged members you
                bring in.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Referrals 1-10: 50 Points each</li>
                <li>Referrals 11-35: 20 Points each</li>
                <li>Referrals 36-100: 5 Points each</li>
              </ul>
              <p className="mt-4 font-semibold">Max Possible Score: 1,325 Points</p>
              </>
            }
          actions={
            <button 
              onClick={() => scrollToId('contactForm')}
              className="w-full lg:w-2/3 bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
              Join now
            </button>
          }
        />

        {/* Card 3: Testnet Performance */}
        <CardPlain
          icon={<Ritardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Dominate the Testnet"
          description={
            <>
              <p className="text-sm">
                This is where the real strategists shine. Your skill on the
                battlefield is a significant part of your score.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Be Active (Max): 200 Points</li>
                <li>Be on the Winning Faction: 1,000 Points (vs. 100 for losing)</li>
              </ul>
              <p className="mt-4 font-semibold">Max Possible Score: 1,200 Points</p>
              </>
            }
          actions={
              <button 
                onClick={() => window.open('http://app.localhost:3000')}
                className="w-full lg:w-2/3 bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
                Launch Testnet App
              </button>
          }
        />

        {/* Card 4: Protocol Security */}
        <CardPlain
          icon={<Ritardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Become a Guardian"
          description={
            <>
              <p className="text-sm">
                Help us secure the protocol. Find and responsibly report bugs to
                earn a massive bonus.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Critical Bug: 25,000 Points</li>
                <li>High Severity Bug: 10,000 Points</li>
                <li>Medium Severity Bug: 2,500 Points</li>
                <li>Low Severity / Informational: 500 Points</li>
              </ul>
              </>
            }
          actions={
            <button 
              onClick={() => window.open('https://github.com/maexp0wer/ritardo_games')}
              className="w-full lg:w-2/3 bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
              Open GitHub
            </button>
          }
        />
              </div>
              <div id='contactForm'>
                <h3 className='text-center text-xl font-bold mt-12 mb-4'>Ready to start your campaign?</h3>
            <ContactForm/>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}