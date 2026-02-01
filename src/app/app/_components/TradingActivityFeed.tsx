'use client';

import { useRecentTrades } from "@/hooks/useRecentTrades";

export function TradingActivityFeed({ seasonAddress }: { seasonAddress: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };

  const short = (addr: string | undefined | null) => {
    if (!addr) return '...';
    return `${addr.substring(0, 4)}..${addr.substring(addr.length - 4)}`;
  };

  // Helper to format large balances (e.g. 1.2k, 500)
  const formatBal = (bal: number) => {
    if (bal >= 1000000) return (bal / 1000000).toFixed(1) + 'M';
    if (bal >= 1000) return (bal / 1000).toFixed(1) + 'k';
    return bal.toFixed(0);
  };

  return (
    <div className="card-app">
                <h3 className="h3-app cardline-app">Recent Activity</h3>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-text2 animate-pulse">
                Scanning Ledger...
            </div>
        ) : !trades || trades.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                <span className="text-xl">📉</span>
                <p className="text-[10px] mt-2 font-bold uppercase text-text2">No Trades Yet</p>
            </div>
        ) : (
            <div className="space-y-2">
                {trades.map((trade) => (
                    <div 
                        key={trade.id} 
                        className="bg-card2/50 p-2 rounded-lg flex justify-between items-center transition-all text-xs"
                    >
                        {/* Price & Volume */}
                        <div className="flex flex-col min-w-[60px]">
                            <span className="font-mono font-bold text-text">
                                ${trade.price.toFixed(4)}
                            </span>
                            <span className="text-[9px] text-text2 font-mono">
                                {trade.amount.toFixed(0)} Vol
                            </span>
                        </div>

                        {/* Flow: Seller -> Buyer (With Balances) */}
                        <div className="flex items-center gap-2 px-1">
                            
                            {/* Seller */}
                            <div className="flex flex-col items-end">
                                <span className="font-mono text-[10px] text-danger/80 bg-danger/5 px-1 rounded">
                                    {short(trade.seller)}
                                </span>
                                <span className="text-[8px] text-text2 font-mono mt-0.5" title="Seller Holding">
                                    {formatBal(trade.sellerBalance)}
                                </span>
                            </div>

                            <span className="text-[8px] text-text2">➔</span>

                            {/* Buyer */}
                            <div className="flex flex-col items-start">
                                <span className="font-mono text-[10px] text-success/80 bg-success/5 px-1 rounded">
                                    {short(trade.buyer)}
                                </span>
                                <span className="text-[8px] text-text2 font-mono mt-0.5" title="Buyer Holding">
                                    {formatBal(trade.buyerBalance)}
                                </span>
                            </div>

                        </div>

                        {/* Time */}
                        <div className="text-[10px] text-text2 font-mono text-right min-w-[40px]">
                            {formatTime(trade.timestamp)}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}