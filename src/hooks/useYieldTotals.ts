import { useState, useEffect } from 'react';

export function useYieldTotals(seasonAddress: string | undefined) {
  const [data, setData] = useState({
    buyback: "0",
    liquidity: "0",
    reinvest: "0",
    dao: "0"
  });
  
  // Start loading only if we actually have an address to fetch
  const [loading, setLoading] = useState(!!seasonAddress);

  useEffect(() => {
    if (!seasonAddress) {
        setLoading(false);
        return;
    }

    setLoading(true); // Start loading

    async function fetchTotals() {
      try {
        const res = await fetch(`/api/yield?address=${seasonAddress}`);
        if (!res.ok) throw new Error("API failed");
        
        const json = await res.json();
        
        // Only update if we got valid numbers back
        if (json && typeof json.buyback === 'string') {
          setData(json);
        }
      } catch (err) {
        console.error("Yield fetch error:", err);
      } finally {
        setLoading(false); // Stop loading regardless of success/failure
      }
    }

    fetchTotals();
  }, [seasonAddress]);

  return { data, loading };
}