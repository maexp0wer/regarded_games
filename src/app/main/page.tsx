'use client';

import { useState} from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '@/app/globals.css';
import { Logo } from '@/components/icons/svg';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import CardPlain from '@/components/CardPlain';
import ContactForm from '@/components/ContactForm';
import GenericModal from '@/components/GenericModal';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import FIM1 from '@/components/icons/FIM1.svg';
import { useDocNavigation } from '@/hooks/useDocNavigation';
import NestedPieChart from '@/components/NestedPieChart';
import { CyclingSubheading } from '@/components/CyclingSubheading';

const tableData = [
  {
    parentName: " ",        // Tier 1
    parentPercentage: 75,
    parentColor: "var(--color-card2)",
    parentExplanation: "75% of the initial $RGD supply is directly controlled by you, the DAO members.",
    name: "DAO Treasury Reserve",        // Tier 2
    percentage: 40,
    color: "var(--color-gold)",
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
    color: "var(--color-gold-70)",
    explanation: "Funds Active Incentives and marketing. Released based on DAO-approved milestones.",
    subChildren: [               // Tier 3
      { name: "Merkl Rewards", percentage: 5, color: "var(--color-gold)" },
      { name: "User Acquisition", percentage: 15, color: "var(--color-gold-70)" }
    ]
  },
  {
    parentName: " ",        // Tier 1
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Market Formation",         // Tier 2
    percentage: 15,
    color: "var(--color-gold-35)",
    explanation: "Distributed to early community participants and used to provide initial exchange liquidity to ensure Day 1 market stability.",
    subChildren: [               // Tier 3
      { name: "Genesis Program", percentage: 3, color: "var(--color-gold)" },
      { name: "Capital Auction", percentage: 6, color: "var(--color-gold-70)" },
      { name: "Liquidity Pool", percentage: 6, color: "var(--color-gold-35)" },
    ]
  },
  {
    parentName: "  ",        // Tier 1
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    parentExplanation: "only 25% of the initial $RGD supply is not directly controlled by you, but distributed to the non-profit DAO LLC and vested among the founding Team for longterm alignment.",
    name: "Operational Reserve",         // Tier 2
    percentage: 10,
    color: "var(--color-gold)",
    explanation: "Allocated to the non-profit Regarded DAO LLC to cover real-world costs (legal compliance, audits, hosting). Managed via multi-sig with strict spending rules.",
    subChildren: [               // Tier 3
    ]
  },
  {
    parentName: "  ",        // Tier 1
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    name: "Team",         // Tier 2
    percentage: 15,
    color: "var(--color-gold)",
    explanation: "Incentivizes the founding team. Subject to a 4-year vesting schedule with a 12-month cliff.",
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
    { id: 'sectionOwnMarket', label: 'Own the Market' },
    { id: 'sectionDistribution', label: 'Distribution of Power' },
    { id: 'sectionCampaign', label: 'Campaign Sequence' },
    { id: 'sectionSecureStake', label: 'Secure Your Stake' }
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

      <main className={`transition-all duration-300 ${
        isNavVisible
          ? 'relative mx-auto 2xl:transform 2xl:-translate-x-16.25'
          : 'relative mx-auto md:transform md:-translate-x-16.25'
      }`}>

        <div className="hero-blur-backdrop" />

        <div className="w-full max-w-6xl p-8 text-text">
          <div className='text-gold flex justify-center items-center '>
            <Logo className='w-40 text-white'/>
          </div>


          {/* Hero Section */}
          <section className="hero-section relative overflow-hidden min-h-screen flex items-center justify-center">

  
  <div className="hero-container">
    {/* Main Header Display - Single block for perfect scaling */}
    <h1 className="hero-title">
      Class Warfare<br />
      <span className="hero-gradient-text">The Game</span>
    </h1>

    {/* Dynamic Cycling Subheading Container */}
    <div className="hero-subtitle">
      <CyclingSubheading />
    </div>

    {/* Action Block Spacing Container */}
    <div className="hero-actions">
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
        onClick={() => scrollToSection('sectionSecureStake')}
        className="btn-game-primary"
      >
        Secure Your Stake
      </button>
    </div>
  </div>
          </section>
          


          {/* Choose your Hero */}
          <section id="sectionHero" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Choose Your Hero</h2>
            <div className="mx-auto">
              
              <div className="grid md:grid-cols-2 gap-8">
                
                <div className="flex flex-col items-center text-center landing-card max-h-screen">
                  <Regardo className="w-full h-auto max-h-70 transition-transform duration-200 ease-in-out hover:scale-110" viewBox="0 0 500 800" onClick={openRegardoModal}/>
                  <h3 className="text-xl font-bold mt-8 m-3">Regardo, the Capitalist</h3>
                  <p className='text-sm'>Play the game of accumulation. Use your capital to concentrate power, outmaneuver rivals, and push the economy towards a state of perfect inequality. If you win, the Bourgeoisie - the select few controlling 50% of the supply - splits the entire prize pool. The rest get nothing.</p>
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

                <div className="flex flex-col items-center text-center bg-card p-8 rounded-lg shadow-md max-h-screen">
                  <Carlo className="w-full h-auto max-h-70  transition-transform duration-200 ease-in-out hover:scale-110 pt-8" viewBox="0 0 500 800" onClick={openCarloModal}/>
                  <h3 className="text-xl font-bold mt-8 m-3">Carlo, the Socialist</h3>
                  <p className='text-sm'>Play the game of coordination. Organize with the masses to resist the pull of capital and drive the economy towards perfect distribution.
                    If you win, the Solidarity Fund caps the rich and pays the surplus to the Proletariat - the mass that holds the other 50% of the supply.
                  </p>
                
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
            <h2 className="text-3xl font-semibold mb-12 text-center">Play the Game</h2>
            <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="ENTER THE ARENA"
                description="Each season begins with an Auction. Buy your in-game Fake Internet Money ($FIM) with $USDC to form the season's Prize Pool."
                onButtonClick={() => navigateToDocs('intro#phase-1-auction')}
                //buttonText="Learn more" // You could override the default if needed
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="OUTPLAY THE MARKET"
                description="During the Trading Phase, trade $FIM to impact the live Gini Coefficient, a measure of wealth inequality. Choose your trades wisely and coordinate with your peers—who you trade with is as important as the price."
                onButtonClick={() => navigateToDocs('intro#phase-3-victory-payouts')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="ENFORCE YOUR IDEOLOGY"
                description="It’s a race. The first faction to shift the Gini Coefficient by 25% captures the Treasury. The winner dictates the payout rules; the loser pays the price."
                onButtonClick={() => navigateToDocs('intro#phase-3-victory-and-payouts')}
              />
            </div>
          </section>


          {/* More Than a Game */}
          <section id="sectionOwnMarket" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Own the Market</h2>
            <div className="mx-auto">
              <p className='mb-10'>Traditional markets are rigged against the individual. Regarded Games is the antidote. We’ve built an unmanipulated, player-owned arena that strips away the insider advantage. The fog of war is lifted; your only weapon is your strategy.</p>
              
              
              </div>
              <div className="grid md:grid-cols-3 gap-8"> 
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Sovereign Player Ownership"
                description="No central company. No rigged outcomes. Regarded Games is a DAO owned entirely by you. Through $RGD, holders dictate the rules, manage the treasury, and control the arena. The players hold the power."
                onButtonClick={() => navigateToDocs('intro#5-governance')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Active Value Accrual"
                description="The Prize Pool generates yield via blue-chip DeFi. $RGD holders direct this revenue: executing deflationary buybacks, deepening liquidity, or compounding future spoils. Ownership is designed to be productive, not passive."
                onButtonClick={() => navigateToDocs('intro#revenue-allocation')}
              />
              <Card
                icon={<FIM1 viewBox="0 0 850 850" />}
                title="Beyond the Casino"
                description="Move past the speculative noise. Regarded Games provides a transparent arena where collective action is a strategic weapon. By playing, you are joining a grand experiment to redefine how humanity organizes itself."
                onButtonClick={() => navigateToDocs('mission')}
              />
              
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={() => navigateToDocs('sectionHero')}
              className=" bg-card2 hover:bg-card3 text-text px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
              Read the Whitepaper
            </button>
          </div>
          </section>


          {/* Distribution of Power */}
          <section id="sectionDistribution" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Distribution of Power</h2>
            <div className="mx-auto">
              <NestedPieChart data={tableData} />

          </div>
          </section>

          {/* Distribution of Power */}
          <section id="sectionCampaign" className="py-16 mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Campaign Sequence</h2>
            <div className="mx-auto">

          </div>
          </section>

          {/* Secure Your Stake */}
          <section id="sectionSecureStake" className="py-16 mx-auto">

            <h2 className="text-3xl font-bold mb-8 text-center">Secure Your Stake</h2>
            <h2 className="text-xl font-bold mb-8 text-center">Regarded Games is a community-owned DAO. We&apos;re reserving a significant portion of the initial $RGD supply for our founding players. Your Contribution Score determines your share. Here&apos;s your quest board:</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Card 1: Community & Social */}
        <CardPlain
          icon={<Regardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Join the Community"
          description={
            <>
              <p className="text-sm">
                First, register for the Genesis Program to unlock your Base Score. Then, earn a 5x Multiplier by becoming a strategic voice in our Discord.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Registration: 100 Points</li>
                <li>Strategic Voice Bonus: Up to 400 Points</li>
              </ul>
              <p className="my-4 font-semibold">Max Score: 500 Points</p>
              </>
            }
          actions={
              <button 
                onClick={() => scrollToId('contactForm')}
                className="w-full lg:w-2/3 bg-gold hover:bg-gold-soft text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
                Register
              </button> 
          }
        />

        {/* Card 2: Ecosystem Growth */}
        <CardPlain
          icon={<Regardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Spread the Word"
          description={
            <>
              <p className="text-sm">
                Use your unique code to recruit other high-quality players. You&apos;re rewarded for the engaged members you
                bring in.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Referrals 1-10: 50 Points each</li>
                <li>Referrals 11-35: 20 Points each</li>
                <li>Referrals 36-100: 5 Points each</li>
              </ul>
              <p className="mt-4 font-semibold">Max Score: 1,325 Points</p>
              </>
            }
          actions={
            <button 
              onClick={() => scrollToId('contactForm')}
              className="w-full lg:w-2/3 bg-gold hover:bg-gold-soft text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
              Get referral code
            </button>
          }
        />

        {/* Card 3: Testnet Performance */}
        <CardPlain
          icon={<Regardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Dominate the Testnet"
          description={
            <>
              <p className="text-sm">
                Prove your skill in the preseason arena. Execute trades to earn activity points, and lead your faction to victory for the big win.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Activity Score: 200 Points</li>
                <li>Winning Faction Bonus: 1,000 Points</li>
              </ul>
              <p className="mt-4 font-semibold">Max Score: 1,200 Points</p>
              </>
            }
          actions={
              <button 
                onClick={() => window.open('http://app.localhost:3000')}
                className="w-full lg:w-2/3 bg-gold hover:bg-gold-soft text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
                Launch Testnet App
              </button>
          }
        />

        {/* Card 4: Protocol Security */}
        <CardPlain
          icon={<Regardo className='w-full h-full' viewBox='0 0 500 800'/>}
          title="Become a Guardian"
          description={
            <>
              <p className="text-sm">
                Help us harden the protocol. Find and responsibly report vulnerabilities to earn the highest tier of rewards.
              </p>
              <h5 className="font-bold mt-4 mb-1 text-card-foreground">Points Breakdown:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Critical Bug: 25,000 Points</li>
                <li>High Severity: 10,000 Points</li>
                <li>Medium Severity: 2,500 Points</li>
                <li>Low / Info: 500 Points</li>
              </ul>
              </>
            }
          actions={
            <button 
              onClick={() => window.open('https://github.com/maexp0wer/Regardo_games')}
              className="w-full lg:w-2/3 bg-gold hover:bg-gold-soft text-bg px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-103">
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