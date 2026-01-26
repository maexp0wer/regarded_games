'use client';

import { Order, useOrderBook } from "@/hooks/useOrderBook";

export function OrderBook({ 
  seasonAddress, 
  isBuy, 
  isMaker, 
  onSelectOrder 
}: { 
  seasonAddress: string; 
  isBuy: boolean;
  isMaker: boolean;
  onSelectOrder: (o: Order) => void;
}) {
  const { data } = useOrderBook(seasonAddress);
  
  const bids = data?.bids || [];
  const asks = data?.asks || [];

  // Helper to shorten address: 0x1234...5678
  const shortAddr = (addr: string) => `${addr.substring(0, 4)}..${addr.substring(addr.length - 4)}`;

  const Header = () => (
    <div className="grid grid-cols-4 text-[10px] uppercase text-text2 font-bold mb-2 px-2 gap-2">
      <span className="col-span-1">Price (USDC)</span>
      <span className="col-span-1 text-right">Amt (FIM)</span>
      <span className="col-span-1 text-right">Total</span>
      <span className="col-span-1 text-right">Maker (Bal)</span>
    </div>
  );

  const Row = ({ order }: { order: Order }) => (
    <div 
      key={order.id}
      onClick={() => {
        const canClick = !isMaker && isBuy !== order.isBuy;
        if (canClick) onSelectOrder(order);
      }}
      className={`grid grid-cols-4 text-xs px-2 py-1.5 rounded transition-colors gap-2 items-center border-b border-border/20 ${
         !isMaker && isBuy !== order.isBuy 
            ? 'hover:bg-card2 cursor-pointer active:bg-primary/10' 
            : 'opacity-50 cursor-default'
      }`}
    >
      {/* Price */}
      <span className={`col-span-1 font-mono font-bold ${order.isBuy ? 'text-success' : 'text-danger'}`}>
        {order.price.toFixed(4)}
      </span>
      
      {/* Amount */}
      <span className="col-span-1 text-right text-text font-mono">
        {order.amount.toFixed(0)}
      </span>
      
      {/* Total Value */}
      <span className="col-span-1 text-right text-text2 font-mono text-[10px]">
        ${(order.price * order.amount).toFixed(2)}
      </span>

      {/* Maker Info */}
      <div className="col-span-1 flex flex-col items-end leading-none">
        <span className="text-[10px] text-primary font-mono bg-primary/10 px-1 rounded">
            {shortAddr(order.maker)}
        </span>
        <span className="text-[9px] text-text2 mt-0.5" title="Total FIM Balance of Maker">
            {order.makerBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} FIM
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-[600px] flex flex-col">
      <h3 className="text-xs font-bold uppercase text-text2 mb-4 text-center tracking-widest">Order Book</h3>
      
      <Header />

      {/* ASKS (Sells) - Red - Listed Bottom-Up */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col-reverse justify-end min-h-0 border-b border-border/10 pb-2">
        {asks.length === 0 ? (
            <div className="text-center text-[10px] text-text2/50 py-10">No Sellers</div>
        ) : (
            asks.map((order: Order) => <Row key={order.id} order={order} />)
        )}
      </div>

      {/* Spread Indicator */}
      <div className="py-2 text-center text-[10px] font-bold text-text2 border-y border-border bg-card2/50 my-1 uppercase tracking-widest">
        Spread
      </div>

      {/* BIDS (Buys) - Green - Listed Top-Down */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pt-2">
        {bids.length === 0 ? (
            <div className="text-center text-[10px] text-text2/50 py-10">No Buyers</div>
        ) : (
            bids.map((order: Order) => <Row key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}