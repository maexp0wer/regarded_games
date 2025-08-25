// lib/wagmi.ts
import { http, createConfig } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors'; // <-- Import connectors

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors: [
    injected(), // <-- Add injected connector (for MetaMask, etc.)
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});