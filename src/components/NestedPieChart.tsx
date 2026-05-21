"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

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

const NestedPieChart: React.FC<NestedPieChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  const parentData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    data.forEach(item => {
      if (!map[item.parentName]) {
        map[item.parentName] = { name: item.parentName, value: item.parentPercentage, color: item.parentColor };
      }
    });
    return Object.values(map);
  }, [data]);

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

  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;

    const tier1Items = parentData.map(d => {
      const isFocused = !isAnyHovered
        || (hoveredIndex !== null && data[hoveredIndex].parentName === d.name)
        || (hoveredIndex === null && hoveredParent === d.name);
      return {
        name: d.name,
        value: d.value,
        itemStyle: { color: d.color, opacity: isAnyHovered && !isFocused ? 0.15 : 1 },
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
          color: d.color,
          opacity: isAnyHovered && !isFocused ? 0.15 : 1,
          borderColor: 'var(--color-card)',
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
              `{t1n|${params.name.toUpperCase()}}\n{t1p|${params.value}%}`,
            rich: {
              t1n: { fontSize: 9, fontWeight: 900, color: 'var(--color-text)', lineHeight: 14 },
              t1p: { fontSize: 9, fontWeight: 700, color: 'var(--color-text)', lineHeight: 12 },
            },
          },
          labelLine: { show: false },
          itemStyle: { borderColor: 'var(--color-card)', borderWidth: 6 },
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
              n: { fontSize: 10, fontWeight: 900, color: 'var(--color-card)', lineHeight: 14 },
              p: { fontSize: 9, fontWeight: 700, color: 'var(--color-card)', lineHeight: 12 },
            },
          },
          labelLine: { show: false },
        },
      ],
    };
  }, [data, parentData, hoveredIndex, hoveredParent]);

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
    <div className="flex flex-col lg:flex-row items-start justify-between w-full max-w-7xl p-8 bg-[var(--color-card)] rounded-xl shadow-2xl font-[family-name:var(--font-display)] overflow-visible">
      {/* List section */}
      <div className="w-full lg:w-1/3 mt-8 lg:mt-0 px-4">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-[var(--color-text)] uppercase">Token Distribution</h3>
        </div>
        <ul className="space-y-4">
          {data.map((item, index) => {
            const itemFocused = hoveredIndex === index || (hoveredParent === item.parentName && hoveredIndex === null);
            const isAnyHovered = hoveredIndex !== null || hoveredParent !== null;
            return (
              <li
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="border-b border-[var(--color-border)] last:border-0 pb-4"
                style={{ opacity: isAnyHovered && !itemFocused ? 0.3 : 1 }}
              >
                <div className="flex items-center justify-between cursor-default py-2 gap-4">
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

      {/* Chart section */}
      <div className="w-full lg:w-3/5 flex flex-col items-center">
        <div className="w-full h-[550px] relative">
          <ReactECharts
            option={option}
            onEvents={onEvents}
            style={{ height: '100%', width: '100%' }}
            notMerge={false}
            lazyUpdate
          />
        </div>

        {/* Explanation box */}
        <div className="mt-4 w-full px-12 min-h-[100px] flex flex-col items-center text-center">
          <div className={`transition-all duration-300 ${activeDisplay ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            {activeDisplay && (
              <>
                <h4 className="font-black uppercase tracking-widest text-xs mb-1" style={{ color: activeDisplay.color }}>
                  {activeDisplay.name}
                </h4>
                <p className="text-[var(--color-text2)] text-sm leading-relaxed max-w-md">
                  {activeDisplay.explanation || 'No additional information available.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestedPieChart;
