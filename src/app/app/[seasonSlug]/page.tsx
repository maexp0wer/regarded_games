'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

// Hooks / ABIs
import { useSeasonGini, useSeasonById } from '@/hooks/useSeasonGini';
import { Order } from '@/hooks/useOrderBook';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useYieldTotals } from '@/hooks/useYieldTotals';

// Components
import { SeasonHeader } from '../_components/SeasonHeader';
import { GiniDisplay } from '../_components/GiniDisplay';
import { SeasonDetails } from '../_components/SeasonDetails';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { OrderBook } from '../_components/OrderBook';
import { TradingActivityFeed } from '../_components/TradingActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { OpenOrders } from '../_components/OpenOrders';
import { PayoutMask } from '../_components/PayoutMask';
import PlayerRankDisplay from '../_components/PlayerRankDisplay';
import { FactionDiscussionBoard } from '../_components/FactionDiscussionBoard';
import { FactionChat } from '../_components/FactionChat';

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN HOOK  (returns d/h/m/s, updates every second)
// ─────────────────────────────────────────────────────────────────────────────
function useCountdown(targetTimestamp: number) {
  const [parts, setParts] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, targetTimestamp - now);
      setParts({
        days:    Math.floor(diff / 86400),
        hours:   Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return parts;
}

const pad = (n: number) => String(n).padStart(2, '0');

// ─────────────────────────────────────────────────────────────────────────────
// PRIZE POOL CARD  (centre hero card)
// ─────────────────────────────────────────────────────────────────────────────
function PrizePoolCard({
  seasonAddress,
  prizePool,
  currentPhase,
}: {
  seasonAddress: string;
  prizePool: number;
  currentPhase: string | null;
}) {
  const isPayout = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const { data: yieldTotals } = useYieldTotals(seasonAddress, currentPhase);
  const rawReinvest = BigInt(yieldTotals?.reinvest || '0');
  const hasYield = isPayout && rawReinvest > 0n;
  const reinvestFormatted = parseFloat(formatUnits(rawReinvest, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="card-app relative flex flex-col justify-between text-center overflow-hidden"
      style={{
        background:
          'radial-gradient(400px 200px at 50% 100%, rgba(245,184,0,0.08), transparent 60%), linear-gradient(180deg, var(--color-card2), var(--color-card))',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* grid-line watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(245,184,0,0.04) 0 1px, transparent 1px 40px)',
        }}
      />

      {/* label */}
      <div className="relative section-label justify-center">
        <span className="tick" />
        {hasYield ? 'Total Prize Pool + Yield Bonus' : 'Total Prize Pool'}
      </div>

      {/* big figure */}
      <p
        className="relative font-display font-extrabold leading-none tracking-[-0.04em] text-gold m-0"
        style={{
          fontSize: 'clamp(40px, 7vw, 84px)',
          textShadow: '0 0 40px rgba(245,184,0,0.25)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span
          style={{
            fontSize: '0.5em',
            verticalAlign: '0.4em',
            color: 'var(--color-gold-soft)',
            marginRight: 4,
          }}
        >
          $
        </span>
        {prizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      {/* yield bonus */}
      {hasYield ? (
        <p className="relative font-mono text-[12px] text-text2 m-0">
          Yield Bonus{' '}
          <b className="text-green ml-1 font-semibold">+${reinvestFormatted}</b>
        </p>
      ) : (
        <div />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN CARD  (right hero card)
// ─────────────────────────────────────────────────────────────────────────────
function CountdownCard({
  tradingStart,
  seasonEnd,
  isAuction,
  isBootstrap,
  isPayout,
  isVictoryPending,
}: {
  tradingStart: number;
  seasonEnd: number;
  isAuction: boolean;
  isBootstrap: boolean;
  isPayout: boolean;
  isVictoryPending: boolean;
}) {
  const showBootstrapWarning = isBootstrap && !isAuction;
  const targetTime = isAuction || isBootstrap ? tradingStart : seasonEnd;
  const { days, hours, minutes, seconds } = useCountdown(targetTime);

  const labelText = isAuction
    ? 'Auction Ends In'
    : isPayout
    ? 'Season'
    : 'Season Ends In';

  return (
    <div className="card-app flex flex-col justify-between gap-4">
      <div className="section-label">
        <span className="tick" style={{ background: 'var(--color-pink)' }} />
        {labelText}
      </div>

      {isPayout ? (
        <div className="flex flex-col items-start gap-1">
          <p className="font-display font-extrabold text-3xl text-text m-0">Concluded</p>
        </div>
      ) : showBootstrapWarning ? (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-warning font-semibold m-0">
            Season On Hold
          </p>
          <p className="font-sans text-xs text-text2 leading-snug m-0">
            Trading paused during Gini verification.
          </p>
        </div>
      ) : isVictoryPending ? (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-gold font-semibold m-0">
            Settlement Pending
          </p>
          <p className="font-sans text-xs text-text2 leading-snug m-0">
            Victory condition met. Preparing Payout Phase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <div className="cd-cell">
            <div className="cd-num">{pad(days)}</div>
            <div className="cd-unit">Days</div>
          </div>
          <div className="cd-cell">
            <div className="cd-num">{pad(hours)}</div>
            <div className="cd-unit">Hrs</div>
          </div>
          <div className="cd-cell">
            <div className="cd-num">{pad(minutes)}</div>
            <div className="cd-unit">Min</div>
          </div>
          <div className="cd-cell danger">
            <div className="cd-num">{pad(seconds)}</div>
            <div className="cd-unit">Sec</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };

  // 1. Routing & metadata
  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);
  const { address: userAddress } = useAccount();

  const seasonAddress  = metadata?.address         as `0x${string}` | undefined;
  const auctionAddress = metadata?.auctionAddress  as `0x${string}` | undefined;
  const exchangeAddress= metadata?.exchangeAddress as `0x${string}` | undefined;
  const fimAddress     = metadata?.fimAddress      as `0x${string}` | undefined;

  // 2. Trading state (lifted)
  const [isBuy, setIsBuy] = useState(true);
  const [isMaker, setIsMaker] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  // 3. Trading handlers
  const handleSelectOrder = (order: Order) => {
    if (!selectedOrders.find((o) => o.id === order.id))
      setSelectedOrders((prev) => [...prev, order]);
  };
  const handleRemoveOrder = (id: string) =>
    setSelectedOrders((prev) => prev.filter((o) => o.id !== id));
  const handleMoveOrder = (index: number, direction: -1 | 1) => {
    const next = [...selectedOrders];
    if (index + direction < 0 || index + direction >= next.length) return;
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setSelectedOrders(next);
  };
  const handleReorderOrders = (orders: Order[]) => setSelectedOrders(orders);

  // 4. Data fetching
  const { data: giniData,  isLoading: isGiniLoading   } = useSeasonGini(seasonAddress);

  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!seasonAddress, staleTime: Infinity },
  });

  const { data: gInitialRaw, refetch: refetchGInitial } = useReadContract({
    address: seasonAddress,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    query: { enabled: !!seasonAddress },
  });

  const { data: finalProgressBpsRaw } = useReadContract({
    address: seasonAddress,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
    query: { enabled: !!seasonAddress },
  });

  const { data: isOligarchyWinRaw } = useReadContract({
    address: seasonAddress,
    abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin',
    query: { enabled: !!seasonAddress },
  });

  const { data: phase, isLoading: isPhaseLoading } = useReadContract({
    address: seasonAddress,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!seasonAddress, refetchInterval: 3000 },
  });

  const { data: myOrders, refetch: refetchOpenOrders } = useOpenOrders(seasonAddress, userAddress);
  const hasOrders = myOrders && myOrders.length > 0;

  const { data: percentilesMap } = useBatchPlayerPercentiles(
    seasonAddress,
    userAddress ? [userAddress] : []
  );
  const factionData = userAddress ? percentilesMap?.[userAddress.toLowerCase()] : undefined;

  // JIT faction sync
  useEffect(() => {
    if (!userAddress || !factionData) return;
    fetch('/api/discourse/sync-faction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: userAddress, seasonAddress, fimAddress, seasonSlug }),
    }).catch((e) => console.error('JIT Sync Failed:', e));
  }, [userAddress, factionData?.isCapitalist]);

  // Phase change effect
  useEffect(() => {
    if (phase === 'TRADING') refetchGInitial();
  }, [phase, refetchGInitial]);

  // 5. Gini calculations
  const {
    config,
    gCurrent,
    gInitial,
    capTargetBps,
    socTargetBps,
    M_dynamic,
    progressPercent,
    winningSide,
    isVictoryPending,
  } = useMemo(() => {
    const safeDefaults = {
      config: null,
      gCurrent: 5000,
      gInitial: 5000,
      capTargetBps: 0,
      socTargetBps: 0,
      M_dynamic: 0,
      progressPercent: 0,
      winningSide: 'none' as 'soc' | 'cap' | 'none',
      isVictoryPending: false,
    };
    if (!rawConfig) return safeDefaults;

    const currentPhase = phase as string;
    const isAuction = currentPhase === 'AUCTION' || currentPhase === 'BOOTSTRAP';
    const isTradingPhase = currentPhase === 'TRADING';
    const isPayoutPhase = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';

    const r = rawConfig as any;
    const getVal = (key: string, index: number) => (r[key] !== undefined ? r[key] : r[index]);

    const cfg = {
      createdAt:          Number(getVal('createdAt', 0)),
      auctionDuration:    Number(getVal('auctionDuration', 1)),
      gameDuration:       Number(getVal('gameDuration', 2)),
      victoryThresholdBps:Number(getVal('victoryThresholdBps', 3)),
      baseBeta:           Number(getVal('beta', 4)),
      buybackBps:         Number(getVal('buybackBps', 5)),
      liquidityBps:       Number(getVal('liquidityBps', 6)),
      reinvestBps:        Number(getVal('reinvestBps', 7)),
      daoBps:             Number(getVal('daoBps', 8)),
    };

    const rawGini = giniData?.gini || 0;
    const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
    const playerCount = giniData?.playerCount || 0;

    let gCurrVal = 0, gInitVal = 0;

    if (isAuction) {
      gCurrVal = playerCount === 0 ? 5000 : rawGini;
      gInitVal = gCurrVal;
    } else if (isPayoutPhase && finalProgressBpsRaw !== undefined && isOligarchyWinRaw !== undefined) {
      gInitVal = rawGInit;
      const gI = gInitVal / 10000;
      const V2 = cfg.victoryThresholdBps / 10000;
      const rawBeta2 = cfg.baseBeta / 10000;
      const M2 = rawBeta2 + Math.pow(1 - gI, 2);
      const capT = (gI + V2 * (1 - gI)) * 10000;
      const socT = (gI * (1 - (M2 > 0 ? V2 / M2 : 0))) * 10000;
      const finalProg = Number(finalProgressBpsRaw) / 10000;
      gCurrVal = isOligarchyWinRaw
        ? Math.round(gInitVal + (capT - gInitVal) * finalProg)
        : Math.round(gInitVal - (gInitVal - socT) * finalProg);
    } else {
      gInitVal = rawGInit;
      gCurrVal = rawGini;
    }

    const gI_Norm = gInitVal / 10000;
    const V = cfg.victoryThresholdBps / 10000;
    const rawBeta = cfg.baseBeta / 10000;
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);

    const capTargetNorm = gI_Norm + V * (1 - gI_Norm);
    const socTerm = M > 0 ? V / M : 0;
    const socTargetNorm = gI_Norm * (1 - socTerm);
    const capTarget = capTargetNorm * 10000;
    const socTarget = socTargetNorm * 10000;

    let prog = 0, side: 'soc' | 'cap' | 'none' = 'none';
    if (!isAuction) {
      if (gCurrVal > gInitVal) {
        side = 'cap';
        const dist = capTarget - gInitVal, covered = gCurrVal - gInitVal;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
      } else if (gCurrVal < gInitVal) {
        side = 'soc';
        const dist = gInitVal - socTarget, covered = gInitVal - gCurrVal;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
      }
    }

    const victoryConditionMet = isTradingPhase && (gCurrVal >= capTarget || gCurrVal <= socTarget);

    return {
      config: cfg,
      gCurrent: gCurrVal,
      gInitial: gInitVal,
      capTargetBps: capTarget,
      socTargetBps: socTarget,
      M_dynamic: M,
      progressPercent: Math.min(Math.max(prog, 0), 100),
      winningSide: side,
      isVictoryPending: victoryConditionMet,
    };
  }, [giniData, rawConfig, gInitialRaw, phase, finalProgressBpsRaw, isOligarchyWinRaw]);

  // 6. Phase flags
  const currentPhase = phase as string;
  const isAuctionOrBootstrap = currentPhase === 'AUCTION' || currentPhase === 'BOOTSTRAP';
  const isAuction = currentPhase === 'AUCTION';
  const isTrading  = currentPhase === 'TRADING';
  const isPayout   = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';

  const tradingStart = (config?.createdAt || 0) + (config?.auctionDuration || 0);
  const seasonEnd    = (config?.createdAt || 0) + (config?.auctionDuration || 0) + (config?.gameDuration || 0);

  const formattedName = seasonSlug?.replace(/_/g, ' ') || 'Season Dashboard';

  // 7. Loading / error states
  if (isMetaLoading || isGiniLoading || isConfigLoading || isPhaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary animate-pulse font-mono text-sm uppercase tracking-widest">
        Reading Ledger…
      </div>
    );
  }

  if (!seasonAddress || !exchangeAddress || !fimAddress || !auctionAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text2 text-center font-mono text-sm">
        Blockchain Data Unavailable
      </div>
    );
  }

  // ─── Shared hero props ────────────────────────────────────────────────────
  const heroProps = {
    tradingStart,
    seasonEnd,
    isAuction,
    isBootstrap: isAuctionOrBootstrap,
    isPayout,
    isVictoryPending,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="pt-4 pb-16 space-y-6 animate-in fade-in duration-700">

      {/* ═══════════════════════════════════════════
          HERO ROW — always 3 equal cards
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SeasonHeader
          seasonName={formattedName}
          playerCount={giniData?.playerCount || 0}
          currentPhase={currentPhase}
          isBootstrap={isAuctionOrBootstrap}
          isPayout={isPayout}
        />
        <PrizePoolCard
          seasonAddress={seasonAddress}
          prizePool={giniData?.prizePool || 0}
          currentPhase={currentPhase}
        />
        <CountdownCard {...heroProps} />
      </div>

      {/* ═══════════════════════════════════════════
          AUCTION / BOOTSTRAP LAYOUT
          ═══════════════════════════════════════════ */}
      {isAuctionOrBootstrap && (
        <>
          {/* Main row: buy widget | gini gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.55fr] gap-6">
            <AuctionMask
              seasonAddress={seasonAddress}
              auctionAddress={auctionAddress}
              fimAddress={fimAddress}
              currentPhase={currentPhase}
            />
            <GiniDisplay
              seasonAddress={seasonAddress}
              gCurrent={gCurrent}
              gInitial={gInitial}
              socTargetBps={socTargetBps}
              capTargetBps={capTargetBps}
              winningSide={winningSide}
              progressPercent={progressPercent}
              currentPhase={currentPhase}
              isAuction={true}
              isBootstrap={isAuctionOrBootstrap}
            />
          </div>

          {/* Bottom row: activity | season details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AuctionActivityFeed seasonAddress={seasonAddress} />
            <div className="lg:col-span-2">
              <SeasonDetails
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
                seasonAddress={seasonAddress}
              />
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          TRADING LAYOUT
          ═══════════════════════════════════════════ */}
      {isTrading && (
        <>
          {/* Trading mask | order book */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TradingMask
              seasonSlug={seasonSlug}
              seasonAddress={seasonAddress}
              exchangeAddress={exchangeAddress}
              fimAddress={fimAddress}
              isBuy={isBuy}
              setIsBuy={setIsBuy}
              isMaker={isMaker}
              setIsMaker={setIsMaker}
              targetAmount={targetAmount}
              setTargetAmount={setTargetAmount}
              selectedOrders={selectedOrders}
              onRemoveOrder={handleRemoveOrder}
              onMoveOrder={handleMoveOrder}
              onReorderOrders={handleReorderOrders}
            />
            <div className="lg:col-span-2">
              <OrderBook
                seasonAddress={seasonAddress}
                isBuy={isBuy}
                isMaker={isMaker}
                onSelectOrder={handleSelectOrder}
              />
            </div>
          </div>

          {/* Open orders (conditional) | Gini */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {hasOrders && (
              <OpenOrders
                orders={myOrders || []}
                exchangeAddress={exchangeAddress}
                onRefresh={refetchOpenOrders}
              />
            )}
            <div className={hasOrders ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <GiniDisplay
                seasonAddress={seasonAddress}
                gCurrent={gCurrent}
                gInitial={gInitial}
                socTargetBps={socTargetBps}
                capTargetBps={capTargetBps}
                winningSide={winningSide}
                progressPercent={progressPercent}
                currentPhase={currentPhase}
                isAuction={false}
                isBootstrap={false}
              />
            </div>
          </div>

          {/* Activity feed | season details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TradingActivityFeed seasonAddress={seasonAddress} />
            <div className="lg:col-span-2">
              <SeasonDetails
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
                seasonAddress={seasonAddress}
              />
            </div>
          </div>

          {/* Faction war room */}
          {factionData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-150">
                <FactionDiscussionBoard
                  seasonSlug={seasonSlug}
                  isCapitalist={factionData.isCapitalist}
                />
              </div>
              <div className="h-150">
                <FactionChat
                  seasonSlug={seasonSlug}
                  isCapitalist={factionData.isCapitalist}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
          PAYOUT / CONCLUDED LAYOUT
          ═══════════════════════════════════════════ */}
      {isPayout && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PayoutMask seasonAddress={seasonAddress} />
            <div className="lg:col-span-2 flex flex-col gap-6">
              <PlayerRankDisplay
                seasonAddress={seasonAddress}
                userAddress={userAddress || ''}
              />
              <GiniDisplay
                seasonAddress={seasonAddress}
                gCurrent={gCurrent}
                gInitial={gInitial}
                socTargetBps={socTargetBps}
                capTargetBps={capTargetBps}
                winningSide={winningSide}
                progressPercent={progressPercent}
                currentPhase={currentPhase}
                isAuction={false}
                isBootstrap={false}
              />
            </div>
          </div>

          <SeasonDetails
            tradingStart={tradingStart}
            seasonEnd={seasonEnd}
            M_dynamic={M_dynamic}
            config={config}
            seasonAddress={seasonAddress}
          />
        </>
      )}

      {/* Footer */}
      <div className="pt-4 flex flex-col items-center gap-2">
        <p className="font-mono text-[10px] text-text2 uppercase tracking-[0.12em] m-0">
          Protocol Reference
        </p>
        <code className="font-mono text-[11px] bg-card2 px-3 py-1 rounded-full text-text2 border border-border">
          {metadata?.address}
        </code>
      </div>
    </main>
  );
}
