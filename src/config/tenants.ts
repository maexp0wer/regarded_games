import { base, baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import mainnetCore from '@/deployments/mainnet/core.json';
import sepoliaCore from '@/deployments/sepolia/core.json';

export type TenantKey = 'mainnet' | 'sepolia';
export type AppEnv = 'fork' | 'mainnet';

export interface CoreDeployment {
  Aave: `0x${string}`;
  CapitalAuction: `0x${string}`;
  Controller: `0x${string}`;
  RGD: `0x${string}`;
  Router: `0x${string}`;
  Staking: `0x${string}`;
  TestnetDistributor: `0x${string}`;
  Treasury: `0x${string}`;
  USDC: `0x${string}`;
  Vesting: `0x${string}`;
}

export interface TenantConfig {
  key: TenantKey;
  realChainId: 8453 | 84532;
  /** Chain ID the frontend talks to. In fork mode: 31337 (mainnet fork) / 31338 (sepolia fork). In mainnet env: realChainId. */
  activeChainId: number;
  deployment: CoreDeployment;
  ponderUrl: string;
  rpcUrl: string;
  realChain: typeof base | typeof baseSepolia;
}

export const APP_ENV: AppEnv =
  (process.env.NEXT_PUBLIC_ENVIRONMENT as AppEnv) || 'fork';

const isFork = APP_ENV !== 'mainnet';

/** Custom foundry-style chain for the sepolia-fork Anvil (chain id 31338, port 8546). */
export const foundrySepolia = defineChain({
  id: 31338,
  name: 'Foundry Sepolia Fork',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA || 'http://127.0.0.1:8546'],
    },
  },
});

const ANVIL_RPC_MAINNET =
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL_MAINNET || 'http://127.0.0.1:8545';
const ANVIL_RPC_SEPOLIA =
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA || 'http://127.0.0.1:8546';

const FORK_PONDER_MAINNET = 'http://127.0.0.1:42069/graphql';
const FORK_PONDER_SEPOLIA = 'http://127.0.0.1:42070/graphql';

export const TENANTS: Record<TenantKey, TenantConfig> = {
  mainnet: {
    key: 'mainnet',
    realChainId: 8453,
    activeChainId: isFork ? 31337 : 8453,
    deployment: mainnetCore as CoreDeployment,
    ponderUrl: isFork
      ? FORK_PONDER_MAINNET
      : process.env.NEXT_PUBLIC_PONDER_URL_MAINNET || FORK_PONDER_MAINNET,
    rpcUrl: isFork
      ? ANVIL_RPC_MAINNET
      : process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL || '',
    realChain: base,
  },
  sepolia: {
    key: 'sepolia',
    realChainId: 84532,
    activeChainId: isFork ? 31338 : 84532,
    deployment: sepoliaCore as CoreDeployment,
    ponderUrl: isFork
      ? FORK_PONDER_SEPOLIA
      : process.env.NEXT_PUBLIC_PONDER_URL_SEPOLIA || FORK_PONDER_SEPOLIA,
    rpcUrl: isFork
      ? ANVIL_RPC_SEPOLIA
      : process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL || '',
    realChain: baseSepolia,
  },
};

export function getTenant(key: TenantKey): TenantConfig {
  return TENANTS[key];
}
