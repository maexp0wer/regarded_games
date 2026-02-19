// GiniDisplay.tsx
import React from 'react';

// Icons (Moved from original GiniDashboard)
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';

// Props Interface
interface GiniDisplayProps {
    gCurrent: number;
    gInitial: number;
    socTargetBps: number;
    capTargetBps: number;
    winningSide: 'soc' | 'cap' | 'none';
    progressPercent: number;
    currentPhase: string | null;
    isAuction: boolean;
    isBootstrap: boolean;
}

// ============================================================================
// 2. SUB-COMPONENT: AUCTION GAUGE (0-100%) (Moved from original)
// ============================================================================
function AuctionGauge({ gCurrent, socTarget, capTarget }: { gCurrent: number, socTarget: number, capTarget: number }) {
  const gNorm = gCurrent / 10000;
  
  return (
    <div className="relative w-full h-2 bg-card2 rounded-full">
      
      {/* --- ICONS (TOP) --- */}
      <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(socTarget / 10000) * 100}%` }}>
        <Carlo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
      </div>
      <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(capTarget / 10000) * 100}%` }}>
        <Regardo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
      </div>

      {/* --- TARGETS (BOTTOM - SHORT LINES) --- */}
      <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(socTarget / 10000) * 100}%` }}>
        <div className="w-0.5 h-3 bg-danger/20 mb-1"></div>
        <span className="text-lg font-black text-danger font-mono leading-none">{socTarget.toFixed(0)}</span>
        <span className="text-[9px] uppercase font-bold text-danger/50 tracking-widest mt-0.5">Target</span>
      </div>

      <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(capTarget / 10000) * 100}%` }}>
        <div className="w-0.5 h-3 bg-info/20 mb-1"></div>
        <span className="text-lg font-black text-info font-mono leading-none">{capTarget.toFixed(0)}</span>
        <span className="text-[9px] uppercase font-bold text-info/50 tracking-widest mt-0.5">Target</span>
      </div>

      {/* --- CURRENT GINI (BOTTOM - LONG LINE) --- */}
      <div 
        className="absolute top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-out z-40"
        style={{ left: `${gNorm * 100}%` }}
      >
        <div className="w-0.5 h-16 bg-primary mb-1"></div>
        <div className="bg-card px- py-1 rounded-lg flex flex-col items-center">
            <span className="text-3xl font-black font-mono leading-none tracking-tighter text-primary">
                {gCurrent.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-text2 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                Current
            </span>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute inset-0 flex items-center">
        <div className="absolute w-3 h-3 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-700 bg-primary" style={{ left: `${gNorm * 100}%` }} />
        <div className="absolute w-2 h-2 bg-danger rounded-full z-20 -translate-x-1/2" style={{ left: `${(socTarget / 10000) * 100}%` }} />
        <div className="absolute w-2 h-2 bg-info rounded-full z-20 -translate-x-1/2" style={{ left: `${(capTarget / 10000) * 100}%` }} />
      </div>
    </div>
  );
}


// ============================================================================
// 3. SUB-COMPONENT: TRADING / PAYOUT GAUGE (Zoomed) (Moved from original)
// ============================================================================
function TradingGauge({ gCurrent, gInitial, socTarget, capTarget, winningSide, progress, phase }: any) {
  
  // Dynamic Scale
  const viewMin = Math.max(0, socTarget - 500);
  const viewMax = Math.min(10000, capTarget + 500);
  const viewSpan = viewMax - viewMin;

  const getPosition = (bps: number) => {
    if (viewSpan <= 0) return 50;
    const pct = ((bps - viewMin) / viewSpan) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  const isFinal = phase === "PAYOUT";

  return (
    <>
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
        <h2 className="h2-app">
           {isFinal ? "Final Gini Position" : "Live Gini Position"}
        </h2>

      </div>

      <div className="relative w-full h-2 bg-card2 rounded-full my-16">
        
        {/* --- INITIAL MARKER (BOTTOM LABEL) --- */}
      <div 
          className="absolute -translate-x-1/2 flex flex-col items-center z-20" 
          style={{ 
              left: `${getPosition(gInitial)}%`, 
              top: 'calc(50% + 8px)' // Starts exactly below the center-track dot
          }}
      >
          {/* Short Vertical Line (Tick) pointing up to the dot */}
          <div className="w-0.5 h-2 bg-text2/30 mb-1"></div>

          {/* The Mono Number (Slightly smaller: text-base) */}
          <span className="text-xs font-black text-text2/50 font-mono leading-none">
              {gInitial.toLocaleString()}
          </span>

          {/* Subtitle (Slightly smaller: text-[8px]) */}
          <span className="text-[8px] uppercase font-bold text-text2/30 tracking-widest mt-0.5">
              Initial
          </span>
      </div>

      
        

        {/* --- ICONS (TOP) --- */}
        <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(socTarget)}%` }}>
           <Carlo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
        </div>
        <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(capTarget)}%` }}>
           <Regardo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
        </div>

        {/* --- TARGETS (BOTTOM - SHORT LINES) --- */}
        <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(socTarget)}%` }}>
            <div className="w-0.5 h-3 bg-danger/20 mb-1"></div>
            <span className="text-lg font-black text-danger font-mono leading-none">{socTarget.toFixed(0)}</span>
            
            <div className="flex flex-col items-center gap-1 mt-0.5">
                <span className="text-[9px] uppercase font-bold text-danger/50 tracking-widest">Target</span>
                {winningSide === 'soc' && (
                  <span className={`text-[9px] font-bold text-card bg-danger px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm ${isFinal ? '' : 'animate-pulse'}`}>
                    {progress.toFixed(1)}% Progress
                  </span>
 
                )}
            </div>
        </div>

        <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(capTarget)}%` }}>
            <div className="w-0.5 h-3 bg-info/20 mb-1"></div>
            <span className="text-lg font-black text-info font-mono leading-none">{capTarget.toFixed(0)}</span>
            
            <div className="flex flex-col items-center gap-1 mt-0.5">
                <span className="text-[9px] uppercase font-bold text-info/50 tracking-widest">Target</span>
                {winningSide === 'cap' && (
                    <span className={`text-[9px] font-bold text-card bg-info px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm ${isFinal ? '' : 'animate-pulse'}`}>
                        {progress.toFixed(1)}% Progress
                    </span>
                )}
            </div>
        </div>

        {/* --- CURRENT GINI (BOTTOM - LONG LINE) --- */}
        <div 
          className="absolute top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-out z-40"
          style={{ left: `${getPosition(gCurrent)}%` }}
        >
          <div className="w-0.5 h-18 bg-primary mb-2"></div>
          
          <div className="bg-card px-2 py-1 rounded-lg flex flex-col items-center">
              <span className="text-3xl font-black font-mono leading-none tracking-tighter text-primary">
                  {gCurrent.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-text2 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                  {isFinal ? "Final" : "Current"}
              </span>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute inset-0 flex items-center">
            <div className={`absolute w-3 h-3 rounded-full z-20 -translate-x-1/2 transition-all duration-700 bg-primary ${isFinal ? '' : 'animate-pulse'}`} style={{ left: `${getPosition(gCurrent)}%` }} />
            <div className="absolute w-2 h-2 bg-danger rounded-full z-20 -translate-x-1/2" style={{ left: `${getPosition(socTarget)}%` }} />
            <div className="absolute w-2 h-2 bg-info rounded-full z-20 -translate-x-1/2" style={{ left: `${getPosition(capTarget)}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-text2/30 rounded-full z-10 -translate-x-1/2"style={{ left: `${getPosition(gInitial)}%` }}
      />
        </div>
      </div>
    </>
  );
}


// ============================================================================
// GiniDisplay Component
// ============================================================================
export function GiniDisplay({
    gCurrent,
    gInitial,
    socTargetBps,
    capTargetBps,
    winningSide,
    progressPercent,
    currentPhase,
    isAuction,
    isBootstrap,
}: GiniDisplayProps) {
    
    // Original component part 3
    return (
        <div className="lg:col-span-2 bg-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center min-h-70 h-full">
            {(isAuction || isBootstrap) ? (
                <>
                    <h2 className="absolute top-6 left-6 text-xs font-bold uppercase text-text2 tracking-widest">
                      Live Gini BPS
                    </h2>
                    <AuctionGauge 
                        gCurrent={gCurrent} 
                        socTarget={socTargetBps} 
                        capTarget={capTargetBps} 
                    />
                </>
            ) : (
                <TradingGauge 
                    gCurrent={gCurrent} 
                    gInitial={gInitial} 
                    socTarget={socTargetBps} 
                    capTarget={capTargetBps} 
                    winningSide={winningSide}
                    progress={progressPercent}
                    phase={currentPhase} 
                />
            )}
        </div>
    );
}