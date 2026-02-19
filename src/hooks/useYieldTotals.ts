// useYieldTotals.ts
import { useState, useEffect } from 'react';

// Add 'trigger' as a second argument (could be the phase string or a boolean)
export function useYieldTotals(seasonAddress: string | undefined, trigger?: any) {
  const [data, setData] = useState({
    buyback: "0",
    liquidity: "0",
    reinvest: "0",
    dao: "0"
  });
  
  const [loading, setLoading] = useState(!!seasonAddress);

  useEffect(() => {
    if (!seasonAddress) {
        setLoading(false);
        return;
    }

    setLoading(true);

    async function fetchTotals() {
      try {
        // Cache busting: Adding a timestamp helps ensure you don't get 
        // a cached browser response for the API route
        const res = await fetch(`/api/yield?address=${seasonAddress}&t=${Date.now()}`);
        if (!res.ok) throw new Error("API failed");
        
        const json = await res.json();
        
        if (json && typeof json.buyback === 'string') {
          setData(json);
        }
      } catch (err) {
        console.error("Yield fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTotals();
    // ADD 'trigger' HERE:
  }, [seasonAddress, trigger]); 

  return { data, loading };
}