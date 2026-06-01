'use client';

import { useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import UniswapV2RouterAbiRaw from '@/deployments/abis/UniswapV2Router.json';

const RouterAbi = UniswapV2RouterAbiRaw as any;

// Returns the price of 1 RGD in USDC (human-readable), or undefined when
// the router doesn't support getAmountsOut (e.g. MockUniswapV2Router on sepolia).
export function useRgdPrice(): number | undefined {
  const { Router, RGD, USDC } = useTenantDeployment();
  const chainId = useTenantChainId();

  const { data } = useReadContract({
    address: Router,
    abi: RouterAbi,
    functionName: 'getAmountsOut',
    args: [parseUnits('1', 18), [RGD, USDC]],
    chainId,
    query: {
      retry: false,
      refetchInterval: 15_000,
    },
  });

  const amounts = data as readonly bigint[] | undefined;
  if (!amounts || amounts.length < 2) return undefined;
  // amounts[1] = USDC received for 1 RGD; USDC has 6 decimals
  return Number(amounts[1]) / 1e6;
}
