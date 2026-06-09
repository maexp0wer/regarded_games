'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Order } from '@/hooks/useOrderBook';
import { PercentileData } from '@/hooks/useBatchPlayerPercentiles';
import { PercentileCircle } from './PercentileCircle';

export interface GroupedOrder extends Order {
  ids: string[];
  orders: Order[];
  unitPrice: string;
}

interface OrderQueueItemProps {
  group: GroupedOrder;
  groupIdx: number;
  groupCount: number;
  draggedGroupIdx: number | null;
  targetAmount: string;
  filledBefore: number;
  stats: PercentileData | undefined;
  onMoveGroup: (idx: number, direction: -1 | 1) => void;
  onRemoveGroup: (group: GroupedOrder) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}

export function OrderQueueItem({
  group, groupIdx, groupCount, draggedGroupIdx, targetAmount, filledBefore,
  stats, onMoveGroup, onRemoveGroup, onDragStart, onDragOver, onDragEnd
}: OrderQueueItemProps) {
  const limit = Number(targetAmount) || Infinity;
  const localFill = Math.max(0, Math.min(group.amount, limit - filledBefore));

  return (
    <motion.div
      layout
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      draggable
      onDragStart={() => onDragStart(groupIdx)}
      onDragOver={(e) => onDragOver(e, groupIdx)}
      onDragEnd={onDragEnd}
      className={`grid grid-cols-[auto_2fr_2fr_2fr_auto] items-center gap-3 p-[0.6rem] bg-card3 border border-border2 rounded-sm mb-[0.4rem] cursor-grab active:cursor-grabbing
        ${draggedGroupIdx === groupIdx ? 'opacity-40 ring-1 ring-primary/20' : ''}
        ${localFill === 0 ? 'grayscale opacity-40' : ''}
      `}
    >
      {/* Col 1: Drag Handle */}
      <div className="flex flex-col gap-0.5 cursor-grab px-1 [&>span]:w-3 [&>span]:h-0.5 [&>span]:bg-border2 [&>span]:rounded-[1px]">
        <span /><span /><span />
      </div>

      {/* Col 2: Price + Maker rank */}
      <div className="flex flex-col gap-1.5">
        {stats ? (
          <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="xxs" />
        ) : (
          <span className="text-[8px] text-text2 animate-pulse">Loading...</span>
        )}
      </div>

      {/* Col 2: Maker rank */}
      <div className="flex flex-col gap-1.5">
        <span className={`text-[11px] font-mono font-bold ${group.isBuy ? 'text-green' : 'text-red'}`}>
          ${parseFloat(group.unitPrice).toFixed(4)}
        </span>
      </div>

      {/* Col 3: Fill amounts */}
      <div className="flex flex-col justify-center">
        <span className="text-[11px] font-mono font-bold text-text tabular-nums">
          {localFill.toLocaleString()}
          <span className="text-text2/60"> / {group.amount.toLocaleString()}</span>
        </span>
      </div>

      {/* Col 4: Shift controls + remove */}
      <div className="flex items-center gap-1">
        {groupCount > 1 && (
          <div className="flex flex-col">
            <button
              onClick={() => onMoveGroup(groupIdx, -1)}
              disabled={groupIdx === 0}
              className="btn-stepper"
            >▲</button>
            <button
              onClick={() => onMoveGroup(groupIdx, 1)}
              disabled={groupIdx === groupCount - 1}
              className="btn-stepper"
            >▼</button>
          </div>
        )}
        <button
          onClick={() => onRemoveGroup(group)}
          className="text-text2 hover:text-red ml-1 p-1 text-base leading-none transition-colors"
        >×</button>
      </div>
    </motion.div>
  );
}