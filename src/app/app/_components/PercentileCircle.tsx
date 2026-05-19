'use client';

import React from 'react';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';


export type PercentileSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface PercentileCircleProps {
  percentage: number;
  isCapitalist: boolean;
  size?: PercentileSize;
  showText?: boolean;
  showIcon?: boolean;
  className?: string;
}

// Map sizes to Tailwind and SVG dimensions
// STROKE logic: We INCREASE the number for larger sizes to make the ring "wider"
const sizeMap = {
  xxs: { container: 'gap-1', icon: 'w-3', circle: 'w-3 h-3', font: 'text-[11px]', stroke: 6 },
  xs: { container: 'gap-1', icon: 'w-3', circle: 'w-3 h-3', font: 'text-[12px]', stroke: 6 },
  sm: { container: 'gap-1.5', icon: 'w-4', circle: 'w-4 h-4', font: 'text-[12px]', stroke: 7 },
  md: { container: 'gap-2', icon: 'w-7', circle: 'w-7 h-7', font: 'text-[12px]', stroke: 8 },
  lg: { container: 'gap-3', icon: 'w-10', circle: 'w-10 h-10', font: 'text-[16px]', stroke: 9 },
  xl: { container: 'gap-4', icon: 'w-14', circle: 'w-14 h-14', font: 'text-[20px]', stroke: 10 },
};

export const PercentileCircle: React.FC<PercentileCircleProps> = ({ 
  percentage, 
  isCapitalist,
  size = 'sm',
  showText = true,
  showIcon = true,
  className = ""
}) => {
  const s = sizeMap[size];
  
  const colorClass = isCapitalist ? "stroke-blue" : "stroke-pink";
  const bgClass = isCapitalist ? "stroke-blue/20" : "stroke-pink/20";
  
  const radius = 15.9155; // Circumference = 100
  const dashArray = `${percentage} ${100 - percentage}`;

  return (
    <div className={`inline-flex items-center leading-none ${s.container} ${className}`}>
      
      {/* 1. FACTION ICON */}
      {showIcon && size !== 'xxs' && (
        <div className={`flex-shrink-0 flex items-center ${s.icon}`}>
          {isCapitalist ? (
            <Regardo className="w-full h-auto opacity-90" viewBox="0 0 600 800"/>
          ) : (
            <Carlo className="w-full h-auto opacity-90" viewBox="0 0 600 800"/>
          )}
        </div>
      )}

      {/* 2. PROGRESS CIRCLE */}
      {/* overflow-visible is key so thick strokes don't clip */}
      <svg viewBox="0 0 40 40" className={`${s.circle} -rotate-90 flex-shrink-0 overflow-visible`}>
        <circle 
          cx="20" cy="20" r={radius} 
          fill="transparent" 
          className={bgClass} 
          strokeWidth={s.stroke} 
        />
        <circle 
          cx="20" cy="20" r={radius} 
          fill="transparent" 
          className={`${colorClass} transition-all duration-1000 ease-out`} 
          strokeWidth={s.stroke} 
          strokeDasharray={dashArray} 
          strokeLinecap="round" 
        />
      </svg>
      
      {/* 3. PERCENTAGE TEXT */}
      {showText && (
        <span className={`font-mono font-black whitespace-nowrap ${s.font} ${isCapitalist ? 'text-blue' : 'text-pink'}`}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};