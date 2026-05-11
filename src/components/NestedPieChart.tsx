"use client";

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LabelList } from 'recharts';

interface Tier3Child {
  name: string;
  percentage: number;
  color: string;
}

interface ChartDataItem {
  name: string;             
  percentage: number;       
  color: string;            
  explanation?: string;     
  parentName: string;       
  parentPercentage: number; 
  parentColor: string;      
  parentExplanation?: string; // NEW: Explanation for the Tier 1 group
  subChildren: Tier3Child[]; 
}

interface NestedPieChartProps {
  data: ChartDataItem[];
}

const NestedPieChart: React.FC<NestedPieChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  const parentData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    data.forEach(item => {
      if (!map[item.parentName]) {
        map[item.parentName] = { 
          name: item.parentName, 
          value: item.parentPercentage, 
          color: item.parentColor 
        };
      }
    });
    return Object.values(map);
  }, [data]);

  // Logic to determine what to show in the explanation box
  const activeDisplay = useMemo(() => {
    // 1. If a specific Tier 2 item is hovered
    if (hoveredIndex !== null) {
      const item = data[hoveredIndex];
      return {
        name: item.name,
        explanation: item.explanation,
        color: item.color
      };
    }
    // 2. If a Parent Core (Tier 1) is hovered
    if (hoveredParent !== null) {
      const pData = data.find(d => d.parentName === hoveredParent);
      return {
        name: hoveredParent,
        explanation: pData?.parentExplanation,
        color: pData?.parentColor
      };
    }
    return null;
  }, [hoveredIndex, hoveredParent, data]);

  const renderTier1Label = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, value } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <g>
        <text x={x} y={y} fill="var(--color-text)" textAnchor="middle" dominantBaseline="central" textRendering="geometricPrecision" className="font-[family-name:var(--font-display)] pointer-events-none select-none outline-none">
          <tspan x={x} dy="-0.6em" fontSize="9" fontWeight="900" className="uppercase tracking-tighter">{name}</tspan>
          <tspan x={x} dy="1.2em" fontSize="9" fontWeight="700">{value}%</tspan>
        </text>
      </g>
    );
  };

  const renderTier2Label = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, percentage } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const words = name.split(' ');
    const isLong = name.length > 12 && words.length > 1;
    let line1 = name, line2 = "";
    if (isLong) {
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }
    return (
      <g>
        <text x={x} y={y} fill="var(--color-card)" textAnchor="middle" dominantBaseline="central" textRendering="geometricPrecision" className="font-[family-name:var(--font-display)] pointer-events-none select-none outline-none">
          {isLong ? (
            <>
              <tspan x={x} dy="-1.1em" fontSize="10" fontWeight="900" className="uppercase tracking-tighter">{line1}</tspan>
              <tspan x={x} dy="1.1em" fontSize="10" fontWeight="900" className="uppercase tracking-tighter">{line2}</tspan>
              <tspan x={x} dy="1.3em" fontSize="9" fontWeight="700">{percentage}%</tspan>
            </>
          ) : (
            <>
              <tspan x={x} dy="-0.5em" fontSize="11" fontWeight="900" className="uppercase tracking-tighter">{name}</tspan>
              <tspan x={x} dy="1.4em" fontSize="10" fontWeight="700">{percentage}%</tspan>
            </>
          )}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-between w-full max-w-7xl p-8 bg-[var(--color-card)] rounded-xl shadow-2xl font-[family-name:var(--font-display)] overflow-visible">
      {/* --- LIST SECTION --- */}
      <div className="w-full lg:w-1/3 mt-8 lg:mt-0 px-4">
        <div className="mb-6"><h3 className="text-2xl font-black text-[var(--color-text)] uppercase">Token Distribution</h3></div>
        <ul className="space-y-4">
          {data.map((item, index) => {
            const itemFocused = hoveredIndex === index || (hoveredParent === item.parentName && hoveredIndex === null);
            const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;
            return (
              <li key={index} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} className="border-b border-[var(--color-border)] last:border-0 pb-4" style={{ opacity: isAnyHovered && !itemFocused ? 0.3 : 1 }}>
                <div  className="flex items-center justify-between cursor-default py-2 gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-lg text-[var(--color-text)] leading-tight uppercase tracking-tight break-words">{item.name}</span>
                  </div>
                  <span className="text-xl font-black text-[var(--color-text)] shrink-0">{item.percentage}%</span>
                </div>
                {item.subChildren && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {item.subChildren.map((sub, sIdx) => (
                      <li key={sIdx} className="flex items-center justify-between py-1 px-2 rounded-md cursor-default gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                          <span className="text-sm font-medium text-[var(--color-text2)] leading-tight break-words">{sub.name}</span>
                        </div>
                        <span className="text-xs font-bold text-[var(--color-text2)] shrink-0">{sub.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* --- CHART SECTION --- */}
      <div className="w-full lg:w-3/5 flex flex-col items-center">
        <div className="w-full h-[550px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart className="outline-none">
              <Pie
                data={parentData}
                dataKey="value"
                cx="50%" cy="50%"
                outerRadius="28%" 
                stroke="var(--color-card)" strokeWidth={6} 
                onMouseEnter={(e) => e?.name && setHoveredParent(e.name)}
                onMouseLeave={() => setHoveredParent(null)}
                isAnimationActive={false}
                label={renderTier1Label}
                labelLine={false}
                className="outline-none"
              >
                {parentData.map((entry, index) => {
                  const isFocused = (hoveredIndex === null && hoveredParent === null) || (hoveredIndex === null && hoveredParent === entry.name);
                  return <Cell key={`tier1-${index}`} fill={entry.color} style={{ opacity: isFocused ? 1 : 0.15, transition: 'opacity 0.2s ease', cursor: 'pointer', outline: 'none' }} />;
                })}
              </Pie>

              <Pie
                data={data}
                dataKey="percentage"
                cx="50%" cy="50%"
                innerRadius="31%" outerRadius="90%" 
                stroke="var(--color-card)" strokeWidth={6} 
                label={renderTier2Label}
                labelLine={false}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                isAnimationActive={false}
                className="outline-none"
              >
                {data.map((entry, index) => {
                  const isFocused = (hoveredIndex === null && hoveredParent === null) || (hoveredIndex === index) || (hoveredIndex === null && hoveredParent === entry.parentName);
                  return <Cell key={`tier2-${index}`} fill={entry.color} style={{ filter: hoveredIndex === index ? 'brightness(1.1)' : 'none', opacity: isFocused ? 1 : 0.15, transition: 'opacity 0.2s ease, filter 0.2s ease', cursor: 'pointer', outline: 'none' }} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* --- EXPLANATION BOX --- */}
        <div className="mt-4 w-full px-12 min-h-[100px] flex flex-col items-center text-center">
          <div className={`transition-all duration-300 ${activeDisplay ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            {activeDisplay && (
              <>
                <h4 className="font-black uppercase tracking-widest text-xs mb-1" style={{ color: activeDisplay.color }}>
                  {activeDisplay.name}
                </h4>
                <p className="text-[var(--color-text2)] text-sm leading-relaxed max-w-md">
                  {activeDisplay.explanation || "No additional information available."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .recharts-surface, .recharts-pie-sector, .recharts-sector { outline: none !important; -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default NestedPieChart;