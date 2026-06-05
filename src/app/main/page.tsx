'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '@/app/globals.css';
import { useTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/icons/svg';
import Card from '@/components/Card';
import CardPlain from '@/components/CardPlain';
import ContactForm from '@/components/ContactForm';
import GenericModal from '@/components/GenericModal';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import FIM1 from '@/components/icons/FIM1.svg';
import { useDocNavigation } from '@/hooks/useDocNavigation';
import NestedPieChart from '@/components/NestedPieChart';
import CyclingSubheading from '@/components/CyclingSubheading';

const tableData = [
  {
    parentName: " ",        // Tier 1
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    parentExplanation: "75% of the initial $RGD supply is directly controlled by you, the DAO members.",
    name: "DAO Treasury Reserve",        // Tier 2
    percentage: 40,
    color: "var(--color-green)",
    explanation: "Long-Term Capital. Controlled entirely by governance for future growth, acquisitions, or diversification. Subject to a 5-year linear unlock.",
    subChildren: [              // Tier 3
    ]
  },
  {
    parentName: " ",        // Tier 1
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Growth & Ecosystem",         // Tier 2
    percentage: 20,
    color: "var(--color-magenta)",
    explanation: "Funds Active Incentives and marketing. Released based on DAO-approved milestones.",
    subChildren: [               // Tier 3
      { name: "Merkl Rewards", percentage: 5, color: "var(--color-magenta-70)" },
      { name: "User Acquisition", percentage: 15, color: "var(--color-magenta)" }
    ]
  },
  {
    parentName: " ",        // Tier 1
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Market Formation",         // Tier 2
    percentage: 15,
    color: "var(--color-orange)",
    explanation: "Distributed to early community participants and used to provide initial exchange liquidity to ensure Day 1 market stability.",
    subChildren: [               // Tier 3
      { name: "Genesis Program", percentage: 3, color: "var(--color-orange-35)" },
      { name: "Capital Auction", percentage: 6, color: "var(--color-orange-70)" },
      { name: "Liquidity Pool", percentage: 6, color: "var(--color-orange)" },
    ]
  },
  {
    parentName: "  ",        // Tier 1
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    parentExplanation: "only 25% of the initial $RGD supply is not directly controlled by you, but distributed to the non-profit DAO LLC and vested among the founding Team for longterm alignment.",
    name: "Team",         // Tier 2
    percentage: 15,
    color: "var(--color-gold)",
    explanation: "Incentivizes the founding team. Subject to a 4-year vesting schedule with a 12-month cliff.",
    subChildren: [               // Tier 3
    ]
  },
  {
    parentName: "  ",        // Tier 1
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    name: "Operational Reserve",         // Tier 2
    percentage: 10,
    color: "var(--color-purple)",
    explanation: "Allocated to the non-profit Regarded DAO LLC to cover real-world costs (legal compliance, audits, hosting). Managed via multi-sig with strict spending rules.",
    subChildren: [
    ]
  },
];


import ScrollNav from '@/components/ScrollNav'; // Import the new component
import { Expletus_Sans } from 'next/font/google';

export default function Home() {
  // Dark Mode State
  const { darkMode } = useTheme();

  const navigateToDocs = useDocNavigation();
  
  // Scroll Navigation
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  // The desktop sidebar always reserves its column at md+, so `mx-auto` centers
  // the main content in the *remaining* space rather than the viewport. We pull
  // it back by exactly half the sidebar's measured width so it sits at the true
  // viewport center. While the nav is visible we only re-center on very wide
  // screens (2xl) where there's room beside it; once it's hidden (its column is
  // still reserved) we can re-center from md up since nothing visible overlaps.
  const [navOffset, setNavOffset] = useState(0);
  useEffect(() => {
    const navEl = document.getElementById('desktop-scrollnav');
    const compute = () => {
      const width = navEl?.offsetWidth ?? 0;
      const vw = window.innerWidth;
      const shouldOffset = isNavVisible ? vw >= 1536 : vw >= 768;
      setNavOffset(shouldOffset ? width / 2 : 0);
    };
    compute();
    const ro = navEl ? new ResizeObserver(compute) : null;
    if (navEl && ro) ro.observe(navEl);
    window.addEventListener('resize', compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [isNavVisible]);

  // Modal
  const [isRegardoModalOpen, setIsRegardoModalOpen] = useState(false);
  const openRegardoModal = () => setIsRegardoModalOpen(true);
  const closeRegardoModal = () => setIsRegardoModalOpen(false);

  const [isCarloModalOpen, setIsCarloModalOpen] = useState(false);
  const openCarloModal = () => setIsCarloModalOpen(true);
  const closeCarloModal = () => setIsCarloModalOpen(false);

  

  // Navigation Links
  const navLinks = [
    { id: 'sectionHero', label: 'Choose your Hero' },
    { id: 'sectionPlay', label: 'Play the Game' },
    { id: 'sectionOwnMarket', label: 'Own the Project' },
    { id: 'sectionDistribution', label: 'Distribution of Power' },
    { id: 'sectionCampaign', label: 'Campaign Sequence' },
    { id: 'sectionSecureYourStake', label: 'Secure Your Stake' }
  ];


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
        <title>Regarded Games</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      {/* Scroll Navigation Column (now a reusable component) */}
      <ScrollNav
        navLinks={navLinks}
        activeSection={activeSection}
        isNavVisible={isNavVisible}
        scrollToSection={scrollToSection}
      />

      <main
        className="relative mx-auto min-w-0 transition-transform duration-300"
        style={{ transform: navOffset ? `translateX(-${navOffset}px)` : undefined }}
      >

        <div className="w-full max-w-6xl md:pl-0  p-5 2xl:p-8 text-text">
          <div className='text-gold flex justify-center items-center '>
            <Logo className='w-40 text-white'/>
          </div>


          {/* Hero Section */}
          <section className="hero-section relative min-h-screen flex items-center justify-center">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[25rem] rounded-full [background:var(--sunset)] blur-[100px] opacity-25 pointer-events-none z-0" />

  <div className="relative flex flex-col items-center justify-center text-center pt-32 px-6 pb-24 max-w-5xl mx-auto overflow-hidden">
    {/* Main Header Display - Single block for perfect scaling */}
    <h1 className="hero-title">
      Class War<br />
      <span className="hero-gradient-text">The Game</span>
    </h1>

    {/* Dynamic Cycling Subheading Container */}
    <div className="hero-subtitle">
      <CyclingSubheading />
    </div>

    {/* Action Block Spacing Container */}
    <div className="flex flex-wrap items-center justify-center gap-4 z-10">
      <button 
        onClick={() => scrollToSection('sectionHero')}
        className="btn-game-secondary"
      >
        Learn More
      </button>
      
      <button 
        onClick={() => navigateToDocs('intro')}
        className="btn-game-secondary"
      >
        Read Docs
      </button>

      <button 
        onClick={() => window.open('http://app.localhost:3000/ico')}
        className="btn-game-primary"
      >
        Secure Your Stake
      </button>
    </div>
  </div>
          </section>
          


          {/* Choose your Hero */}
          <section id="sectionHero" className="py-16 mx-auto">
            <h2 className="h2-app mb-12 text-center">Choose Your Hero</h2>
            <div className="mx-auto">
              
              <div className="grid md:grid-cols-2 gap-8">
                
                <div className="flex flex-col items-center text-center landing-card max-h-screen">
                  <Regardo className="w-full h-auto max-h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 500 800" onClick={openRegardoModal}/>
                  <h3 className="h3-app mt-8 m-3">Regardo, the Capitalist</h3>
                  <p className='text-sm'>Concentrate capital to push the economy toward perfect inequality. Win as the Capitalists — the fewest wallets collectively holding 50% of the supply — and split the entire prize pool. The rest get nothing.</p>
                </div>
                <GenericModal
                  isOpen={isRegardoModalOpen}
                  onClose={closeRegardoModal}
                  title="Regardo, the Capitalist"
                >
                  <div className="flex h-full flex-col items-center text-center text-text">
                    <div className="flex w-full flex-1 items-center justify-center min-h-0 p-2">

                      <Regardo
                        className="h-auto w-auto max-w-full max-h-full md:max-h-70"
                        viewBox="0 0 500 800"
                      />
                    </div>
                    <div className="shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Regardo, the Capitalist
                      </h3>
                      <p className="px-4 p-2 text-text/90">
                        Operating from his mom&apos;s basement, Regardo wields what he calls weaponized autism and his grandma&apos;s 401k. He sees the market as a live-action video game, where fundamentals are boomer magic and the only true indicator is meme-velocity. For Regardo, the goal is to win big, or go home in a blaze of loss-porn glory.
                      </p>
                    </div>
                  </div>
                </GenericModal>

                <div className="flex flex-col items-center text-center landing-card max-h-screen">
                  <Carlo className="w-full h-auto max-h-70  transition-transform duration-200 ease-in-out hover:scale-110 pt-8" viewBox="0 0 500 800" onClick={openCarloModal}/>
                  <h3 className="mt-8 m-3 h3-app">Carlo, the Proletarian</h3>
                  <p className='text-sm'>Coordinate with the masses to drive the economy toward perfect distribution. Win as the Proletariat — the largest number of players collectively holding 50% of the supply — and trigger the Expropriation: Capitalist payouts are capped and the surplus flows to you.</p>
                
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
                    <div className="shrink-0">
                      <h3 className="mt-4 mb-2 text-2xl font-bold">
                        Carlo, the Socialist
                      </h3>
                      <p className="px-4 p-2 text-text/90">
                        Carlo is a barista who trades from his sticky breakroom table, fueled by burnt coffee and pure resentment. He analyzes the market through the Lens of Historical Materialism, shorting companies he deems the most exploitative. For Karl, every trade is a moral crusade to prove the whole game is rigged.
                      </p>
                    </div>
                  </div>
                </GenericModal>              
            </div>
          </section>

          {/* How it Works */}
          <section id="sectionPlay" className="py-16 mx-auto ">
            <h2 className="h2-app mb-12 text-center">Play the Game</h2>
            <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="ENTER THE ARENA"
                description="Buy Fake Internet Money ($FIM) with $USDC in the season's opening Auction which seeds the Prize Pool."
                onButtonClick={() => navigateToDocs('intro#phase-1-auction')}
                //buttonText="Learn more" // You could override the default if needed
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="OUTPLAY THE MARKET"
                description="Trade $FIM to move the Gini Coefficient. Coordinate with your faction — who you trade with matters as much as price."
                onButtonClick={() => navigateToDocs('intro#phase-3-victory-payouts')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="ENFORCE YOUR IDEOLOGY"
                description="Shift the Gini Coefficient in your favor. The winning faction sets the payout rules — the loser pays."
                onButtonClick={() => navigateToDocs('intro#phase-3-victory-and-payouts')}
              />
            </div>
          </section>


          {/* More Than a Game */}
          <section id="sectionOwnMarket" className="py-16 mx-auto">
            <h2 className="h2-app mb-8 text-center">Own the Project</h2>
            <div className="mx-auto">
              </div>
              <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Player Ownership"
                description="No company. No rigged outcomes. Regarded Token holders govern the game and DAO treasury"
                onButtonClick={() => navigateToDocs('intro#5-governance')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Value Accrual"
                description="Prize Pool defi yield flows to holders — via deflationary buybacks, liquidity injections, or Prize Pool Bonuses."
                onButtonClick={() => navigateToDocs('intro#revenue-allocation')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Market 3.0"
                description="Challeng the status quo of web3 and financial markets. Help building a new paradigm for people-owned, people-governed economies."
                onButtonClick={() => navigateToDocs('mission')}
              />
              
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={() => window.open('http://docs.localhost:3000/whitepaper')}
              className=" btn-game-secondary">
              Read the Whitepaper
            </button>
          </div>
          </section>


          {/* Distribution of Power */}
          <section id="sectionDistribution" className="py-16 mx-auto">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2 text-center">
                <h2 className="h2-app">Distribution of Power</h2>
              </div>
              <NestedPieChart data={tableData} />
            </div>
          </section>

          {/* Distribution of Power */}
          <section id="sectionCampaign" className="py-16 mx-auto">
            <h2 className="h2-app mb-12 text-center">Campaign Sequence</h2>
            <div className="mx-auto">

          </div>
          </section>

          
          <section id="sectionSecureYourStake" className="py-16 mx-auto">
            

            <h2 className="h2-app text-center mb-5">Secure Your Stake</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex flex-col items-center text-center landing-card max-h-screen">
                  <h2 className="h3-app mb-4">Capital Auction</h2>
                  <p className='text-sm mb-8'>The Regarded Token will be launched in a capital auction, allowing early supporters to secure their stake in the project.</p>
                  <button 
                    onClick={() => window.open('http://app.localhost:3000/ico')}
                    className=" btn-game-primary">
                    Capital Auction
                </button>
                </div>
                <div className="flex flex-col items-center text-center landing-card max-h-screen">
                  <h2 className="h3-app mb-4">Testnet Quests</h2>
                  <p className='text-sm mb-8'>Complete quests and play on the Testnet to earn points that trasnalate into governance token during the Token Generation Event</p>
                  <button 
                    onClick={() => window.open('http://app.sepolia.localhost:3000/quests')}
                    className=" btn-game-primary">
                    Quest Board
                </button>
                </div>
              </div>


            <div className="flex flex-col items-center gap-4">
            
              
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}