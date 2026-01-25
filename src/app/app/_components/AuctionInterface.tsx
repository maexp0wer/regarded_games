'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { WalletButton } from './WalletButton'; 

// ABIs
import ERC20Abi from '@/deployments/abis/MockUSDC.json'; 
import StakingAbi from '@/deployments/abis/Staking.json';
import AuctionAbi from '@/deployments/abis/Auction.json';
import coreAddresses from '@/deployments/core.json';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'buying' | 'mining_buy' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function AuctionInterface({ seasonAddress: propSeason, auctionAddress: propAuction, fimAddress: propFim }: { seasonAddress?: string, auctionAddress?: string, fimAddress?: string }) {
  const { isConnected } = useAccount();

  const resolvedAuction = (propAuction || DEAD_ADDRESS) as `0x${string}`;
  const resolvedSeason = (propSeason || DEAD_ADDRESS) as `0x${string}`;
  const resolvedFim = (propFim || DEAD_ADDRESS) as `0x${string}`;
  
  const isAuctionValid = resolvedAuction !== DEAD_ADDRESS && isAddress(resolvedAuction);
  const isSeasonValid = resolvedSeason !== DEAD_ADDRESS && isAddress(resolvedSeason);
  const isFimValid = resolvedFim !== DEAD_ADDRESS && isAddress(resolvedFim);
  const isStakingValid = (coreAddresses.Staking && isAddress(coreAddresses.Staking));
  const isUsdcValid = (coreAddresses.USDC && isAddress(coreAddresses.USDC));
  
  const isFullyConfigured = isAuctionValid && isSeasonValid && isFimValid && isStakingValid && isUsdcValid;

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all text-center space-y-6 w-full">
          <h3 className="text-lg font-black uppercase text-text2 tracking-wider mt-4">Auction Participation</h3>
          <p className="text-sm text-text2 mb-4">Connect your wallet to participate.</p>
          <div className="pt-2"><WalletButton /></div>
      </div>
    );
  }

  if (!isFullyConfigured) {
    return (
      <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm text-center space-y-4 w-full">
        <h3 className="text-danger font-black uppercase text-[10px] tracking-widest">Waiting for Contract Data...</h3>
      </div>
    );
  }

  return (
    <AuctionInterfaceInner 
      seasonAddress={resolvedSeason} 
      auctionAddress={resolvedAuction} 
      fimAddress={resolvedFim} 
    />
  );
}

function AuctionInterfaceInner({ seasonAddress, auctionAddress, fimAddress }: { seasonAddress: string, auctionAddress: string, fimAddress: string }) {
  const { address } = useAccount();
  const publicClient = usePublicClient(); 
  const queryClient = useQueryClient();
  
  const [buyAmount, setBuyAmount] = useState("");
  const [status, setStatus] = useState<WorkflowStep>('idle');

  const stakingAddr = (coreAddresses as any).Staking as `0x${string}`;
  const usdcAddr = (coreAddresses as any).USDC as `0x${string}`;

  // --- 1. Contract Reads ---
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({ 
    address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: [address] 
  });
  const { data: requiredRtdStake, refetch: refetchRequired } = useReadContract({ 
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRtdStake', args: [address]
  });
  const { data: rtdPrice } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'getRTDPrice'
  });
  const { data: fimWallet, refetch: refetchFimWallet, isFetching: isFimFetching } = useReadContract({
    address: fimAddress as `0x${string}`, abi: ERC20Abi, functionName: 'balanceOf', args: [address], query: { refetchInterval: 5000 }
  });
  const { data: usdcWallet, refetch: refetchUsdcWallet } = useReadContract({ 
    address: usdcAddr, abi: ERC20Abi, functionName: 'balanceOf', args: [address] 
  });
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({ 
    address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`], query: { staleTime: 0 } 
  });

  const { writeContractAsync } = useWriteContract();

  // --- 2. Logic & Math ---
  const usdcToBuyBigInt = buyAmount ? parseUnits(buyAmount, 6) : 0n;
  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRtdStake as bigint) ?? 0n;
  const hasStakedAnything = currentStaked > 0n;
  const currentPrice = (rtdPrice as bigint) ?? 1n;
  const currentFim = (fimWallet as bigint) ?? 0n;
  const currentUsdcInWallet = (usdcWallet as bigint) ?? 0n;

  const totalEligibleFim = useMemo(() => {
    if (!stakedBalances || !rtdPrice) return 0n;
    const ratioBps = 1000n; 
    const maxUsdcValue = (currentStaked * 10000n * currentPrice) / (ratioBps * parseUnits("1", 30));
    return maxUsdcValue * parseUnits("1", 12);
  }, [currentStaked, currentPrice]);

  const handleMax = () => {
    if (!totalEligibleFim) return;
    const remainingFim = totalEligibleFim > currentFim ? totalEligibleFim - currentFim : 0n;
    const requiredUsdc = remainingFim / parseUnits("1", 12);
    const finalUsdc = requiredUsdc > currentUsdcInWallet ? currentUsdcInWallet : requiredUsdc;
    setBuyAmount(formatUnits(finalUsdc, 6));
  };

  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    if (!publicClient || !address) return;
    if (!usdcToBuyBigInt) return;

    try {
      const liveAllowance = await publicClient.readContract({
        address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`]
      }) as bigint;

      if (liveAllowance < usdcToBuyBigInt) {
        setStatus('approving');
        const hash = await writeContractAsync({
          address: usdcAddr, abi: ERC20Abi, functionName: 'approve', args: [auctionAddress as `0x${string}`, usdcToBuyBigInt],
        });
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash });
        refetchUsdcAllowance();
      }

      setStatus('buying');
      const buyHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`, abi: AuctionAbi, functionName: 'buyFIM', args: [usdcToBuyBigInt],
      });

      setStatus('mining_buy');
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setStatus('success');
      refetchStaked(); refetchRequired(); refetchUsdcAllowance(); refetchUsdcWallet(); refetchFimWallet();
      queryClient.invalidateQueries({ queryKey: ["auctionHistory", seasonAddress.toLowerCase()] });

      setTimeout(() => {
        setBuyAmount("");
        setStatus('idle');
      }, 2500);

    } catch (err: any) {
      console.error("Workflow Error:", err);
      
      // Parse specific error types
      const isRejection = err.shortMessage?.includes("rejected") || err.message?.includes("User rejected");
      const isInsufficientGas = err.message?.includes("insufficient funds") || err.name === 'InsufficientFundsError';
      
      if (isRejection) {
        setStatus('canceled');
      } else if (isInsufficientGas) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
      
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- 4. UI Helpers ---
  const fimDisplayValue = isFimFetching ? "..." : Number(formatUnits(currentFim, 18)).toLocaleString();
  const lockedDisplay = Number(formatUnits(currentLocked, 18)).toFixed(2);
  const eligibleDisplay = Number(formatUnits(totalEligibleFim, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const getProgressWidth = () => {
    switch (status) {
      case 'idle': return '0%';
      case 'approving': return '15%';
      case 'mining_approval': return '40%';
      case 'buying': return '60%';
      case 'mining_buy': return '85%';
      case 'success': return '100%';
      default: return '0%';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approving': return "Step 1/2: Approve USDC...";
      case 'mining_approval': return "Step 1/2: Confirming...";
      case 'buying': return "Step 2/2: Sign Purchase...";
      case 'mining_buy': return "Step 2/2: Finalizing...";
      case 'success': return "Success! FIM Purchased";
      case 'canceled': return "Canceled";
      case 'no_gas': return "Insufficient Gas";
      case 'failed': return "Transaction Failed";
      default: 
        if (!buyAmount || usdcToBuyBigInt === 0n) return "Buy FIM";
        const currentAllowance = (usdcAllowance as bigint) ?? 0n;
        return currentAllowance < usdcToBuyBigInt ? "Step 1: Approve" : "Step 2: Buy FIM";
    }
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !buyAmount || !hasStakedAnything;

  return (
    <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all space-y-6 w-full">
      
      {/* 4-COLUMN HEADER */}
      <div className="border-b border-border/40 pb-5 mb-5">
        <div className="grid grid-cols-4 gap-2 text-left px-1">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">FIM Balance</span>
            <span className="text-lg font-black text-primary tracking-tighter leading-none">{fimDisplayValue}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Staked RTD</span>
            <span className="text-lg font-black text-text tracking-tighter leading-none">{Number(formatUnits(currentStaked, 18)).toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1 text-danger">Locked</span>
            <span className="text-lg font-black text-danger tracking-tighter leading-none">{currentLocked > 0n ? lockedDisplay : "0.00"}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1 text-success">Total Eligible FIM</span>
            <span className="text-lg font-black text-success tracking-tighter leading-none">{eligibleDisplay}</span>
          </div>
        </div>
      </div>

      <div className={`space-y-4 pt-2`}>
        {!hasStakedAnything && (
          <Link href="/stake" className="block transform transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]">
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center shadow-inner cursor-pointer">
              <p className="text-[10px] font-black uppercase text-danger">⚠️ No Collateral Staked</p>
              <p className="text-[10px] text-text2 mt-1 uppercase tracking-tighter">Click here to stake RTD and unlock buying</p>
            </div>
          </Link>
        )}

        <div className={`bg-card2 rounded-xl p-4 border border-border/10 ${!hasStakedAnything ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="flex justify-between items-end mb-2 px-1">
            <label className="text-[9px] uppercase font-bold text-text2 tracking-widest">Buy FIM with USDC</label>
            <span className="text-[9px] font-mono text-text2 uppercase tracking-tighter opacity-70">
                Wallet: {Number(formatUnits(currentUsdcInWallet, 6)).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <input 
              type="number" placeholder="0.00"
              className="bg-transparent border-none p-0 w-full text-3xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={buyAmount} 
              onChange={(e) => setBuyAmount(e.target.value)}
              disabled={isBusy || isSuccess || isError}
            />
            <button 
                onClick={handleMax} 
                className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all ml-4"
                disabled={isBusy || isSuccess || isError}
            >MAX</button>
          </div>
        </div>

        <div className="relative w-full rounded-xl overflow-hidden shadow-lg transition-all active:scale-[0.99]">
            {status !== 'idle' && !isError && (
                <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isSuccess ? 'bg-success' : 'bg-primary/30'}`}
                    style={{ width: getProgressWidth() }}
                />
            )}
            
            <button 
                className={`relative w-full py-4 font-black text-[10px] uppercase tracking-widest z-10 flex items-center justify-center gap-2 transition-all duration-200
                    ${isButtonDisabled && !isBusy && !isSuccess && !isError ? 'bg-muted/20 text-text2 cursor-not-allowed shadow-none' : ''}
                    ${isBusy ? 'cursor-not-allowed text-text' : ''}
                    ${isSuccess ? 'cursor-not-allowed text-card shadow-lg' : ''}
                    ${isError ? 'bg-danger text-card cursor-not-allowed shadow-lg' : ''}
                    ${status === 'idle' && !isButtonDisabled ? 'bg-primary text-card hover:brightness-110 shadow-lg' : ''}
                    ${status !== 'idle' && !isSuccess && !isError ? 'text-text' : ''}
                `}
                disabled={isButtonDisabled} 
                onClick={handleStartFlow}
            >
                {isBusy && <div className="w-3 h-3 border-2 border-text border-t-transparent rounded-full animate-spin" />}
                {getStatusText()}
            </button>
        </div>
      </div>
    </div>
  );
}