'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '@/app/globals.css';
import { useTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/icons/svg';
import Card from '@/components/Card';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import FIM1 from '@/components/icons/FIM1.svg';
import { useDocNavigation } from '@/hooks/useDocNavigation';
import NestedPieChart from '@/components/NestedPieChart';
import CyclingSubheading from '@/components/CyclingSubheading';
import ScrollNav from '@/components/ScrollNav';


const tableData = [
  {
    parentName: " ",        
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    parentExplanation: "75% of the initial $RGD supply is directly controlled by you, the DAO members.",
    name: "DAO Treasury Reserve",        
    percentage: 40,
    color: "var(--color-green)",
    explanation: "Long-Term Capital. Controlled entirely by governance for future growth, acquisitions, or diversification. Subject to a 5-year linear unlock.",
    subChildren: []
  },
  {
    parentName: " ",        
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Growth & Ecosystem",         
    percentage: 20,
    color: "var(--color-magenta)",
    explanation: "Funds Active Incentives and marketing. Released based on DAO-approved milestones.",
    subChildren: [
      { name: "Merkl Rewards", percentage: 5, color: "var(--color-magenta-70)" },
      { name: "User Acquisition", percentage: 15, color: "var(--color-magenta)" }
    ]
  },
  {
    parentName: " ",        
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Market Formation",         
    percentage: 15,
    color: "var(--color-orange)",
    explanation: "Distributed to early community participants and used to provide initial exchange liquidity to ensure Day 1 market stability.",
    subChildren: [               
      { name: "Genesis Program", percentage: 3, color: "var(--color-orange-35)" },
      { name: "Capital Auction", percentage: 6, color: "var(--color-orange-70)" },
      { name: "Liquidity Pool", percentage: 6, color: "var(--color-orange)" },
    ]
  },
  {
    parentName: "  ",        
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    parentExplanation: "only 25% of the initial $RGD supply is not directly controlled by you, but distributed to the non-profit DAO LLC and vested among the founding Team for longterm alignment.",
    name: "Team",         
    percentage: 15,
    color: "var(--color-gold)",
    explanation: "Incentivizes the founding team. Subject to a 4-year vesting schedule with a 12-month cliff.",
    subChildren: []
  },
  {
    parentName: "  ",        
    parentPercentage: 25,
    parentColor: "var(--color-card3)",
    name: "Operational Reserve",         
    percentage: 10,
    color: "var(--color-purple)",
    explanation: "Allocated to the non-profit Regarded DAO LLC to cover real-world costs (legal compliance, audits, hosting). Managed via multi-sig with strict spending rules.",
    subChildren: []
  },
];

export default function Home() {
  const { darkMode } = useTheme();
  const navigateToDocs = useDocNavigation();
  const { activeSection, isNavVisible, scrollToSection } = useScrollNavigation();

  const [navOffset, setNavOffset] = useState(0);
  const [regardoFlipped, setRegardoFlipped] = useState(false);
  const [carloFlipped, setCarloFlipped] = useState(false);
  const [action1Flipped , setAction1Flipped] = useState(false);
    const [action2Flipped , setAction2Flipped] = useState(false);

      const [action3Flipped , setAction3Flipped] = useState(false);


  // Layout calculations for SideNav
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

  // --- 1. BULLETPROOF FULL PAGE MOUSE WHEEL HIJACKING ---
  useEffect(() => {
    let isScrolling = false;
    let scrollTimeout;

    const handleWheel = (e) => {
      // Allow horizontal scroll (side swiping on trackpads)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Ignore trackpad momentum bounces to fix the "2 scroll" glitch
      if (Math.abs(e.deltaY) < 30) return;

      // Do not hijack scroll if inside modals or naturally scrollable internal divs
      if (e.target.closest('[role="dialog"]') || e.target.closest('.overflow-y-auto')) {
        return;
      }

      e.preventDefault(); 
      if (isScrolling) return;

      const sections = Array.from(document.querySelectorAll('section'));
      if (sections.length === 0) return;

      // Mathematical guarantee: Find the section nearest to exact center of the screen
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let currentIndex = 0;
      let minDistance = Infinity;

      sections.forEach((sec, index) => {
        const secCenter = sec.offsetTop + sec.offsetHeight / 2;
        const dist = Math.abs(viewportCenter - secCenter);
        if (dist < minDistance) {
          minDistance = dist;
          currentIndex = index;
        }
      });

      let targetIndex = currentIndex;
      if (e.deltaY > 0 && currentIndex < sections.length - 1) {
        targetIndex++; // Scroll Down
      } else if (e.deltaY < 0 && currentIndex > 0) {
        targetIndex--; // Scroll Up
      }

      if (targetIndex !== currentIndex) {
        isScrolling = true;
        sections[targetIndex].scrollIntoView({ behavior: 'smooth' });
        
        // Solid lock: 1000ms cooldown aligns perfectly with standard OS smooth scrolls
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => { isScrolling = false; }, 1000); 
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // --- 2. SCROLL-LINKED FLUID COMPONENT MOVEMENT ---
  const cardsSectionRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: cardsSectionRef,
    offset: ["start end", "start start"] 
  });

  // Changed opacity mapping to 0.2 base (less visible) and scale to 1.8 base (bigger)
  const yTransform = useTransform(scrollYProgress, [0, 1], ["-100vh", "0vh"]);
  const opacityTransform = useTransform(scrollYProgress, [0, 1], [0.2, 1]); 
  const scaleTransform = useTransform(scrollYProgress, [0, 1], [1.8, 1]); 
  
  // Spread them apart when in the Hero section (0) to flank the main text
  const xRegardo = useTransform(scrollYProgress, [0, 1], ["-15vw", "0vw"]);
  const xCarlo = useTransform(scrollYProgress, [0, 1], ["15vw", "0vw"]);

  const navLinks = [
    { id: 'sectionHero', label: 'Choose your Hero' },
    { id: 'sectionPlay', label: 'Play the Game' },
    { id: 'sectionOwnMarket', label: 'Own the Project' },
    { id: 'sectionDistribution', label: 'Distribution of Power' },
    { id: 'sectionCampaign', label: 'Campaign Sequence' },
    { id: 'sectionSecureYourStake', label: 'Secure Your Stake' }
  ];

  return (
    <div className={`flex font-display overflow-x-clip ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      <Head>
        <title>Regarded Games</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>

      <style jsx global>{`
        html, body {
          scroll-behavior: smooth;
        }
      `}</style>

      <ScrollNav
        navLinks={navLinks}
        activeSection={activeSection}
        isNavVisible={isNavVisible}
        scrollToSection={scrollToSection}
      />

      <main
        className="relative mx-auto min-w-0 transition-transform duration-300 w-full"
        style={{ transform: navOffset ? `translateX(-${navOffset}px)` : undefined }}
      >
        <div className="w-full max-w-6xl md:pl-0 p-5 2xl:p-8 text-text mx-auto">
          <div className='text-gold flex justify-center items-center'>
            <Logo className='w-40 text-white'/>
          </div>

          {/* Hero Section - z-30 Ensures text is clickable and sits on top of flying SVGs */}
          <section id="hero" className="hero-section relative min-h-screen flex items-center justify-center z-30">
            {/* Background Light */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[25rem] rounded-full [background:var(--sunset)] blur-[100px] opacity-25 pointer-events-none z-0" />

            <div className="relative flex flex-col items-center justify-center text-center pt-32 px-6 pb-24 max-w-5xl mx-auto z-20 pointer-events-auto">
              <h1 className="hero-title">
                Class War<br />
                <span className="hero-gradient-text">The Game</span>
              </h1>
              <div className="hero-subtitle relative z-20">
                <CyclingSubheading />
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4 z-30 relative">
                <button onClick={() => scrollToSection('sectionHero')} className="btn-game-secondary">
                  Learn More
                </button>
                <button onClick={() => navigateToDocs('intro')} className="btn-game-secondary">
                  Read Docs
                </button>
                <button onClick={() => window.open('http://app.localhost:3000/ico')} className="btn-game-primary">
                  Secure Your Stake
                </button>
              </div>
            </div>
          </section>
          
          {/* Choose your Hero (Cards Section) */}
          {/* Choose your Hero (Cards Section) */}
<section 
  id="sectionHero" 
  ref={cardsSectionRef} 
  className="py-20 px-6 mx-auto min-h-screen flex flex-col justify-center relative z-20 max-w-6xl"
  style={{ backgroundColor: 'var(--color-bg)' }}
>
  <h2 
    className="h2-app mb-16 text-center relative z-20 text-[2.5rem] font-bold"
    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
  >
    Choose Your Hero
  </h2>
  
  <div className="w-full">
    {/* Spaced Grid Container */}
    <div className="grid md:grid-cols-2 gap-12 lg:gap-16 justify-items-center relative w-full">
      
      {/* ================= REGARDO 3D FLIP CONTAINER ================= */}
      <div 
        className="w-full max-w-[400px] h-[580px] relative group" 
        style={{ perspective: 1200 }} 
      >
        <motion.div
          animate={{ rotateY: regardoFlipped ? 180 : 0 }}
          whileHover={{ y: -6, transition: { duration: 0.3 } }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="w-full h-full relative cursor-pointer"
          onClick={() => setRegardoFlipped(!regardoFlipped)}
        >
          {/* REGARDO FRONT SIDE */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div 
              className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-gold)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]" 
              style={{ 
                backgroundColor: 'var(--color-card)',
              }}
            >
              {/* Card Header */}
              <div className="flex justify-between items-end mb-2.5 px-1 pt-1">
                <div className="flex flex-col">
                  <span 
                    className="text-[9px] uppercase font-extrabold tracking-widest"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-gold-hover)' }}
                  >
                    Basic Hero
                  </span>
                  <h3 
                    className="text-2xl font-black tracking-wide"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    Regardo
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[11px] font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}
                  >
                    HP 100M
                  </span>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shadow-sm border"
                    style={{ 
                      backgroundColor: 'var(--color-card2)', 
                      borderColor: 'var(--color-gold)', 
                      color: 'var(--color-gold-hover)' 
                    }}
                  >
                    $
                  </div>
                </div>
              </div>

              {/* Character Frame */}
              <div 
                className="w-full h-72 border-4 rounded-xl relative overflow-visible flex items-center justify-center shadow-inner mb-2.5"
                style={{ 
                  backgroundColor: 'var(--color-card3)', 
                  borderColor: 'var(--color-border2)' 
                }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none rounded-lg" 
                  style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}
                />
                <motion.div
                  style={{
                    y: yTransform,
                    x: xRegardo,
                    opacity: opacityTransform,
                    scale: scaleTransform,
                  }}
                  className="w-full absolute z-10 flex justify-center pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)]"
                >
                  <Regardo className="w-full h-auto max-w-[270px] max-h-64 object-contain" viewBox="0 0 500 800" />
                </motion.div>
              </div>

              {/* Middle Info Bar (Edge-to-Edge Header Bar Redesign) */}
<div 
  className="border-2 rounded-xl overflow-hidden mb-2.5 flex flex-col"
  style={{ 
    backgroundColor: 'var(--color-card2)', 
    borderColor: 'var(--color-border)' 
  }}
>
  {/* Solid Gold Header Strip */}
  <div 
    className="w-full py-1.5 px-4 flex items-center justify-center select-none"
    style={{ backgroundColor: 'var(--color-gold)' }}
  >
    {/* Left horizontal line */}
    <div className="flex-grow border-t" style={{ borderColor: 'var(--color-text)', opacity: 0.25 }} />
    
    <span 
      className="px-3 text-[10px] font-black uppercase tracking-widest text-center"
      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
    >
      Class: Capitalist
    </span>
    
    {/* Right horizontal line */}
    <div className="flex-grow border-t" style={{ borderColor: 'var(--color-text)', opacity: 0.25 }} />
  </div>

  {/* Description Area */}
  <div className="p-3 text-left">
    <p 
      className="text-[11px] leading-relaxed"
      style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
    >
      the smallest number of players collectively holding 50% of the supply.
    </p>
  </div>
</div>

              {/* Rules/Ability Text Box */}
<div 
  className="border-2 rounded-xl p-3.5 flex-grow flex flex-col justify-center"
  style={{ 
    backgroundColor: 'var(--color-card2)', 
    borderColor: 'var(--color-border)' 
  }}
>
  <div className="space-y-3.5">
    {/* Action 1: Concentrate Capital */}
    <div>
      <div className="flex items-center mb-1">
        <div className="flex-grow border-t border-[var(--color-gold)]/30" />
        <span 
          className="px-2 text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-hover)' }}
        >
          Concentrate Capital
        </span>
        <div className="flex-grow border-t border-[var(--color-gold)]/30" />
      </div>
      <p 
        className="text-center text-[11px] leading-relaxed"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
      >
        push the economy toward perfect inequality.
      </p>
    </div>

    {/* Action 2: Enslavement */}
    <div>
      <div className="flex items-center mb-1">
        <div className="flex-grow border-t border-[var(--color-gold)]/30" />
        <span 
          className="px-2 text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-hover)' }}
        >
          Enslavement
        </span>
        <div className="flex-grow border-t border-[var(--color-gold)]/30" />
      </div>
      <p 
        className="text-center text-[11px] leading-relaxed"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
      >
        Split the entire prize pool. Proletarians get nothing.
      </p>
    </div>
  </div>
</div>

              {/* Footer */}
              <div 
                className="flex justify-between items-center mt-2 px-1 text-[9px] opacity-85"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}
              >
                <span>Illus. Game Engine</span>
                <span>001 / 002 ★</span>
              </div>
            </div>
          </div>

          {/* REGARDO BACK SIDE */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: "rotateY(180deg)" 
            }}
          >
            <div 
              className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-gold)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]" 
              style={{ 
                backgroundColor: 'var(--color-card)',
              }}
            >
              <div 
                className="w-full flex-grow rounded-2xl border-2 p-6 relative flex flex-col items-center justify-between overflow-hidden"
                style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
                <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
                
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-md" style={{ borderColor: 'var(--color-gold)' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-md" style={{ borderColor: 'var(--color-purple)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-md" style={{ borderColor: 'var(--color-purple)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-md" style={{ borderColor: 'var(--color-gold)' }} />

                <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
                
                {/* Central Medallion */}
                <div className="relative flex items-center justify-center z-10 scale-95">
                  <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-purple))' }} />
                  <div className="p-[3px] rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-purple) 100%)' }}>
                    <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}>
                      <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: 'var(--color-text2)' }} />
                      
                      {/* Round Info Link Button */}
                      <a 
                        href="/learn-more-regardo" 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                        style={{ 
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-gold)',
                          color: 'var(--color-gold-hover)'
                        }}
                      >
                        <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                      </a>
                    </div>
                  </div>
                </div>
                
                <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ================= CARLO 3D FLIP CONTAINER ================= */}
      <div 
        className="w-full max-w-[400px] h-[580px] relative group" 
        style={{ perspective: 1200 }} 
      >
        <motion.div
          animate={{ rotateY: carloFlipped ? 180 : 0 }}
          whileHover={{ y: -6, transition: { duration: 0.3 } }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="w-full h-full relative cursor-pointer"
          onClick={() => setCarloFlipped(!carloFlipped)}
        >
          {/* CARLO FRONT SIDE */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div 
              className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-purple)] group-hover:shadow-[0_0_30px_rgba(106,27,154,0.45)]" 
              style={{ 
                backgroundColor: 'var(--color-card)',
              }}
            >
              {/* Card Header */}
              <div className="flex justify-between items-end mb-2.5 px-1 pt-1">
                <div className="flex flex-col">
                  <span 
                    className="text-[9px] uppercase font-extrabold tracking-widest"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-purple)' }}
                  >
                    Basic Hero
                  </span>
                  <h3 
                    className="text-2xl font-black tracking-wide"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    Carlo
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[11px] font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}
                  >
                    HP 99M
                  </span>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md border"
                    style={{ 
                      backgroundColor: 'var(--color-card2)', 
                      borderColor: 'var(--color-purple)', 
                      color: 'var(--color-purple)' 
                    }}
                  >
                    ⚒
                  </div>
                </div>
              </div>

              {/* Character Frame */}
              <div 
                className="w-full h-72 border-4 rounded-xl relative overflow-visible flex items-center justify-center shadow-inner mb-2.5"
                style={{ 
                  backgroundColor: 'var(--color-card3)', 
                  borderColor: 'var(--color-border2)' 
                }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none rounded-lg" 
                  style={{ backgroundColor: 'rgba(106, 27, 154, 0.05)' }}
                />
                <motion.div
                  style={{
                    y: yTransform,
                    x: xCarlo,
                    opacity: opacityTransform,
                    scale: scaleTransform,
                  }}
                  className="w-full absolute z-10 flex justify-center pt-8 pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)]"
                >
                  <Carlo className="w-full h-auto max-w-[270px] max-h-64 object-contain" viewBox="0 0 500 800" />
                </motion.div>
              </div>

{/* Middle Info Bar (Edge-to-Edge Header Bar Redesign) */}
<div 
  className="border-2 rounded-xl overflow-hidden mb-2.5 flex flex-col"
  style={{ 
    backgroundColor: 'var(--color-card2)', 
    borderColor: 'var(--color-border)' 
  }}
>
  {/* Solid Purple Header Strip */}
  <div 
    className="w-full py-1.5 px-4 flex items-center justify-center select-none"
    style={{ backgroundColor: 'var(--color-purple)' }}
  >
    {/* Left horizontal line */}
    <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
    
    <span 
      className="px-3 text-[10px] font-black uppercase tracking-widest text-center"
      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-bg)' }}
    >
      Class: Proletariat
    </span>
    
    {/* Right horizontal line */}
    <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
  </div>

  {/* Description Area */}
  <div className="p-3 text-left">
    <p 
      className="text-[11px] leading-relaxed"
      style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
    >
      the largest number of players collectively holding 50% of the supply.
    </p>
  </div>
</div>

             {/* Rules/Ability Text Box */}
<div 
  className="border-2 rounded-xl p-3.5 flex-grow flex flex-col justify-center"
  style={{ 
    backgroundColor: 'var(--color-card2)', 
    borderColor: 'var(--color-border)' 
  }}
>
  <div className="space-y-3.5">
    {/* Action 1: Coordinate Masses */}
    <div>
      <div className="flex items-center mb-1">
        <div className="flex-grow border-t border-[var(--color-purple)]/30" />
        <span 
          className="px-2 text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}
        >
          Coordinate Masses
        </span>
        <div className="flex-grow border-t border-[var(--color-purple)]/30" />
      </div>
      <p 
        className="text-center text-[11px] leading-relaxed"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
      >
        push the economy toward perfect distribution.
      </p>
    </div>

    {/* Action 2: Wealth Tax */}
    <div>
      <div className="flex items-center mb-1">
        <div className="flex-grow border-t border-[var(--color-purple)]/30" />
        <span 
          className="px-2 text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}
        >
          Wealth Tax
        </span>
        <div className="flex-grow border-t border-[var(--color-purple)]/30" />
      </div>
      <p 
        className="text-center text-[11px] leading-relaxed"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
      >
        Capitalist payouts are capped and the surplus flows to you.
      </p>
    </div>
  </div>
</div>

              {/* Footer */}
              <div 
                className="flex justify-between items-center mt-2 px-1 text-[9px] opacity-85"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}
              >
                <span>Illus. Game Engine</span>
                <span>002 / 002 ★</span>
              </div>
            </div>
          </div>

          {/* CARLO BACK SIDE */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: "rotateY(180deg)" 
            }}
          >
            <div 
              className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-purple)] group-hover:shadow-[0_0_30px_rgba(106,27,154,0.45)]" 
              style={{ 
                backgroundColor: 'var(--color-card)',
              }}
            >
              <div 
                className="w-full flex-grow rounded-2xl border-2 p-6 relative flex flex-col items-center justify-between overflow-hidden"
                style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
                <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
                
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-md" style={{ borderColor: 'var(--color-gold)' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-md" style={{ borderColor: 'var(--color-purple)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-md" style={{ borderColor: 'var(--color-purple)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-md" style={{ borderColor: 'var(--color-gold)' }} />

                <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
                
                {/* Central Medallion */}
                <div className="relative flex items-center justify-center z-10 scale-95">
                  <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-purple))' }} />
                  <div className="p-[3px] rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-purple) 100%)' }}>
                    <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}>
                      <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: 'var(--color-text2)' }} />
                      
                      {/* Round Info Link Button */}
                      <a 
                        href="/learn-more-carlo" 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                        style={{ 
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-purple)',
                          color: 'var(--color-purple)'
                        }}
                      >
                        <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                      </a>
                    </div>
                  </div>
                </div>
                
                <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  </div>
</section>

          {/* Play the Game (Action Cards Section) */}
<section 
  id="sectionPlay" 
  className="py-16 mx-auto min-h-screen flex flex-col justify-center max-w-6xl px-4"
  style={{ backgroundColor: 'var(--color-bg)' }}
>
  <h2 
    className="h2-app mb-16 text-center text-[2.5rem] font-bold"
    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
  >
    Play the Game
  </h2>
  
  {/* 3-Column Responsive Grid */}
  <div className="grid md:grid-cols-3 gap-8 justify-items-center relative w-full">
    
    {/* ================= CARD 1: ENTER THE ARENA ================= */}
    <div 
      className="w-full max-w-[340px] h-[540px] relative group" 
      style={{ perspective: 1200 }} 
    >
      <motion.div
        animate={{ rotateY: action1Flipped ? 180 : 0 }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative cursor-pointer"
        onClick={() => setAction1Flipped(!action1Flipped)}
      >
        {/* CARD 1 FRONT */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-end mb-2 px-1 pt-1">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-extrabold tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-magenta)' }}>Phase</span>
                <h3 className="text-lg font-black tracking-wide" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>ENTER THE ARENA</h3>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text2)' }}>01</span>
            </div>

            {/* Illustration Frame */}
            <div 
              className="w-full h-48 border-4 rounded-xl relative overflow-visible flex items-center justify-center shadow-inner mb-2"
              style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}
            >
              <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ backgroundColor: 'rgba(184, 0, 111, 0.05)' }} />
              <div className="w-full max-h-40 max-w-[200px] flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)]">
                <FIM1 viewBox="0 0 850 850" className="w-full h-auto" />
              </div>
            </div>

            {/* Class Box */}
            <div 
              className="border-2 rounded-xl overflow-hidden mb-2 flex flex-col"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-full py-1 px-3 flex items-center justify-center" style={{ backgroundColor: 'var(--color-magenta)' }}>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
                <span className="px-2.5 text-[9px] font-black uppercase tracking-widest text-center" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-bg)' }}>
                  Auction
                </span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
              </div>
                
              
            </div>

            {/* Rules Box */}
            <div 
              className="border-2 rounded-xl p-3 flex-grow flex flex-col justify-center"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex items-center mb-0.5">
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                    <span className="px-2 text-[9px] font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-magenta)' }}>Seed the Prize Pool</span>
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                  </div>
                  <p className="text-center text-[11px] leading-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                    Buy Fake Internet Money ($FIM) with $USDC.
                  </p>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-2 px-1 text-[8px] opacity-85" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>
              <span>Phase 01 Guide</span>
              <span>Doc. Reference ↗</span>
            </div>
          </div>
        </div>

        {/* CARD 1 BACK */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className="w-full flex-grow rounded-2xl border-2 p-6 relative flex flex-col items-center justify-between overflow-hidden" style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}>
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-md" style={{ borderColor: 'var(--color-magenta)' }} />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-md" style={{ borderColor: 'var(--color-magenta)' }} />

              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
              
              <div className="relative flex items-center justify-center z-10 scale-95">
                <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-magenta), var(--color-card3))' }} />
                <div className="p-[3px] rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-magenta) 0%, var(--color-border2) 100%)' }}>
                  <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}>
                    <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: 'var(--color-text2)' }} />
                    <a 
                      href="#" 
                      onClick={(e) => { e.stopPropagation(); navigateToDocs('intro#phase-1-auction'); }} 
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-magenta)', color: 'var(--color-magenta)' }}
                    >
                      <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>LEARN THE ARENA</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

    {/* ================= CARD 2: OUTPLAY THE MARKET ================= */}
    <div 
      className="w-full max-w-[340px] h-[540px] relative group" 
      style={{ perspective: 1200 }} 
    >
      <motion.div
        animate={{ rotateY: action2Flipped ? 180 : 0 }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative cursor-pointer"
        onClick={() => setAction2Flipped(!action2Flipped)}
      >
        {/* CARD 2 FRONT */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-end mb-2 px-1 pt-1">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-extrabold tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-magenta)' }}>Phase</span>
                <h3 className="text-lg font-black tracking-wide" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>OUTPLAY THE MARKET</h3>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text2)' }}>02</span>
            </div>

            {/* Illustration Frame */}
            <div 
              className="w-full h-48 border-4 rounded-xl relative overflow-visible flex items-center justify-center shadow-inner mb-2"
              style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}
            >
              <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ backgroundColor: 'rgba(184, 0, 111, 0.05)' }} />
              <div className="w-full max-h-40 max-w-[200px] flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)]">
                <FIM1 viewBox="0 0 850 850" className="w-full h-auto" />
              </div>
            </div>

            {/* Class Box */}
            <div 
              className="border-2 rounded-xl overflow-hidden mb-2 flex flex-col"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-full py-1 px-3 flex items-center justify-center" style={{ backgroundColor: 'var(--color-magenta)' }}>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
                <span className="px-2.5 text-[9px] font-black uppercase tracking-widest text-center" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-bg)' }}>
                  Trading
                </span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
              </div>

            </div>

            {/* Rules Box */}
            <div 
              className="border-2 rounded-xl p-3 flex-grow flex flex-col justify-center"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-3">
                
                <div>
                  <div className="flex items-center mb-0.5">
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                    <span className="px-2 text-[9px] font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-magenta)' }}>Trade</span>
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                  </div>
                  <p className="text-center text-[11px] leading-normal pb-2" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                    Trade $FIM with other players to shift the wealth distribution.
                  </p>
                  <div className="flex items-center mb-0.5">
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                    <span className="px-2 text-[9px] font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-magenta)' }}>Coordinate</span>
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                  </div>
                  <p className="text-center text-[11px] leading-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                    Coordinate with your Faction. Who you trade with matters more than the price.
                  </p>
                  
                </div>
              </div>
            </div>
            

            {/* Footer */}
            <div className="flex justify-between items-center mt-2 px-1 text-[8px] opacity-85" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>
              <span>Phase 02 Guide</span>
              <span>Doc. Reference ↗</span>
            </div>
          </div>
        </div>

        {/* CARD 2 BACK */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className="w-full flex-grow rounded-2xl border-2 p-6 relative flex flex-col items-center justify-between overflow-hidden" style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}>
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-md" style={{ borderColor: 'var(--color-magenta)' }} />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-md" style={{ borderColor: 'var(--color-magenta)' }} />

              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
              
              <div className="relative flex items-center justify-center z-10 scale-95">
                <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-magenta), var(--color-card3))' }} />
                <div className="p-[3px] rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-magenta) 0%, var(--color-border2) 100%)' }}>
                  <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}>
                    <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: 'var(--color-text2)' }} />
                    <a 
                      href="#" 
                      onClick={(e) => { e.stopPropagation(); navigateToDocs('intro#phase-3-victory-payouts'); }} 
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-magenta)', color: 'var(--color-magenta)' }}
                    >
                      <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>LEARN THE TRADES</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

    {/* ================= CARD 3: ENFORCE YOUR IDEOLOGY ================= */}
    <div 
      className="w-full max-w-[340px] h-[540px] relative group" 
      style={{ perspective: 1200 }} 
    >
      <motion.div
        animate={{ rotateY: action3Flipped ? 180 : 0 }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative cursor-pointer"
        onClick={() => setAction3Flipped(!action3Flipped)}
      >
        {/* CARD 3 FRONT */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] border-[var(--color-border2)] p-4 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-end mb-2 px-1 pt-1">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-extrabold tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-magenta)' }}>Phase</span>
                <h3 className="text-lg font-black tracking-wide" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>ENFORCE YOUR IDEOLOGY</h3>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--color-text2)' }}>03</span>
            </div>

            {/* Illustration Frame */}
            <div 
              className="w-full h-48 border-4 rounded-xl relative overflow-visible flex items-center justify-center shadow-inner mb-2"
              style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}
            >
              <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ backgroundColor: 'rgba(184, 0, 111, 0.05)' }} />
              <div className="w-full max-h-40 max-w-[200px] flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)]">
                <FIM1 viewBox="0 0 850 850" className="w-full h-auto" />
              </div>
            </div>

            {/* Class Box */}
            <div 
              className="border-2 rounded-xl overflow-hidden mb-2 flex flex-col"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-full py-1 px-3 flex items-center justify-center" style={{ backgroundColor: 'var(--color-magenta)' }}>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
                <span className="px-2.5 text-[9px] font-black uppercase tracking-widest text-center" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-bg)' }}>
                  Payout
                </span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--color-bg)', opacity: 0.35 }} />
              </div>
              <div className="p-2 text-left">
                <p className="text-[10px] leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                  the final validation phase to calculate victory and enforce payout rules.
                </p>
              </div>
            </div>

            {/* Rules Box */}
            <div 
              className="border-2 rounded-xl p-3 flex-grow flex flex-col justify-center"
              style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex items-center mb-0.5">
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                    <span className="px-2 text-[9px] font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-magenta)' }}>Shift the Economy</span>
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                  </div>
                  <p className="text-center text-[11px] leading-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                    Shift the final wealth distribution in favor of your faction.
                  </p>
                </div>
                <div>
                  <div className="flex items-center mb-0.5">
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                    <span className="px-2 text-[9px] font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-magenta)' }}>Winner Dictates</span>
                    <div className="flex-grow border-t border-[var(--color-magenta)]/30" />
                  </div>
                  <p className="text-center text-[11px] leading-normal" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}>
                    The winning faction sets the ultimate payout rules — the loser pays.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-2 px-1 text-[8px] opacity-85" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>
              <span>Phase 03 Guide</span>
              <span>Doc. Reference ↗</span>
            </div>
          </div>
        </div>

        {/* CARD 3 BACK */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-[2.5rem] border-[12px] p-4 shadow-xl justify-between transition-all duration-300 border-[var(--color-border2)] group-hover:border-[var(--color-magenta)] group-hover:shadow-[0_0_25px_rgba(184,0,111,0.45)]" 
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className="w-full flex-grow rounded-2xl border-2 p-6 relative flex flex-col items-center justify-between overflow-hidden" style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}>
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-border2), var(--color-text2), var(--color-border2))' }} />
              
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-md" style={{ borderColor: 'var(--color-magenta)' }} />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-md" style={{ borderColor: 'var(--color-border2)' }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-md" style={{ borderColor: 'var(--color-magenta)' }} />

              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>THE SYSTEM ENGINE</span>
              
              <div className="relative flex items-center justify-center z-10 scale-95">
                <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-magenta), var(--color-card3))' }} />
                <div className="p-[3px] rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-magenta) 0%, var(--color-border2) 100%)' }}>
                  <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}>
                    <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: 'var(--color-text2)' }} />
                    <a 
                      href="#" 
                      onClick={(e) => { e.stopPropagation(); navigateToDocs('intro#phase-3-victory-and-payouts'); }} 
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-magenta)', color: 'var(--color-magenta)' }}
                    >
                      <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <span className="text-[10px] tracking-[0.3em] font-bold uppercase select-none opacity-60 z-10" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text2)' }}>LEARN THE IDEOLOGY</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

  </div>
</section>

          {/* More Than a Game */}
          <section id="sectionOwnMarket" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <h2 className="h2-app mb-8 text-center">Own the Project</h2>
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
                description="Challenge the status quo of web3 and financial markets. Help building a new paradigm for people-owned, people-governed economies."
                onButtonClick={() => navigateToDocs('mission')}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <button onClick={() => window.open('http://docs.localhost:3000/whitepaper')} className="btn-game-secondary">
                Read the Whitepaper
              </button>
            </div>
          </section>

          {/* Distribution of Power */}
          <section id="sectionDistribution" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2 text-center">
                <h2 className="h2-app">Distribution of Power</h2>
              </div>
              <NestedPieChart data={tableData} />
            </div>
          </section>

          {/* Campaign Sequence */}
          <section id="sectionCampaign" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <h2 className="h2-app mb-12 text-center">Campaign Sequence</h2>
            <div className="mx-auto"></div>
          </section>
          
          {/* Secure Your Stake */}
          <section id="sectionSecureYourStake" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <h2 className="h2-app text-center mb-5">Secure Your Stake</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center text-center landing-card max-h-screen">
                <h2 className="h3-app mb-4">Capital Auction</h2>
                <p className='text-sm mb-8'>The Regarded Token will be launched in a capital auction, allowing early supporters to secure their stake in the project.</p>
                <button onClick={() => window.open('http://app.localhost:3000/ico')} className="btn-game-primary">
                  Capital Auction
                </button>
              </div>
              <div className="flex flex-col items-center text-center landing-card max-h-screen">
                <h2 className="h3-app mb-4">Testnet Quests</h2>
                <p className='text-sm mb-8'>Complete quests and play on the Testnet to earn points that translate into governance token during the Token Generation Event</p>
                <button onClick={() => window.open('http://app.sepolia.localhost:3000/quests')} className="btn-game-primary">
                  Quest Board
                </button>
              </div>
            </div>
          </section>
          
        </div>
      </main>
    </div>
  );
}