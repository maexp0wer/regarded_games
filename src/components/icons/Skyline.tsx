import React from 'react';

const Skyline = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 800 450" 
      preserveAspectRatio="none"
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        {/* Dynamic Sky Gradient using theme variables */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-bg, #070709)" />
          <stop offset="100%" stopColor="var(--color-card, #121216)" />
        </linearGradient>

        {/* Sophisticated semi-transparent border2 reflection panel */}
        <linearGradient id="border2GlassReflection" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-border2, #c5a059)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-border2, #c5a059)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky Base */}
      <rect width="800" height="450" fill="url(#skyGrad)" />

      {/* ================= LAYER 1: Distant Skyline (Deep Neutral Base) ================= */}
      <g opacity="0.35">
        <rect x="40" y="180" width="85" height="270" fill="var(--color-bg, #070709)" />
        <rect x="200" y="120" width="60" height="330" fill="var(--color-bg, #070709)" />
        <rect x="440" y="100" width="100" height="350" fill="var(--color-bg, #070709)" />
        <rect x="580" y="190" width="90" height="260" fill="var(--color-bg, #070709)" />
      </g>

      {/* ================= LAYER 2: Midground Skyline (Middle Neutral) ================= */}
      <g opacity="0.65">
        {/* Left Spire Building */}
        <line x1="145" y1="120" x2="145" y2="180" stroke="var(--color-border2, rgba(212, 175, 55, 0.2))" strokeWidth="2" />
        <rect x="110" y="180" width="70" height="270" fill="var(--color-card, #121216)" />
        
        {/* Angled Roof Tower */}
        <polygon points="260,200 310,240 310,450 260,450" fill="var(--color-card, #121216)" />

        {/* Tall Midground Spire Tower */}
        <line x1="480" y1="90" x2="480" y2="150" stroke="var(--color-border2, rgba(212, 175, 55, 0.2))" strokeWidth="2.5" />
        <rect x="450" y="150" width="60" height="300" fill="var(--color-card, #121216)" />
        
        {/* Subtle Accent Windows */}
        <line x1="465" y1="165" x2="465" y2="430" stroke="var(--color-border2, #c5a059)" strokeWidth="1.5" strokeDasharray="1,8" opacity="0.35" />
        <line x1="495" y1="165" x2="495" y2="430" stroke="var(--color-border2, #c5a059)" strokeWidth="1.5" strokeDasharray="1,8" opacity="0.35" />

        <rect x="610" y="210" width="80" height="240" fill="var(--color-card, #121216)" />
      </g>

      {/* ================= LAYER 3: Foreground Skyline (The Card2/Card3 Neutrals) ================= */}
      <g>
        {/* --- Building F1 (Far Left, Flat Block) --- */}
        <rect x="0" y="220" width="50" height="230" fill="var(--color-card2, #18181f)" />
        <line x1="15" y1="240" x2="15" y2="430" stroke="var(--color-border2, #dfc482)" strokeWidth="1" strokeDasharray="2,12" opacity="0.25" />
        <line x1="35" y1="240" x2="35" y2="430" stroke="var(--color-border2, #dfc482)" strokeWidth="1" strokeDasharray="2,12" opacity="0.25" />

        {/* --- Building F2 (Left Pillar) --- */}
        <rect x="60" y="170" width="40" height="280" fill="var(--color-card2, #18181f)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        {/* border2 Accent Window Line */}
        <line x1="80" y1="190" x2="80" y2="420" stroke="var(--color-border2, #c5a059)" strokeWidth="1.5" strokeDasharray="1,12" opacity="0.6" />

        {/* --- Building F3 (Tall reflecting Skyscraper with Spire Accent) --- */}
        <line x1="195" y1="50" x2="195" y2="100" stroke="var(--color-border2, #c5a059)" strokeWidth="3" />
        <line x1="210" y1="90" x2="210" y2="100" stroke="var(--color-border2, rgba(212, 175, 55, 0.2))" strokeWidth="2" />
        <rect x="140" y="100" width="105" height="350" fill="var(--color-card3, #202028)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        
        {/* Semi-transparent border2 Glass Reflection Panel */}
        <rect x="195" y="130" width="38" height="180" fill="url(#border2GlassReflection)" />
        
        {/* Regular Window Grid */}
        <line x1="155" y1="120" x2="155" y2="420" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" strokeDasharray="3,9" opacity="0.4" />
        <line x1="175" y1="120" x2="175" y2="420" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" strokeDasharray="3,9" opacity="0.4" />

        {/* --- Building F4 (Center Angled-Cut Tower) --- */}
        <polygon points="275,250 330,220 330,450 275,450" fill="var(--color-card2, #18181f)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        <line x1="290" y1="260" x2="290" y2="430" stroke="var(--color-bg, #070709)" strokeWidth="1.5" strokeDasharray="3,12" opacity="0.6" />
        <line x1="315" y1="250" x2="315" y2="430" stroke="var(--color-bg, #070709)" strokeWidth="1.5" strokeDasharray="3,12" opacity="0.6" />

        {/* --- Building F5 (Center Tall Spire Tower with High-Frequency border2 Accent Lights) --- */}
        <line x1="460" y1="120" x2="460" y2="180" stroke="var(--color-border2, #c5a059)" strokeWidth="2.5" />
        <polygon points="435,180 460,170 485,180 485,450 435,450" fill="var(--color-card3, #202028)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        <line x1="460" y1="180" x2="460" y2="450" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" opacity="0.6" />
        
        {/* Vibrant border2 Window accents */}
        <line x1="448" y1="200" x2="448" y2="430" stroke="var(--color-border2, #c5a059)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
        <line x1="472" y1="200" x2="472" y2="430" stroke="var(--color-border2, #c5a059)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />

        {/* --- Building F6 (Right Low-rise block) --- */}
        <rect x="500" y="260" width="45" height="190" fill="var(--color-card2, #18181f)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        <line x1="522" y1="280" x2="522" y2="430" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" strokeDasharray="1,6" opacity="0.6" />

        {/* --- Building F7 (Polished Mid-Right Tower) --- */}
        <rect x="560" y="220" width="55" height="230" fill="var(--color-card3, #202028)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        <line x1="575" y1="240" x2="575" y2="420" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" strokeDasharray="4,8" opacity="0.6" />
        <line x1="595" y1="240" x2="595" y2="420" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="1.5" strokeDasharray="4,8" opacity="0.6" />

        {/* --- Building F8 (Far Right, Massive Tiered Skyscraper) --- */}
        {/* Tier 1 (Base Layer) */}
        <rect x="680" y="50" width="120" height="400" fill="var(--color-card, #121216)" />
        {/* Tier 2 (Middle Layer) */}
        <rect x="695" y="80" width="105" height="370" fill="var(--color-card2, #18181f)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        {/* Tier 3 (Front Structured Layer) */}
        <rect x="710" y="110" width="90" height="340" fill="var(--color-card3, #202028)" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="0.5" />
        
        {/* Structural window bands on the tiered skyscraper using the border2 accent color */}
        <line x1="725" y1="130" x2="725" y2="430" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="3" strokeDasharray="6,6" opacity="0.8" />
        <line x1="725" y1="130" x2="725" y2="430" stroke="var(--color-border2, #dfc482)" strokeWidth="1.5" strokeDasharray="1,11" opacity="0.75" />
        
        <line x1="750" y1="130" x2="750" y2="430" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="3" strokeDasharray="6,6" opacity="0.8" />
        <line x1="750" y1="130" x2="750" y2="430" stroke="var(--color-border2, #dfc482)" strokeWidth="1.5" strokeDasharray="1,11" opacity="0.75" />

        <line x1="775" y1="130" x2="775" y2="430" stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="3" strokeDasharray="6,6" opacity="0.8" />
        <line x1="775" y1="130" x2="775" y2="430" stroke="var(--color-border2, #dfc482)" strokeWidth="1.5" strokeDasharray="1,11" opacity="0.75" />
      </g>
    </svg>
  );
};

export default Skyline;