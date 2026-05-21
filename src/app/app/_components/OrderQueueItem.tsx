'use client';

import React from 'react';
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
    <div
      draggable
      onDragStart={() => onDragStart(groupIdx)}
      onDragOver={(e) => onDragOver(e, groupIdx)}
      onDragEnd={onDragEnd}
      className={`order-queue-row cursor-grab active:cursor-grabbing transition-all
        ${draggedGroupIdx === groupIdx ? 'opacity-40 ring-1 ring-primary/20' : ''}
        ${localFill === 0 ? 'grayscale opacity-40' : ''}
      `}
    >
      {/* Col 1: Drag Handle */}
      <div className="drag-handle-texture">
        <span /><span /><span />
      </div>

      {/* Col 2: Price + Maker rank */}
      <div className="flex flex-col gap-1.5">
        <span className={`text-[11px] font-mono font-bold ${group.isBuy ? 'text-green' : 'text-red'}`}>
          ${parseFloat(group.unitPrice).toFixed(4)}
        </span>
        {stats ? (
          <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="sm" />
        ) : (
          <span className="text-[8px] text-text2 animate-pulse">Loading...</span>
        )}
      </div>

      {/* Col 3: Fill amounts */}
      <div className="flex flex-col justify-center">
        <span className="text-[11px] font-mono font-bold text-text tabular-nums">
          {localFill.toLocaleString()}
          <span className="text-text2/60"> / {group.amount.toLocaleString()}</span>
        </span>
        <span className="text-[9px] font-mono uppercase text-text2/50 mt-0.5">FIM Fill</span>
      </div>

      {/* Col 4: Shift controls + remove */}
      <div className="flex items-center gap-1">
        {groupCount > 1 && (
          <>
            <button
              onClick={() => onMoveGroup(groupIdx, -1)}
              disabled={groupIdx === 0}
              className="bg-text/50 p-1 px-1.5 rounded text-bg text-[8px] hover:bg-gold hover:text-bg transition-colors disabled:opacity-30"
            >▲</button>
            <button
              onClick={() => onMoveGroup(groupIdx, 1)}
              disabled={groupIdx === groupCount - 1}
              className="bg-text/50 p-1 px-1.5 rounded text-bg text-[8px] hover:bg-gold hover:text-bg transition-colors disabled:opacity-30"
            >▼</button>
          </>
        )}
        <button
          onClick={() => onRemoveGroup(group)}
          className="text-text2 hover:text-red ml-1 p-1 text-base leading-none transition-colors"
        >×</button>
      </div>
    </div>
  );
}
