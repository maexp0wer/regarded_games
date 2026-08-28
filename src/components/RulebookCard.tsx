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

  /* Printed page number, bottom-right of the page */
  pageNumber?: string;

  footerLeftText: string;
  footerMiddleText: string;
  footerRightText: string;
  footerTextColor?: string;

  maxWidth?: string;
  width?: string;
  minHeight?: string;

  /**
   * When true, skips the outer black bezel and uses a thin chassis border
   * with corner bracket details instead of the thick metallic frame.
   */
  noBezel?: boolean;

  /**
   * When true, suppresses the chassis border entirely — use when the card is
   * embedded inside an outer container that owns the border.
   */
  noBorder?: boolean;

  detailsSlot: React.ReactNode;
}

/**
 * A single page of the game's instruction manual. Shares the HeroCard chassis
 * (black bezel, metallic gradient frame, header plate, footer strip) so it
 * reads as part of the same deck — but the interior is a rulebook page: paper
 * surface, binding shadow along the spine, page-edge stack on the fore-edge
 * and a printed page number.
 */
export default function RulebookCard({
  themeColor,
  themeColorHover,
  themeColorRgba,
  chassisGradient,
  headerTag,
  title,
  symbol,
  pageNumber,
  footerLeftText,
  footerMiddleText,
  footerRightText,
  footerTextColor,
  maxWidth = '440px',
  width,
  minHeight = '560px',
  noBezel = false,
  noBorder = false,
  detailsSlot
}: RulebookCardProps) {
  const [isCardHovered, setIsCardHovered] = useState(false);
  const highlightColor = themeColorHover || themeColor;

  const innerContent = (
    <div className="flex flex-col flex-grow min-h-0 justify-between gap-1.5 z-10">

      {/* Header plate — omitted in noBorder mode (parent wrapper owns the header) */}
      {!noBorder && (
        <div
          className="flex justify-between items-center px-3 py-1.5 rounded border shadow-md transition-colors duration-300"
          style={{
            backgroundColor: noBezel ? 'var(--color-card2)' : 'rgba(12, 12, 15, 0.6)',
            borderColor: `rgba(${themeColorRgba}, 0.25)`
          }}
        >
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black tracking-widest font-mono" style={{ color: themeColor }}>
              {headerTag}
            </span>
            <h3 className="text-md font-black tracking-widest leading-tight uppercase text-text">
              {title}
            </h3>
          </div>
          <div
            className="w-7 h-7 rounded flex items-center justify-center font-black text-xs border"
            style={{
              backgroundColor: noBezel ? 'var(--color-card3)' : 'rgba(25, 25, 30, 0.95)',
              borderColor: themeColor,
              color: highlightColor
            }}
          >
            {symbol}
          </div>
        </div>
      )}

      {/* Rulebook page — in noBorder mode the parent page owns the inset, so the
          gold panel hugs this wrapper and matches the PageFace inner panel */}
      <div className="flex flex-col flex-grow min-h-0">
        <div
          className="relative flex flex-col flex-grow min-h-0 rounded-sm border overflow-hidden shadow-inner border-t-transparent md:border-t-(--rb-panel-border)"
          style={{
            backgroundColor: 'var(--color-card)',
            // Drive border color through a CSS var so the responsive top-color
            // utilities above can win. Mobile drops the top border (the page
            // already supplies top chrome above this embedded panel); desktop
            // restores it. Other three sides always use the var.
            ['--rb-panel-border' as string]: `rgba(${themeColorRgba}, 0.3)`,
            borderRightColor: 'var(--rb-panel-border)',
            borderBottomColor: 'var(--rb-panel-border)',
            borderLeftColor: 'var(--rb-panel-border)',
          }}
        >
          {/* Corner brackets inside the page panel — top brackets hidden on mobile
              (the page already has its own top chrome above this embedded panel) */}
          <div className="hidden md:block absolute top-1 left-1 w-3 h-3 border-t border-l pointer-events-none z-20" style={{ borderColor: `rgba(${themeColorRgba}, 0.5)` }} />
          <div className="hidden md:block absolute top-1 right-1 w-3 h-3 border-t border-r pointer-events-none z-20" style={{ borderColor: `rgba(${themeColorRgba}, 0.5)` }} />
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l pointer-events-none z-20" style={{ borderColor: `rgba(${themeColorRgba}, 0.5)` }} />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r pointer-events-none z-20" style={{ borderColor: `rgba(${themeColorRgba}, 0.5)` }} />

          {/* Paper grain */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)' }}
          />
          {/* Page-edge stack on the fore-edge — in noBorder mode the parent
              page owns the fore-edge, outside this inner panel */}
          {!noBorder && (
            <div
              className="absolute inset-y-1 right-0 w-[5px] pointer-events-none z-10"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
            />
          )}

          <div className="relative z-[5] flex flex-col flex-grow min-h-0 gap-2 p-5 md:p-6">
            <div className="flex flex-col flex-grow min-h-0 overflow-y-auto custom-scrollbar">
              {detailsSlot}
            </div>

            {pageNumber && (
              <div className="flex justify-end">
                <span className="font-mono text-[9px] tabular-nums text-text2 opacity-70">{pageNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer strip — omitted in noBorder mode (parent wrapper owns the footer) */}
      {!noBorder && (
        <div
          className="flex justify-between items-center px-1 pt-0.5 text-[9px] font-mono rounded opacity-80"
          style={{ color: footerTextColor || (noBezel ? 'var(--color-text2)' : 'rgba(255, 255, 255, 0.6)') }}
        >
          <span>{footerLeftText}</span>
          <span>{footerMiddleText}</span>
          <span>{footerRightText}</span>
        </div>
      )}

    </div>
  );

  if (noBezel) {
    return (
      <div
        className="w-full relative group mx-auto flex flex-col flex-grow min-h-0 select-none"
        style={{ maxWidth, minHeight, ...(width ? { width } : {}) }}
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
      >
        <div
          className="flex flex-col flex-grow min-h-0 w-full rounded-md relative overflow-hidden transition-all duration-500"
          style={{
            border: noBorder ? 'none' : `1px solid ${themeColor}`,
            backgroundColor: 'var(--color-card)',
            boxShadow: noBorder ? undefined : (isCardHovered
              ? `0 0 28px rgba(${themeColorRgba}, 0.35)`
              : `0 0 14px rgba(${themeColorRgba}, 0.08)`),
          }}
        >
          {innerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full relative group mx-auto flex flex-col"
      style={{ maxWidth, minHeight, ...(width ? { width } : {}) }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Outer black bezel — same stack as HeroCard's front face */}
      <div
        className="flex flex-col flex-grow w-full rounded-md p-2.5 relative select-none transition-all duration-500"
        style={{
          backgroundColor: '#070709',
          boxShadow: isCardHovered
            ? `0 0 45px rgba(${themeColorRgba}, 0.45)`
            : `0 0 30px rgba(${themeColorRgba}, 0.12)`
        }}
      >
        {/* Metallic chassis frame */}
        <div
          className="flex flex-col flex-grow w-full rounded-md p-2 border relative overflow-hidden"
          style={{
            background: chassisGradient,
            borderColor: `rgba(${themeColorRgba}, 0.55)`,
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)',
          }}
        >
          {/* Overlay scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
          />
          <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

          {innerContent}
        </div>
      </div>
    </div>
  );
}
