'use client';

import React, { useState } from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';
import { useSeasonAccrual } from '@/hooks/useSeasonAccrual';
import { useTenantDeployment } from '@/context/TenantContext';
import { identifyYieldVenue } from '@/utils/yieldVenue';

const USDC_DECIMALS = 6;

/* Pinned to en-US rather than the visitor's locale: this renders on the server
   too, and a locale-formatted number is the classic hydration mismatch. */
const formatUSDC = (val: bigint) =>
  parseFloat(formatUnits(val, USDC_DECIMALS)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Ponder returns bigint columns as decimal strings; never trust one to parse. */
const toBigInt = (val: string | undefined) => {
  try { return BigInt(val || '0'); } catch { return 0n; }
};

const DIST_COLORS = ['var(--color-purple)', 'var(--color-gold)','var(--color-magenta)', 'var(--color-orange)'];
const DIST_COLORS_70 = ['var(--color-purple-70)', 'var(--color-gold-70)','var(--color-magenta-70)', 'var(--color-orange-70)'];

/** Aave's ghost mark, stylised to a single silhouette. The eye holes are cut to
    the card surface rather than a fixed colour, so it reads in both themes. */
function AaveGhost({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 22) / 18} viewBox="0 0 18 22" fill="none" aria-hidden="true">
      <path
        d="M9 0C4 0 0 4.4 0 10v12l3-3 3 3 3-3 3 3 3-3 3 3V10c0-5.6-4-10-9-10Z"
        fill="currentColor"
      />
      <circle cx="6.1" cy="9.6" r="1.9" fill="var(--color-card)" />
      <circle cx="11.9" cy="9.6" r="1.9" fill="var(--color-card)" />
    </svg>
  );
}

interface LendingDistributionCardProps {
  seasonAddress: string;
  config: {
    buybackBps: number;
    liquidityBps: number;
    prizePoolBps: number;
    daoBps: number;
  } | null;
}

/**
 * Where the season's idle USDC is deployed, what it has earned there, and how
 * that yield is (or will be) split four ways.
 *
 * The card reads the same season in two phases, and the phase decides what the
 * split means. Before the harvest the streams have received nothing, so the
 * legend projects the live `accruedYield` bucket through the season-locked
 * policy — labelled PROJECTED SPLIT, because none of it has moved yet. At
 * `openDistribution` the season harvests once, the bucket drains into the four
 * streams as `YieldHarvested`, and the legend switches to the booked amounts
 * the indexer recorded — labelled DISTRIBUTED. The headline figure spans both:
 * harvested + still-accruing is everything this season's principal has earned,
 * and the two terms are disjoint by construction (see `useSeasonAccrual`).
 */
export function LendingDistributionCard({ seasonAddress, config }: LendingDistributionCardProps) {
  const { data: yieldTotals } = useYieldTotals(seasonAddress);
  const accrual = useSeasonAccrual(seasonAddress);
  const { Aave } = useTenantDeployment();
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  /* The live `aavePool()` read is authoritative, but the tenant manifest carries
     the same address with no round-trip — seed from it so the badge never
     flashes a Mock marker on mainnet while the read is in flight. */
  const venue = identifyYieldVenue(accrual.poolAddress ?? Aave);

  const harvested = {
    buyback:   toBigInt(yieldTotals?.buyback),
    liquidity: toBigInt(yieldTotals?.liquidity),
    reinvest:  toBigInt(yieldTotals?.reinvest),
    dao:       toBigInt(yieldTotals?.dao),
  };
  const harvestedTotal =
    harvested.buyback + harvested.liquidity + harvested.reinvest + harvested.dao;

  const isDistributed = harvestedTotal > 0n;
  const totalEarned = harvestedTotal + accrual.accruedYield;

  const economicItems = config ? [
    { label: 'Buyback',          value: config.buybackBps,   amt: harvested.buyback },
    { label: 'Liquidity',        value: config.liquidityBps, amt: harvested.liquidity },
    { label: 'Prize Pool Bonus', value: config.prizePoolBps, amt: harvested.reinvest },
    { label: 'DAO Treasury',     value: config.daoBps,       amt: harvested.dao },
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value)
  : [];

  return (
    <div className="terminal-pane h-full">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Lending Distribution</span>
      </div>

      {/* Venue and the running total it has earned. Uncaptioned by design: the
          mark says where the money is, and a figure under a live dot needs no
          label to say what it is. */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border2 bg-card2 text-text2">
            <AaveGhost size={16} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-text">
              {venue.name}
            </span>
            {venue.isMock && <span className="mask-label">Testnet Mock</span>}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${accrual.isAccruing ? 'animate-pulse' : ''}`}
            style={{
              background: 'var(--color-green)',
              opacity: accrual.isAccruing ? 1 : 0.3,
            }}
          />
          <span
            className="font-mono text-[17px] font-bold leading-none text-text"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {`$${formatUSDC(totalEarned)}`}
            <span className="ml-1.5 text-[9px] font-black tracking-[0.14em] text-text2">USDC</span>
          </span>
        </span>
      </div>

      {economicItems.length === 0 ? (
        <p className="section-label mt-4 justify-center pt-2 opacity-30">No active distribution</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3" onMouseLeave={() => setHoveredLabel(null)}>
          {/* Names the bar and the legend under it — and, more to the point,
              whether the amounts on them have actually moved yet. */}
          <span className="mask-label">
            {isDistributed ? 'Distributed' : 'Projected Split'}
          </span>

          <div className="flex h-8 w-full overflow-hidden rounded-md bg-card3">
            {economicItems.map((item, i) => (
              <div
                key={item.label}
                className="h-full cursor-pointer transition-opacity duration-200"
                style={{
                  flex: item.value,
                  background: hoveredLabel === item.label
                    ? DIST_COLORS[i % DIST_COLORS.length]
                    : DIST_COLORS_70[i % DIST_COLORS_70.length],
                }}
                onMouseEnter={() => setHoveredLabel(item.label)}
                onMouseLeave={() => setHoveredLabel(null)}
              />
            ))}
          </div>

          <div className="flex w-full flex-col gap-1">
            {economicItems.map((item, i) => {
              /* Booked once harvested; until then the stream's share of whatever
                 the bucket currently holds. */
              const amount = isDistributed
                ? item.amt
                : (accrual.accruedYield * BigInt(item.value)) / 10000n;
              const fill = DIST_COLORS[i % DIST_COLORS.length];
              const isHovered = hoveredLabel === item.label;
              return (
                <div
                  key={item.label}
                  className="kv-row transition-all duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredLabel(item.label)}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-text2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full transition-transform duration-200"
                      style={{ background: fill, transform: isHovered ? 'scale(1.5)' : 'scale(1)' }}
                    />
                    <span style={{ color: isHovered ? 'var(--color-text)' : 'inherit' }}>
                      {item.label}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] font-semibold" style={{ color: fill, fontVariantNumeric: 'tabular-nums' }}>
                    {amount > 0n ? (
                      <>
                        {`$${formatUSDC(amount)}`}
                        <span className="ml-1 font-normal text-text2">{`(${item.value / 100}%)`}</span>
                      </>
                    ) : `${item.value / 100}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
