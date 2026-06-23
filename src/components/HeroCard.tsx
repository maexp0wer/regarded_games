// src/components/HeroCard.tsx
import { motion } from 'framer-motion';
import React, { useState } from 'react';

interface HeroCardProps {
  isFlipped: boolean;
  onFlip: () => void;
  
  // Theming
  themeColor: string;           
  themeColorHover?: string;     
  themeColorRgba: string;       
  chassisGradient: string;      
  
  // Content (Made optional to support the bottomBoxSlot custom override)
  headerTag: string;
  title: string;
  symbol: React.ReactNode; 
  classTitle?: string;
  classSymbol?: React.ReactNode;
  classDesc?: string;
  abilities?: { name: string; desc: string }[];
  footerLeftText: string;
  footerMiddleText: string;
  footerRightText: string;
  footerTextColor?: string; 
  backInfoLink: string;
  
  // Sizing & Events
  maxWidth?: string;
  height?: string;
  imageHeight?: string;
  titleSize?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;

  // New Slots for custom layouts
  actionButtonSlot?: React.ReactNode;
  bottomBoxSlot?: React.ReactNode; // Overrides the default abilities box

  // Slots for custom graphics
  backgroundSlot?: React.ReactNode; 
  illustrationSlot: React.ReactNode; 
}

export default function HeroCard({
  isFlipped,
  onFlip,
  themeColor,
  themeColorHover,
  themeColorRgba,
  chassisGradient,
  headerTag,
  title,
  symbol,
  classTitle = '',
  classSymbol = '',
  classDesc = '',
  abilities = [],
  footerLeftText,
  footerMiddleText,
  footerRightText,
  footerTextColor, 
  backInfoLink,
  maxWidth = '400px',
  height = '580px',
  imageHeight = 'h-[48%]',
  titleSize = 'text-2xl',
  onMouseEnter,
  onMouseLeave,
  actionButtonSlot,
  bottomBoxSlot,
  backgroundSlot,
  illustrationSlot
}: HeroCardProps) {
  const [isCardHovered, setIsCardHovered] = useState(false);
  const highlightColor = themeColorHover || themeColor;

  const handleMouseEnter = () => {
    setIsCardHovered(true);
    if (onMouseEnter) onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsCardHovered(false);
    if (onMouseLeave) onMouseLeave();
  };

  return (
    <div 
      className="w-full relative group mx-auto" 
      style={{ perspective: 1200, maxWidth, height }} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative cursor-pointer"
        onClick={onFlip}
      >
        {/* ================= FRONT SIDE ================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-md ${isFlipped ? 'pointer-events-none' : ''}`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-md p-3 relative select-none transition-all duration-500"
            style={{
              backgroundColor: '#070709',
              border: '0px solid #101014',
              boxShadow: isCardHovered
                ? `0 0 40px rgba(${themeColorRgba}, 0.5)`
                : `0 0 40px rgba(${themeColorRgba}, 0.15)`
            }}
          >
            <div
              className="flex flex-col h-full w-full rounded-md p-2.5 justify-between border relative overflow-visible"
              style={{ 
                background: chassisGradient,
                borderColor: `rgba(${themeColorRgba}, 0.55)`, 
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)', 
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
              />
              <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

              <div className="flex flex-col h-full justify-between space-y-2 z-10 overflow-visible">
                
                {/* 1. Header */}
                <div 
                  className="flex justify-between items-center px-4 py-2 rounded border shadow-md transition-colors duration-300"
                  style={{ backgroundColor: 'rgba(12, 12, 15, 0.6)', borderColor: `rgba(${themeColorRgba}, 0.25)` }}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono" style={{ color: themeColor }}>
                      {headerTag}
                    </span>
                    <h3 className={`${titleSize} font-black tracking-widest leading-tight uppercase text-white`}>
                      {title}
                    </h3>
                  </div>
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center font-black text-[15px] border"
                    style={{ backgroundColor: 'rgba(25, 25, 30, 0.95)', borderColor: themeColor, color: highlightColor }}
                  >
                    {symbol}
                  </div>
                </div>

                {/* 2. Character / Graphic Frame */}
                <div 
                  className={`w-full ${imageHeight} border rounded-sm relative overflow-visible flex items-center justify-center shadow-inner`}
                  style={{ backgroundColor: '#0D0B14', borderColor: `rgba(${themeColorRgba}, 0.3)` }}
                >
                  {backgroundSlot && (
                    <div className="absolute inset-0 z-0 rounded-md overflow-hidden">
                      {backgroundSlot}
                    </div>
                  )}

                  <div className="absolute inset-1 border border-white/5 pointer-events-none rounded z-30" />
                  
                  <div className="absolute top-1 left-1 w-3 h-3 border-t border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />

                  {/* Backface-culled wrapper: keeps the illustration/icon flipping WITH the front face.
                      backface-visibility is per-element (not inherited), so the icon layer needs its own
                      flag to be hidden once the card rotates past 90deg. */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                  >
                    {illustrationSlot}
                  </div>
                </div>

                {/* 3. Class/Type Box */}
                {bottomBoxSlot ? (
                  bottomBoxSlot
                ) : (
                  <div 
                    className="border rounded-md p-3 flex flex-col gap-2 shadow-sm text-left flex-grow justify-start"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: `rgba(${themeColorRgba}, 0.25)` }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[14px] font-semibold uppercase tracking-wider text-white font-mono">
                        {classTitle}
                      </span>
                      <span className="text-[13px]" style={{ color: highlightColor }}>{classSymbol}</span>
                    </div>
                    {classDesc && (
                      <p className="text-[13px] leading-relaxed italic border-t pt-1.5" style={{ borderColor: '#251F3D', fontFamily: 'var(--font-sans)', color: '#9E97BD' }}>
                        &ldquo;{classDesc}&rdquo;
                      </p>
                    )}
                  
                    {/* Abilities */}
                    <div className="space-y-1.5 text-left overflow-y-auto pr-1.5 mt-1.5">
                      {abilities.map((ability, index) => (
                        <div key={index}>
                          <span className="font-bold text-[13px] uppercase tracking-wider mr-1" style={{ fontFamily: 'var(--font-display)', color: highlightColor }}>
                            {ability.name}:
                          </span>
                          <span className="text-[13px] leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: '#9E97BD' }}>
                            {ability.desc}
                          </span>
                        </div>
                      ))}
                    </div>

                    {actionButtonSlot && (
                      <div 
                        className="mt-auto pt-2.5 w-full z-20"
                        onClick={(e) => e.stopPropagation()} 
                      >
                        {actionButtonSlot}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Footer */}
                <div 
                  className="flex justify-between items-center px-1.5 text-[11px] font-mono rounded opacity-80 pt-1"
                  style={{ color: footerTextColor || 'rgba(255, 255, 255, 0.6)' }}
                >
                  <span>{footerLeftText}</span>
                  <span>{footerMiddleText}</span>
                  <span>{footerRightText}</span>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ================= BACK SIDE ================= */}
        <div
          className={`absolute inset-0 w-full h-full ${!isFlipped ? 'pointer-events-none' : ''}`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}
        >
          <div 
            className="flex flex-col h-full w-full rounded-md p-3 relative select-none transition-all duration-500"
            style={{
              backgroundColor: '#070709',
              border: '0px solid #101014',
              boxShadow: isCardHovered
                ? `0 0 40px rgba(${themeColorRgba}, 0.5)`
                : `0 0 40px rgba(${themeColorRgba}, 0.15)`
            }}
          >
            <div
              className="flex flex-col h-full w-full rounded-md p-2.5 justify-between border relative overflow-hidden"
              style={{ 
                background: chassisGradient,
                borderColor: `rgba(${themeColorRgba}, 0.55)`, 
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)', 
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
              />
              <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

              <div 
                className="w-full grow rounded-sm border p-7 relative flex flex-col items-center justify-between overflow-hidden shadow-inner z-10"
                style={{ backgroundColor: '#1F1A30', borderColor: '#251F3D' }}
              >
                {/* Background Cross Lines with outer spacing */}
                <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-0.5 opacity-30 pointer-events-none" style={{ backgroundColor: '#9E97BD' }} />
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-3 h-0.5 opacity-30 pointer-events-none" style={{ backgroundColor: '#9E97BD' }} />
                {/* Corners: Updated to rounded-sm to match the container's border radius */}
                <div className="absolute top-1 left-1 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-sm" style={{ borderColor: themeColor }} />
                <div className="absolute top-1 right-1 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-sm" style={{ borderColor: themeColor }} />
                <div className="absolute bottom-1 left-1 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-sm" style={{ borderColor: themeColor }} />
                <div className="absolute bottom-1 right-1 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-sm" style={{ borderColor: themeColor }} />

                {/* Top Text: REGARDED GAMES (split across lines and masks the vertical line) */}
                <div 
                  className="flex flex-col items-center justify-center text-[13px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-5 py-2"
                  style={{ 
                    fontFamily: 'var(--font-mono)', 
                    backgroundColor: '#1F1A30' 
                  }}
                >
                  <div className="opacity-60 flex flex-col items-center gap-1.5" style={{ color: '#9E97BD' }}>
                    <span>REGARDED</span>
                    <span>GAMES</span>
                  </div>
                </div>
                
                {/* Center Circle Graphic */}
<div className="relative flex items-center justify-center z-10 scale-95">
  {/* Pulsing glow behind the card */}
  <div className="absolute w-40 h-40 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: themeColor }} />
  
  {/* Masking wrapper: masks the background lines to create a gap (adjust p-2.5 to increase or decrease the gap) */}
  <div className="p-3 rounded-full" style={{ backgroundColor: '#1F1A30' }}>
    
    <div className="p-[3px] rounded-full shadow-lg" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, rgba(${themeColorRgba}, 0.2) 100%)` }}>
      <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 relative overflow-hidden" style={{ backgroundColor: '#2B2544', borderColor: '#4C3F7A' }}>
        <div className="absolute w-28 h-28 rounded-full border border-dashed opacity-25" style={{ borderColor: '#9E97BD' }} />
        
        <a
          href={backInfoLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-16 h-16 rounded-full flex items-center justify-center border-2 z-10 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
          style={{ backgroundColor: '#161322', borderColor: themeColor, color: highlightColor }}
        >
          <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
        </a>
      </div>
    </div>

  </div>
</div>
                
                {/* Bottom Text: CLASS WARFARE THE GAME (split across lines and masks the vertical line) */}
                <div 
                  className="flex flex-col items-center justify-center text-[13px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-5 py-2"
                  style={{ 
                    fontFamily: 'var(--font-mono)', 
                    backgroundColor: '#1F1A30' 
                  }}
                >
                  <div className="opacity-60 flex flex-col items-center gap-1.5" style={{ color: '#9E97BD' }}>
                    <span>CLASS WARFARE</span>
                    <span>THE GAME</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}