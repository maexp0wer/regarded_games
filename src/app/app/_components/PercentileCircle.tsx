'use client';

import React from 'react';

export type PercentileSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface PercentileCircleProps {
  percentage: number;
  isCapitalist: boolean;
  size?: PercentileSize;
  showText?: boolean;
  className?: string;
}

// Map sizes to Tailwind and SVG dimensions
const sizeMap = {
  xxs: { container: 'gap-1', circle: 'w-3 h-3', font: 'text-[12px]', stroke: 20 },
  xs: { container: 'gap-1', circle: 'w-3 h-3', font: 'text-[12px]', stroke: 20 },
  sm: { container: 'gap-1.5', circle: 'w-4 h-4', font: 'text-[12px]', stroke: 20 },
  md: { container: 'gap-2', circle: 'w-7 h-7', font: 'text-[12px]', stroke: 20 },
  lg: { container: 'gap-3', circle: 'w-10 h-10', font: 'text-[16px]', stroke: 20 },
  xl: { container: 'gap-4', circle: 'w-14 h-14', font: 'text-[20px]', stroke: 20 },
};

export const PercentileCircle: React.FC<PercentileCircleProps> = ({ 
  percentage, 
  isCapitalist,
  size = 'sm',
  showText = true,
  className = ""
}) => {
  const s = sizeMap[size];
  
  const colorClass = isCapitalist ? "stroke-gold" : "stroke-purple";
  const bgClass = isCapitalist ? "stroke-(--color-gold-35)" : "stroke-(--color-purple-35)";
  
  const strokeWidth = s.stroke;
  const radius = 20 - (strokeWidth / 2); 
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;
  const dashArray = `${strokeDash} ${circumference}`;

  return (
    <div className={`inline-flex items-center leading-none ${s.container} ${className}`}>
      
      {/* 1. PROGRESS PIE */}
      <svg viewBox="0 0 40 40" className={`${s.circle} -rotate-90 shrink-0`}>
        <circle 
          cx="20" cy="20" r={radius} 
          fill="transparent" 
          className={bgClass} 
          strokeWidth={strokeWidth} 
        />
        <circle 
          cx="20" cy="20" r={radius} 
          fill="transparent" 
          className={`${colorClass} transition-all duration-1000 ease-out`} 
          strokeWidth={strokeWidth} 
          strokeDasharray={dashArray} 
        />
      </svg>
      
      {/* 2. TEXT AND SUBTEXT BLOCK */}
      {showText && (
        <div className="flex flex-col justify-center leading-none -translate-y-0.5">
          {/* ^ leading-none strips default vertical padding, -translate-y-[2px] nudges it up optically */}
          <span className={`font-mono font-black whitespace-nowrap leading-none ${s.font} ${isCapitalist ? 'text-gold' : 'text-purple'}`}>
            {Math.round(percentage)}%
          </span>
          {(size === 'lg' || size === 'xl') && (
            <span className={`text-[11px] font-semibold uppercase tracking-wider leading-none mt-1.5 ${isCapitalist ? 'text-gold/80' : 'text-purple/80'}`}>
              {/* ^ leading-none and explicit mt-1.5 margin gives you exact spacing control */}
              {isCapitalist ? 'Capitalist' : 'Proletarian'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};