'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  useAccount, useConnect, useDisconnect, useChainId,
  useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient
} from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { hardhat } from 'wagmi/chains';
import { auctionTemplateABI, erc20ABI, contractAddresses } from '@/lib/contracts';

// =================================================================================
// Sub-Component 1: Handles ONLY the Approval Logic
// =================================================================================
interface ApproveButtonProps {
  usdcAddress: Address;
  treasuryAddress: Address;
  amountToSpend: bigint;
  onApprovalSuccess: () => void;
}

function ApproveButton({ usdcAddress, treasuryAddress, amountToSpend, onApprovalSuccess }: ApproveButtonProps) {
  const { data: approveRequest } = useSimulateContract({
    address: usdcAddress,
    abi: erc20ABI,
    functionName: 'approve',
    args: [treasuryAddress, amountToSpend],
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();

  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  useEffect(() => {
    if (isApprovalSuccess) {
      console.log('✅ Approval transaction mined! Calling onApprovalSuccess.');
      onApprovalSuccess();
    }
  }, [isApprovalSuccess, onApprovalSuccess]);

  return (
    <button
      disabled={!approveRequest || isApproving || isWaitingForApproval}
      onClick={() => approve(approveRequest!.request)}
      className="w-full px-4 py-2 text-white bg-blue-500 rounded-lg disabled:bg-gray-400"
    >
      {isApproving ? 'Check Wallet...' : isWaitingForApproval ? 'Approving...' : `Approve ${formatUnits(amountToSpend, 6)} USDC`}
    </button>
  );
}

// =================================================================================
// Sub-Component 2: Handles ONLY the Buy Logic (WITH UX TWEAKS)
// =================================================================================
interface BuyFimButtonProps {
  auctionAddress: Address;
  amountToSpend: bigint;
  onBuySuccess: () => void; // Callback to tell the parent the purchase is done
}

function BuyFimButton({ auctionAddress, amountToSpend, onBuySuccess }: BuyFimButtonProps) {
  const { data: buyFimRequest, error: buyFimError } = useSimulateContract({
    address: auctionAddress,
    abi: auctionTemplateABI,
    functionName: 'buyFIM',
    args: [amountToSpend],
  });

  const { writeContract: buyFIM, data: buyFimHash, isPending: isBuying } = useWriteContract();
  
  const { isLoading: isWaitingForBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ 
    hash: buyFimHash 
  });

  // --- NEW: Reset logic after success ---
  useEffect(() => {
    if (isBuySuccess) {
      // 1. Tell the parent component that the purchase succeeded
      onBuySuccess();

      // 2. Set a timer to reset the button state after 5 seconds
      const timer = setTimeout(() => {
        // This effect will be handled by the parent component
      }, 5000); // 5000 milliseconds = 5 seconds

      // Cleanup function to clear the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [isBuySuccess, onBuySuccess]);

  return (
    <>
      <button
        disabled={!buyFimRequest || isBuying || isWaitingForBuy}
        onClick={() => buyFIM(buyFimRequest!.request)}
        className="w-full px-4 py-2 text-white bg-green-500 rounded-lg disabled:bg-gray-400"
      >
        {isBuying ? 'Check Wallet...' : isWaitingForBuy ? 'Processing...' : isBuySuccess ? 'Success!' : 'Buy FIM'}
      </button>
      {/* Moved success/error messages to the parent for better state control */}
    </>
  );
}

// =================================================================================
// Main Parent Component: Manages State and Renders the Correct Sub-Component
// =================================================================================
export function AuctionClient() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  
  const [usdcAmount, setUsdcAmount] = useState('');
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(true);
  
  // --- NEW: State to track purchase success for the reset timer ---
  const [showSuccess, setShowSuccess] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const amountToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : BigInt(0);

  const fetchAllowance = useCallback(async () => {
    if (!address || !addresses || !publicClient) return;
    setIsAllowanceLoading(true);
    try {
      const allowanceResult = await publicClient.readContract({
        address: addresses.usdc, abi: erc20ABI, functionName: 'allowance', args: [address, addresses.treasury],
      });
      setAllowance(allowanceResult);
    } catch (error) { console.error("Failed to fetch allowance:", error); setAllowance(null); }
    finally { setIsAllowanceLoading(false); }
  }, [address, addresses, publicClient]);

  useEffect(() => { fetchAllowance(); }, [fetchAllowance]);

  // --- NEW: Callback for when a purchase succeeds ---
  const handleBuySuccess = useCallback(() => {
    setShowSuccess(true);
    fetchAllowance(); // Refresh the allowance display
    
    const timer = setTimeout(() => {
      setShowSuccess(false);
      setUsdcAmount(''); // Clear the input for the next purchase
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [fetchAllowance]);

  // If we are showing the success message, we don't need approval yet
  const needsApproval = !showSuccess && allowance !== null && allowance < amountToSpend;

  if (!isMounted) return null;
  if (!isConnected) return <button onClick={() => connect({ connector: connectors[0] })} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Connect Wallet</button>;
  if (!addresses) return <div className="text-center p-4"><p className="mb-4 text-red-600 font-semibold">Unsupported Network</p><button onClick={() => switchChain?.({ chainId: hardhat.id })} className="px-4 py-2 bg-yellow-500 text-white rounded-lg" disabled={!switchChain}>Switch to Hardhat</button></div>;

  return (
    <div className="p-6 border rounded-lg shadow-md max-w-md mx-auto space-y-4 bg-white">
      <div className="flex justify-between items-center"><p className="text-sm font-mono truncate" title={address}>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p><button onClick={() => disconnect()} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Disconnect</button></div>
      <div><label htmlFor="usdcAmount" className="block text-sm font-medium text-gray-700">USDC Amount to spend</label><input id="usdcAmount" type="number" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
      
      <div className="space-y-2">
        {showSuccess ? (
          <button disabled className="w-full px-4 py-2 text-white rounded-lg bg-green-500">Success!</button>
        ) : isAllowanceLoading ? (
          <button disabled className="w-full px-4 py-2 text-white rounded-lg bg-gray-400">Verifying Allowance...</button>
        ) : amountToSpend === BigInt(0) ? (
          <button disabled className="w-full px-4 py-2 text-white bg-gray-400 rounded-lg">Enter an amount</button>
        ) : needsApproval ? (
          <ApproveButton usdcAddress={addresses.usdc} treasuryAddress={addresses.treasury} amountToSpend={amountToSpend} onApprovalSuccess={fetchAllowance} />
        ) : (
          <BuyFimButton auctionAddress={addresses.auction} amountToSpend={amountToSpend} onBuySuccess={handleBuySuccess} />
        )}
      </div>
      
      <div className="text-xs text-center text-gray-500">
        {!isAllowanceLoading && allowance !== null && <p>Current Allowance: {formatUnits(allowance, 6)} USDC</p>}
      </div>
    </div>
  );
}