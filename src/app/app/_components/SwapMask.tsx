'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { WalletButton } from './WalletButton';

// ABIs & Addresses
import MockRouterAbiRaw from '@/deployments/abis/MockUniswapRouter.json';
import Core from '@/deployments/core.json';
import Mocks from '@/deployments/mocks.json';

const MockRouterAbi = MockRouterAbiRaw as any;

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'swapping' | 'mining_swap' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function SwapMask() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true); // true = USDC->GINI, false = GINI->USDC
  const [status, setStatus] = useState<WorkflowStep>('idle');

  // Configuration
  const ROUTER_ADDRESS = Mocks.Router as `0x${string}`;
  const usdcAddr = Core.USDC as `0x${string}`;
  const giniAddr = Core.GINI as `0x${string}`;

  const tokenIn = isBuying ? usdcAddr : giniAddr;
  const tokenOut = isBuying ? giniAddr : usdcAddr;
  const decimalsIn = isBuying ? 6 : 18;
  const decimalsOut = isBuying ? 18 : 6;
  const symbolIn = isBuying ? 'USDC' : 'GINI';
  const symbolOut = isBuying ? 'GINI' : 'USDC';

  // --- 1. Contract Reads ---
  // Read both balances always so switching is snappy
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: usdcAddr, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  const { data: giniBalance, refetch: refetchGini } = useReadContract({
    address: giniAddr, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  
  // Read allowance for the CURRENT input token
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn, abi: erc20Abi, functionName: 'allowance', args: address ? [address, ROUTER_ADDRESS] : undefined,
  });

  // --- 2. Logic & Math ---
  const amountBigInt = amount ? parseUnits(amount, decimalsIn) : 0n;
  const currentUsdc = (usdcBalance as bigint) ?? 0n;
  const currentGini = (giniBalance as bigint) ?? 0n;
  const walletBalanceIn = isBuying ? currentUsdc : currentGini;
  
  // Mock Quote Calculation (1 USDC = 1 GINI scaled)
  const estimatedOutputBigInt = useMemo(() => {
    if (amountBigInt === 0n) return 0n;
    if (isBuying) return amountBigInt * 1000000000000n; // 1e6 -> 1e18
    return amountBigInt / 1000000000000n; // 1e18 -> 1e6
  }, [amountBigInt, isBuying]);

  const handleMax = () => {
    setAmount(formatUnits(walletBalanceIn, decimalsIn));
  };

  const resetData = () => {
    refetchUsdc();
    refetchGini();
    refetchAllowance();
  };

  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountBigInt) return;

    try {
      // 1. Check Allowance
      const liveAllowance = await publicClient.readContract({
        address: tokenIn, abi: erc20Abi, functionName: 'allowance', args: [address, ROUTER_ADDRESS]
      }) as bigint;

      if (liveAllowance < amountBigInt) {
        setStatus('approving');
        // Max approval for convenience
        const maxApproval = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
        const approveHash = await writeContractAsync({
          address: tokenIn, abi: erc20Abi, functionName: 'approve', args: [ROUTER_ADDRESS, maxApproval],
        });
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        refetchAllowance();
      }

      // 2. Execute Swap
      setStatus('swapping');
      
      const swapHash = await writeContractAsync({
        address: ROUTER_ADDRESS,
        abi: MockRouterAbi,
        functionName: 'exactInputSingle',
        args: [{
          tokenIn,
          tokenOut,
          fee: 3000,
          recipient: address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600), // 10 mins
          amountIn: amountBigInt,
          amountOutMinimum: 0n, // Slippage 0 for mock
          sqrtPriceLimitX96: 0n
        }],
      });

      setStatus('mining_swap');
      await publicClient.waitForTransactionReceipt({ hash: swapHash });

      // 3. Success
      setStatus('success');
      resetData();

      setTimeout(() => {
        setAmount("");
        setStatus('idle');
      }, 2500);

    } catch (err: any) {
      console.error("Workflow Error:", err);
      
      const isRejection = err.shortMessage?.includes("rejected") || err.message?.includes("User rejected");
      const isInsufficientGas = err.message?.includes("insufficient funds") || err.name === 'InsufficientFundsError';
      
      if (isRejection) setStatus('canceled');
      else if (isInsufficientGas) setStatus('no_gas');
      else setStatus('failed');
      
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- 4. UI Helpers ---
  const getProgressWidth = () => {
    switch (status) {
      case 'idle': return '0%';
      case 'approving': return '15%';
      case 'mining_approval': return '40%';
      case 'swapping': return '60%';
      case 'mining_swap': return '85%';
      case 'success': return '100%';
      default: return '0%';
    }
  };

  const getButtonText = () => {
    if (status === 'approving') return `Step 1/2: Approve ${symbolIn}...`;
    if (status === 'mining_approval') return "Step 1/2: Confirming...";
    if (status === 'swapping') return `Step 2/2: Swap ${symbolIn}...`;
    if (status === 'mining_swap') return "Finalizing...";
    if (status === 'success') return "Swap Successful!";
    if (status === 'canceled') return "Canceled";
    if (status === 'no_gas') return "Insufficient Gas";
    if (status === 'failed') return "Transaction Failed";

    if (!amount || amountBigInt === 0n) return "Enter Amount";
    if (walletBalanceIn < amountBigInt) return `Insufficient ${symbolIn}`;
    
    return `Swap ${symbolIn} for ${symbolOut}`;
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !amount || walletBalanceIn < amountBigInt || amountBigInt === 0n;

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all text-center space-y-6 w-full max-w-sm mx-auto">
          <h3 className="text-lg font-black uppercase text-text2 tracking-wider mt-4">Swap Interface</h3>
          <p className="text-sm text-text2 mb-4">Connect wallet to trade tokens.</p>
          <div className="pt-2"><WalletButton /></div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all space-y-6 w-full max-w-sm mx-auto">
      
      {/* HEADER: Mode Toggle & Stats */}
      <div className="space-y-5 border-b border-border/40 pb-5 mb-5">
        
        {/* Toggle */}
        <div className="bg-card2 rounded-lg flex overflow-hidden border border-border/20 h-10">
          <button 
            onClick={() => { if(!isBusy) { setIsBuying(true); setAmount(""); } }}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
              ${isBuying ? 'bg-primary text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
            disabled={isBusy}
          >
            Buy GINI
          </button>
          <button 
            onClick={() => { if(!isBusy) { setIsBuying(false); setAmount(""); } }}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
              ${!isBuying ? 'bg-primary text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
            disabled={isBusy}
          >
            Sell GINI
          </button>
        </div>

        {/* 3-Column Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-left px-1">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">USDC Bal</span>
            <span className="text-lg font-black text-text tracking-tighter leading-none">
              {Number(formatUnits(currentUsdc, 6)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex flex-col text-center">
             <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Rate</span>
             <span className="text-lg font-black text-primary tracking-tighter leading-none">1:1</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Gini Bal</span>
            <span className="text-lg font-black text-text tracking-tighter leading-none">
              {Number(formatUnits(currentGini, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        
        {/* INPUT BOX */}
        <div className="bg-card2 rounded-xl p-4 border border-border/10">
          <div className="flex justify-between items-end mb-2 px-1">
            <label className="text-[9px] uppercase font-bold text-text2 tracking-widest">
              Pay {symbolIn}
            </label>
            <span className="text-[9px] font-mono text-text2 uppercase tracking-tighter opacity-70">
              Max: {Number(formatUnits(walletBalanceIn, decimalsIn)).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <input 
              type="number" placeholder="0.00"
              className="bg-transparent border-none p-0 w-full text-3xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              disabled={isBusy || isSuccess || isError}
            />
            <button 
                onClick={handleMax} 
                className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all ml-4"
                disabled={isBusy || isSuccess || isError}
            >MAX</button>
          </div>
          
          {/* Estimated Output Subtext */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/5">
             <span className="text-[9px] uppercase font-bold text-text2 tracking-widest">Receive {symbolOut}</span>
             <span className="text-sm font-black text-success tracking-tight">
                 {amount ? Number(formatUnits(estimatedOutputBigInt, decimalsOut)).toLocaleString() : "0.00"}
             </span>
          </div>
        </div>

        {/* SMART BUTTON WITH PROGRESS BAR */}
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg transition-all active:scale-[0.99]">
            {status !== 'idle' && !isError && (
                <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isSuccess ? 'bg-success' : 'bg-primary/30'}`}
                    style={{ width: getProgressWidth() }}
                />
            )}
            
            <button 
                className={`relative w-full py-4 font-black text-[10px] uppercase tracking-widest z-10 flex items-center justify-center gap-2 transition-all duration-200
                    ${isButtonDisabled && !isBusy && !isSuccess && !isError ? 'bg-bg text-text2 cursor-not-allowed shadow-none' : ''}
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
                {getButtonText()}
            </button>
        </div>
      </div>
    </div>
  );
}