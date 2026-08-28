/* Server-side treasury figures for the public /treasury page.
 *
 * Three bands, and the distinction between them is the point:
 *   1. CUSTODIED — season principal deployed to Aave and the yield it earned.
 *      This is PLAYERS' prize-pool money under management, not protocol-owned.
 *   2. FLOWS — where harvested yield went, lifetime, split four ways.
 *   3. HOLDINGS — what the Treasury contract holds right now. Protocol-owned.
 * Presenting 1 as "the treasury" would overstate what the DAO owns by the whole
 * prize pool, so the page keeps them apart and so does this module.
 *
 * Mainnet only, always: lifetime buybacks denominated in Sepolia play money are
 * meaningless, and the page has no tenant switcher. */

import { unstable_cache } from 'next/cache';
import { formatUnits, erc20Abi } from 'viem';
import type { Abi } from 'abitype';

import TreasuryAbiJson from '@/deployments/abis/Treasury.json';
import { TENANTS } from '@/config/tenants';
import { serverPublicClient } from './serverRpc';
import { fetchAllPonderItems } from './ponder';
import {
  treasuryHoldings,
  rgdUsdcPair,
  ZERO_ADDRESS,
  type HoldingToken,
} from '@/config/treasuryHoldings';

const TreasuryAbi = TreasuryAbiJson as Abi;

/** Minimal UniswapV2 pair surface — reserves price RGD and value the LP position. */
const PAIR_ABI = [
  {
    type: 'function',
    name: 'getReserves',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  { type: 'function', name: 'token0', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

const USDC_DECIMALS = 6;

export interface Holding {
  symbol: string;
  label: string;
  /** Raw balance, formatted to the token's own decimals. */
  amount: string;
  /** USD equivalent, or null when it can't be priced (no liquidity yet). */
  usd: number | null;
}

export interface TreasuryReport {
  /* Band 1 — custodied player funds. */
  principalDeployed: string | null;
  lifetimeYield: string | null;
  /* Band 2 — lifetime yield split. */
  flows: { label: string; amount: string }[];
  /* Band 3 — protocol-owned holdings. */
  holdings: Holding[];
  /** Indicative RGD spot from the pair, null when the pool is empty/absent. */
  rgdUsdPrice: number | null;
  /** True when nothing has been indexed or deployed yet (pre-Season-01). */
  isEmpty: boolean;
  /** Non-fatal problems, surfaced as a notice rather than a blank page. */
  errors: string[];
}

interface YieldEventRow {
  buybackAmt: string;
  liquidityAmt: string;
  reinvestAmt: string;
  daoAmt: string;
}

/* No seasonAddress filter — the per-season variant lives in useYieldTotals.
   This is the lifetime aggregate across every season. */
const LIFETIME_YIELD_QUERY = `
  query GetAllYieldEvents($after: String, $limit: Int!) {
    yieldEventss(after: $after, limit: $limit) {
      items { buybackAmt liquidityAmt reinvestAmt daoAmt }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const usd = (raw: bigint, decimals = USDC_DECIMALS) => Number(formatUnits(raw, decimals));

/** Seconds a built report stays warm. Matches the page's `revalidate`. */
export const TREASURY_TTL_SECONDS = 300;

/* The page-level `revalidate` export cannot do this job: the root layout calls
   headers(), which makes every route dynamic, so the page re-renders per
   request. Caching the DATA is what actually keeps the RPC and indexer at two
   reads per window instead of one per visitor. */
export const getTreasuryReport = unstable_cache(
  () => buildTreasuryReport(),
  ['treasury-report'],
  { revalidate: TREASURY_TTL_SECONDS, tags: ['treasury'] },
);

async function buildTreasuryReport(): Promise<TreasuryReport> {
  const tenant = TENANTS.mainnet;
  const errors: string[] = [];

  /* ---- Band 1: Treasury globals ---------------------------------------- */
  let principalDeployed: string | null = null;
  let lifetimeYield: string | null = null;
  try {
    const client = serverPublicClient('mainnet');
    const [principal, accrued] = await Promise.all([
      client.readContract({
        address: tenant.deployment.Treasury,
        abi: TreasuryAbi,
        functionName: 'totalGlobalPrincipal',
      }) as Promise<bigint>,
      client.readContract({
        address: tenant.deployment.Treasury,
        abi: TreasuryAbi,
        functionName: 'totalAccruedYield',
      }) as Promise<bigint>,
    ]);
    principalDeployed = formatUnits(principal, USDC_DECIMALS);
    lifetimeYield = formatUnits(accrued, USDC_DECIMALS);
  } catch (e) {
    errors.push('Treasury contract state is temporarily unavailable.');
    console.error('[treasury] contract read failed:', e instanceof Error ? e.message : e);
  }

  /* ---- Band 2: lifetime yield split ------------------------------------ */
  let flows: { label: string; amount: string }[] = [];
  try {
    const rows = await fetchAllPonderItems<YieldEventRow>(
      tenant.ponderUrl,
      LIFETIME_YIELD_QUERY,
      {},
      (d) => d.yieldEventss,
    );
    let buyback = 0n, liquidity = 0n, reinvest = 0n, dao = 0n;
    for (const r of rows) {
      buyback   += BigInt(r.buybackAmt   || '0');
      liquidity += BigInt(r.liquidityAmt || '0');
      reinvest  += BigInt(r.reinvestAmt  || '0');
      dao       += BigInt(r.daoAmt       || '0');
    }
    /* Labels lifted verbatim from LendingDistributionCard so the public page and
       the in-app per-season card name the same four slices identically. */
    flows = [
      { label: 'Buyback',          amount: formatUnits(buyback,   USDC_DECIMALS) },
      { label: 'Liquidity',        amount: formatUnits(liquidity, USDC_DECIMALS) },
      { label: 'Prize Pool Bonus', amount: formatUnits(reinvest,  USDC_DECIMALS) },
      { label: 'DAO Treasury',     amount: formatUnits(dao,       USDC_DECIMALS) },
    ];
  } catch (e) {
    errors.push('Yield history is temporarily unavailable.');
    console.error('[treasury] ponder query failed:', e instanceof Error ? e.message : e);
  }

  /* ---- Band 3: live holdings ------------------------------------------- */
  const { holdings, rgdUsdPrice } = await readHoldings(errors);

  const isEmpty =
    !principalDeployed &&
    flows.every((f) => Number(f.amount) === 0) &&
    holdings.length === 0;

  return { principalDeployed, lifetimeYield, flows, holdings, rgdUsdPrice, isEmpty, errors };
}

async function readHoldings(
  errors: string[],
): Promise<{ holdings: Holding[]; rgdUsdPrice: number | null }> {
  const tenant = TENANTS.mainnet;
  const treasury = tenant.deployment.Treasury;

  // Placeholder entries stay out of the report entirely — see treasuryHoldings.
  const tokens = treasuryHoldings('mainnet').filter((t) => t.address !== ZERO_ADDRESS);
  if (tokens.length === 0) return { holdings: [], rgdUsdPrice: null };

  let client: ReturnType<typeof serverPublicClient>;
  try {
    client = serverPublicClient('mainnet');
  } catch (e) {
    errors.push('Treasury holdings are temporarily unavailable.');
    console.error('[treasury] rpc unavailable:', e instanceof Error ? e.message : e);
    return { holdings: [], rgdUsdPrice: null };
  }

  const balances = await Promise.all(
    tokens.map((t) =>
      client
        .readContract({ address: t.address, abi: erc20Abi, functionName: 'balanceOf', args: [treasury] })
        .catch(() => null),
    ),
  );

  const pricing = await readPairPricing(client, errors);

  const holdings: Holding[] = [];
  tokens.forEach((t, i) => {
    const raw = balances[i];
    if (raw === null) return;
    holdings.push({
      symbol: t.symbol,
      label: t.label,
      amount: formatUnits(raw as bigint, t.decimals),
      usd: priceHolding(t, raw as bigint, pricing),
    });
  });

  return { holdings, rgdUsdPrice: pricing?.rgdUsd ?? null };
}

interface PairPricing {
  rgdUsd: number;
  /** USD value of one whole LP token. */
  lpUnitUsd: number;
}

async function readPairPricing(
  client: ReturnType<typeof serverPublicClient>,
  errors: string[],
): Promise<PairPricing | null> {
  const pair = rgdUsdcPair('mainnet');
  if (!pair) return null;

  try {
    const [reserves, token0, supply] = await Promise.all([
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'getReserves' }),
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token0' }),
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'totalSupply' }),
    ]);

    const usdcAddr = TENANTS.mainnet.deployment.USDC.toLowerCase();
    const usdcIsToken0 = (token0 as string).toLowerCase() === usdcAddr;
    const [r0, r1] = reserves as unknown as [bigint, bigint, number];
    const usdcReserve = usdcIsToken0 ? r0 : r1;
    const rgdReserve = usdcIsToken0 ? r1 : r0;
    const lpSupply = supply as bigint;

    // An unseeded or drained pool prices nothing; say so rather than dividing by zero.
    if (usdcReserve === 0n || rgdReserve === 0n || lpSupply === 0n) return null;

    const usdcVal = usd(usdcReserve, USDC_DECIMALS);
    const rgdVal = Number(formatUnits(rgdReserve, 18));
    const rgdUsd = usdcVal / rgdVal;
    // Constant-product pool: total value is both sides, which is 2x the USDC leg.
    const lpUnitUsd = (usdcVal * 2) / Number(formatUnits(lpSupply, 18));

    return { rgdUsd, lpUnitUsd };
  } catch (e) {
    errors.push('RGD pricing is temporarily unavailable.');
    console.error('[treasury] pair read failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

function priceHolding(token: HoldingToken, raw: bigint, pricing: PairPricing | null): number | null {
  switch (token.pricing) {
    case 'usd-pegged':
      return usd(raw, token.decimals);
    case 'rgd-spot':
      return pricing ? Number(formatUnits(raw, token.decimals)) * pricing.rgdUsd : null;
    case 'lp-share':
      return pricing ? Number(formatUnits(raw, token.decimals)) * pricing.lpUnitUsd : null;
  }
}
