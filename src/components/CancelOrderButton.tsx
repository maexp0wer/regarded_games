// src/components/CancelOrderButton.tsx
'use client';

import { useEffect } from 'react';
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI } from '@/lib/contracts';
import { useExchangeContext } from '@/context/ExchangeContext'; // To refetch the order book
import { useUserHoldingsContext } from '@/context/UserHoldingsContext'; // To refetch balances

interface CancelOrderButtonProps {
  orderId: bigint;
}

export function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  
  // Get the refetch functions from the contexts to update the UI on success
  const { refetchOrders } = useExchangeContext();
  const { refetch: refetchHoldings } = useUserHoldingsContext();

  // 1. Prepare (simulate) the `cancelOrder` transaction.
  //    This hook will return an error if the user is not the creator, etc.
  const { data: cancelRequest, error: cancelError } = useSimulateContract({
    address: addresses?.Exchange,
    abi: exchangeABI,
    functionName: 'cancelOrder',
    args: [orderId],
    // The query is enabled by default, which is what we want.
    // The button will be disabled if `cancelRequest` is not available.
  });

  // 2. Setup the hook to send the transaction.
  const { writeContract: cancelOrder, data: cancelHash, isPending: isCanceling } = useWriteContract();

  // 3. Setup the hook to wait for the transaction to be mined.
  const { isLoading: isWaitingForCancel, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ 
    hash: cancelHash 
  });

  // 4. React to a successful cancellation to update the app state.
  useEffect(() => {
    if (isCancelSuccess) {
      console.log(`Order ${orderId} canceled successfully. Refetching data.`);
      refetchOrders();
      refetchHoldings();
    }
  }, [isCancelSuccess, refetchOrders, refetchHoldings, orderId]);
  
  const isLoading = isCanceling || isWaitingForCancel;

  // If the transaction has succeeded, we can show a confirmation state.
  if (isCancelSuccess) {
    return <span className="text-xs text-gray-500 font-mono">Canceled</span>;
  }

  return (
    <>
      <button
        onClick={() => {
          if (cancelRequest) {
            cancelOrder(cancelRequest.request);
          }
        }}
        // The button is disabled if the simulation fails (e.g., not order creator) or if a transaction is in progress.
        disabled={!cancelRequest || isLoading}
        className="px-2 py-1 bg-danger text-bg rounded-md text-xs font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? '...' : 'Cancel'}
      </button>
      {/* Optionally display a simulation error if one exists */}
      {/* {cancelError && <p className="text-danger text-xs">Cannot cancel</p>} */}
    </>
  );
}