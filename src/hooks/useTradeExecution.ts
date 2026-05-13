'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, usePublicClient } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { Order } from '@/hooks/useOrderBook';

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
}

export function useTradeExecution({
  isMaker, isBuy, targetAmount, makerTotalUsdcRaw, executionPayload,
  spendingToken, spendingSymbol, exchangeAddress, amountNeeded,
  selectedOrders, onRemoveOrder, setTargetAmount, setPrice
}: UseTradeExecutionParams) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStep>('idle');

  const { refetch: refetchAllowance } = useReadContract({
    address: spendingToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, exchangeAddress],
  });

  const handleStartFlow = async () => {
    if (!publicClient || !address) return;
    try {
      const liveAllowance = await publicClient.readContract({
        address: spendingToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, exchangeAddress]
      }) as bigint;

      if (liveAllowance < amountNeeded) {
        setWorkflowStatus('approving');
        const hash = await writeContractAsync({
          address: spendingToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [exchangeAddress, amountNeeded]
        });
        setWorkflowStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash });
        await refetchAllowance();
      }

      setWorkflowStatus('executing');
      const txHash = isMaker
        ? await writeContractAsync({
            address: exchangeAddress,
            abi: ExchangeAbi as any,
            functionName: 'createOrder',
            args: [isBuy, parseUnits(targetAmount, 18), makerTotalUsdcRaw]
          })
        : await writeContractAsync({
            address: exchangeAddress,
            abi: ExchangeAbi as any,
            functionName: 'fillBatch',
            args: [executionPayload.ids, executionPayload.amounts]
          });

      setWorkflowStatus('mining_execute');
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setWorkflowStatus('success');

      setTimeout(() => {
        if (!isMaker) selectedOrders.forEach(o => onRemoveOrder(o.id));
        setTargetAmount("");
        setPrice("");
        setWorkflowStatus('idle');
        queryClient.invalidateQueries();
      }, 2000);
    } catch (err: any) {
      setWorkflowStatus(err.shortMessage?.includes("rejected") ? 'canceled' : 'failed');
      setTimeout(() => setWorkflowStatus('idle'), 2000);
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

  return { workflowStatus, handleStartFlow, getStatusText, isBusy };
}
