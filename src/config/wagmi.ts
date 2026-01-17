import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// ✅ FIX: Ensure connectors are only initialized on the client to prevent server crashes
const connectors = typeof window !== 'undefined' ? connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Ritardo Games',
    projectId,
  }
) : []; 

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
  },
  connectors,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});