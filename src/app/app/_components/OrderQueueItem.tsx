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
      className={`bg-card2 p-3 rounded-lg border flex justify-between items-center cursor-grab active:cursor-grabbing transition-all
        ${draggedGroupIdx === groupIdx ? 'opacity-40 border-text ring-1 ring-primary/20' : 'border-none shadow-sm'}
        ${localFill === 0 ? 'grayscale opacity-40' : 'opacity-100'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="text-text text-[10px]">☰</div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold ${group.isBuy ? 'text-success' : 'text-danger'}`}>
              ${parseFloat(group.unitPrice).toFixed(4)}
            </span>
          </div>
          <span className="text-[11px] text-text2 font-bold uppercase mt-0.5">
            Fill: {localFill.toLocaleString()} / {group.amount.toLocaleString()} FIM
          </span>
        </div>
      </div>

      {stats ? (
        <PercentileCircle
          percentage={stats.factionPercentile}
          isCapitalist={stats.isCapitalist}
          size="md"
        />
      ) : (
        <span className="text-[8px] bg-card2 px-1.5 py-0.5 rounded text-text2 animate-pulse">
          Loading...
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onMoveGroup(groupIdx, -1)}
          disabled={groupIdx === 0}
          className="bg-text/50 p-1 px-2 rounded text-bg text-[8px] hover:bg-primary hover:text-bg transition-colors"
        >▲</button>
        <button
          onClick={() => onMoveGroup(groupIdx, 1)}
          disabled={groupIdx === groupCount - 1}
          className="bg-text/50 p-1 px-2 rounded text-bg text-[8px] hover:bg-primary hover:text-bg transition-colors"
        >▼</button>
        <button
          onClick={() => onRemoveGroup(group)}
          className="text-text2 hover:text-primary ml-1 p-1"
        >×</button>
      </div>
    </div>
  );
}
