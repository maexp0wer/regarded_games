'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatUnits } from 'viem';

import ERC20AbiRaw from '@/deployments/abis/FakeUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { useLifetimeStats } from '@/hooks/useLifetimeStats';
import { useRgdPrice } from '@/hooks/useRgdPrice';

const ERC20Abi = ERC20AbiRaw as any;
const StakingAbi = StakingAbiRaw as any;

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

  const displayImageUrl = useMemo(() => {
    if (profile.imageUrl?.trim()) return profile.imageUrl;
    const seed = profile.name?.trim() || profileAddress;
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile.imageUrl, profile.name, profileAddress]);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const rgdAddr     = coreAddresses.RGD    as `0x${string}`;

  const { data: stakedBalances }   = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances',   args: [profileAddress], chainId });
  const { data: requiredRegStake } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: [profileAddress], chainId });
  const { data: walletBalance }    = useReadContract({ address: rgdAddr,     abi: ERC20Abi,   functionName: 'balanceOf',         args: [profileAddress], chainId });

  const currentStaked = (stakedBalances   as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;
  const currentWallet = (walletBalance    as bigint) ?? 0n;

  const { lifetimePnl, bestGlobalRank, bestTotalPlayers, bestRelativePercent, loading: statsLoading } = useLifetimeStats(profileAddress);
  const rgdPrice = useRgdPrice();

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
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '6px 10px',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  };

  const pnlPositive = lifetimePnl >= 0;

  return (
    <div className="card-app overflow-hidden w-full border-border2 p-0 relative isolate">

      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-72 h-72 blur-3xl rounded-full -z-10 pointer-events-none"
        style={{ background: 'var(--color-purple-15)', transform: 'translate(30%, -30%)' }}
      />

      {/* ── HEADER ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6"
        style={{ borderBottom: '1px dashed var(--color-border)' }}
      >
        {/* Left: avatar + identity */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div
            className="relative shrink-0 overflow-hidden shadow-[0_0_16px_var(--color-gold-35)]"
            style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--color-gold)' }}
          >
            <img
              src={displayImageUrl}
              alt="Player Avatar"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/bottts/svg?seed=${profileAddress}`; }}
            />
            <div
              className="absolute inset-x-0 h-px pointer-events-none"
              style={{ background: 'var(--color-gold-70)', animation: 'scanner-line 3s linear infinite' }}
            />
          </div>

          {/* Name / edit */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 w-1/2 min-w-45">
                  <input
                    style={inputStyle}
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Player Name"
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-gold)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
                  />
                  <input
                    style={inputStyle}
                    value={profile.imageUrl}
                    onChange={(e) => setProfile({ ...profile, imageUrl: e.target.value })}
                    placeholder="Image URL (optional)"
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-gold)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button onClick={handleSaveProfile} disabled={isSaving} className="btn-game-secondary disabled:opacity-50" style={{ width: 'auto', padding: '6px 14px', fontSize: 11 }}>
                    {isSaving ? 'Signing…' : 'Save'}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-game-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 11 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-2xl text-text uppercase tracking-tight leading-none truncate">
                    {profile.name || 'Regarded Anon'}
                  </h2>
                  {isOwner && profileLoaded && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-lg transition-colors text-text2 shrink-0"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Address pill */}
                <button
                  onClick={() => navigator.clipboard.writeText(profileAddress)}
                  className="inline-flex items-center gap-1.5 mt-1.5 cursor-copy"
                  title="Copy address"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--color-green)', boxShadow: '0 0 6px var(--color-green)', animation: 'pill-pulse 2s ease-in-out infinite' }}
                  />
                  <span className="font-mono text-[10px] text-text2 uppercase tracking-widest">
                    {profileAddress.slice(0, 6)}…{profileAddress.slice(-4)}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Purple gradient badge */}
        <span
          className="font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: 'var(--cyber-sunset)', color: '#fff' }}
        >
          Regarded Player
        </span>
      </div>

      {/* ── Assets ── */}
      <div className="p-6" style={{ borderBottom: '1px dashed var(--color-border)' }}>
        <span className="section-label block mb-3">Assets</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden bg-border border border-border">
          {[
            { label: 'Total RGD',  value: currentWallet, colorVar: 'var(--color-text)', usdValue: walletUsd },
            { label: 'Staked RGD', value: currentStaked, colorVar: 'var(--color-green)' },
            { label: 'Locked RGD', value: currentLocked, colorVar: 'var(--color-purple)', badge: 'Vault' },
          ].map(({ label, value, colorVar, badge, usdValue }) => (
            <div key={label} className="bg-card p-4 flex flex-col gap-1.5 hover:bg-card2 transition-colors">
              <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest">{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold tabular-nums tracking-tight" style={{ color: colorVar }}>
                  {Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                {badge && (
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider"
                    style={{ background: 'var(--color-purple-15)', color: 'var(--color-purple)' }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {usdValue !== undefined && (
                <span className="font-mono text-[10px] text-text2 tabular-nums">
                  ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CAREER PERFORMANCE ── */}
      <div className="p-6">
        <span className="section-label block mb-3">Career Performance</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden bg-border border border-border">

          {/* Lifetime PnL */}
          <div className="relative bg-card p-4 flex flex-col gap-1.5 overflow-hidden group hover:bg-card2 transition-colors">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all"
              style={{ background: pnlPositive ? 'var(--color-green)' : 'var(--color-red)', boxShadow: pnlPositive ? '0 0 8px var(--color-green-35)' : '0 0 8px var(--color-red-35)' }}
            />
            <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest pl-3">Lifetime PnL</span>
            {statsLoading ? (
              <span className="font-mono text-lg font-bold pl-3 animate-pulse text-text2">···</span>
            ) : (
              <span className="font-mono text-lg font-bold tabular-nums tracking-tight pl-3" style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)' }}>
                {pnlPositive ? '+' : ''}{lifetimePnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="font-mono text-[10px] font-normal text-text2 ml-1">USDC</span>
              </span>
            )}
          </div>

          {/* Best Global Rank */}
          <div className="relative bg-card p-4 flex flex-col gap-1.5 overflow-hidden group hover:bg-card2 transition-colors">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all"
              style={{ background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold-35)' }}
            />
            <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest pl-3">Best Global Rank</span>
            {statsLoading ? (
              <span className="font-display text-xl font-black pl-3 animate-pulse text-text2">···</span>
            ) : bestGlobalRank > 0 ? (
              <div className="flex items-baseline gap-1.5 pl-3">
                <span className="font-display text-xl font-black text-gold uppercase leading-none">
                  #{bestGlobalRank}
                </span>
                <span className="font-mono text-[10px] text-text2">/ {bestTotalPlayers}</span>
              </div>
            ) : (
              <span className="font-display text-xl font-black text-text2 pl-3 leading-none">—</span>
            )}
          </div>

          {/* Best Relative Rank */}
          <div className="relative bg-card p-4 flex flex-col gap-1.5 overflow-hidden group hover:bg-card2 transition-colors">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all"
              style={{ background: 'var(--color-purple)', boxShadow: '0 0 8px var(--color-purple-35)' }}
            />
            <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest pl-3">Best Relative Rank</span>
            {statsLoading ? (
              <span className="font-display text-xl font-black pl-3 animate-pulse text-text2">···</span>
            ) : bestRelativePercent > 0 ? (
              <span className="font-display text-xl font-black uppercase pl-3 leading-none" style={{ color: 'var(--color-purple)' }}>
                Top {bestRelativePercent < 1 ? bestRelativePercent.toFixed(2) : bestRelativePercent.toFixed(1)}%
              </span>
            ) : (
              <span className="font-display text-xl font-black text-text2 pl-3 leading-none">—</span>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
