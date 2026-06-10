'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useScrollNavigation } from '@/hooks/useScrollNavigation';
import '@/app/globals.css';
import { useTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/icons/svg';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import FIM1 from '@/components/icons/FIM1.svg';
import { useDocNavigation } from '@/hooks/useDocNavigation';
import NestedPieChart from '@/components/NestedPieChart';
import CyclingSubheading from '@/components/CyclingSubheading';
import ScrollNav from '@/components/ScrollNav';
import { AuctionChart } from '@/app/app/_components/AuctionChart';
import { TradeFlows } from '@/app/app/_components/TradeFlows';
import Skyline from '@/components/icons/Skyline';
import HeroCard from '@/components/HeroCard';
import AnimatedGiniCard from '@/components/AnimatedGiniCard';

interface AuctionPoint {
  time: number;
  prizePool?: number;
  mintVolume?: number;
}

const CLASS_GROUPS_20 = [
  { isCapitalist: true, label: 'Capitalist 90%-100%', playerCount: 5 },
  { isCapitalist: true, label: 'Capitalist 80%-89%', playerCount: 15 },
  { isCapitalist: true, label: 'Capitalist 70%-79%', playerCount: 30 },
  { isCapitalist: true, label: 'Capitalist 60%-69%', playerCount: 45 },
  { isCapitalist: true, label: 'Capitalist 50%-59%', playerCount: 60 },
  { isCapitalist: true, label: 'Capitalist 40%-49%', playerCount: 80 },
  { isCapitalist: true, label: 'Capitalist 30%-39%', playerCount: 110 },
  { isCapitalist: true, label: 'Capitalist 20%-29%', playerCount: 140 },
  { isCapitalist: true, label: 'Capitalist 10%-19%', playerCount: 180 },
  { isCapitalist: true, label: 'Capitalist 0%-9%', playerCount: 220 },

  { isCapitalist: false, label: 'Protelarians 9%-0%', playerCount: 320 },
  { isCapitalist: false, label: 'Protelarians 19%-10%', playerCount: 410 },
  { isCapitalist: false, label: 'Protelarians 29%-20%', playerCount: 550 },
  { isCapitalist: false, label: 'Protelarians 39%-30%', playerCount: 680 },
  { isCapitalist: false, label: 'Protelarians 49%-40%', playerCount: 820 },
  { isCapitalist: false, label: 'Protelarians 59%-50%', playerCount: 950 },
  { isCapitalist: false, label: 'Protelarians 69%-60%', playerCount: 1100 },
  { isCapitalist: false, label: 'Protelarians 79%-70%', playerCount: 1350 },
  { isCapitalist: false, label: 'Protelarians 89%-80%', playerCount: 1600 },
  { isCapitalist: false, label: 'Protelarians 100%-90%', playerCount: 2500 },
];

const generateBase20Matrix = (): number[][] => {
  const matrix: number[][] = [];
  for (let r = 0; r < 20; r++) {
    const row: number[] = [];
    for (let c = 0; c < 20; c++) {
      if (r === c) {
        row.push(0);
      } else {
        const isCapR = r < 10;
        const isCapC = c < 10;

        let baseVal = 100;
        if (isCapR && isCapC) {
          baseVal = Math.floor(1100 + Math.sin(r * c) * 450);
        } else if (!isCapR && !isCapC) {
          baseVal = Math.floor(1300 + Math.cos(r + c) * 500);
        } else {
          baseVal = Math.floor(650 + Math.sin(r - c) * 250);
        }
        
        row.push(Math.max(120, baseVal));
      }
    }
    matrix.push(row);
  }
  return matrix;
};

const BASE_FLOW_MATRIX_20 = generateBase20Matrix();

const getTopConnections = (matrix: number[][]) => {
  const capitalists: { r: number; c: number; target: number }[] = [];
  const socialists: { r: number; c: number; target: number }[] = [];
  const crossClass: { r: number; c: number; target: number }[] = [];

  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 20; c++) {
      if (r === c) continue;
      
      const isCapR = r < 10;
      const isCapC = c < 10;
      const target = matrix[r][c];

      if (isCapR && isCapC) {
        capitalists.push({ r, c, target });
      } else if (!isCapR && !isCapC) {
        socialists.push({ r, c, target });
      } else {
        crossClass.push({ r, c, target });
      }
    }
  }

  capitalists.sort((a, b) => b.target - a.target);
  socialists.sort((a, b) => b.target - a.target);
  crossClass.sort((a, b) => b.target - a.target);

  const capSubset = capitalists.slice(0, 12);   
  const socSubset = socialists.slice(0, 12);     
  const crossSubset = crossClass.slice(0, 8);   

  return [...capSubset, ...socSubset, ...crossSubset].sort(() => Math.random() - 0.5);
};

function HoverChordChart({ isHovered }: { isHovered: boolean }) {
  const [matrix, setMatrix] = useState<number[][]>(BASE_FLOW_MATRIX_20);
  
  const activeConnIndexRef = useRef<number>(-1);
  const currentGrowthValueRef = useRef<number>(0);
  const currentMatrixRef = useRef<number[][]>([]);
  const queueRef = useRef<{ r: number; c: number; target: number }[]>([]);
  const tickCountRef = useRef<number>(0);

  useEffect(() => {
    setMatrix(BASE_FLOW_MATRIX_20);
  }, []);

  useEffect(() => {
    if (!isHovered) {
      setMatrix(BASE_FLOW_MATRIX_20);
      activeConnIndexRef.current = -1;
      return;
    }

    const emptyState = BASE_FLOW_MATRIX_20.map(row => row.map(() => 0));
    currentMatrixRef.current = emptyState;
    setMatrix(emptyState);

    const topConns = getTopConnections(BASE_FLOW_MATRIX_20);
    queueRef.current = topConns;
    
    activeConnIndexRef.current = 0;
    currentGrowthValueRef.current = 0;
    tickCountRef.current = 0;

    const interval = setInterval(() => {
      tickCountRef.current += 1;
      const t = tickCountRef.current;
      const connIdx = activeConnIndexRef.current;

      if (connIdx < 0 || connIdx >= queueRef.current.length) {
        const pulsingMatrix = currentMatrixRef.current.map((row, r) =>
          row.map((val, c) => {
            if (r === c) return 0;
            const isDrawn = queueRef.current.some(q => q.r === r && q.c === c);
            const baseVal = isDrawn ? BASE_FLOW_MATRIX_20[r][c] : 0;
            const breathing = 1 + Math.sin(t / 8 + r * c) * 0.06;
            return Math.max(0, Math.floor(baseVal * breathing));
          })
        );
        setMatrix(pulsingMatrix);
        return;
      }

      const { r, c, target } = queueRef.current[connIdx];
      
      const step = Math.max(100, Math.floor(target / 6));
      const nextVal = Math.min(target, currentGrowthValueRef.current + step);
      currentGrowthValueRef.current = nextVal;

      const updated = currentMatrixRef.current.map((row, rowIndex) =>
        row.map((val, colIndex) => {
          if (rowIndex === r && colIndex === c) {
            return nextVal;
          }
          
          const isAlreadyBuilt = queueRef.current.slice(0, connIdx).some(q => q.r === rowIndex && q.c === colIndex);
          if (isAlreadyBuilt) {
            const targetVal = BASE_FLOW_MATRIX_20[rowIndex][colIndex];
            const breathing = 1 + Math.sin(t / 8 + rowIndex * colIndex) * 0.03;
            return Math.floor(targetVal * breathing);
          }
          
          return val;
        })
      );

      currentMatrixRef.current = updated;
      setMatrix(updated);

      if (nextVal >= target) {
        activeConnIndexRef.current += 1;
        currentGrowthValueRef.current = 0;
      }

    }, 55);

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div className="w-full h-full p-1 flex items-center justify-center">
      <TradeFlows
        minimal={true}
        mockChordData={{
          groups: CLASS_GROUPS_20,
          matrix: matrix,
        }}
      />
    </div>
  );
}

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
  
  const [action1Hovered, setaction1Hovered] = useState(false);
  const [action2Hovered, setaction2Hovered] = useState(false);
  const [action3Hovered, setaction3Hovered] = useState(false);

  const [own1Flipped , setOwn1Flipped] = useState(false);
  const [own2Flipped , setOwn2Flipped] = useState(false);
  const [own3Flipped , setOwn3Flipped] = useState(false);
  const [stake1Flipped, setStake1Flipped] = useState(false);
  const [stake2Flipped, setStake2Flipped] = useState(false);

  const generateBasePoints = (count: number): AuctionPoint[] => {
    const points: AuctionPoint[] = [];
    const baseTime = Math.floor(Date.now() / 1000) - count * 3600;
    let pool = 12000;
    for (let i = 0; i < count; i++) {
      pool += Math.random() * 1500 + 300;
      points.push({
        time: baseTime + i * 3600,
        prizePool: pool,
        mintVolume: Math.floor(Math.random() * 4000) + 800,
      });
    }
    return points;
  };

  function HoverGrowingChart({ isHovered }: { isHovered: boolean }) {
    const [points, setPoints] = useState<AuctionPoint[]>([]);

    useEffect(() => {
      setPoints(generateBasePoints(60));
    }, []);

    useEffect(() => {
      if (!isHovered) {
        setPoints(generateBasePoints(60));
        return;
      }

      const interval = setInterval(() => {
        setPoints((current) => {
          if (current.length >= 50) return generateBasePoints(200);
          const lastPoint = current[current.length - 1];
          const nextTime = lastPoint.time + 3600;
          const nextPool = lastPoint.prizePool + Math.random() * 12000 + 2000;
          const nextVolume = Math.floor(Math.random() * 18000) + 3000;

          return [
            ...current,
            { time: nextTime, prizePool: nextPool, mintVolume: nextVolume },
          ];
        });
      }, 250);

      return () => clearInterval(interval);
    }, [isHovered]);

    return (
      <div className="w-full h-full min-h-0 relative select-none">
        <AuctionChart
          points={points}
          minimal={true}
        />
      </div>
    );
  }

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

  useEffect(() => {
    let isScrolling = false;
    let scrollTimeout;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaY) < 30) return;
      if (e.target.closest('[role="dialog"]') || e.target.closest('.overflow-y-auto')) {
        return;
      }

      e.preventDefault(); 
      if (isScrolling) return;

      const sections = Array.from(document.querySelectorAll('section'));
      if (sections.length === 0) return;

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
        targetIndex++;
      } else if (e.deltaY < 0 && currentIndex > 0) {
        targetIndex--;
      }

      if (targetIndex !== currentIndex) {
        isScrolling = true;
        sections[targetIndex].scrollIntoView({ behavior: 'smooth' });
        
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

  // --- MASTER SINGLE-LAYER MULTI-SECTION FLIGHT CHOREOGRAPHY ---
  const cardsSectionRef = useRef(null);
  const playSectionRef = useRef(null);
  
  // --- MASTER SINGLE-LAYER MULTI-SECTION FLIGHT CHOREOGRAPHY ---
 // --- MASTER SINGLE-LAYER MULTI-SECTION FLIGHT CHOREOGRAPHY ---
  // --- MASTER SINGLE-LAYER MULTI-SECTION FLIGHT CHOREOGRAPHY ---
  // --- MASTER SINGLE-LAYER MULTI-SECTION FLIGHT CHOREOGRAPHY ---
  const { scrollYProgress: globalScroll } = useScroll();

  // Regardo (Capitalist)
  // - Starts barely visible (opacity: 0.15) on initial load, fading into 1.0 inside the cards
  const regX = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [-600, -288, 460, 440]);
  const regY = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], ["-60px", "-40px", "-85px", "-100vh"]);
  const regScale = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [2.6, 0.55, 0.18, 0.18]);
  const regOpacity = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [0.05, 1.0, 1.0, 0]);

  // Carlo (Proletariat)
  // - Starts barely visible (opacity: 0.15) on initial load, fading into 1.0 inside the cards
  const carX = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [600, 288, 275, 275]);
  const carY = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], ["0px", "-20px", "-85px", "-100vh"]);
  const carScale = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [2.6, 0.55, 0.18, 0.18]);
  const carOpacity = useTransform(globalScroll, [0, 0.18, 0.34, 0.45], [0.05, 1.0, 1.0, 0]);

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
        .mini-chart-view .terminal-pane > div:first-child {
          display: none !important;
        }
      `}</style>

      {/* Global Desktop Floating Overlay - Explicit initial opacity prevents FOUC/translucency on mount */}
      <div className="fixed inset-0 pointer-events-none z-50 hidden lg:flex items-center justify-center">
        {/* Regardo (Capitalist) */}
        <motion.div
          initial={{ opacity: 1.0 }}
          style={{
            x: regX,
            y: regY,
            scale: regScale,
            opacity: regOpacity,
          }}
          className="absolute w-64 h-auto filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.95)]"
        >
          <Regardo className="w-full h-auto text-gold" viewBox="0 0 500 800" />
        </motion.div>

        {/* Carlo (Proletarian) */}
        <motion.div
          initial={{ opacity: 1.0 }}
          style={{
            x: carX,
            y: carY,
            scale: carScale,
            opacity: carOpacity,
          }}
          className="absolute w-64 h-auto filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.95)]"
        >
          <Carlo className="w-full h-auto text-purple" viewBox="0 0 500 800" />
        </motion.div>
      </div>


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

          {/* Hero Section */}
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
                <button onClick={() => scrollToSection('sectionHero')} className="btn-secondary">
                  Learn More
                </button>
                <button onClick={() => navigateToDocs('intro')} className="btn-secondary">
                  Read Docs
                </button>
                <button onClick={() => window.open('http://app.localhost:3000/ico')} className="btn-primary">
                  Secure Your Stake
                </button>
              </div>
            </div>
          </section>
          
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
              <div className="grid md:grid-cols-2 gap-12 lg:gap-16 justify-items-center relative w-full">
                
                {/* ================= REGARDO CARD ================= */}
                <HeroCard 
                  isFlipped={regardoFlipped}
                  onFlip={() => setRegardoFlipped(!regardoFlipped)}
                  themeColor="var(--color-gold)"
                  themeColorHover="var(--color-gold-hover)"
                  themeColorRgba="212, 175, 55"
                  chassisGradient="linear-gradient(135deg, #7c6225 0%, #dfc482 25%, #977636 50%, #ebdba4 75%, #6a501c 100%)"
                  headerTag="Basic Hero"
                  title="Regardo"
                  symbol={<span className="font-sans text-xs">$</span>}
                  classTitle="Class: Capitalist"
                  classSymbol={<span className="font-sans text-xs">★</span>}
                  classDesc="the smallest number of players collectively holding 50% of the supply."
                  abilities={[
                    { name: "Concentrate Capital", desc: "push the economy toward perfect inequality." },
                    { name: "BAILOUT", desc: "Split the entire prize pool. Proletarians get nothing." }
                  ]}
                  footerLeftText="Faction 01"
                  footerMiddleText='001 / 002'
                  footerRightText="Doc. Reference ↗"
                  footerTextColor="rgba(7, 7, 9, 0.65)"
                  backInfoLink="/learn-more-regardo"
                  backgroundSlot={
                    <svg viewBox="0 0 800 450" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="skyGrad-reg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-bg)" />
                          <stop offset="100%" stopColor="var(--color-card)" />
                        </linearGradient>
                        <linearGradient id="glassGrad-reg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect width="800" height="450" fill="url(#skyGrad-reg)" />
                      <g opacity="0.35">
                        <rect x="40" y="180" width="85" height="270" fill="var(--color-bg)" />
                        <rect x="200" y="120" width="60" height="330" fill="var(--color-bg)" />
                        <rect x="440" y="100" width="100" height="350" fill="var(--color-bg)" />
                      </g>
                      <g opacity="0.65">
                        <line x1="145" y1="120" x2="145" y2="180" stroke="var(--color-border2)" strokeWidth="2" />
                        <rect x="110" y="180" width="70" height="270" fill="var(--color-card)" />
                        <polygon points="260,200 310,240 310,450 260,450" fill="var(--color-card)" />
                      </g>
                      <g>
                        <rect x="0" y="220" width="50" height="230" fill="var(--color-card2)" />
                        <rect x="60" y="170" width="40" height="280" fill="var(--color-card2)" />
                        <line x1="195" y1="50" x2="195" y2="100" stroke="var(--color-gold)" strokeWidth="3" />
                        <rect x="140" y="100" width="105" height="350" fill="var(--color-card3)" />
                        <rect x="195" y="130" width="38" height="180" fill="url(#glassGrad-reg)" />
                        <polygon points="275,250 330,220 330,450 275,450" fill="var(--color-card2)" />
                        <line x1="460" y1="120" x2="460" y2="180" stroke="var(--color-gold)" strokeWidth="2.5" />
                        <polygon points="435,180 460,170 485,180 485,450 435,450" fill="var(--color-card3)" />
                        <line x1="448" y1="200" x2="448" y2="430" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
                        <line x1="472" y1="200" x2="472" y2="430" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
                        <rect x="560" y="220" width="55" height="230" fill="var(--color-card3)" />
                        <rect x="695" y="80" width="105" height="370" fill="var(--color-card2)" />
                        <rect x="710" y="110" width="90" height="340" fill="var(--color-card3)" stroke="var(--color-border)" strokeWidth="0.5" />
                      </g>
                    </svg>
                  }
                  /* Static fallback for mobile viewports, hidden on desktop layout stop */
                  illustrationSlot={
                    <div className="w-full absolute z-20 flex justify-center pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)] lg:hidden">
                      <Regardo className="w-full h-auto max-w-[270px] max-h-50 object-contain" viewBox="0 0 500 800" />
                    </div>
                  }
                />

                {/* ================= CARLO CARD ================= */}
                <HeroCard 
                  isFlipped={carloFlipped}
                  onFlip={() => setCarloFlipped(!carloFlipped)}
                  themeColor="var(--color-purple)"
                  themeColorRgba="171, 71, 188"
                  chassisGradient="linear-gradient(135deg, #2e0854 0%, #7b1fa2 25%, #3f0c70 50%, #ba68c8 75%, #220341 100%)"
                  headerTag="Basic Hero"
                  title="Carlo"
                  symbol={<span className="font-sans text-xs">⚒</span>}
                  classTitle="Class: Proletariat"
                  classSymbol={<span className="font-sans text-xs">⚒</span>}
                  classDesc="the largest number of players collectively holding 50% of the supply."
                  abilities={[
                    { name: "Coordinate Masses", desc: "push the economy toward perfect distribution." },
                    { name: "Wealth Tax", desc: "Capitalist payouts are capped and the surplus flows to you." }
                  ]}
                  footerLeftText="Faction 02"
                  footerMiddleText='002 / 002'
                  footerRightText="Doc. Reference ↗ "
                  footerTextColor="rgba(255, 255, 255, 0.65)"
                  backInfoLink="/learn-more-carlo"
                  backgroundSlot={
                    <svg viewBox="0 0 800 450" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="skyGrad-car" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-bg)" />
                          <stop offset="100%" stopColor="var(--color-card)" />
                        </linearGradient>
                        <linearGradient id="glassGrad-car" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--color-purple)" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="var(--color-purple)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect width="800" height="450" fill="url(#skyGrad-car)" />
                      <g opacity="0.35">
                        <rect x="40" y="180" width="85" height="270" fill="var(--color-bg)" />
                        <rect x="200" y="120" width="60" height="330" fill="var(--color-bg)" />
                        <rect x="440" y="100" width="100" height="350" fill="var(--color-bg)" />
                      </g>
                      <g opacity="0.65">
                        <line x1="145" y1="120" x2="145" y2="180" stroke="var(--color-border2)" strokeWidth="2" />
                        <rect x="110" y="180" width="70" height="270" fill="var(--color-card)" />
                        <polygon points="260,200 310,240 310,450 260,450" fill="var(--color-card)" />
                      </g>
                      <g>
                        <rect x="0" y="220" width="50" height="230" fill="var(--color-card2)" />
                        <rect x="60" y="170" width="40" height="280" fill="var(--color-card2)" />
                        <line x1="195" y1="50" x2="195" y2="100" stroke="var(--color-purple)" strokeWidth="3" />
                        <rect x="140" y="100" width="105" height="350" fill="var(--color-card3)" />
                        <rect x="195" y="130" width="38" height="180" fill="url(#glassGrad-car)" />
                        <polygon points="275,250 330,220 330,450 275,450" fill="var(--color-card2)" />
                        <line x1="460" y1="120" x2="460" y2="180" stroke="var(--color-purple)" strokeWidth="2.5" />
                        <polygon points="435,180 460,170 485,180 485,450 435,450" fill="var(--color-card3)" />
                        <line x1="448" y1="200" x2="448" y2="430" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
                        <line x1="472" y1="200" x2="472" y2="430" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
                        <rect x="560" y="220" width="55" height="230" fill="var(--color-card3)" />
                        <rect x="695" y="80" width="105" height="370" fill="var(--color-card2)" />
                        <rect x="710" y="110" width="90" height="340" fill="var(--color-card3)" stroke="var(--color-border)" strokeWidth="0.5" />
                      </g>
                    </svg>
                  }
                  /* Static fallback for mobile viewports, hidden on desktop layout stop */
                  illustrationSlot={
                    <div className="w-full absolute z-20 flex justify-center pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)] lg:hidden">
                      <Carlo className="w-full h-auto max-w-[270px] max-h-50 object-contain" viewBox="0 0 500 800" />
                    </div>
                  }
                />

              </div>
            </div>
          </section>

          {/* Play the Game (Action Cards Section) */}
          <section 
            id="sectionPlay" 
            ref={playSectionRef}
            className="py-16 mx-auto min-h-screen flex flex-col justify-center max-w-6xl px-4"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <h2 
              className="h2-app mb-16 text-center text-[2.5rem] font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Play the Game
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 justify-items-center relative w-full">
              
              {/* ================= CARD 1: ENTER THE ARENA ================= */}
              <HeroCard
                isFlipped={action1Flipped}
                onFlip={() => setAction1Flipped(!action1Flipped)}
                onMouseEnter={() => setaction1Hovered(true)}
                onMouseLeave={() => setaction1Hovered(false)}
                themeColor="var(--color-magenta)"
                themeColorRgba="184, 0, 111"
                chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Phase"
                title="ENTER THE ARENA"
                symbol="01"
                classTitle="Phase: Auction"
                classSymbol="✦"
                classDesc="The initial capital formation event."
                abilities={[
                  { name: "Seed the Prize Pool", desc: "Buy Fake Internet Money ($FIM) with $USDC." }
                ]}
                footerLeftText="Phase 01 Guide"
                footerMiddleText='001 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="intro#phase-1-auction"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20">
                    <HoverGrowingChart isHovered={action1Hovered} />
                  </div>
                }
              />

              {/* ================= CARD 2: OUTPLAY THE MARKET ================= */}
              <HeroCard
                isFlipped={action2Flipped}
                onFlip={() => setAction2Flipped(!action2Flipped)}
                onMouseEnter={() => setaction2Hovered(true)}
                onMouseLeave={() => setaction2Hovered(false)}
                themeColor="var(--color-magenta)"
                themeColorRgba="184, 0, 111"
                chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Phase"
                title="OUTPLAY MARKET"
                symbol="02"
                classTitle="Phase: Trading"
                classSymbol="✦"
                classDesc="The marketplace to shift wealth distribution."
                abilities={[
                  { name: "Trade", desc: "Trade $FIM with players to shift the wealth distribution." },
                  { name: "Coordinate", desc: "Coordinate with your Faction. Who you trade with matters." }
                ]}
                footerLeftText="Phase 02 Guide"
                footerMiddleText='002 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="intro#phase-2-trading"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20">
                    <HoverChordChart isHovered={action2Hovered} />
                  </div>
                }
              />

              {/* ================= CARD 3: ENFORCE YOUR IDEOLOGY ================= */}
              <HeroCard
                isFlipped={action3Flipped}
                onFlip={() => setAction3Flipped(!action3Flipped)}
                onMouseEnter={() => setaction3Hovered(true)}
                onMouseLeave={() => setaction3Hovered(false)}
                themeColor="var(--color-magenta)"
                themeColorRgba="184, 0, 111"
                chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Phase"
                title="ENFORCE IDEOLOGY"
                symbol="03"
                classTitle="Phase: Payout"
                classSymbol="✦"
                classDesc="The final resolution and distribution."
                abilities={[
                  { name: "TAKEOVER", desc: "Shift the wealth distribution in favor of your faction." },
                  { name: "Dictate", desc: "Set the payout rules: Bailout or Wealth Tax" }
                ]}
                footerLeftText="Phase 03 Guide"
                footerMiddleText='003 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="intro#phase-3-victory-and-payouts"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  /* Changed pointer-events-none to pointer-events-auto to enable mouse interactions */
                  <div className="w-full h-full flex justify-center items-center pointer-events-auto drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <AnimatedGiniCard isHovered={action3Hovered} />
                  </div>
                }
              />

            </div>
          </section>

          {/* Own the Project */}
          <section id="sectionOwnMarket" className="py-16 mx-auto min-h-screen flex flex-col justify-center px-4">
            <h2 className="h2-app mb-16 text-center text-[2.5rem] font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Own the Project
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 justify-items-center relative w-full"> 
              
              {/* ================= CARD 1: PLAYER OWNERSHIP ================= */}
              <HeroCard
                isFlipped={own1Flipped}
                onFlip={() => setOwn1Flipped(!own1Flipped)}
                themeColor="var(--color-orange)"
                themeColorRgba="249, 115, 22"
                chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Governance"
                title="PLAYER OWNERSHIP"
                symbol={<span className="font-sans text-xs">⚖</span>}
                classTitle="Type: DAO"
                classSymbol={<span className="font-sans text-xs">✦</span>}
                classDesc="No company. No rigged outcomes."
                abilities={[
                  { name: "Absolute Control", desc: "Regarded Token holders govern the game and DAO treasury." }
                ]}
                footerLeftText="Ownership Guide"
                footerMiddleText='001 / 003'
                footerRightText="Doc. Reference ↗"
                footerTextColor="rgba(255, 255, 255, 0.6)"
                backInfoLink="intro#5-governance"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="w-full h-full flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <FIM1 viewBox="0 0 850 850" className="w-[60%] h-auto max-w-[140px]" />
                  </div>
                }
              />

              {/* ================= CARD 2: VALUE ACCRUAL ================= */}
              <HeroCard
                isFlipped={own2Flipped}
                onFlip={() => setOwn2Flipped(!own2Flipped)}
                themeColor="var(--color-orange)"
                themeColorRgba="249, 115, 22"
                chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Governance"
                title="VALUE ACCRUAL"
                symbol="$"
                classTitle="Type: Yield"
                classSymbol="✦"
                classDesc="Prize Pool defi yield flows to holders."
                abilities={[
                  { name: "Revenue Streams", desc: "Value flows via deflationary buybacks, liquidity injections, or Prize Pool Bonuses." }
                ]}
                footerLeftText="Economics Guide"
                footerMiddleText='002 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="intro#revenue-allocation"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="w-full h-full flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <FIM1 viewBox="0 0 850 850" className="w-[60%] h-auto max-w-[140px]" />
                  </div>
                }
              />

              {/* ================= CARD 3: MARKET 3.0 ================= */}
              <HeroCard
                isFlipped={own3Flipped}
                onFlip={() => setOwn3Flipped(!own3Flipped)}
                themeColor="var(--color-orange)"
                themeColorRgba="249, 115, 22"
                chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Governance"
                title="MARKET 3.0"
                symbol="∞"
                classTitle="Type: Paradigm"
                classSymbol="✦"
                classDesc="Challenge the status quo of web3 and finance."
                abilities={[
                  { name: "Build the Future", desc: "Help build a new paradigm for people-owned, people-governed economies." }
                ]}
                footerLeftText="Vision Guide"
                footerMiddleText='003 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="mission"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="w-full h-full flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <FIM1 viewBox="0 0 850 850" className="w-[60%] h-auto max-w-[140px]" />
                  </div>
                }
              />
            </div>
          </section>

          {/* Distribution of Power */}
          <section id="sectionDistribution" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <div className="flex flex-col gap-10">
              <NestedPieChart data={tableData} />
            </div>
          </section>

          {/* Campaign Sequence */}
          <section id="sectionCampaign" className="py-16 mx-auto min-h-screen flex flex-col justify-center">
            <h2 className="h2-app mb-12 text-center">Campaign Sequence</h2>
            <div className="mx-auto"></div>
          </section>
          
          {/* Secure Your Stake */}
          <section id="sectionSecureYourStake" className="py-16 mx-auto min-h-screen flex flex-col justify-center px-4">
            <h2 className="h2-app text-center mb-16 text-[2.5rem] font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Secure Your Stake
            </h2>
            
            <div className="grid md:grid-cols-2 gap-12 justify-items-center max-w-4xl mx-auto w-full">
              
              {/* ================= STAKE CARD 1: CAPITAL AUCTION ================= */}
              <HeroCard
                isFlipped={stake1Flipped}
                onFlip={() => setStake1Flipped(!stake1Flipped)}
                themeColor="var(--color-sunset, #ff5e62)"
                themeColorRgba="255, 94, 98"
                chassisGradient="linear-gradient(135deg, #4a1525 0%, #b83b5e 25%, #6a1b37 50%, #f08a5d 75%, #2a0815 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Launch"
                title="CAPITAL AUCTION"
                symbol="$"
                classTitle="Launch: ICO"
                classSymbol="✦"
                classDesc="Secure early alignment with the ecosystem."
                abilities={[
                  { name: "Acquisition", desc: "The Regarded Token will be launched in a fair capital auction." },
                  { name: "Supporters", desc: "Early alignment enables deep participation in future governance." }
                ]}
                footerLeftText="Auction Phase"
                footerMiddleText='002 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="http://app.localhost:3000/ico"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-sunset, #ff5e62) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="w-full h-full flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <FIM1 viewBox="0 0 850 850" className="w-[60%] h-auto max-w-[140px]" />
                  </div>
                }
                actionButtonSlot={
                  <button 
                    onClick={() => window.open('http://app.localhost:3000/ico')}
                    className="w-full py-2.5 px-4 rounded font-black text-[11px] uppercase tracking-widest text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 text-black hover:opacity-90 shadow-md"
                    style={{ backgroundColor: 'var(--color-sunset, #ff5e62)' }}
                  >
                    Capital Auction
                  </button>
                }
              />

              {/* ================= STAKE CARD 2: TESTNET QUESTS ================= */}
              <HeroCard
                isFlipped={stake2Flipped}
                onFlip={() => setStake2Flipped(!stake2Flipped)}
                themeColor="var(--color-sunset, #ff5e62)"
                themeColorRgba="255, 94, 98"
                chassisGradient="linear-gradient(135deg, #4a1525 0%, #b83b5e 25%, #6a1b37 50%, #f08a5d 75%, #2a0815 100%)"
                maxWidth="340px"
                height="540px"
                titleSize="text-base"
                headerTag="Earn"
                title="TESTNET QUESTS"
                symbol="⚒"
                classTitle="Campaign: Quests"
                classSymbol="✦"
                classDesc="Ecosystem deployment trials and testing."
                abilities={[
                  { name: "Activity", desc: "Complete quests and play on Testnet to accumulate campaign score." },
                  { name: "TGE Conversion", desc: "Campaign points translate to utility tokens on TGE." }
                ]}
                footerLeftText="Campaign Phase"
                footerMiddleText='002 / 003'
                footerRightText="Doc. Reference ↗"
                backInfoLink="http://app.sepolia.localhost:3000/quests"
                backgroundSlot={
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-sunset, #ff5e62) 0%, transparent 70%)' }} />
                }
                illustrationSlot={
                  <div className="w-full h-full flex justify-center items-center pointer-events-none drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
                    <FIM1 viewBox="0 0 850 850" className="w-[60%] h-auto max-w-[140px]" />
                  </div>
                }
                actionButtonSlot={
                  <button 
                    onClick={() => window.open('http://app.sepolia.localhost:3000/quests')}
                    className="w-full py-2.5 px-4 rounded font-black text-[11px] uppercase tracking-widest text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 text-black hover:opacity-90 shadow-md"
                    style={{ backgroundColor: 'var(--color-sunset, #ff5e62)' }}
                  >
                    Quest Board
                  </button>
                }
              />

            </div>
          </section>
          
        </div>
      </main>
    </div>
  );
}