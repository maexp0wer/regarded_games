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

// ********** MODIFIED PARENT COMPONENT **********
export function AuctionMask({ 
    seasonAddress: propSeason, 
    auctionAddress: propAuction, 
    fimAddress: propFim,
    // ********** NEW PROPS ADDED **********
    currentPhase, 
    isPhaseLoading = false, // Default to false if not provided
    isPhaseError = false    // Default to false if not provided
    // *************************************
}: { 
    seasonAddress?: string, 
    auctionAddress?: string, 
    fimAddress?: string,
    currentPhase: string | null | undefined, // Phase is now a mandatory prop
    isPhaseLoading?: boolean,
    isPhaseError?: boolean
}) {
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
          <h3 className="text-lg font-black uppercase text-text2 tracking-wider mt-4">Auction</h3>
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
  
  // NOTE: Phase read logic is NOT here, as it's passed in via props.

  return (
    <AuctionMaskInner 
      seasonAddress={resolvedSeason} 
      auctionAddress={resolvedAuction} 
      fimAddress={resolvedFim} 
      // ********** PASSING PROPS **********
      currentPhase={currentPhase} 
      isPhaseLoading={isPhaseLoading}
      isPhaseError={isPhaseError}
      // ***********************************
    />
  );
}
// *************************************************

// ********** MODIFIED INNER COMPONENT **********
function AuctionMaskInner({ 
    seasonAddress, 
    auctionAddress, 
    fimAddress, 
    // ********** NEW PROPS **********
    currentPhase, 
    isPhaseLoading, 
    isPhaseError 
    // *******************************
}: { 
    seasonAddress: string, 
    auctionAddress: string, 
    fimAddress: string,
    currentPhase: string | null | undefined, // Added type definition for the new prop
    isPhaseLoading: boolean,
    isPhaseError: boolean
}) {
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
  const { data: requiredRegardsStake, refetch: refetchRequired } = useReadContract({ 
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegardsStake', args: [address]
  });
  const { data: regardsPrice } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'getRegardsPrice'
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
  // Phase read logic is now in the parent, not here.

  const { writeContractAsync } = useWriteContract();

  const isAuctionPhase = currentPhase === "AUCTION";

  // --- 2. Logic & Math ---
  const usdcToBuyBigInt = buyAmount ? parseUnits(buyAmount, 6) : 0n;
  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRegardsStake as bigint) ?? 0n;
  const hasStakedAnything = currentStaked > 0n;
  
  const currentFim = (fimWallet as bigint) ?? 0n;
  const currentUsdcInWallet = (usdcWallet as bigint) ?? 0n;

  const totalEligibleFim = useMemo(() => {
    if (!currentStaked) return 0n;
    return currentStaked * 10n; 
  }, [currentStaked]);

  const remainingFimAllowance = totalEligibleFim > currentFim ? totalEligibleFim - currentFim : 0n;
  const isMaxedOut = hasStakedAnything && remainingFimAllowance === 0n;

  // NEW: Convert input (6 dec) to FIM scale (18 dec) to compare
  const inputAsFim = usdcToBuyBigInt * 1000000000000n;
  const isOverLimit = hasStakedAnything && inputAsFim > remainingFimAllowance && remainingFimAllowance > 0n;

  const handleMax = () => {
    // 1. How much FIM allowance do you have left? (18 decimals)
    

    // 2. Convert FIM allowance to USDC cost (6 decimals)
    // Since Price is 1:1, we just shift decimals from 18 to 6 (divide by 10^12)
    const usdcNeeded = remainingFimAllowance / 1000000000000n;

    // 3. You can only buy the lesser of your allowance OR your wallet balance
    const finalUsdc = usdcNeeded > currentUsdcInWallet 
      ? currentUsdcInWallet 
      : usdcNeeded;

    // 4. Set the input string (formatUnits handles the 6 decimals for us)
    setBuyAmount(formatUnits(finalUsdc, 6));
  };

  
  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    // ... (handleStartFlow remains unchanged)
    if (!publicClient || !address) return;
    if (!usdcToBuyBigInt) return;
    // ... (rest of the transaction logic)
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
  const remainingFimBigInt = totalEligibleFim > currentFim ? totalEligibleFim - currentFim : 0n;

  const fimDisplayValue = isFimFetching ? "..." : Number(formatUnits(currentFim, 18)).toLocaleString();
  const lockedDisplay = Number(formatUnits(currentLocked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const eligibleDisplay = Number(formatUnits(totalEligibleFim, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const stakedDisplay = Number(formatUnits(currentStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const additionalEligibleDisplay = Number(formatUnits(remainingFimBigInt, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });

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
    // 1. Transaction status takes highest priority
    switch (status) {
      case 'approving': return "Step 1/2: Approve USDC...";
      case 'mining_approval': return "Step 1/2: Confirming...";
      case 'buying': return "Step 2/2: Sign Purchase...";
      case 'mining_buy': return "Step 2/2: Finalizing...";
      case 'success': return "Success! FIM Purchased";
      case 'canceled': return "Canceled";
      case 'no_gas': return "Insufficient Gas";
      case 'failed': return "Transaction Failed";
    }

    // 2. Limit checks
    if (!hasStakedAnything) return "Stake REGARDS to unlock";
    if (isMaxedOut) return "Stake REGARDS to buy FIM";
    
    // NEW: Handle over-limit input
    if (isOverLimit) {
      const moreFim = Number(formatUnits(remainingFimAllowance, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
      return `You can only buy ${moreFim} more FIM with your current REGARDS Stake`;
    }

    // 3. Default
    return "Buy FIM";
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !buyAmount || !hasStakedAnything || isMaxedOut || isOverLimit;

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm transition-all space-y-6 w-full h-full">
      
      <div className="flex flex-col">
          <span className="h3-app">FIM Balance</span>
          <span className="text-lg md:text-2xl font-black text-primary leading-none">{fimDisplayValue}</span>
        </div>

      <div className={`space-y-4 pt-2`}>
        {!hasStakedAnything && (
          <Link href="/stake" className="block transform transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]">
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center shadow-inner cursor-pointer">
              <p className="text-[10px] font-black uppercase text-danger">⚠️ No Collateral Staked</p>
              <p className="text-[10px] text-text2 mt-1 uppercase tracking-tighter">Click here to stake REGARDS and unlock buying</p>
            </div>
          </Link>
        )}

        {/* ********** MODIFIED: PHASE FILTER IMPLEMENTATION ********** */}
        {isPhaseLoading ? (
          <div className="p-4 bg-card2 rounded-xl text-center shadow-inner">
            <p className="text-[10px] font-black uppercase text-text2">Loading Auction Phase...</p>
          </div>
        ) : isPhaseError || currentPhase === null || currentPhase === undefined ? (
           <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-center shadow-inner">
             <p className="text-[10px] font-black uppercase text-danger">⚠️ PHASE DATA UNAVAILABLE</p>
             <p className="text-[10px] text-text2 mt-1 uppercase tracking-tighter">Cannot determine current season phase.</p>
          </div>
        ) : !isAuctionPhase ? (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center shadow-inner">
            <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Season on Hold</p>
          </div>
        ) : (
          <>
            <div className={`bg-card2 rounded-xl px-4 py-3  ${!hasStakedAnything || isMaxedOut ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-end mb-2 px-1">
                <label className="text-[9px] uppercase font-bold text-text2 tracking-widest">Buy FIM with USDC</label>
                <span className="text-[9px] font-mono text-text2 uppercase tracking-tighter opacity-70">
                    Wallet: {Number(formatUnits(currentUsdcInWallet, 6)).toLocaleString()} USDC
                </span>
              </div>
              <div className="flex items-center">
                <input 
                  type="number" placeholder="0.00"
                  className="bg-transparent border-none p-0 w-full text-2xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className={`relative w-full py-4 font-black text-[10px]  uppercase tracking-widest z-10 flex items-center justify-center gap-2 transition-all duration-200
                        ${isButtonDisabled && !isBusy && !isSuccess && !isError ? 'bg-card2 text-text2 cursor-not-allowed shadow-none' : ''}
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
          </>
        )}

        <div className="grid grid-cols-4 gap-2 text-left px-1">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Total Eligible FIM</span>
            <span className="font-black text-success tracking-tighter leading-none">{eligibleDisplay}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">
              additional Eligible FIM
            </span>
            <span className={`font-black tracking-tighter leading-none transition-colors ${
              remainingFimBigInt  > 0n ? 'text-success' : 'text-danger'
            }`}>
              {additionalEligibleDisplay}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Staked REGARDS</span>
            <span className="font-black text-text tracking-tighter leading-none">{stakedDisplay}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Locked REGARDS</span>
            <span className="font-black text-danger tracking-tighter leading-none">{currentLocked > 0n ? lockedDisplay : "0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
