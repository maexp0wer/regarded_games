"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/context/ThemeContext';

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

// Resolves a CSS variable string (e.g. "var(--color-gold)") to a concrete color
// by temporarily injecting a hidden element. Required because ECharts canvas
// rendering cannot evaluate CSS variables natively.
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

  const activeDisplay = useMemo(() => {
    if (hoveredIndex !== null) {
      const item = data[hoveredIndex];
      return { name: item.name, explanation: item.explanation, color: item.color };
    }
    if (hoveredParent !== null) {
      const pData = data.find(d => d.parentName === hoveredParent);
      return { name: hoveredParent, explanation: pData?.parentExplanation, color: pData?.parentColor };
    }
    return null;
  }, [hoveredIndex, hoveredParent, data]);

  // darkMode in deps so colors re-resolve on theme switch
  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const cardColor = resolveColor('var(--color-card)');
    const textColor = resolveColor('var(--color-text)');
    const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;

    const tier1Items = parentData.map(d => {
      const isFocused = !isAnyHovered
        || (hoveredIndex !== null && data[hoveredIndex].parentName === d.name)
        || (hoveredIndex === null && hoveredParent === d.name);
      return {
        name: d.name,
        value: d.value,
        itemStyle: {
          color: resolveColor(d.color),
          opacity: isAnyHovered && !isFocused ? 0.15 : 1,
        },
      };
    });

    const tier2Items = data.map((d, index) => {
      const isFocused = !isAnyHovered
        || hoveredIndex === index
        || (hoveredIndex === null && hoveredParent === d.parentName);
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
      return {
        name: d.name,
        value: d.percentage,
        label: { formatter: () => labelText },
        itemStyle: {
          color: resolveColor(d.color),
          opacity: isAnyHovered && !isFocused ? 0.15 : 1,
          borderColor: cardColor,
          borderWidth: 6,
        },
      };
    });

    return {
      animation: false,
      series: [
        {
          type: 'pie',
          radius: ['0%', '28%'],
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
          itemStyle: { borderColor: cardColor, borderWidth: 6 },
        },
        {
          type: 'pie',
          radius: ['31%', '90%'],
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
        },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, parentData, hoveredIndex, hoveredParent, darkMode]);

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
    <div className="flex flex-col gap-4 w-full">

      {/* 75 / 25 split summary */}
      <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-xl overflow-hidden">
        {groups.map((group, gIdx) => {
          const isCommunity = group.parentPercentage === 75;
          const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;
          return (
            <div
              key={gIdx}
              onMouseEnter={() => setHoveredParent(group.parentName)}
              onMouseLeave={() => setHoveredParent(null)}
              className="relative bg-card hover:bg-card2 transition-all duration-150 ease-in-out cursor-default p-5 flex flex-col gap-1.5"
              style={{ opacity: isAnyHovered && hoveredParent !== group.parentName && hoveredIndex === null ? 0.4 : 1 }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: isCommunity ? 'var(--color-gold)' : 'var(--color-text2)' }}
              />
              <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest pl-2">
                {isCommunity ? 'Community Controlled' : 'Team & Operations'}
              </span>
              <span
                className="font-display font-black text-4xl tabular-nums pl-2"
                style={{ color: isCommunity ? 'var(--color-gold)' : 'var(--color-text)' }}
              >
                {group.parentPercentage}%
              </span>
              <span className="font-sans text-xs text-text2 pl-2">
                {isCommunity
                  ? 'Treasury, Growth & Market Formation'
                  : 'Operational Reserve & Founding Team'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main panel */}
      <div className="flex flex-col lg:flex-row w-full bg-card border border-border rounded-xl overflow-hidden shadow-2xl">

        {/* Legend panel */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-border">
          <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest">
            Allocation Breakdown
          </span>

          <div className="flex flex-col gap-4">
            {groups.map((group, gIdx) => {
              const isCommunity = group.parentPercentage === 75;
              return (
                <div key={gIdx} className="flex flex-col gap-1">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-2 py-1 cursor-default"
                    onMouseEnter={() => setHoveredParent(group.parentName)}
                    onMouseLeave={() => setHoveredParent(null)}
                  >
                    <span
                      className="font-mono text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: isCommunity ? 'var(--color-gold)' : 'var(--color-text2)' }}
                    >
                      {isCommunity ? 'DAO Community' : 'Founding Team'}
                    </span>
                    <span className="font-mono text-[10px] font-bold tabular-nums text-text2">
                      {group.parentPercentage}%
                    </span>
                  </div>

                  {/* Stat separation grid */}
                  <div className="flex flex-col gap-px bg-border rounded-xl overflow-hidden border border-border">
                    {group.items.map((item) => {
                      const itemFocused = hoveredIndex === item.globalIndex
                        || (hoveredParent === item.parentName && hoveredIndex === null);
                      const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;
                      return (
                        <div
                          key={item.globalIndex}
                          onMouseEnter={() => { setHoveredIndex(item.globalIndex); setHoveredParent(null); }}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className="relative group bg-card hover:bg-card2 transition-all duration-150 ease-in-out cursor-default"
                          style={{ opacity: isAnyHovered && !itemFocused ? 0.35 : 1 }}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all duration-150"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="pl-4 pr-3 py-2.5 flex flex-col gap-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-sans font-semibold text-xs text-text truncate">
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-xs tabular-nums text-text shrink-0">
                                {item.percentage}%
                              </span>
                            </div>
                            {item.subChildren && item.subChildren.length > 0 && (
                              <div className="flex flex-col gap-0.5 ml-1">
                                {item.subChildren.map((sub, sIdx) => (
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart + info panel */}
        <div className="flex flex-col flex-1 min-w-0 p-5 gap-4">
          <div className="w-full h-105">
            <ReactECharts
              option={option}
              onEvents={onEvents}
              style={{ height: '100%', width: '100%' }}
              notMerge={false}
              lazyUpdate
            />
          </div>

          {/* Info panel */}
          <div className="rounded-xl border border-border bg-card2 p-4 min-h-18 flex items-start">
            <div className={`w-full transition-all duration-300 ${activeDisplay ? 'opacity-100 translate-y-0' : 'opacity-60'}`}>
              {activeDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <span
                    className="font-display font-black text-xs uppercase tracking-widest"
                    style={{ color: activeDisplay.color }}
                  >
                    {activeDisplay.name}
                  </span>
                  <p className="font-sans text-sm text-text2 leading-relaxed">
                    {activeDisplay.explanation ?? 'No additional information available.'}
                  </p>
                </div>
              ) : (
                <span className="font-mono text-xs text-text2 uppercase tracking-widest">
                  Hover any allocation to learn more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestedPieChart;
