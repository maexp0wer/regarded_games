// src/components/NestedPieChart.tsx
"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/context/ThemeContext';
import RulebookCard from '@/components/RulebookCard'; 

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
  parentExplanation?: string;
  subChildren: Tier3Child[];
}

interface NestedPieChartProps {
  data: ChartDataItem[];
}

interface Group {
  parentName: string;
  parentPercentage: number;
  parentColor: string;
  parentExplanation?: string;
  items: Array<ChartDataItem & { globalIndex: number }>;
}

function resolveColor(cssValue: string): string {
  if (typeof window === 'undefined') return '#888888';
  if (!cssValue.startsWith('var(')) return cssValue;
  const el = document.createElement('div');
  el.setAttribute('style', `position:fixed;width:0;height:0;background:${cssValue}`);
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
  return resolved || '#888888';
}

function getEChartsGradient(cssVar: string) {
  if (typeof window === 'undefined') return '#888888';
  return resolveColor(cssVar);
}

function getHoverColor(cssVar: string): string {
  if (typeof cssVar === 'string' && cssVar.startsWith('var(')) {
    return cssVar.replace(/\)$/, '-hovered)');
  }
  return cssVar;
}

const NestedPieChart: React.FC<NestedPieChartProps> = ({ data }) => {
  const { darkMode } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  const groups = useMemo<Group[]>(() => {
    const map: Record<string, Group> = {};
    data.forEach((item, index) => {
      const key = item.parentName;
      if (!map[key]) {
        map[key] = {
          parentName: key,
          parentPercentage: item.parentPercentage,
          parentColor: item.parentColor,
          parentExplanation: item.parentExplanation,
          items: [],
        };
      }
      map[key].items.push({ ...item, globalIndex: index });
    });
    return Object.values(map);
  }, [data]);

  const parentData = useMemo(() =>
    groups.map(g => ({ name: g.parentName, value: g.parentPercentage, color: g.parentColor })),
    [groups]
  );

  const borderColor = useMemo(() => {
    const c1 = resolveColor('var(--color-border)');
    if (c1 !== '#888888') return c1;
    const c2 = resolveColor('var(--border)');
    if (c2 !== '#888888') return c2;
    return '#3f3f46';
  }, []);

  const border2Color = useMemo(() => {
    const c1 = resolveColor('var(--color-border-2)');
    if (c1 !== '#888888') return c1;
    const c2 = resolveColor('var(--border-2)');
    if (c2 !== '#888888') return c2;
    const c3 = resolveColor('var(--color-border2)');
    if (c3 !== '#888888') return c3;
    return '#27272a';
  }, []);

  const activeDisplay = useMemo(() => {
    if (hoveredIndex !== null) {
      const item = data[hoveredIndex];
      return {
        name: item.name,
        explanation: item.explanation,
        color: item.color,
        percentage: item.percentage,
        subChildren: item.subChildren,
      };
    }
    if (hoveredParent !== null) {
      const pData = data.find(d => d.parentName === hoveredParent);
      const parentIndex = parentData.findIndex(p => p.name === hoveredParent);
      const resolvedParentColor = parentIndex === 0 ? borderColor : border2Color;

      return {
        name: hoveredParent.trim() || (pData?.parentPercentage === 75 ? 'Community Controlled' : 'Team & Operations'),
        explanation: pData?.parentExplanation,
        color: resolvedParentColor,
        percentage: pData?.parentPercentage,
        subChildren: [] as Tier3Child[],
      };
    }
    return null;
  }, [hoveredIndex, hoveredParent, data, parentData, borderColor, border2Color]);

  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const cardColor = resolveColor('var(--color-card)');
    const textColor = resolveColor('var(--color-text)');
    const goldColor = resolveColor('var(--color-gold)');

    const tier1Items = parentData.map((d, index) => {
      const sliceColor = index === 0 ? borderColor : border2Color;

      return {
        name: d.name,
        value: d.value,
        itemStyle: {
          color: sliceColor,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: sliceColor,
          }
        }
      };
    });

    const tier2Items = data.map((d) => {
      const words = d.name.split(' ');
      const isLong = d.name.length > 12 && words.length > 1;
      let labelText: string;
      if (isLong) {
        const mid = Math.ceil(words.length / 2);
        const l1 = words.slice(0, mid).join(' ').toUpperCase();
        const l2 = words.slice(mid).join(' ').toUpperCase();
        labelText = `{n|${l1}}\n{n|${l2}}\n{p|${d.percentage}%}`;
      } else {
        labelText = `{n|${d.name.toUpperCase()}}\n{p|${d.percentage}%}`;
      }

      const baseColor = getEChartsGradient(d.color);
      const hoverColor = getEChartsGradient(getHoverColor(d.color));

      return {
        name: d.name,
        value: d.percentage,
        label: { formatter: () => labelText },
        itemStyle: {
          color: baseColor,
          borderColor: cardColor,
          borderWidth: 6,
          borderRadius: 8 
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: hoverColor,
            borderColor: cardColor,
            borderWidth: 6,
            borderRadius: 8
          }
        }
      };
    });

    return {
      animation: false,
      series: [
        {
          type: 'pie',
          radius: ['0%', '28%'],
          startAngle: 180,
          data: tier1Items,
          emphasis: { scale: false },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: { name: string; value: number }) =>
              `{t1n|${params.name.trim() ? params.name.toUpperCase() : ''}}\n{t1p|${params.value}%}`,
            rich: {
              t1n: { fontSize: 9, fontWeight: 900, color: textColor, lineHeight: 14 },
              t1p: { fontSize: 9, fontWeight: 700, color: textColor, lineHeight: 12 },
            },
          },
          labelLine: { show: false },
          itemStyle: { 
            borderColor: cardColor, 
            borderWidth: 6,
            borderRadius: 4 
          },
        },
        {
          type: 'pie',
          radius: ['31%', '90%'],
          startAngle: 180,
          data: tier2Items,
          emphasis: { scale: false },
          label: {
            show: true,
            position: 'inside',
            rich: {
              n: { fontSize: 10, fontWeight: 900, color: cardColor, lineHeight: 14 },
              p: { fontSize: 9, fontWeight: 700, color: cardColor, lineHeight: 12 },
            },
          },
          labelLine: { show: false },
          labelLayout: (params: any) => {
            const text = params.text || '';
            if (text.toUpperCase().includes('DAO TREASURY')) {
              return { dy: 10 };
            }
            if (text.toUpperCase().includes('GROWTH')) {
              return { dx: -3 };
            }
            return {};
          },
        },
        {
          type: 'gauge',
          center: ['50%', '50%'],
          radius: '96%', 
          z: 10, 
          startAngle: 90,
          endAngle: -270,
          splitNumber: 12, 
          axisLine: {
            show: true,
            lineStyle: {
              color: [[1, goldColor]],
              width: 1,
              opacity: 0.25
            }
          },
          pointer: { show: false },
          axisTick: {
            show: true,
            lineStyle: { color: cardColor, opacity: 1, width: 1 },
            length: 5,
            splitNumber: 3 
          },
          splitLine: {
            show: true,
            lineStyle: { color: cardColor, opacity: 1, width: 1.5 },
            length: 12 
          },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false }
        }
      ],
    };
  }, [data, parentData, darkMode, borderColor, border2Color]);

  const onEvents = useMemo(() => ({
    mouseover: (params: { seriesIndex: number; name: string }) => {
      if (params.seriesIndex === 0) {
        setHoveredParent(params.name);
        setHoveredIndex(null);
      } else if (params.seriesIndex === 1) {
        const index = data.findIndex(d => d.name === params.name);
        setHoveredIndex(index >= 0 ? index : null);
        setHoveredParent(null);
      }
    },
    mouseout: () => {
      setHoveredParent(null);
      setHoveredIndex(null);
    },
  }), [data]);

  return (
    <div className="w-full relative py-6">
      <RulebookCard
        // All green visual mappings completely replaced with gold/amber configurations
        themeColor="var(--color-gold)"
        themeColorRgba="234, 179, 8" 
        chassisGradient="linear-gradient(135deg, var(--color-bg) 0%, var(--color-card) 100%)"
        maxWidth="880px" 
        minHeight="680px"
        headerTag="System"
        title="DISTRIBUTION OF POWER" 
        symbol={<span className="font-sans text-xs">%</span>}
        footerLeftText="System Mechanics"
        footerMiddleText='001 / 001'
        footerRightText="Allocation Map ↗"
        footerTextColor="rgba(255, 255, 255, 0.65)" 
        
        illustrationSlot={
          <ReactECharts
            option={option}
            onEvents={onEvents}
            style={{ height: '500px', width: '400px' }}
            notMerge={false}
            lazyUpdate
          />
        }

        detailsSlot={
          <div 
            className="flex flex-col justify-start flex-grow h-full w-full relative z-10 transition-all duration-300 gap-3"
            style={{ 
              borderColor: activeDisplay ? `${activeDisplay.color}50` : 'rgba(234, 179, 8, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Corner Bracket Graphics updating based on theme colors */}
            {activeDisplay ? (
              <>
                <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none opacity-45 transition-colors duration-300" style={{ borderColor: activeDisplay.color }} />
                <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r pointer-events-none opacity-45 transition-colors duration-300" style={{ borderColor: activeDisplay.color }} />
                <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l pointer-events-none opacity-45 transition-colors duration-300" style={{ borderColor: activeDisplay.color }} />
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none opacity-45 transition-colors duration-300" style={{ borderColor: activeDisplay.color }} />
              </>
            ) : (
              <>
                <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none opacity-45 border-[var(--color-gold)]" />
                <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r pointer-events-none opacity-45 border-[var(--color-gold)]" />
                <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l pointer-events-none opacity-45 border-[var(--color-gold)]" />
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none opacity-45 border-[var(--color-gold)]" />
              </>
            )}

            <div className="w-full transition-all duration-300 z-10 flex-grow flex flex-col justify-start p-1">
              {activeDisplay ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="font-display font-black text-xs uppercase tracking-widest"
                      style={{ color: activeDisplay.color }}
                    >
                      {activeDisplay.name}
                    </span>
                    {activeDisplay.percentage != null && (
                      <span
                        className="font-mono font-bold text-sm tabular-nums shrink-0"
                        style={{ color: activeDisplay.color }}
                      >
                        {activeDisplay.percentage}%
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-text2 leading-relaxed">
                    {activeDisplay.explanation ?? 'No additional information available.'}
                  </p>
                  {activeDisplay.subChildren && activeDisplay.subChildren.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5">
                      {activeDisplay.subChildren.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: sub.color }}
                            />
                            <span className="font-sans text-[10px] text-text2">{sub.name}</span>
                          </div>
                          <span className="font-mono text-[10px] tabular-nums text-text2">
                            {sub.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full py-1">
                  <div className="flex flex-col gap-0.5 w-full text-left">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display font-black text-xs uppercase tracking-widest text-[var(--color-gold)]">
                        Community Controlled
                      </span>
                      <span className="font-mono font-bold text-sm tabular-nums shrink-0 text-[var(--color-gold)]">
                        75%
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-text2 leading-relaxed">
                      DAO Treasury, Ecosystem Incentives & Day-1 Market Stability.
                    </p>
                  </div>

                  <div className="border-t border-white/5 w-full" />

                  <div className="flex flex-col gap-0.5 w-full text-left">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display font-black text-xs uppercase tracking-widest text-[var(--color-gold)]">
                        Team & Operations
                      </span>
                      <span className="font-mono font-bold text-sm tabular-nums shrink-0 text-[var(--color-gold)]">
                        25%
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-text2 leading-relaxed">
                      Operational Reserve LLC & Founding Team long-term alignment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
};

export default NestedPieChart;