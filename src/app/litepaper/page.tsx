'use client';

import { useEffect, } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo, ArrowRight} from '@/components/icons';
import { useTheme } from '../context/ThemeContext';


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

  // Navigation Links
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
  const competitiveAdvantageHeaders = [
  { label: 'Feature', showMobileLabel: false },
  { label: 'Ritardo Games' },
  { label: 'Meme Coin Trading' },
  { label: 'Online Poker / Prediction Markets' }
];
  const competitiveAdvantageRows = [
    ['Fairness', 'Provably Fair (On-chain, transparent rules)', 'Fundamentally Unfair (Asymmetric info, insider manipulation)', 'Generally Fair (But subject to bots, collusion, platform risk)'],
    ['Core Driver', 'Collective Strategy & Game Theory', 'Luck, Hype & Social Signaling', 'Individual Skill & Probability'],
    ['Strategic Depth', 'Macroeconomic (Influencing a whole system)', 'Non-existent (Pure speculation)', 'Microeconomic (Playing your hand/position)'],
    ['Transparency', 'Radical (All data is public on-chain)', 'Opaque (Insider wallets, hidden team actions)', 'Limited (Platform takes a cut, logic is centralized)'],
    ['Value Accrual', 'Real Yield for Governors ($RTD)', 'None, beyond price appreciation', 'Rake / Fees paid to a central company'],
  ];

  // Data for the Token Distribution Table
  const tokenDistHeaders = [
  { label: 'Category', showMobileLabel: false },
  { label: 'Allocation' },
  { label: 'Total Tokens' },
  { label: 'Purpose and Vesting Schedule', showMobileLabel: false }
];
  const tokenDistRows = [
      ['Community Treasury', '40%', '400,000,000', 'Controlled entirely by the DAO for future growth initiatives, strategic partnerships, and opportunities as determined by $RTD holder governance. These tokens will unlock progressively over a 5-year period.'],
      ['Ecosystem & Player Incentives', '20%', '200,000,000', 'A dedicated fund for player acquisition, marketing campaigns, tournament prize pools, and community grants for third-party developers, content creators, and strategic contributors. To be released based on DAO-approved programs.'],
      ['Core Contributors & Future Team', '15%', '150,000,000', 'Reserved for the initial founding team and to attract future full-time talent to the ecosystem. This allocation is subject to a standard 4-year vesting schedule with a 12-month cliff to ensure long-term commitment.'],
      ['Seed Investors', '10%', '100,000,000', 'For early backers who provided initial capital via SAFT agreements. This allocation is subject to a 2-year vesting schedule with a 6-month cliff to align their interests with the project\'s foundational growth phase.'],
      ['Foundation Operational Fund', '10%', '100,000,000', 'A multi-signature treasury held by the Swiss Foundation to cover essential, ongoing operational costs such as legal counsel, recurring security audits, platform hosting, and core infrastructure maintenance.'],
      ['Public Launch & Airdrop', '5%', '50,000,000', 'To bootstrap the initial community of governors and players. A significant portion will be airdropped to early testnet participants and community members, with the remainder used to provide initial liquidity on decentralized exchanges.'],
      ['Total', '100%', '1,000,000,000', ''],
  ];

  // Data for the Security & Risk Factors Table
  const securityRiskHeaders = [
    { label: 'Key Risk', showMobileLabel: false },
    { label: 'Mitigation Strategy', showMobileLabel: false }
  ];

  const securityRiskRows = [
      ['Smart Contract Risk (The risk of bugs or vulnerabilities in our on-chain code.)', 'Our "Defense-in-Depth" security plan includes: • Multiple independent audits from top-tier firms • A competitive audit via a platform like Code4rena. • A continuous and public bug bounty program. • A commitment to open-sourcing all smart contract code.'],
      ['Regulatory Risk (The risk of an evolving legal landscape impacting operations.)', 'Proactive legal structuring via a Swiss Foundation in a crypto-forward jurisdiction, supported by ongoing expert legal counsel to navigate changes and ensure compliance.'],
      ['Market Adoption Risk (The risk of failing to attract a sustainable player base.)', 'A dedicated Ecosystem & Player Incentives fund (20% of total supply) combined with a detailed Go-to-Market Strategy to drive long-term player growth and community engagement.'],
  ];

  return (
    <div className={`flex font-display ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Litepaper</title>
        <link rel="icon" href="/logo.png" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      {/* Scroll Navigation Column*/}
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
          
          {/* Hero Section */}
          <section className="hero-section min-h-screen flex items-center justify-center">
            
            <div className="text-center max-w-4xl px-4">
              <div className='text-primary flex justify-center items-center'>
            <div className="w-full max-w-[500px] mx-10 mb-10"> 
              <Logo/>
            </div>
          </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-7 text-text">
                Litepaper
              </h1>
              <p className="text-sm text-tex2 ">Version 1.0 - 18.08.2025</p>
            <p className="text-sm mt-2 mb-10"><a href="https://www.ritardo.games" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.ritardo.games</a></p>
            <p className="text-xs text-text2 italic mb-12 p-4 border border-gray-700 rounded-lg">
            Disclaimer: This Litepaper is for informational purposes only and does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation for any security or financial instrument. The information herein is not investment, legal, or tax advice. $RTD and $FIM are tokens with utility within the Ritardo Games ecosystem and are not intended to be investment products. Please conduct your own research and consult with professional advisors before participating. All forward-looking statements are subject to risks and uncertainties.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => scrollToSection('sectionExecutiveSummary')}
                  className=" bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                  Read
                </button>
                
                <button 
                  onClick={handleDownload}
                  className=" bg-card2 hover:bg-card3 text-text px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 hover:scale-103">
                 Download
                </button>
              </div>
            
            </div>            
          </section>
          



          {/* 1. Executive Summary */}
          <section id="sectionExecutiveSummary" className="py-16">
            <h2 className="text-2xl font-bold text-center mb-8">1. Executive Summary</h2>
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

          {/* 2. DAO Overview & Core Principles */}
          <section id="sectionDAOOverview" className="py-16">
            <h2 className="text-2xl font-bold text-center mb-8">2. DAO Overview & Core Principles</h2>
            <h3 className="text-xl font-semibold mt-6 mb-4">DAO Identity: Ritardo Games</h3>
            <p className='mb-4'>Ritardo Games is a decentralized strategy game where players compete to collectively outsmart the dynamics of the high-risk crypto market. Our name, "Ritardo," reflects our core philosophy: deliberate analysis, collective prediction, and disciplined execution.</p>
            <h3 className="text-xl font-semibold mt-6 mb-4">Why This Must Be a DAO: The Pursuit of Credible Neutrality</h3>
            <p className='mb-8'>This project's integrity demands a decentralized structure. A traditional company could be pressured by shareholders or regulators to change the game's rules, alter the payout structure, or censor participants. A DAO makes this impossible. The rules are code, the treasury is on-chain, and governance is in the hands of the players. This provides credible neutrality: a guarantee that the game will remain fair and unbiased in perpetuity, bound only by the will of the community.</p>
            
            <div className="grid md:grid-cols-2 gap-8 my-8 p-6 bg-bg-light dark:bg-bg-dark rounded-lg">
              <div>
                  <h4 className="text-xl font-bold mb-4">The Foundation (Off-Chain Shield)</h4>
                  <ul className="list-disc list-inside space-y-2">
                      <li>Legally holds the ritardogames.com website.</li>
                      <li>Funds initial development and security audits.</li>
                      <li>Manages real-world partnerships and grants.</li>
                      <li><strong>Treasury Security:</strong> Off-chain funds are held in a multi-signature wallet requiring 3-of-5 signers.</li>
                  </ul>
              </div>
              <div>
                  <h4 className="text-xl font-bold mb-4">The DAO (On-Chain Brain)</h4>
                  <ul className="list-disc list-inside space-y-2">
                      <li>Has exclusive control over the game's smart contracts and the community treasury.</li>
                      <li>Governs all game rules, risk parameters, and the strategic direction of the ecosystem.</li>
                      <li>Executes all decisions via on-chain voting by $RTD holders.</li>
                      <li><strong>Treasury Security:</strong> On-chain funds are held in a DAO-controlled, multi-signature wallet.</li>
                  </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-10 mb-4">Our Core Principles</h3>
            <ul className="list-disc ml-8 space-y-2">
              <li><strong>There Are No Secret Tips, Only Superior Strategy:</strong> Victory comes from mastering the game's mechanics, not from outside information.</li>
              <li><strong>Symmetric Gameplay & Perfect Information:</strong> All trades and the entire order book are public. Players can see the token balances of potential counterparties, enabling deep, "Gini-aware" strategies.</li>
              <li><strong>Disciplined Mechanics:</strong> The game's rules are enforced by immutable smart contracts, removing human emotion and bias.</li>
              <li><strong>Sustainable Governance:</strong> DAO ownership is productive. Our governors earn a real, continuous yield generated by the game's core activity.</li>
              <li><strong>Security is Non-Negotiable:</strong> The integrity of our ecosystem is paramount, secured through progressive decentralization, multiple audits, and a bug bounty program.</li>
            </ul>
          </section>

          {/* 3. Market Opportunity */}
                    <section id="sectionMarketOpportunity" className="py-16">
                      
                      <h2 className="text-2xl font-bold text-center mb-8">3. Market Opportunity & Competitive Landscape</h2>
                      <p className='mb-4'>Ritardo Games operates at the intersection of several massive, highly engaged markets. We are not just building a new game; we are creating a new economic arena to capture the capital, attention, and strategic energy currently flowing into less efficient and fundamentally unfair systems.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Total Addressable Market</h3>
                      <p className='mb-4'>Our players are currently participating in a variety of high-stakes environments. We aim to attract them by offering a more intellectually stimulating and provably fair alternative.</p>
                      <ul className="list-disc ml-8 space-y-4">
                        <li><strong>The High-Risk & Meme Coin Market:</strong> With a market capitalization that regularly exceeds $50 billion, the speculative appetite is immense. Ritardo Games captures this desire for high-stakes competition while replacing luck and insider manipulation with transparent rules and deep strategy.</li>
                        <li><strong>The Speculative Derivatives Market:</strong> Our game mirrors the game theory of options trading—predicting macroeconomic shifts and positioning accordingly. We appeal to the strategic thinker who enjoys this complexity in a self-contained, gamified environment.</li>
                        <li><strong>The Online Poker & Skill-Gaming Market:</strong> Like poker, Ritardo Games is a PvP contest of skill, psychology, and capital management. We offer a new, vastly more complex strategic challenge where superior strategy is rewarded.</li>
                        <li><strong>The Crypto Gaming (GameFi) Market:</strong> We represent the evolution of GameFi, moving beyond repetitive "grinding" to offer a game of pure, high-level economic strategy.</li>
                      </ul>
                      <h3 className="text-xl font-semibold mt-10 mb-4">Our Competitive Advantage</h3>
                      <div className="overflow-x-auto">
                      <DataTable 
                        headers={competitiveAdvantageHeaders} 
                        rows={competitiveAdvantageRows} 
                        caption=""
                      />
                      </div>
                    </section>

          {/* 4. Technology Stack */}
                    <section id="sectionTechnologyStack" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">4. Technology Stack</h2>
                      <p className='mb-4'>To provide a secure, scalable, and accessible platform, the Ritardo Games protocol will be initially deployed on <strong>Base</strong>, the Ethereum Layer 2 network incubated by Coinbase.</p>
                      <p className='mb-4'>This strategic choice provides several key advantages:</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>EVM Compatibility:</strong> Allows for rapid development using standard tools like Solidity and ensures portability.</li>
                        <li><strong>Low Transaction Costs:</strong> Critical for our game, which encourages active trading, making it affordable and accessible for all players.</li>
                        <li><strong>Coinbase Ecosystem Access:</strong> Provides a seamless on-ramp for millions of Coinbase users, reducing friction and accelerating adoption.</li>
                        <li><strong>Ethereum Security:</strong> Inherits the robust security and decentralization of the Ethereum mainnet.</li>
                      </ul>
                    </section>
          
                    {/* 5. The Game: Rules & Mechanics */}
                    <section id="sectionTheGame" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">5. The Game: Rules & Mechanics</h2>
                      <p className='mb-4'>Ritardo Games is a quarterly contest between two opposing economic philosophies. Its mechanics are designed to be transparent, strategically deep, and resistant to manipulation.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Phase 1: The Batch Auction</h3>
                      <p className='mb-4'>Each season begins with a Batch Auction to ensure a fair launch. Players commit USDC, and a single clearing price for the seasonal $FIM token is determined for all participants.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Phase 2: The Buy-Side Only Exchange</h3>
                      <p className='mb-4'>Trading occurs on a transparent, buy-side only order book. Sellers must choose an existing public buy order to fill. This prevents risk-free manipulation and enables deep "Gini-aware" gameplay, where sellers can choose who to sell to based on the strategic impact the trade will have on the Gini Coefficient.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Winning the Game: The Proportional Race</h3>
                      <p className='mb-4'>Victory is a proportional race to see which faction can first achieve 25% of the total possible progress from the starting Gini Coefficient toward their ideological goal.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Phase 3: The Payout</h3>
                      <p className='mb-4'>The distribution of the USDC Prize Pool is the ultimate expression of the winning philosophy.</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>If Capitalism Wins (The Oligarchy):</strong> The smallest group of top players whose holdings exceed 50% of the supply split 100% of the prize pool. All other players receive $0.</li>
                        <li><strong>If Socialism Wins (The Solidarity Fund):</strong> A payout cap is established based on the wealth of the "Masses" (bottom 50% of holders). Excess funds from the "Elite" (top 50%) are confiscated and redistributed to all players based on their net capital contribution.</li>
                      </ul>
                    </section>
                    
                    {/* 6. Tokenomics */}
                    <section id="sectionTokenomics" className="min-h-screen py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">6. Tokenomics & Governance</h2>
                      <p className='mb-4'>Ritardo Games operates on a dual-token model that separates short-term gameplay from long-term governance.</p>
                      <ul className="list-disc ml-8 space-y-2 mb-8">
                          <li><strong>$FIM (Fake Internet Money):</strong> The seasonal, non-transferable in-game token used for speculation.</li>
                          <li><strong>$RDT (The Ritardo):</strong> The governance token representing ownership. Holders vote on game rules and treasury management, and earn a continuous stream of real yield generated by the Prize Pool.</li>
                      </ul>
                      <h3 className="text-2xl font-semibold text-center mt-10 mb-4">$RTD Token Distribution & Emission</h3>
                      <DataTable 
                        headers={tokenDistHeaders} 
                        rows={tokenDistRows}
                        breakpoint="md"
                      />
                      <h3 className="text-xl font-semibold mt-10 mb-4">A Note on Our Distribution Strategy: Prioritizing Long-Term Health</h3>
                      <p className='mb-4'>The initial public allocation of 5% is a deliberate decision to ensure long-term health. By limiting the initial circulating supply, we protect against volatility and manipulation. A full 65% of the total supply is dedicated to the community via the Treasury and incentives, distributed over many years to reward contribution, not just initial capital. This, combined with strict vesting for the team and investors, aligns all parties for the long-term success of the DAO.</p>
                    </section>
                    
                    {/* 7. Roadmap */}
                    <section id="sectionRoadmap" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">7. Roadmap & Future Vision</h2>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Roadmap</h3>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>Phase 1 (Completed):</strong> Conceptualization, Economic Design, Legal Framework.</li>
                        <li><strong>Phase 2 (Q4 202X):</strong> Seed Fundraise, Foundation Establishment, Smart Contract Development.</li>
                        <li><strong>Phase 3 (Q1 202Y):</strong> Security Audits, Public Testnet Launch, Community Building.</li>
                        <li><strong>Phase 4 (Q2 202Y):</strong> Game Season 1 Launch, $RTD TGE, DAO Governance Activated.</li>
                        <li><strong>Phase 5 (Beyond):</strong> Implementation of DAO-approved new game modes.</li>
                      </ul>
                      <h3 className="text-xl font-semibold mt-10 mb-4">Future Vision: The Evolution of the Game</h3>
                      <p className='mb-4'>The initial game is just the beginning. The DAO will be empowered to introduce new modes, such as:</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>The "Volatile Asset" Game Mode:</strong> Players mint game tokens with volatile assets (e.g., ETH, WBTC), adding a new layer of complexity as the Gini Coefficient shifts with real-world price movements.</li>
                        <li><strong>The "Equal Start" Game Mode:</strong> All players start with the exact same amount of $FIM, testing the ability of factions to create or defend against inequality from a perfectly level playing field.</li>
                      </ul>
                    </section>
                    
                    {/* 8. Community Growth */}
                    <section id="sectionCommunity" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">8. Community Growth & Go-to-Market Strategy</h2>
                      <p className='mb-4'>Our strategy is focused on attracting and retaining a dedicated base of players and governors through organic growth and targeted incentives.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">The Collaboration Hub: The Ritardo Forum</h3>
                      <p className='mb-4'>To facilitate high-level strategic discussion, the platform will include an integrated collaboration hub. This dedicated, on-site message board will serve as the digital town square and strategic war room for our community, featuring:</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li>Faction-Specific Strategy Rooms.</li>
                        <li>DAO Governance Proposal discussions.</li>
                        <li>Game Theory & Analysis boards.</li>
                        <li>General Discussion & Support for new players.</li>
                      </ul>
                    </section>
                    
                    {/* 9. Security & Risk Factors */}
                    <section id="sectionSecurity" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">9. Security & Risk Factors</h2>
                      <p className='mb-4'>The security of our ecosystem and the transparent management of risk are foundational to our success. Our approach to key risks is outlined below:</p>
                      <DataTable
                        headers={securityRiskHeaders}
                        rows={securityRiskRows}
                        caption=""
                      />
                    </section>
                    
                    {/* 10. Core Contributors */}
                    <section id="sectionContributors" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">10. Core Contributors</h2>
                      <p className='text-center italic text-gray-400'>[This section can be populated with team member bios, photos, or links as desired.]</p>
                    </section>
          
                    {/* 11. Join the Game */}
                    <section id="sectionJoin" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">11. Join the Game</h2>
                      <p className='mb-8 text-center'>Ritardo Games is more than a project; it's a community built on a shared passion for strategy, economics, and fair play. The game has just begun, and we invite you to be part of our founding community.</p>
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <a href="#" target="_blank" rel="noopener noreferrer" className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200">
                          Join Discord
                        </a>
                        <a href="#" target="_blank" rel="noopener noreferrer" className="bg-primary hover:bg-primary2 text-bg px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200">
                          Follow on X
                        </a>
                      </div>
                    </section>
        </div>
      </main>
    </div>
  );
}