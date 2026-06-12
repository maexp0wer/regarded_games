'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, usePublicClient } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import type { Abi } from 'abitype';
import { Order } from '@/hooks/useOrderBook';
import { useTenantChainId } from '@/context/TenantContext';
import { friendlyRevertReason, isUserRejection } from '@/utils/revertReason';

export type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'executing' | 'mining_execute' | 'success' | 'canceled' | 'failed';

export interface ExecutionPayload {
  ids: bigint[];
  amounts: bigint[];
  totalCostRaw: bigint;
  totalFimRaw: bigint;
}

interface UseTradeExecutionParams {
  isMaker: boolean;
  isBuy: boolean;
  targetAmount: string;
  makerTotalUsdcRaw: bigint;
  executionPayload: ExecutionPayload;
  spendingToken: `0x${string}`;
  spendingSymbol: string;
  exchangeAddress: `0x${string}`;
  amountNeeded: bigint;
  selectedOrders: Order[];
  onRemoveOrder: (id: string) => void;
  setTargetAmount: (v: string) => void;
  setPrice: (v: string) => void;
  // Mixed-trade extras: sell leg needs a separate FIM approval
  isMixed?: boolean;
  fimToken?: `0x${string}`;
  sellFimAmountNeeded?: bigint;
}

export function useTradeExecution({
  isMaker, isBuy, targetAmount, makerTotalUsdcRaw, executionPayload,
  spendingToken, spendingSymbol, exchangeAddress, amountNeeded,
  selectedOrders, onRemoveOrder, setTargetAmount, setPrice,
  isMixed, fimToken, sellFimAmountNeeded,
}: UseTradeExecutionParams) {
  const { address } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStep>('idle');
  const [txHashes, setTxHashes] = useState<(string | null)[]>([null, null]);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const { refetch: refetchAllowance } = useReadContract({
    address: spendingToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, exchangeAddress],
    chainId,
  });

  const handleStartFlow = async () => {
    if (!publicClient || !address) return;
    setTxHashes([null, null]);
    setErrorReason(null);
    try {
      // Step 1a: USDC (or FIM for non-mixed sell) approval
      const liveAllowance = await publicClient.readContract({
        address: spendingToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, exchangeAddress]
      }) as bigint;

      if (liveAllowance < amountNeeded) {
        setWorkflowStatus('approving');
        const approveHash = await writeContractAsync({
          address: spendingToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [exchangeAddress, amountNeeded]
        });
        setWorkflowStatus('mining_approval');
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approvalReceipt.status === 'reverted') throw new Error('Approval reverted');
        setTxHashes([approveHash, null]);
        await refetchAllowance();
      }

      // Step 1b: FIM approval for the sell leg of a mixed trade
      if (isMixed && fimToken && sellFimAmountNeeded && sellFimAmountNeeded > 0n) {
        const liveFimAllowance = await publicClient.readContract({
          address: fimToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, exchangeAddress]
        }) as bigint;

        if (liveFimAllowance < sellFimAmountNeeded) {
          setWorkflowStatus('approving');
          const fimApproveHash = await writeContractAsync({
            address: fimToken,
            abi: erc20Abi,
            functionName: 'approve',
            args: [exchangeAddress, sellFimAmountNeeded]
          });
          setWorkflowStatus('mining_approval');
          const fimApprovalReceipt = await publicClient.waitForTransactionReceipt({ hash: fimApproveHash });
          if (fimApprovalReceipt.status === 'reverted') throw new Error('FIM approval reverted');
          setTxHashes([fimApproveHash, null]);
        }
      }

      setWorkflowStatus('executing');
      const txHash = isMaker
        ? await writeContractAsync({
            address: exchangeAddress,
            abi: ExchangeAbi as Abi,
            functionName: 'createOrder',
            args: [isBuy, parseUnits(targetAmount, 18), makerTotalUsdcRaw]
          })
        : await writeContractAsync({
            address: exchangeAddress,
            abi: ExchangeAbi as Abi,
            functionName: 'fillBatch',
            args: [executionPayload.ids, executionPayload.amounts]
          });

      setWorkflowStatus('mining_execute');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === 'reverted') throw new Error('Transaction reverted');
      setTxHashes(prev => [prev[0], txHash]);

      setWorkflowStatus('success');

      setTimeout(() => {
        if (!isMaker) selectedOrders.forEach(o => onRemoveOrder(o.id));
        setTargetAmount("");
        setPrice("");
        setWorkflowStatus('idle');
        setTxHashes([null, null]);
        queryClient.invalidateQueries();
      }, 2000);
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setWorkflowStatus('canceled');
        // Rejections are self-explanatory — auto-dismiss.
        setTimeout(() => { setWorkflowStatus('idle'); setTxHashes([null, null]); }, 2000);
      } else {
        // A real revert: surface the reason and let the user dismiss via the
        // modal's "Close & Retry" so they actually read it (no auto-reset).
        setErrorReason(friendlyRevertReason(err));
        setWorkflowStatus('failed');
      }
    }
  };

  const getStatusText = () => {
    if (workflowStatus === 'idle') return isBuy ? 'Buy FIM →' : 'Sell FIM →';
    const texts: Record<WorkflowStep, string> = {
      approving: `Step 1/2: Approve ${spendingSymbol}`, mining_approval: "Confirming Approval...",
      executing: "Step 2/2: Sign Transaction", mining_execute: "Finalizing...",
      success: "Success!", canceled: "Canceled", failed: "Failed", idle: ""
    };
    return texts[workflowStatus];
  };

  const isBusy = workflowStatus !== 'idle' && !['success', 'canceled', 'failed'].includes(workflowStatus);

  const resetWorkflow = () => {
    setWorkflowStatus('idle');
    setTxHashes([null, null]);
    setErrorReason(null);
  };

  return { workflowStatus, txHashes, handleStartFlow, getStatusText, isBusy, errorReason, resetWorkflow };
}
