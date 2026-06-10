// src/components/RulebookCard.tsx
"use client";

import React, { useState } from 'react';

interface RulebookCardProps {
  themeColor: string;           
  themeColorHover?: string;     
  themeColorRgba: string;       
  chassisGradient: string;      
  
  headerTag: string;
  title: string;
  symbol: React.ReactNode; 
  
  footerLeftText: string;
  footerMiddleText: string;
  footerRightText: string;
  footerTextColor?: string; 
  
  maxWidth?: string;
  minHeight?: string;

  illustrationSlot: React.ReactNode; 
  detailsSlot: React.ReactNode;      
}

export default function RulebookCard({
  themeColor,
  themeColorHover,
  themeColorRgba,
  chassisGradient,
  headerTag,
  title,
  symbol,
  footerLeftText,
  footerMiddleText,
  footerRightText,
  footerTextColor, 
  maxWidth = '880px',
  minHeight = '680px',
  illustrationSlot,
  detailsSlot
}: RulebookCardProps) {
  const [isCardHovered, setIsCardHovered] = useState(false);
  const highlightColor = themeColorHover || themeColor;

  return (
    <div 
      className="w-full relative group mx-auto transition-all duration-300" 
      style={{ maxWidth, minHeight }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Outer black bezel padding set to tight 1px offset */}
      <div 
        className="flex flex-col h-full w-full rounded-md p-[1px] relative select-none transition-all duration-500"
        style={{ 
          backgroundColor: '#070709', 
          boxShadow: isCardHovered 
            ? `0 0 45px rgba(${themeColorRgba}, 0.45)`
            : `0 0 30px rgba(${themeColorRgba}, 0.12)`
        }}
      >
        {/* Chassis Gradient frame set to ultra-thin p-[2px] bezel */}
        <div 
          className="flex flex-col h-full w-full rounded-md p-[2px] justify-between border relative overflow-visible"
          style={{ 
            background: chassisGradient,
            borderColor: `rgba(${themeColorRgba}, 0.55)`, 
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)', 
          }}
        >
          {/* Overlay Grid Scanlines */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
          />
          <div className="absolute inset-[0.5px] border border-black/15 rounded pointer-events-none" />

          {/* Unified Content with compact gap spacing */}
          <div className="flex flex-col h-full justify-between gap-1.5 z-10 overflow-visible p-1">
            
            {/* Header (Full Width) */}
            <div 
              className="flex justify-between items-center px-2.5 py-1 rounded border shadow-md transition-colors duration-300"
              style={{ backgroundColor: 'rgba(12, 12, 15, 0.6)', borderColor: `rgba(${themeColorRgba}, 0.25)` }}
            >
              <div className="flex flex-col">
                <span className="text-[7.5px] uppercase font-black tracking-widest font-mono" style={{ color: themeColor }}>
                  {headerTag}
                </span>
                <h3 className="text-md font-black tracking-widest leading-tight uppercase text-text">
                  {title}
                </h3>
              </div>
              <div 
                className="w-6.5 h-6.5 rounded flex items-center justify-center font-black text-[10px] border"
                style={{ backgroundColor: 'rgba(25, 25, 30, 0.95)', borderColor: themeColor, color: highlightColor }}
              >
                {symbol}
              </div>
            </div>

            {/* Tightened Dual-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-grow items-stretch">
              
              {/* Left Column: Graphic Frame */}
              <div className="md:col-span-6 flex flex-col h-full">
                <div 
                  className="w-full h-full min-h-[300px] md:min-h-0 border rounded-sm relative overflow-visible flex items-center justify-center shadow-inner flex-grow"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: `rgba(${themeColorRgba}, 0.3)` }}
                >
                  <div className="absolute inset-0.5 border border-white/5 pointer-events-none rounded z-30" />
                  
                  {/* Decorative Corners */}
                  <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 border-t border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 border-t border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-0.5 left-0.5 w-2.5 h-2.5 border-b border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-b border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  
                  <div className="absolute inset-0 w-full h-full z-10 p-1">
                    {illustrationSlot}
                  </div>
                </div>
              </div>

              {/* Right Column: Technical Details */}
              <div className="md:col-span-6 flex flex-col h-full">
                <div 
                  className="border rounded-md p-3 flex flex-col gap-1 shadow-sm text-left h-full justify-start flex-grow relative overflow-hidden"
                  style={{ backgroundColor: 'rgba(12, 12, 15, 0.92)', borderColor: `rgba(${themeColorRgba}, 0.25)` }}
                >
                  {detailsSlot}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div 
              className="flex justify-between items-center px-1 text-[8px] font-mono rounded opacity-80 pt-0.5"
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
  );
}