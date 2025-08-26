'use client';

import { useEffect, } from 'react';
import Head from 'next/head';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '../globals.css';
import { Logo, ArrowRight} from '@/components/icons/svg';
import { useTheme } from '../../../context/ThemeContext';


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
              <li><strong>Victory & Payout:</strong> Victory is achieved when one ideology is the first to shift the Gini Coefficient a set amount toward its goal (perfect inequality for Capitalism, or perfect equality for Socialism). The Prize Pool is then distributed according to the winning philosophy: a winner-take-all "Oligarchy" payout or a redistributive "Solidarity Fund" payout.</li>
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
            <h3 className="text-xl font-semibold mt-6 mb-4">Legal Structure: The Ritardo Foundation & The DAO</h3>
<p className='mb-4'>Our ecosystem uses a dual structure for maximum protection and credible neutrality: a Swiss non-profit Foundation to act as a legal steward, and the Ritardo Games DAO, the fully on-chain, player-governed game engine.</p>
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
    <li>
        <strong>The High-Risk & Meme Coin Market:</strong>
        <ul className="list-none ml-6 mt-2 space-y-2">
            <li><strong>Market Size:</strong> With a market capitalization that regularly exceeds $50 billion and billions in daily trading volume, the speculative appetite for high-risk assets is immense.</li>
            <li><strong>Our Appeal:</strong> This market is driven by the thrill of high-reward outcomes but is plagued by a lack of fairness and skill expression. Ritardo Games captures this desire for high-stakes competition while replacing the luck and insider manipulation of meme coins with transparent rules and deep strategy.</li>
        </ul>
    </li>
    <li>
        <strong>The Speculative Derivatives Market:</strong>
        <ul className="list-none ml-6 mt-2 space-y-2">
            <li><strong>Market Size:</strong> The crypto derivatives market sees trillions of dollars in monthly volume, proving a vast demand for tools to speculate on market direction and volatility.</li>
            <li><strong>Our Appeal:</strong> Our game mirrors the game theory of options trading—predicting macroeconomic shifts and positioning accordingly. We appeal to the strategic thinker who enjoys this complexity but prefers a self-contained, gamified environment without the complexities of expirations and opaque market makers.</li>
        </ul>
    </li>
    <li>
        <strong>The Online Poker & Skill-Gaming Market:</strong>
        <ul className="list-none ml-6 mt-2 space-y-2">
            <li><strong>Market Size:</strong> The global online poker market alone is valued at over $70 billion annually and continues to grow.</li>
            <li><strong>Our Appeal:</strong> This is a direct appeal to the skill-based player. Like poker, Ritardo Games is a PvP (Player-vs-Player) contest of skill, psychology, and capital management. We offer a new, vastly more complex strategic challenge for the millions of players seeking a real-money game where superior strategy is rewarded.</li>
        </ul>
    </li>
    <li>
        <strong>The Crypto Gaming (GameFi) Market:</strong>
        <ul className="list-none ml-6 mt-2 space-y-2">
            <li><strong>Market Size:</strong> With millions of active wallets and billions of dollars in on-chain assets, GameFi has proven the demand for player-owned economies.</li>
            <li><strong>Our Appeal:</strong> Ritardo Games represents the evolution of GameFi. We move beyond the repetitive "grinding" mechanics of early titles and offer a game of pure, high-level economic strategy.</li>
        </ul>
    </li>
</ul>

<h3 className="text-xl font-semibold mt-6 mb-4">Competitive Landscape</h3>
<p className='mb-4'>Ritardo Games is a first-of-its-kind platform, creating a new category of "Economic Strategy Game." As such, we have no direct one-to-one competitors.</p>
<p className='mb-4'>However, we compete for the attention and capital of participants in the markets listed above. Our primary competition is not another product, but the alternatives people currently use to satisfy their appetite for high-stakes, skill-based speculation.</p>
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
                      <p className='mb-4'>To provide a secure, scalable, and accessible platform, the Ritardo Games protocol will be initially deployed on Base, the Ethereum Layer 2 network incubated by Coinbase.</p>
<p className='mb-4'>This strategic choice provides several key advantages:</p>
<ul className="list-disc ml-8 space-y-2">
    <li><strong>EVM Compatibility:</strong> Full compatibility with the Ethereum Virtual Machine allows for rapid development using standard tools like Solidity and ensures that our protocol is portable to other EVM-compatible chains in the future.</li>
    <li><strong>Low Transaction Costs:</strong> As a Layer 2, Base offers significantly lower gas fees than the Ethereum mainnet. This is critical for our game, which encourages active trading, making it affordable and accessible for all players.</li>
    <li><strong>Coinbase Ecosystem Access:</strong> Building on Base provides a seamless on-ramp for millions of Coinbase users, reducing friction and potentially accelerating player adoption through integrated wallets and fiat gateways.</li>
    <li><strong>Ethereum Security:</strong> Base inherits the robust security and decentralization of the Ethereum mainnet, ensuring that our players' assets and the DAO's treasury are fundamentally secure.</li>
</ul>
                    </section>
          
                    {/* 5. The Game: Rules & Mechanics */}
                    <section id="sectionTheGame" className="pt-16">
                      <h2 className="text-2xl font-bold text-center mb-8">5. The Game: Rules & Mechanics</h2>
                      <p className='mb-4'>Ritardo Games is a quarterly contest between two opposing economic philosophies. Its mechanics are designed to be transparent, strategically deep, and resistant to manipulation.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-4">The Game Token: $FIM (Fake Internet Money)</h3>
                      <p className='mb-4'>$FIM is the in-game token used exclusively for playing the game. Its design is guided by two core principles:</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>Seasonal Nature:</strong> Each new game season features its own unique, season-specific $FIM token to ensure a fresh start.</li>
                        <li><strong>Non-Transferable Core:</strong> $FIM tokens cannot be transferred directly between wallets. All trades must occur through the official Exchange, a critical security measure to prevent Gini manipulation.</li>
                      </ul>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Phase 1: The Batch Auction</h3>
                      <p className='mb-4'>Instead of a simple fixed-price sale, each season begins with a Batch Auction to ensure a fair launch and prevent whale manipulation of the starting conditions.</p>
                      <ol className="list-decimal ml-8 space-y-2">
                        <li><strong>Commitment Phase:</strong> Players commit USDC to a pool over a set period.</li>
                        <li><strong>Price Discovery:</strong> At the end of the auction, a single clearing price for $FIM is determined based on the total USDC committed and the total $FIM being minted for the season.</li>
                        <li><strong>Distribution:</strong> Every participant receives their $FIM at this same final price.</li>
                      </ol>
                      <h3 className="text-xl font-semibold mt-6 mb-4" id='sectionPhase2'>Phase 2: The Game & The Buy-Side Only Exchange</h3>
                      <p className='mb-4'>The game's trading occurs on a transparent, buy-side only order book. This is a fundamental pillar of the game's fairness and strategic depth.</p>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>Mechanism:</strong> Players who want to buy $FIM must post a public buy order with their USDC. Players who want to sell $FIM must choose an existing buy order to fill.</li>
                        <li><strong>Strategic Impact:</strong> This prevents risk-free manipulation by forcing any player wishing to acquire tokens into an open, competitive market. It also enables deep "Gini-aware" gameplay, where sellers can choose which buyer to sell to based not just on price, but on the strategic impact the trade will have on the Gini Coefficient.</li>
                      </ul>
                      <h3 className="text-xl font-semibold mt-6 mb-4" id='sectionWinningTheGame'>Winning the Game: The Proportional Race</h3>
                      <p className='mb-4'>Victory is not about reaching an absolute Gini score. It's a proportional race to see which faction can first achieve 25% of the total possible progress from the starting point toward their ideological goal. This ensures the game is fair regardless of the initial Gini coefficient.</p>
                      <ul className="list-disc ml-8 space-y-2 mb-6">
                        <li><strong>Initial State (G_initial):</strong> The Gini Coefficient calculated at the moment the Auction ends. This is the starting line for the race.</li>
                        <li><strong>Victory Threshold:</strong> A fixed score of 0.25 (representing 25% progress).</li>
                      </ul>

                      <h4 className="text-lg font-semibold mt-6 mb-2">The Capitalist Faction Wins If:</h4>
                      <div className="bg-card2  p-4 rounded-lg my-4 font-mono text-sm">
                        (G_current - G_initial) / (1 - G_initial) ≥ 0.25
                      </div>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>Explanation:</strong> The denominator (1 - G_initial) represents the total "distance" left to travel to reach perfect inequality (a Gini of 1.0). The numerator (G_current - G_initial) is the distance already traveled. This formula calculates the exact percentage of the remaining path that the Capitalists have successfully covered.</li>
                        <li><strong>Example:</strong> If G_initial is 0.80, the remaining distance to 1.0 is 0.20. To win, the Capitalists must increase the Gini by 25% of that distance, meaning G_current must reach at least 0.85.</li>
                      </ul>

                      <h4 className="text-lg font-semibold mt-6 mb-2">The Socialist Faction Wins If:</h4>
                      <div className="bg-card2 p-4 rounded-lg my-4 font-mono text-sm">
                        ((G_initial - G_current) / G_initial) * M ≥ 0.25
                      </div>
                      <ul className="list-disc ml-8 space-y-2">
                        <li><strong>Explanation:</strong> Similarly, the denominator (G_initial) represents the total distance to travel to reach perfect equality (a Gini of 0.0). The numerator (G_initial - G_current) is the distance already covered. This formula calculates the percentage of that path the Socialists have covered, which is then boosted by the Compensation Multiplier.</li>
                        <li><strong>Example:</strong> If G_initial is 0.50, the Socialists must reduce the Gini by 25% of that distance, meaning G_current must fall to 0.375 (before the multiplier is applied).</li>
                      </ul>

                      <h4 className="text-lg font-semibold mt-6 mb-2">The Compensation Multiplier (M)</h4>
                      <p className='mb-4'>We recognize that the game's core mechanic of free-market trading creates a natural gravity towards wealth concentration. To ensure a fair contest, the Socialist faction receives a scoring bonus. This bonus is essential because the Capitalist strategy leverages individual profit-seeking, the most natural behavior in a trading game. The multiplier fairly compensates the Socialist faction for the greater strategic challenge of organizing collective action against individual financial incentive.</p>
                      <p className='mb-4'>The multiplier is calculated once at the start of the game to reflect the initial conditions:</p>
                      <div className="bg-card2 p-4 rounded-lg my-4 font-mono text-sm">
                        M = 1.4 + (1 - G_initial)^2
                      </div>
                      <p className='mb-4'>Crucially, the parameters of this formula will be the primary lever the Ritardo DAO can adjust through governance. By voting on changes to the base value and scaling factor, the $RTD holders will be responsible for fine-tuning game balance in future seasons, ensuring the contest remains compelling and competitive in perpetuity.</p>

                      <p className='mb-4'><strong>Draw Condition:</strong> If the quarter ends with no winner, the game is a Draw. The Prize Pool is returned to all players proportionally based on their final $FIM holdings.</p>

                      <h3 className="text-xl font-semibold mt-6 mb-4">Phase 3: The Payout - The Spoils of Ideological Victory</h3>
                      <p className='mb-4'>The distribution of the USDC Prize Pool is the ultimate expression of the winning philosophy.</p>

                      <h4 className="text-lg font-semibold mt-6 mb-2">If Capitalism Wins: The Oligarchy</h4>
                      <ul className="list-none space-y-2">
                          <li>
                            <strong>Philosophy:</strong> The spoils go to the elite who successfully accumulated capital and power.
                          </li>
                          <li>
                            <strong>Mechanism:</strong>
                            <ol className="list-decimal ml-8 mt-2 space-y-2">
                              <li>The smallest group of top players whose combined $FIM holdings equal or exceed 50% of the total supply is identified as the "Oligarchy."</li>
                              <li>This Oligarchy splits 100% of the prize pool proportional to their individual $FIM holdings within the group.</li>
                              <li>All other players receive $0 from the prize pool.</li>
                            </ol>
                          </li>
                      </ul>

                      <h4 className="text-lg font-semibold mt-6 mb-2">If Socialism Wins: The Solidarity Fund</h4>
                      <ul className="list-none space-y-2">
                          <li>
                            <strong>Philosophy:</strong> The spoils are used to reward collective sacrifice and implement a check on the power of the elite, benefiting all participants.
                          </li>
                          <li>
                            <strong>Mechanism:</strong>
                            <ol className="list-decimal ml-8 mt-2 space-y-2">
                              <li>Players are conceptually divided into the "Masses" (bottom 50% of $FIM holders) and the "Elite" (top 50%).</li>
                              <li>A theoretical prize share is calculated for every player in the game based on their final $FIM count.</li>
                              <li>A Cap_Value is established, equal to the theoretical prize share of the richest player within the "Masses" group.</li>
                              <li>Any "Elite" player whose theoretical share exceeds this cap has their payout reduced to the Cap_Value.</li>
                              <li>All confiscated funds form a Solidarity Fund.</li>
                              <li>This fund is then distributed among ALL players (both Masses and Elite) based on their proportional Net Contribution (Money_In - Money_Out). This is a Sybil-resistant metric that rewards players who risked the most personal capital during the game, regardless of their final token count.</li>
                            </ol>
                          </li>
                      </ul>
                    </section>
                    
                    {/* 6. Tokenomics */}
                    <section id="sectionTokenomics" className="min-h-screen py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">6. Tokenomics & Governance</h2>
                      <p className='mb-4'>Ritardo Games operates on a sophisticated dual-token model that separates the volatile, short-term game from the long-term governance and value accrual of the DAO.</p>

<h3 className="text-xl font-semibold mt-6 mb-4">Gameplay Token: $FIM - Fake Internet Money</h3>
<ul className="list-disc ml-8 space-y-2">
    <li><strong>Purpose:</strong> In-game unit of account and speculation.</li>
    <li><strong>Lifecycle:</strong> Minted with USDC at the start of a season, traded during the season, and burned at the end. $FIM from one season has no utility in the next.</li>
    <li><strong>Value:</strong> Its perceived value is purely strategic within the context of winning the current season's Prize Pool. It is not an investment.</li>
</ul>

<h3 className="text-xl font-semibold mt-6 mb-4">Governance Token: $RDT - The Ritardo</h3>
<p className='mb-4'>$RDT represents true ownership and governance rights over the entire Ritardo Games ecosystem.</p>
<ul className="list-disc ml-8 space-y-4">
    <li>
        <strong>Core Utility:</strong> Governance. $RDT holders propose and vote on all critical parameters:
        <ul className="list-disc ml-8 mt-2 space-y-2">
            <li>Game rules (Victory Threshold, Multiplier formula, etc.).</li>
            <li>Whitelist of DeFi protocols for yield generation.</li>
            <li>DAO treasury management and spending.</li>
            <li>New game modes and feature development.</li>
        </ul>
    </li>
    <li>
        <strong>Value Accrual:</strong> Continuous Yield Stream. This is the cornerstone of $RTD's value. The system is designed to provide a continuous, flowing stream of rewards to long-term stakers.
        <ol className="list-decimal ml-8 mt-2 space-y-2">
            <li>At the end of each season, the total USDC yield is harvested from the Prize Pool.</li>
            <li>This yield is then made available to staked $RTD holders not all at once, but as a continuous stream, released with every block that passes during the following season.</li>
            <li>This model eliminates the price volatility of "dividend" events and directly rewards the most committed, long-term governors of the protocol.</li>
        </ol>
    </li>
    <li>
        <strong>The Flywheel Effect:</strong>
        <ol className="list-decimal ml-8 mt-2 space-y-2">
            <li>More players lead to a larger Prize Pool.</li>
            <li>A larger Prize Pool generates more yield.</li>
            <li>More yield increases the rewards for $RDT stakers.</li>
            <li>Higher rewards make holding $RDT more attractive, increasing its value and strengthening the DAO.</li>
        </ol>
    </li>
</ul>

<h3 className="text-xl font-semibold mt-6 mb-4">$RTD Token Distribution & Emission</h3>
<p className='mb-4'>The total supply of $RTD will be fixed at [e.g., 1,000,000,000] tokens. The initial allocation is designed to foster a vibrant, self-sustaining ecosystem, reward early believers, and ensure the long-term alignment of all participants.</p>
<p className='mb-4'>The allocation is broken down as follows:</p>                      <DataTable 
                        headers={tokenDistHeaders} 
                        rows={tokenDistRows}
                        breakpoint="md"
                      />
                      <h3 className="text-xl font-semibold mt-10 mb-4">A Note on Our Distribution Strategy: Prioritizing Long-Term Health</h3>
<p className='mb-4'>Some may note that the initial public allocation is 5% of the total supply. This is a deliberate and strategic decision designed to ensure the long-term health, stability, and genuine decentralization of the Ritardo Games ecosystem.</p>

<ol className="list-decimal ml-8 space-y-4">
    <li>
        <strong>Ensuring a Stable Launch:</strong> By limiting the initial circulating supply (a "low float"), we protect the project from the extreme price volatility and whale manipulation that can harm new tokens. This allows a stable market to form, providing a solid foundation for future growth.
    </li>
    <li>
        <strong>Deep Community Ownership Over Time:</strong> It is crucial to understand that the initial 5% public sale is not the full extent of community ownership. Our tokenomics are structured so that 65% of the total $RTD supply is dedicated to the community. This includes the Community Treasury (40%) and Ecosystem Incentives (20%), which will be distributed to players, builders, and active participants through DAO-governed programs over many years. This model rewards contribution, not just initial capital.
    </li>
    <li>
        <strong>Aligning Incentives for the Marathon:</strong> Our vesting schedules for the core team and seed investors are strict for a reason. They ensure that the people who built and funded the project are committed for the long haul. Their success is directly tied to the success of the DAO years from now, not on the launch day price. This long-term alignment is the bedrock of trust between the core team and the community.
    </li>
</ol>

<p className='mt-6 mb-4'>In short, our distribution model prioritizes sustainable growth over short-term hype. We are building an ecosystem that is meant to last, and our tokenomics reflect that core commitment.</p></section>
                    
                    {/* 7. Roadmap */}
                    <section id="sectionRoadmap" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">7. Roadmap & Future Vision</h2>
                      <h3 className="text-xl font-semibold mt-6 mb-4">Roadmap</h3>
<ul className="list-disc ml-8 space-y-2">
    <li><strong>Phase 1 (Completed):</strong> Conceptualization, Dual-Token Economic Design, Legal Framework Analysis.</li>
    <li><strong>Phase 2 (Q4 202X):</strong> Seed Fundraise (via SAFT for $RTD), Foundation Establishment, Initial Smart Contract Development on Base.</li>
    <li><strong>Phase 3 (Q1 202Y):</strong> Dual Independent Security Audits, Public Testnet Launch on Base, Community Building Campaign.</li>
    <li><strong>Phase 4 (Q2 202Y):</strong> Game Season 1 Launch, $RTD Token Generation Event (TGE), DAO Governance and Staking Activated.</li>
    <li><strong>Phase 5 (Beyond):</strong> Implementation of DAO-approved new game modes and ecosystem expansion.</li>
</ul>

<h3 className="text-xl font-semibold mt-6 mb-4">Future Vision: The Evolution of the Game</h3>
<p className='mb-4'>The initial game mode is just the beginning. The Ritardo DAO will be empowered to introduce new, innovative game modes to continuously challenge our players and expand the ecosystem. Future possibilities the DAO may explore include:</p>
<ul className="list-disc ml-8 space-y-2">
    <li><strong>The "Volatile Asset" Game Mode:</strong> Instead of minting $FIM with stablecoins, players would mint Fake Internet Coins (FICs) by depositing real, volatile assets (e.g., minting $FICeth with ETH, $FICbtc with WBTC, $FICdoge with DOGE). This introduces a profound new layer of complexity: the Gini Coefficient would constantly shift not just from player trading, but from the real-world price movements of the underlying collateral. This mode would test a faction's ability to manage a truly chaotic, multi-variable economy.</li>
    <li><strong>The "Equal Start" Game Mode (The Proletariat Arena):</strong> A game mode where the Auction phase is replaced. Every participating player is airdropped the exact same amount of $FIM at the start, creating a state of perfect equality (Gini = 0.0). This mode would test the Capitalist faction's ability to create inequality from a perfectly level playing field, and the Socialist faction's ability to defend it.</li>
</ul>
                    </section>
                    
                    {/* 8. Community Growth */}
                    <section id="sectionCommunity" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">8. Community Growth & Go-to-Market Strategy</h2>
                      <p className='mb-4'>Technology alone does not build a community. Our growth strategy is focused on attracting and retaining a dedicated base of players and governors.</p>

<ul className="list-disc ml-8 space-y-4">
    <li>
        <strong>Phase 1: Bootstrapping (Pre-Launch)</strong>
        <p className='mt-2 mb-2'>We will focus on organic growth by engaging communities who appreciate game theory and economic strategy. Our methods will include:</p>
        <ul className="list-disc ml-8 space-y-2">
            <li><strong>Content Creation:</strong> Publishing in-depth articles on Mirror and Twitter that explore the game's mechanics, economic philosophy, and strategic depth.</li>
            <li><strong>Community Engagement:</strong> Hosting AMAs and participating in discussions within DeFi, strategy gaming, and DAO-focused communities on Discord, Telegram, and Farcaster.</li>
            <li><strong>Building in Public:</strong> Transparently sharing our development progress to build trust and attract early contributors.</li>
        </ul>
    </li>
    <li>
        <strong>Phase 2: Launch & Incentivization (Post-TGE)</strong>
        <p className='mt-2 mb-2'>Upon launch, we will activate the Ecosystem & Player Incentives fund to accelerate adoption:</p>
        <ul className="list-disc ml-8 space-y-2">
            <li><strong>Targeted Airdrop:</strong> A portion of the initial supply will be airdropped to engaged testnet participants and wallets that have demonstrated activity in adjacent protocols (e.g., prediction markets, other gaming DAOs).</li>
            <li><strong>"Play-to-Govern" Campaigns:</strong> Rewarding top-performing players and strategic factions with $RTD tokens, turning the best players into the future owners of the game.</li>
            <li><strong>Referral Programs:</strong> Incentivizing the community to bring new players into the ecosystem.</li>
        </ul>
    </li>
</ul>

<h3 className="text-xl font-semibold mt-6 mb-4">The Collaboration Hub: The Ritardo Forum</h3>
<p className='mb-4'>Effective coordination requires effective tools. To facilitate the high-level strategic discussion that Ritardo Games demands, the platform will include an integrated collaboration hub, The Ritardo Forum. This dedicated, on-site message board will serve as the digital town square and strategic war room for our community.</p>
<p className='mb-4'>Its key functions will be:</p>
<ul className="list-disc ml-8 space-y-2">
    <li><strong>Faction-Specific Strategy Rooms:</strong> Private and public spaces for players aligned with the Capitalist and Socialist factions to debate tactics, plan market moves, and organize collective action.</li>
    <li><strong>DAO Governance Proposals:</strong> A formal venue for long-form discussion and debate on proposals before they go to an on-chain vote. This ensures all governance decisions are well-vetted by the community.</li>
    <li><strong>Game Theory & Analysis:</strong> A public section where players can share analysis, post-game reports, and develop new theories on how to master the game's economic dynamics.</li>
    <li><strong>General Discussion & Support:</strong> A welcoming space for new players to ask questions, get help, and integrate into the community.</li>
</ul>
<p className='mt-6 mb-4'>The Ritardo Forum is a core part of our commitment to fostering a deeply engaged and intelligent player base, providing the infrastructure needed for true strategic collaboration to flourish.</p>
                    </section>
                    
                    {/* 9. Security & Risk Factors */}
                    <section id="sectionSecurity" className="py-16">
                      <h2 className="text-2xl font-bold text-center mb-8">9. Security & Risk Factors</h2>
                      <p className='mb-4'>The security of our ecosystem and the transparent management of risk are foundational to our success. We have adopted a proactive strategy to address potential challenges, ensuring we are well-prepared to build a resilient and lasting platform.
Our approach to key risks is outlined below:
</p>
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