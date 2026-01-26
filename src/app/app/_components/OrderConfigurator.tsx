'use client';

import { Order } from "@/hooks/useOrderBook";

interface ConfiguratorProps {
  selectedOrders: Order[];
  targetAmount: string;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

export function OrderConfigurator({ selectedOrders, targetAmount, onRemove, onMove }: ConfiguratorProps) {
  let needed = Number(targetAmount || 0);

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[400px] flex flex-col">
      <h3 className="text-xs font-bold uppercase text-text2 mb-4">Trade Configuration</h3>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {selectedOrders.map((order, index) => {
          // Logic: How much of this order do we need?
          const fillAmount = Math.min(needed, order.amount);
          needed = Math.max(0, needed - fillAmount);
          const isPartial = fillAmount < order.amount && fillAmount > 0;
          const isUnused = fillAmount === 0 && Number(targetAmount) > 0;

          return (
            <div key={order.id} className={`p-3 rounded bg-card2 border ${isUnused ? 'border-border opacity-50' : 'border-primary/30'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-primary font-bold">Price: {order.price}</span>
                <button onClick={() => onRemove(order.id)} className="text-danger hover:bg-danger/10 px-2 rounded">×</button>
              </div>
              
              <div className="flex justify-between text-[10px] text-text2 uppercase">
                <span>Available: {order.amount.toFixed(2)}</span>
                <span className={isPartial ? "text-warning font-bold" : "text-text"}>
                  Fill: {fillAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-1 mt-2">
                <button 
                  onClick={() => onMove(index, -1)} 
                  disabled={index === 0}
                  className="bg-card hover:bg-border px-2 py-0.5 rounded text-[10px] disabled:opacity-30"
                >▲</button>
                <button 
                  onClick={() => onMove(index, 1)} 
                  disabled={index === selectedOrders.length - 1}
                  className="bg-card hover:bg-border px-2 py-0.5 rounded text-[10px] disabled:opacity-30"
                >▼</button>
              </div>
            </div>
          );
        })}
        {selectedOrders.length === 0 && <p className="text-xs text-text2 text-center pt-10">Select orders from Order Book</p>}
      </div>
    </div>
  );
}