'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { formatUnits } from 'viem';

// ... (keep your existing imports and ABIs)
import ERC20AbiRaw from '@/deployments/abis/MockUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import coreAddresses from '@/deployments/core.json';

const ERC20Abi = ERC20AbiRaw as any;
const StakingAbi = StakingAbiRaw as any;

interface PlayerHoldingsProps {
  profileAddress: `0x${string}`;
}

export function PlayerHoldings({ profileAddress }: PlayerHoldingsProps) {
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const isOwner = connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  const [profile, setProfile] = useState({ name: '', imageUrl: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // --- NEW LOGIC: FALLBACK AVATAR GENERATOR ---
  // This calculates the display image based on priority
  const displayImageUrl = useMemo(() => {
    // 1. If user provided a custom URL, use it
    if (profile.imageUrl && profile.imageUrl.trim() !== "") {
      return profile.imageUrl;
    }
    
    // 2. Determine seed: Use Name if exists, otherwise Wallet Address
    const seed = profile.name && profile.name.trim() !== "" 
      ? profile.name 
      : profileAddress;

    // 3. Generate DiceBear Bottts URL
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile.imageUrl, profile.name, profileAddress]);

  // --- (Keep existing contract reads and useEffect for fetching) ---
  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const regAddr = coreAddresses.REG as `0x${string}`;

  const { data: stakedBalances } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: [profileAddress],
  });
  const { data: requiredRegStake } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: [profileAddress],
  });
  const { data: walletBalance } = useReadContract({
    address: regAddr, abi: ERC20Abi, functionName: 'balanceOf', args: [profileAddress],
  });

  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;
  const currentWallet = (walletBalance as bigint) ?? 0n;

  useEffect(() => {
    async function fetchProfile() {
      if (!profileAddress) return;
      try {
        setLoadingProfile(true);
        const res = await fetch(`/api/profile?address=${profileAddress.toLowerCase()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setProfile({
            name: data.name || '',
            imageUrl: data.image_url || '' 
          });
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
  }, [profileAddress]);

  const handleSaveProfile = async () => {
    if (!isOwner || !profileAddress) return;
    setIsSaving(true);
    try {
      const n = profile.name || '';
      const img = profile.imageUrl || '';
      const message = `Update profile: ${n} ${img}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: profileAddress,
          name: n,
          imageUrl: img,
          signature
        }),
      });

      if (res.ok) {
        setIsEditing(false);
      } else {
        const text = await res.text();
        alert(`Failed: ${text}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to save"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/10 shadow-sm overflow-hidden w-full transition-all">
      <div className="p-6 bg-gradient-to-br from-card2/30 to-transparent border-b border-border/10">
        <div className="flex items-center gap-5">
          
          {/* PROFILE IMAGE - Now using displayImageUrl logic */}
          <div className="w-20 h-20 rounded-2xl bg-bg border-2 border-primary/20 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
            <img 
              src={displayImageUrl} 
              alt="Pilot Avatar" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                // Fallback if the user-provided URL is broken
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/bottts/svg?seed=${profileAddress}`;
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input 
                  className="bg-bg border border-border/40 rounded px-3 py-1.5 text-sm text-text w-full outline-none focus:border-primary transition-all"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="Player Name"
                />
                <input 
                  className="bg-bg border border-border/40 rounded px-3 py-1.5 text-[10px] text-text w-full outline-none focus:border-primary transition-all"
                  value={profile.imageUrl}
                  onChange={(e) => setProfile({...profile, imageUrl: e.target.value})}
                  placeholder="Custom Image URL (optional)"
                />
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                    className="text-[10px] bg-primary text-card px-4 py-1.5 rounded font-black uppercase hover:brightness-110 disabled:opacity-50"
                  >
                    {isSaving ? "SIGNING..." : "SAVE CHANGES"}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="text-[10px] text-text2 uppercase font-bold px-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 group">
                <h2 className="text-2xl font-black text-text break-all whitespace-normal">
                  {profile.name || "Anon Regard"}
                  </h2>
                  {isOwner && (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="p-1.5 hover:bg-primary/10 rounded-lg text-text2 hover:text-primary transition-all shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-mono text-text2 opacity-50 uppercase tracking-[0.2em] mt-1">
                  {profileAddress.slice(0, 6)}...{profileAddress.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <StatRow label="Total REGARDS" value={currentWallet} colorClass="text-text" description="Total Regards in wallet" />
        <StatRow label="Staked REGARDS" value={currentStaked} colorClass="text-primary" description="Total staked regards" />
        <StatRow label="Locked REGARDS" value={currentLocked} colorClass="text-danger" description="Regards locked in active game" />
      </div>

      <div className="px-6 py-4 bg-white/5 border-t border-border/5 flex justify-between items-center">
        <span className="text-[9px] text-text2 uppercase font-bold tracking-widest">{isOwner ? "Your Dashboard" : "Public View"}</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-success animate-pulse' : 'bg-text2 opacity-50'}`} />
          <span className={`text-[9px] uppercase font-bold ${isOwner ? 'text-success' : 'text-text2 opacity-50'}`}>{isOwner ? "Authorized" : "Read Only"}</span>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, colorClass, description }: { label: string, value: bigint, colorClass: string, description: string }) {
  const formatted = Number(formatUnits(value, 18)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="text-[9px] uppercase font-black text-text2 tracking-widest mb-0.5">{label}</p>
        <p className="text-[8px] text-text2 opacity-40 uppercase font-medium">{description}</p>
      </div>
      <div className="text-right"><span className={`text-2xl font-black tracking-tighter ${colorClass}`}>{formatted}</span></div>
    </div>
  );
}