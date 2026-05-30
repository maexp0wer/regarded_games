import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { foundry, base, baseSepolia } from 'wagmi/chains'; // 1. Import chains
import { foundrySepolia } from './tenants';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// 1. Define all chains. In fork mode two local Anvils run side-by-side:
//    foundry (31337) → Base mainnet fork on :8545
//    foundrySepolia (31338) → Base Sepolia fork on :8546
//    The active chain per tenant is set by RainbowKitProvider's `initialChain`
//    prop (see src/components/Providers.tsx + src/app/layout.tsx).
const chains = [foundry, foundrySepolia, baseSepolia, base] as const;


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
// In fork mode, use local Anvils. In mainnet mode, use /api/rpc proxy (adds Alchemy key server-side).
const isFork = typeof window !== 'undefined' ?
  process.env.NEXT_PUBLIC_ENVIRONMENT !== 'mainnet' :
  true;

const baseMainnetRpc = isFork
  ? (process.env.NEXT_PUBLIC_ANVIL_RPC_URL_MAINNET || 'http://127.0.0.1:8545')
  : '/api/rpc/mainnet';

const baseSepoliaRpc = isFork
  ? (process.env.NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA || 'http://127.0.0.1:8546')
  : '/api/rpc/sepolia';

export const config = createConfig({
  chains,
  transports: {
    [foundry.id]: http(process.env.NEXT_PUBLIC_ANVIL_RPC_URL_MAINNET || 'http://127.0.0.1:8545'),
    [foundrySepolia.id]: http(process.env.NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA || 'http://127.0.0.1:8546'),
    [baseSepolia.id]: http(baseSepoliaRpc),
    [base.id]: http(baseMainnetRpc),
  },
  connectors,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});