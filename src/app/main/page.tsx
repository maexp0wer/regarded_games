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
import { AuctionChart } from '@/app/app/_components/AuctionChart';
import { TradeFlows } from '@/app/app/_components/TradeFlows';
import Skyline from '@/components/icons/Skyline';

interface AuctionPoint {
  time: number;
  prizePool?: number;
  mintVolume?: number;
}

// 1. Updated labels dividing the wealth spectrum systematically from richest to poorest
const CLASS_GROUPS_20 = [
  // 10 Capitalist Factions (Indices 0 - 9)
  // 10 Capitalist Factions (Indices 0 - 9) - Corrected Order
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

  // 10 Protelarian Factions (Indices 10 - 19)
  { isCapitalist: false, label: 'Protelarians 9%-0%', playerCount: 320 },
  { isCapitalist: false, label: 'Protelarians 19%-10%', playerCount: 410 },
  { isCapitalist: false, label: 'Protelarians 29%-20%', playerCount: 550 },
  { isCapitalist: false, label: 'Protelarians 39%-30%', playerCount: 680 },
  { isCapitalist: false, label: 'Protelarians 49%-40%', playerCount: 820 },
  { isCapitalist: false, label: 'Protelarians 59%-50%', playerCount: 950 },
  { isCapitalist: false, label: 'Protelarians 69%-60%', playerCount: 1100 },
  { isCapitalist: false, label: 'Protelarians 79%-70%', playerCount: 1350 },
  { isCapitalist: false, label: 'Protelarians 89%-80%', playerCount: 1600 },
  { isCapitalist: false, label: 'Protelarians 100%-90%', playerCount: 2500 }, // Poorest
];

const getPercentilePosition = (i: number): number => {
  if (i < 10) {
    // Capitalists (Indices 0 to 9) map to 200% down to 100%
    // Index 0 (richest) is 195%, Index 9 (poorest capitalist) is 105%
    return 195 - i * 10;
  } else {
    // Protelarians (Indices 10 to 19) map to 100% down to 0%
    // Index 10 (richest proletarian) is 95%, Index 19 (poorest) is 5%
    return 95 - (i - 10) * 10;
  }
};

// 2. Generates the 20x20 matrix using a continuous 200% decay threshold
// 1. Streamlined Matrix Generator: Fully populates every single trade pathway (r !== c) with no decay
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
          baseVal = Math.floor(1100 + Math.sin(r * c) * 450); // Robust intra-capitalist flow
        } else if (!isCapR && !isCapC) {
          baseVal = Math.floor(1300 + Math.cos(r + c) * 500); // Robust intra-proletarian flow
        } else {
          baseVal = Math.floor(650 + Math.sin(r - c) * 250);  // Robust inter-class flow (guarantees cross-gap trading)
        }
        
        // Ensure a healthy minimum of 120 FIM so all 380 pathways can draw if active
        row.push(Math.max(120, baseVal));
      }
    }
    matrix.push(row);
  }
  return matrix;
};

const BASE_FLOW_MATRIX_20 = generateBase20Matrix();

// 2. Partitioned Picker: Collects top flows across all sectors to draw a balanced, dense network
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

  // Take a generous, balanced sample from all pathways (total of 32 connections)
  // to build a dense, beautiful mesh of ribbons
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

  // Default resting state displays the fully completed network
  useEffect(() => {
    setMatrix(BASE_FLOW_MATRIX_20);
  }, []);

  useEffect(() => {
    if (!isHovered) {
      setMatrix(BASE_FLOW_MATRIX_20);
      activeConnIndexRef.current = -1;
      return;
    }

    // Initialize: Clear all ribbons to absolute 0s (no inner lines on load)
    const emptyState = BASE_FLOW_MATRIX_20.map(row => row.map(() => 0));
    currentMatrixRef.current = emptyState;
    setMatrix(emptyState);

    // Fetch the balanced, multi-faction transaction sequence
    const topConns = getTopConnections(BASE_FLOW_MATRIX_20);
    queueRef.current = topConns;
    
    activeConnIndexRef.current = 0;
    currentGrowthValueRef.current = 0;
    tickCountRef.current = 0;

    const interval = setInterval(() => {
      tickCountRef.current += 1;
      const t = tickCountRef.current;
      const connIdx = activeConnIndexRef.current;

      // 2. STOP RESET AND PREVENT REPLAY: Once all connections are fully built, just pulse completed shapes
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
        return; // Exits loop tick early, staying built and pulsing indefinitely
      }

      // ACTIVE DRAWING STEP: Process exactly ONE ribbon at a time
      const { r, c, target } = queueRef.current[connIdx];
      
      const step = Math.max(100, Math.floor(target / 6));
      const nextVal = Math.min(target, currentGrowthValueRef.current + step);
      currentGrowthValueRef.current = nextVal;

      // Reassemble the composite matrix state
      const updated = currentMatrixRef.current.map((row, rowIndex) =>
        row.map((val, colIndex) => {
          if (rowIndex === r && colIndex === c) {
            return nextVal; // Active growing ribbon
          }
          
          // Apply a subtle ambient transaction pulse to already completed ribbons
          const isAlreadyBuilt = queueRef.current.slice(0, connIdx).some(q => q.r === rowIndex && q.c === colIndex);
          if (isAlreadyBuilt) {
            const targetVal = BASE_FLOW_MATRIX_20[rowIndex][colIndex];
            const breathing = 1 + Math.sin(t / 8 + rowIndex * colIndex) * 0.03;
            return Math.floor(targetVal * breathing);
          }
          
          return val; // Future locked ribbons (held strictly at 0)
        })
      );

      currentMatrixRef.current = updated;
      setMatrix(updated);

      // Proceed to drawing the next single transaction once target is hit
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
  const [card1Hovered, setCard1Hovered] = useState(false);
  const [card2Hovered, setCard2Hovered] = useState(false);




interface AuctionPoint {
  time: number;
  prizePool: number;
  mintVolume: number;
}

// Generates simulated base historical data
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
          .mini-chart-view .terminal-pane > div:first-child {
  display: none !important;
}
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
    {/* 
      REGARDO FRONT SIDE 
      - Swaps pointer events dynamically when flipped so front layers cannot block back side clicks [1].
    */}
    <div 
      className={`absolute inset-0 w-full h-full rounded-lg shadow-[0_0_40px_rgba(212,175,55,0.2)] ${regardoFlipped ? 'pointer-events-none' : ''}`}
      style={{ 
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Thick Outer Obsidian Border */}
      <div 
        className="flex flex-col h-full w-full rounded-lg p-2.5 shadow-lg relative select-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]"
        style={{
          backgroundColor: '#070709', 
          border: '0px solid #101014', 
        }}
      >
        {/* Sophisticated "Structured Gold" Card Chassis */}
        <div 
          className="flex flex-col h-full w-full rounded-lg p-2 justify-between border relative overflow-visible"
          style={{ 
            background: 'linear-gradient(135deg, #7c6225 0%, #dfc482 25%, #977636 50%, #ebdba4 75%, #6a501c 100%)',
            borderColor: 'rgba(212, 175, 55, 0.55)', 
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)', 
          }}
        >
          {/* Subtle paper-fiber/metallic grain overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)'
            }}
          />
          <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

          {/* Content Containers Stack */}
          <div className="flex flex-col h-full justify-between space-y-1.5 z-10 overflow-visible">
            
            {/* 1. Header Container (Sunset Gradient Background) */}
            <div 
              className="flex justify-between items-center px-3 py-1.5 rounded border shadow-md"
              style={{ 
                backgroundColor: 'rgba(12, 12, 15, 0.6)', 
                borderColor: 'rgba(171, 71, 188, 0.25)' 
              }}
            >
              <div className="flex flex-col">
                <span 
                  className="text-[8px] uppercase font-black tracking-widest text-gold"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Basic Hero
                </span>
                <h3 
                  className="text-lg font-black tracking-wide leading-tight text-text"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Regardo
                </h3>
              </div>
              <div 
                className="w-7 h-7 rounded flex items-center justify-center font-black text-xs border"
                style={{ 
                  backgroundColor: 'rgba(25, 25, 30, 0.95)', 
                  borderColor: 'var(--color-gold)', 
                  color: 'var(--color-gold-hover)' 
                }}
              >
                $
              </div>
            </div>

            {/* 2. Character Frame (Art Box - overflow-visible allows pop-out animation) */}
            <div 
              className="w-full h-72 border rounded-xl relative overflow-visible flex items-center justify-center shadow-inner"
              style={{ 
                backgroundColor: 'rgba(212, 175, 55, 0.08)', 
                borderColor: 'rgba(212, 175, 55, 0.3)' 
              }}
            >
              {/* Skyline Background with Gold Accents */}
              <div className="absolute inset-0 z-0 rounded-lg overflow-hidden">
                <svg 
                  viewBox="0 0 800 450" 
                  preserveAspectRatio="none"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                >
                  <defs>
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-bg, #070709)" />
                      <stop offset="100%" stopColor="var(--color-card, #121216)" />
                    </linearGradient>
                    <linearGradient id="goldGlass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect width="800" height="450" fill="url(#skyGrad)" />
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
                    <rect x="195" y="130" width="38" height="180" fill="url(#goldGlass)" />
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
              </div>

              {/* Internal framing elements */}
              <div className="absolute inset-1 border border-white/5 pointer-events-none rounded z-10" />
              <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-white/20 z-10" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-white/20 z-10" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-white/20 z-10" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-white/20 z-10" />
              
              <motion.div
                style={{
                  y: yTransform,
                  x: xRegardo,
                  opacity: opacityTransform,
                  scale: scaleTransform,
                }}
                className="w-full absolute z-20 flex justify-center pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)]"
              >
                <Regardo className="w-full h-auto max-w-[270px] max-h-50 object-contain" viewBox="0 0 500 800" />
              </motion.div>
            </div>



            {/* 3. Class/Type Line Bar with Description Repositioned Underneath (Aligned with Carlo's layout) */}
            <div 
              className="border rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm text-left"
              style={{ 
                backgroundColor: 'rgba(12, 12, 15, 0.92)', 
                borderColor: 'rgba(212, 175, 55, 0.25)' 
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span 
                  className="text-[12px] font-semibold uppercase tracking-wider text-text font-mono "
                >
                  Class: Capitalist
                </span>
                <span className="text-[10px] text-[var(--color-gold-hover)]">★</span>
              </div>
              <p 
                className="text-[11px] leading-relaxed italic border-t border-border pt-1.5"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
              >
                "the smallest number of players collectively holding 50% of the supply."
              </p>
            
              {/* Ability Mechanics */}
              <div className="space-y-1.5 text-left overflow-y-auto pr-1">
                <div>
                  <span 
                    className="font-bold text-[12px] uppercase tracking-wider mr-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-hover)' }}
                  >
                    Concentrate Capital:
                  </span>
                  <span 
                    className="text-[11px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
                  >
                    push the economy toward perfect inequality.
                  </span>
                </div>

                <div>
                  <span 
                    className="font-bold text-[12px] uppercase tracking-wider mr-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-hover)' }}
                  >
                    BAILOUT:
                  </span>
                  <span 
                    className="text-[11px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
                  >
                    Split the entire prize pool. Proletarians get nothing.
                  </span>
                </div>
              </div>

              
            </div>

            
            <div className="flex justify-between items-center mt-0.5 px-1 text-[9px] font-mono text-bg rounded opacity-80">
              <span>Faction 01 Guide</span>
              <span>Doc. Reference ↗</span>
            </div>

          </div>
        </div>
      </div>
    </div>

    {/* 
      REGARDO BACK SIDE 
      - Swaps pointer events dynamically when NOT flipped so it never blocks front side clicks [1].
    */}
    <div 
      className={`absolute inset-0 w-full h-full ${!regardoFlipped ? 'pointer-events-none' : ''}`}
      style={{ 
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: "rotateY(180deg)" 
      }}
    >
      <div 
        className="flex flex-col h-full w-full rounded-2xl border-[8px] border-[var(--color-border2)] p-3 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-gold)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]" 
        style={{ 
          backgroundColor: 'var(--color-card)',
        }}
      >
        <div 
          className="w-full flex-grow rounded-xl border p-6 relative flex flex-col items-center justify-between overflow-hidden"
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
                
                {/* Round Info Link Button (Styled in Gold) */}
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
    {/* 
      CARLO FRONT SIDE 
      - Added dynamic pointer-events-none when flipped so it never blocks the back side [1]
    */}
    <div 
      className={`absolute inset-0 w-full h-full ${carloFlipped ? 'pointer-events-none' : ''}`}
      style={{ 
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Thick Outer Obsidian Border */}
      <div 
        className="flex flex-col h-full w-full rounded-2xl p-2.5 shadow-2xl relative select-none transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(106,27,154,0.3)]"
        style={{
          backgroundColor: '#070709', 
          border: '10px solid #101014', 
        }}
      >
        {/* Sophisticated "Structured Purple" Card Chassis */}
        <div 
          className="flex flex-col h-full w-full rounded-lg p-2 justify-between border relative overflow-visible"
          style={{ 
            background: 'linear-gradient(135deg, #2e0854 0%, #7b1fa2 25%, #3f0c70 50%, #ba68c8 75%, #220341 100%)',
            borderColor: 'rgba(171, 71, 188, 0.55)', 
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.65), inset 0 0 3px rgba(255,255,255,0.25)', 
          }}
        >
          {/* Subtle brushed metal lining overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)'
            }}
          />
          <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

          {/* Content Containers Stack */}
          <div className="flex flex-col h-full justify-between space-y-1.5 z-10 overflow-visible">
            
            {/* 1. Header Container */}
            <div 
              className="flex justify-between items-center px-3 py-1.5 rounded border shadow-md"
              style={{ 
                backgroundColor: 'rgba(12, 12, 15, 0.92)', 
                borderColor: 'rgba(171, 71, 188, 0.25)' 
              }}
            >
              <div className="flex flex-col">
                <span 
                  className="text-[8px] uppercase font-black tracking-widest opacity-80"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-purple)' }}
                >
                  Basic Hero
                </span>
                <h3 
                  className="text-lg font-black tracking-wide leading-tight"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  Carlo
                </h3>
              </div>
              <div 
                className="w-7 h-7 rounded flex items-center justify-center font-black text-xs border"
                style={{ 
                  backgroundColor: 'rgba(25, 25, 30, 0.95)', 
                  borderColor: 'var(--color-purple)', 
                  color: 'var(--color-purple)' 
                }}
              >
                ⚒
              </div>
            </div>

            {/* 2. Character Frame (Art Box - h-72 and overflow-visible for pop-out animation) */}
            <div 
              className="w-full h-72 border rounded-xl relative overflow-visible flex items-center justify-center shadow-inner"
              style={{ 
                backgroundColor: 'rgba(171, 71, 188, 0.08)', 
                borderColor: 'rgba(171, 71, 188, 0.3)' 
              }}
            >
              {/* Skyline Background with Purple Accents */}
              <div className="absolute inset-0 z-0 rounded-lg overflow-hidden">
                <svg 
                  viewBox="0 0 800 450" 
                  preserveAspectRatio="none"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                >
                  <defs>
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-bg, #070709)" />
                      <stop offset="100%" stopColor="var(--color-card, #121216)" />
                    </linearGradient>
                    <linearGradient id="purpleGlass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--color-purple)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--color-purple)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect width="800" height="450" fill="url(#skyGrad)" />
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
                    <rect x="195" y="130" width="38" height="180" fill="url(#purpleGlass)" />
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
              </div>

              {/* Internal framing elements */}
              <div className="absolute inset-1 border border-white/5 pointer-events-none rounded z-10" />
              <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-white/20 z-10" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-white/20 z-10" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-white/20 z-10" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-white/20 z-10" />
              
              <motion.div
                style={{
                  y: yTransform,
                  x: xCarlo,
                  opacity: opacityTransform,
                  scale: scaleTransform,
                }}
                className="w-full absolute z-20 flex justify-center pointer-events-none drop-shadow-[0_12px_12px_rgba(22,18,36,0.35)]"
              >
                <Carlo className="w-full h-auto max-w-[270px] max-h-50 object-contain" viewBox="0 0 500 800" />
              </motion.div>
            </div>

            {/* 3. Class/Type Line Bar with Description Repositioned Underneath */}
            <div 
              className="border rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm text-left"
              style={{ 
                backgroundColor: 'rgba(12, 12, 15, 0.92)', 
                borderColor: 'rgba(171, 71, 188, 0.25)' 
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span 
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
                >
                  Class: Proletariat
                </span>
                <span className="text-[10px] text-[var(--color-purple)]">⚒</span>
              </div>
              <p 
                className="text-[10px] leading-relaxed italic opacity-75 border-t border-white/5 pt-1.5"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
              >
                "the largest number of players collectively holding 50% of the supply."
              </p>
            </div>

            {/* 4. Rules/Ability Text Box */}
            <div 
              className="relative border rounded-lg p-3 flex-grow flex flex-col justify-start overflow-hidden shadow-md"
              style={{ 
                backgroundColor: 'rgba(12, 12, 15, 0.92)', 
                borderColor: 'rgba(171, 71, 188, 0.25)' 
              }}
            >
              {/* Ability Mechanics */}
              <div className="space-y-1.5 text-left overflow-y-auto pr-1">
                <div>
                  <span 
                    className="font-bold text-[9.5px] uppercase tracking-wider mr-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}
                  >
                    Coordinate Masses:
                  </span>
                  <span 
                    className="text-[10px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
                  >
                    push the economy toward perfect distribution.
                  </span>
                </div>

                <div>
                  <span 
                    className="font-bold text-[9.5px] uppercase tracking-wider mr-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}
                  >
                    Wealth Tax:
                  </span>
                  <span 
                    className="text-[10px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text2)' }}
                  >
                    Capitalist payouts are capped and the surplus flows to you.
                  </span>
                </div>
              </div>

              {/* Overlapping Stat Box */}
              <div 
                className="absolute bottom-[-1px] right-[-1px] px-3.5 py-1 border-t border-l rounded-tl-md font-mono text-[10px] font-black tracking-widest shadow-md"
                style={{ 
                  backgroundColor: 'rgba(25, 25, 30, 0.98)', 
                  borderColor: 'rgba(171, 71, 188, 0.35)',
                  color: 'var(--color-purple)'
                }}
              >
                HP 99M
              </div>
            </div>

            {/* 5. Footer */}
            <div 
              className="flex justify-between items-center px-1 text-[8px] tracking-wider uppercase opacity-80"
              style={{ fontFamily: 'var(--font-mono)', color: '#101014' }} 
            >
              <span>Illus. Game Engine</span>
              <span>002 / 002 ★</span>
            </div>

          </div>
        </div>
      </div>
    </div>

    {/* 
      CARLO BACK SIDE 
      - Added dynamic pointer-events-none when NOT flipped so it never intercepts clicks on the front side [1]
    */}
    <div 
      className={`absolute inset-0 w-full h-full ${!carloFlipped ? 'pointer-events-none' : ''}`}
      style={{ 
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: "rotateY(180deg)" 
      }}
    >
      <div 
        className="flex flex-col h-full w-full rounded-2xl border-[8px] border-[var(--color-border2)] p-3 shadow-xl justify-between transition-all duration-300 group-hover:border-[var(--color-purple)] group-hover:shadow-[0_0_30px_rgba(106,27,154,0.45)]" 
        style={{ 
          backgroundColor: 'var(--color-card)',
        }}
      >
        <div 
          className="w-full flex-grow rounded-xl border p-6 relative flex flex-col items-center justify-between overflow-hidden"
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
                
                {/* Round Info Link Button with Stopped Propagation */}
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
  onMouseEnter={() => setCard1Hovered(true)}
  onMouseLeave={() => setCard1Hovered(false)}
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

        {/* Illustration Frame — SWAPPED TO ANIMATED CHART */}
        <div 
          className="w-full h-48 border-4 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner mb-2"
          style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-lg z-10" style={{ backgroundColor: 'rgba(184, 0, 111, 0.05)' }} />
          <div className="w-full h-full p-0 overflow-hidden">
            <HoverGrowingChart isHovered={card1Hovered} />
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

    {/* =========={/* ================= CARD 2: OUTPLAY THE MARKET ================= */}
    <div 
      className="w-full max-w-[340px] h-[540px] relative group" 
      style={{ perspective: 1200 }} 
      onMouseEnter={() => setCard2Hovered(true)}
      onMouseLeave={() => setCard2Hovered(false)}
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

            {/* Illustration Frame — SWAPPED TO MORPHING CHORD CHART */}
            <div 
              className="w-full h-48 border-4 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner mb-2"
              style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-border2)' }}
            >
              <div className="absolute inset-0 pointer-events-none rounded-lg z-10" style={{ backgroundColor: 'rgba(184, 0, 111, 0.05)' }} />
              <div className="w-full h-full overflow-hidden">
                <HoverChordChart isHovered={card2Hovered} />
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