'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatUnits } from 'viem';

import ERC20AbiRaw from '@/deployments/abis/FakeUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import type { Abi } from 'abitype';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { useLifetimeStats } from '@/hooks/useLifetimeStats';
import { usePlayerRank } from '@/hooks/usePlayerRank';
import { useRgdPrice } from '@/hooks/useRgdPrice';

/**
 * Hidden probe: runs the real usePlayerRank for one season the player claimed and
 * reports its rank values up. The Career card mounts one per claimed season so the
 * "best rank" is aggregated from the exact same values Season Stats displays —
 * usePlayerRank can't be called in a loop, so each season gets its own component.
 */
interface SeasonRankResult { rank: number; efficiencyRank: number; loading: boolean }
function SeasonRankProbe({
  seasonAddress,
  playerAddress,
  onResult,
}: {
  seasonAddress: string;
  playerAddress: `0x${string}`;
  onResult: (season: string, r: SeasonRankResult) => void;
}) {
  const { rank, efficiencyRank, loading } = usePlayerRank(seasonAddress, playerAddress);
  useEffect(() => {
    onResult(seasonAddress, { rank, efficiencyRank, loading });
  }, [seasonAddress, rank, efficiencyRank, loading, onResult]);
  return null;
}

const ERC20Abi = ERC20AbiRaw as Abi;
const StakingAbi = StakingAbiRaw as Abi;

interface PlayerProfileProps {
  profileAddress: `0x${string}`;
}


export function PlayerProfile({ profileAddress }: PlayerProfileProps) {
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const coreAddresses = useTenantDeployment();
  const chainId = useTenantChainId();
  const isOwner = connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  const [profile, setProfile] = useState({ name: '', imageUrl: '' });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const displayImageUrl = useMemo(() => {
    if (profile.imageUrl?.trim()) return profile.imageUrl;
    const seed = profile.name?.trim() || profileAddress;
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile.imageUrl, profile.name, profileAddress]);
  useEffect(() => { setAvatarError(false); }, [displayImageUrl]);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const rgdAddr     = coreAddresses.RGD    as `0x${string}`;

  const { data: stakedBalances }   = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances',   args: [profileAddress], chainId });
  const { data: requiredRegStake } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: [profileAddress], chainId });
  const { data: walletBalance }    = useReadContract({ address: rgdAddr,     abi: ERC20Abi,   functionName: 'balanceOf',         args: [profileAddress], chainId });

  const currentStaked = (stakedBalances   as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;
  const currentWallet = (walletBalance    as bigint) ?? 0n;

  const { lifetimePnl, lifetimeVolume, seasonsPlayed, claimedSeasons, loading: statsLoading, error: statsError } = useLifetimeStats(profileAddress);
  const rgdPrice = useRgdPrice();

  // Aggregate the exact usePlayerRank values from each claimed season into the
  // career best. Ranks arrive asynchronously from the per-season probes below.
  const [rankResults, setRankResults] = useState<Record<string, SeasonRankResult>>({});
  const handleRankResult = useCallback((season: string, r: SeasonRankResult) => {
    setRankResults((prev) => (
      prev[season] && prev[season].rank === r.rank && prev[season].efficiencyRank === r.efficiencyRank && prev[season].loading === r.loading
        ? prev
        : { ...prev, [season]: r }
    ));
  }, []);

  const ranksLoading = statsLoading || claimedSeasons.some(
    (s) => !rankResults[s] || rankResults[s].loading,
  );
  const ranked = claimedSeasons
    .map((s) => rankResults[s])
    .filter((r): r is SeasonRankResult => !!r && !r.loading && r.rank > 0);
  const hasRank = ranked.length > 0;
  // Best Absolute = lowest Absolute P&L ordinal; Best Relative = lowest Relative
  // P&L (efficiency) ordinal. Both are the exact ordinals usePlayerRank produces
  // for Season Stats, displayed here as "#N".
  const bestGlobalRank = hasRank ? Math.min(...ranked.map((r) => r.rank)) : -1;
  const efficiencyRanks = ranked.map((r) => r.efficiencyRank).filter((n) => n > 0);
  const bestRelativeRank = efficiencyRanks.length ? Math.min(...efficiencyRanks) : -1;

  const walletUsd = rgdPrice !== undefined
    ? Number(formatUnits(currentWallet, 18)) * rgdPrice
    : undefined;

  useEffect(() => {
    async function fetchProfile() {
      if (!profileAddress) { setProfileLoaded(true); return; }
      try {
        const res = await fetch(`/api/profile?address=${profileAddress.toLowerCase()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data) setProfile({ name: data.name || '', imageUrl: data.image_url || '' });
        }
      } catch (err) { console.error('Load error:', err); }
      finally { setProfileLoaded(true); }
    }
    fetchProfile();
  }, [profileAddress]);

  const handleSaveProfile = async () => {
    if (!isOwner || !profileAddress) return;
    setIsSaving(true);
    try {
      const message = `Update profile: ${profile.name || ''} ${profile.imageUrl || ''}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: profileAddress, name: profile.name || '', imageUrl: profile.imageUrl || '', signature }),
      });
      if (res.ok) setIsEditing(false);
      else alert(`Failed: ${await res.text()}`);
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };


  const pnlPositive = lifetimePnl >= 0;

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-700">

      {/* ── HEADER CARD ── */}
      <div className="terminal-pane md:col-span-2 lg:col-span-1">

        <div className="terminal-pane-header relative flex items-center">
          <span className="terminal-pane-title">Player Profile</span>
          {isOwner && profileLoaded && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute right-0 p-1.5 rounded-lg transition-colors text-text2 hover:text-text pr-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* Left: avatar + identity */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative shrink-0 overflow-hidden rounded-md border border-border2" style={{ width: 64, height: 64 }}>
              <Image
                src={avatarError ? `https://api.dicebear.com/9.x/bottts/svg?seed=${profileAddress}` : displayImageUrl}
                alt="Player Avatar"
                fill
                unoptimized
                className="object-cover"
                onError={() => setAvatarError(true)}
              />
            </div>

            {/* Name / edit */}
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
                      <span className="font-mono text-xs font-bold text-text2 shrink-0">NAME</span>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Player Name"
                        className="flex-1 min-w-0 bg-transparent font-mono text-sm text-text outline-none placeholder:text-text2/40"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
                      <span className="font-mono text-xs font-bold text-text2 shrink-0">IMG</span>
                      <input
                        type="text"
                        value={profile.imageUrl}
                        onChange={(e) => setProfile({ ...profile, imageUrl: e.target.value })}
                        placeholder="Image URL (optional)"
                        className="flex-1 min-w-0 bg-transparent font-mono text-sm text-text outline-none placeholder:text-text2/40"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={isSaving} className="btn-game-secondary disabled:opacity-50 text-xs py-1.5 px-3">
                      {isSaving ? 'Signing…' : 'Save'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="btn-game-secondary text-xs py-1.5 px-3">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <h2 className="h2-app">
                    {profile.name || 'Regarded Anon'}
                  </h2>
                  <button
                    onClick={() => navigator.clipboard.writeText(profileAddress)}
                    className="inline-flex items-center gap-1.5 cursor-copy self-start transition-colors hover:text-gold"
                    title="Copy address"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green" style={{ boxShadow: '0 0 6px var(--color-green)' }} />
                    <span className="font-mono text-[10px] text-text2 uppercase tracking-widest">
                      {profileAddress.slice(0, 6)}…{profileAddress.slice(-4)}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── ASSETS SECTION ── */}
      <div className="terminal-pane h-full flex flex-col">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Assets</span>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Total RGD</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                {Number(formatUnits(currentWallet, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-text2 font-normal ml-1">RGD</span>
              </span>
              {walletUsd !== undefined && (
                <span className="font-mono text-[10px] text-text2 tabular-nums">
                  ≈ ${walletUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Staked RGD</span>
            <span className="font-mono text-[13px] font-semibold text-green tabular-nums">
              {Number(formatUnits(currentStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-text2 font-normal ml-1">RGD</span>
            </span>
          </div>
          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Vault Locked</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                {Number(formatUnits(currentLocked, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-text2 font-normal ml-1">RGD</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CAREER PERFORMANCE ── */}
      <div className="terminal-pane h-full flex flex-col">
        {/* Hidden rank probes: one per claimed season, each running the exact
            usePlayerRank Season Stats uses. They render nothing. */}
        {claimedSeasons.map((s) => (
          <SeasonRankProbe key={s} seasonAddress={s} playerAddress={profileAddress} onResult={handleRankResult} />
        ))}
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Career Performance</span>
        </div>
        {statsError && (
          <p className="font-mono text-[11px] text-red mb-2">{statsError}</p>
        )}
        <div className="flex flex-col gap-3">

          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">
              Lifetime PnL
              {!statsLoading && seasonsPlayed > 0 && (
                <span className="text-text2/60 ml-1.5">({seasonsPlayed} season{seasonsPlayed === 1 ? '' : 's'})</span>
              )}
            </span>
            {statsLoading ? (
              <span className="font-mono text-[13px] font-semibold animate-pulse text-text2 tabular-nums">···</span>
            ) : (
              <span className={`font-mono text-[13px] font-semibold tabular-nums ${pnlPositive ? 'text-green' : 'text-red'}`}>
                {pnlPositive ? '+' : ''}{lifetimePnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-text2 font-normal ml-1">USDC</span>
              </span>
            )}
          </div>

          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Best Global Rank</span>
            {ranksLoading ? (
              <span className="font-mono text-[13px] font-semibold animate-pulse text-text2 tabular-nums">···</span>
            ) : hasRank ? (
              <span className="font-mono text-[13px] font-semibold text-gold tabular-nums">#{bestGlobalRank}</span>
            ) : (
              <span className="font-mono text-[13px] font-semibold text-text2">—</span>
            )}
          </div>

          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Best Relative Rank</span>
            {ranksLoading ? (
              <span className="font-mono text-[13px] font-semibold animate-pulse text-text2 tabular-nums">···</span>
            ) : bestRelativeRank > 0 ? (
              <span className="font-mono text-[13px] font-semibold text-purple tabular-nums">#{bestRelativeRank}</span>
            ) : (
              <span className="font-mono text-[13px] font-semibold text-text2">—</span>
            )}
          </div>

          <div className="kv-row">
            <span className="font-mono text-[11px] text-text2">Lifetime Trade Volume</span>
            {statsLoading ? (
              <span className="font-mono text-[13px] font-semibold animate-pulse text-text2 tabular-nums">···</span>
            ) : (
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                ${lifetimeVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-text2 font-normal ml-1">USDC</span>
              </span>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
