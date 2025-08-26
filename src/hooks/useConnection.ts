// src/hooks/useConnection.ts
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { hardhat } from 'wagmi/chains';
// 🔴 THE DEFINITIVE FIX IS HERE: Import the `Chain` type from `viem`.
import { type Address, type Chain } from 'viem';
import { contractAddresses } from '@/lib/contracts';

export interface ConnectionState {
  isMounted: boolean;
  isConnected: boolean;
  isWrongNetwork: boolean;
  address?: Address;
  chain?: Chain; // This will now correctly resolve to the type we imported from viem
  connect: () => void;
  disconnect: () => void;
  switchNetwork?: () => void;
}

export function useConnection(): ConnectionState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && (!chain || !contractAddresses[chain.id]);

  return {
    isMounted,
    isConnected,
    isWrongNetwork,
    address,
    chain, // The `chain` object returned by useAccount conforms to the `viem` Chain type
    connect: () => connect({ connector: connectors[0] }),
    disconnect,
    switchNetwork: switchChain ? () => switchChain({ chainId: hardhat.id }) : undefined,
  };
}