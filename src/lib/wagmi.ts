// src/lib/wagmi.ts
import { http, createConfig } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected()], // Supports MetaMask and other browser wallets
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});