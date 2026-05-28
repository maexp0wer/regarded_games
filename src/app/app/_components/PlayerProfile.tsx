'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatUnits } from 'viem';

import ERC20AbiRaw from '@/deployments/abis/FakeUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const displayImageUrl = useMemo(() => {
    if (profile.imageUrl?.trim()) return profile.imageUrl;
    const seed = profile.name?.trim() || profileAddress;
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile.imageUrl, profile.name, profileAddress]);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const rgdAddr     = coreAddresses.RGD    as `0x${string}`;

  const { data: stakedBalances }  = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances',  args: [profileAddress], chainId });
  const { data: requiredRegStake } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: [profileAddress], chainId });
  const { data: walletBalance }   = useReadContract({ address: rgdAddr,     abi: ERC20Abi,   functionName: 'balanceOf',         args: [profileAddress], chainId });

  const currentStaked = (stakedBalances   as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;
  const currentWallet = (walletBalance    as bigint) ?? 0n;

  useEffect(() => {
    async function fetchProfile() {
      if (!profileAddress) return;
      try {
        const res = await fetch(`/api/profile?address=${profileAddress.toLowerCase()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data) setProfile({ name: data.name || '', imageUrl: data.image_url || '' });
      } catch (err) { console.error('Load error:', err); }
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

  return (
    <div
      className="card-app overflow-hidden w-full border-border2 p-0"
    >
      {/* Top: avatar + name */}
      <div
        className="flex items-center gap-5 p-6"
        style={{
          background: 'linear-gradient(135deg, var(--color-card2) 0%, var(--color-card) 100%)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Avatar */}
        <div
          className="shrink-0 overflow-hidden avatar-gold-glow"
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--color-card2)',
            border: '2px solid var(--color-gold)',
          }}
        >
          <img
            src={displayImageUrl}
            alt="Player Avatar"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/bottts/svg?seed=${profileAddress}`; }}
          />
        </div>

        {/* Name / edit */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                className="text-input-sm"
                style={inputStyle}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Player Name"
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-gold)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
              />
              <input
                className="text-input-xs"
                style={inputStyle}
                value={profile.imageUrl}
                onChange={(e) => setProfile({ ...profile, imageUrl: e.target.value })}
                placeholder="Custom Image URL (optional)"
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-gold)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary px-4 py-1.5 text-[10px] disabled:opacity-50">
                  {isSaving ? 'Signing…' : 'Save Changes'}
                </button>
                <button onClick={() => setIsEditing(false)} className="font-mono text-[10px] uppercase font-bold text-text2 px-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-xl text-text break-all whitespace-normal">
                  {profile.name || 'Regarded Anon'}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg transition-colors text-text2 shrink-0"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <span className="font-mono text-[10px] text-text2 opacity-50 uppercase tracking-[0.2em]">
                {profileAddress.slice(0, 6)}…{profileAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-3 p-6">
        {[
          { label: 'Total REGARDS',  value: currentWallet, color: 'var(--color-text)' },
          { label: 'Staked REGARDS', value: currentStaked, color: 'var(--color-gold)' },
          { label: 'Locked REGARDS', value: currentLocked, color: 'var(--color-red)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kv-row">
            <span className="font-mono text-[11px] text-text2">{label}</span>
            <span className="font-mono font-semibold text-[13px]" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
              {Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: 'var(--color-card2)', borderTop: '1px solid var(--color-border)' }}
      >
        <span className="section-label">{isOwner ? 'Your Dashboard' : 'Public View'}</span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isOwner ? 'var(--color-green)' : 'var(--color-text2)',
              opacity: isOwner ? 1 : 0.4,
              boxShadow: isOwner ? '0 0 6px var(--color-green)' : 'none',
            }}
          />
          <span className="font-mono text-[9px] uppercase font-bold" style={{ color: isOwner ? 'var(--color-green)' : 'var(--color-text2)', opacity: isOwner ? 1 : 0.4 }}>
            {isOwner ? 'Authorized' : 'Read Only'}
          </span>
        </div>
      </div>
    </div>
  );
}
