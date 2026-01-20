import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { foundry, base, baseSepolia } from 'wagmi/chains'; // 1. Import chains
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// 1. Define all chains (Anvil for dev, Base for test/prod)
const chains = [
  foundry, // Anvil (31337)
  baseSepolia,
  base,
] as const;


// 2. Set up the connectors (Wallet UI logic)
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
    appName: 'My Blockchain App',
    projectId,
  }
) : [];

// 3. Create the main Wagmi Config
export const config = createConfig({
  chains,
  transports: {
    // Local Anvil Node
    [foundry.id]: http(process.env.NEXT_PUBLIC_ANVIL_RPC_URL),
    
    // Base Sepolia Testnet (Alchemy)
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL),
    
    // Base Mainnet (Alchemy)
    [base.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL),
  },
  connectors, 
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});