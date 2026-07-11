'use client';

import { useEffect, useRef, useState } from 'react';
import { useBlock } from 'wagmi';

import { useTenantChainId } from '@/context/TenantContext';

/**
 * Current time **on the chain's clock**, in unix seconds, advanced smoothly
 * every second.
 *
 * Every on-chain deadline (auction end, trading start/end, settlement/review
 * windows, claim deadline) is expressed against `block.timestamp`. Comparing
 * those to the browser's `Date.now()` is only valid when the chain's clock
 * tracks wall-clock time. In **fork mode** it does not: an Anvil fork is pinned
 * to the `block.timestamp` of the block it forked from — often days behind real
 * time — and only advances as blocks are mined. Using `Date.now()` there makes
 * every countdown collapse to "FINALIZING"/"elapsed" while the chain still
 * considers the phase open. Use this hook for any comparison against an
 * on-chain timestamp.
 *
 * Real-world deadlines that do NOT come from the chain (e.g. a Discourse poll
 * close time) must keep using `Date.now()` — do not route those through here.
 *
 * Implementation: anchor to the latest block's timestamp paired with the real
 * time we observed it, then tick `anchor.chain + (realNow - anchor.real)` every
 * second. This keeps a live, smooth clock between the periodic block refetches
 * while staying pinned to chain time. Returns 0 until the first block loads.
 */
export function useChainTime(refetchIntervalMs = 10000): number {
  const chainId = useTenantChainId();
  const { data: blockData } = useBlock({ chainId, query: { refetchInterval: refetchIntervalMs } });

  const [chainTs, setChainTs] = useState(0);
  const anchor = useRef<{ chain: number; real: number } | null>(null);

  useEffect(() => {
    if (blockData?.timestamp) {
      const chain = Number(blockData.timestamp);
      const real = Math.floor(Date.now() / 1000);
      anchor.current = { chain, real };
      setChainTs(chain);
    }
  }, [blockData?.timestamp]);

  useEffect(() => {
    const id = setInterval(() => {
      if (anchor.current) {
        const elapsed = Math.floor(Date.now() / 1000) - anchor.current.real;
        setChainTs(anchor.current.chain + elapsed);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return chainTs;
}
