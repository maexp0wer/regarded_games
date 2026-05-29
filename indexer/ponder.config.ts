import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { GameControllerAbi } from "./abis/GameControllerAbi";
import { GameSeasonAbi } from "./abis/GameSeasonAbi";
import { FimAbi } from "./abis/FimAbi";
import { ExchangeAbi } from "./abis/ExchangeAbi";
import { AuctionAbi } from "./abis/AuctionAbi";
import { TreasuryAbi } from "./abis/TreasuryAbi";
import { CapitalAuctionAbi } from "./abis/CapitalAuctionAbi";
import { FakeUSDCFaucetAbi } from "./abis/FakeUSDCFaucetAbi";
import { StakingAbi } from "./abis/StakingAbi";
import { Erc20Abi } from "./abis/Erc20Abi";
import mainnetCore from "../src/deployments/mainnet/core.json";
import sepoliaCore from "../src/deployments/sepolia/core.json";

const PONDER_DEPLOYMENT = (process.env.PONDER_DEPLOYMENT ?? "mainnet").toLowerCase();
const coreDeployment = PONDER_DEPLOYMENT === "sepolia" ? sepoliaCore : mainnetCore;

const CONTROLLER_ADDRESS = coreDeployment.Controller as `0x${string}`;
const TREASURY_ADDRESS = coreDeployment.Treasury as `0x${string}`;
const CAPITAL_AUCTION_ADDRESS = coreDeployment.CapitalAuction as `0x${string}`;
const FAUCET_ADDRESS = (coreDeployment as any).Faucet as `0x${string}` | undefined;
const STAKING_ADDRESS = (coreDeployment as any).Staking as `0x${string}` | undefined;
const RGD_ADDRESS = (coreDeployment as any).RGD as `0x${string}` | undefined;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const START_BLOCK = parseInt(process.env.PONDER_START_BLOCK ?? "0");

// Each Ponder instance indexes exactly one chain. In fork mode start.bat runs
// two instances side-by-side: PONDER_CHAIN_ID=31337 (mainnet fork on :8545) and
// PONDER_CHAIN_ID=31338 (sepolia fork on :8546). PONDER_RPC_URL points at the
// matching Anvil. In real mainnet/sepolia deployments these are 8453/84532
// plus the real RPC URL.
const CHAIN_ID = parseInt(process.env.PONDER_CHAIN_ID ?? "31337");
const RPC_URL =
  process.env.PONDER_RPC_URL ??
  process.env.PONDER_RPC_URL_31337 ??
  "http://127.0.0.1:8545";

export default createConfig({
  database: {
    kind: "postgres",
    // Trim to guard against trailing whitespace from Windows `set VAR=value &&` in cmd.exe
    connectionString: process.env.DATABASE_URL?.trim(),
  },
  chains: {
    anvil: {
      id: CHAIN_ID,
      rpc: RPC_URL,
    },
  },
  contracts: {
    GameController: {
      abi: GameControllerAbi,
      chain: "anvil", // Switch to "baseSepolia" or "base" for deployment
      address: CONTROLLER_ADDRESS,
      startBlock: START_BLOCK,
    },
    GameSeason: {
      abi: GameSeasonAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "season",
      }),
      startBlock: START_BLOCK,
    },
    FIM: {
      abi: FimAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "fim",
      }),
      startBlock: START_BLOCK,
    },
    Exchange: {
      abi: ExchangeAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "exchange",
      }),
      startBlock: START_BLOCK,
    },
     Auction: {
      abi: AuctionAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "auction",
      }),
      startBlock: START_BLOCK,
    },
    Treasury: {
      abi: TreasuryAbi,
      chain: "anvil",
      address: TREASURY_ADDRESS,
      startBlock: START_BLOCK,
    },
    CapitalAuction: {
      abi: CapitalAuctionAbi,
      chain: "anvil",
      address: CAPITAL_AUCTION_ADDRESS,
      startBlock: START_BLOCK,
    },
    ...(FAUCET_ADDRESS && FAUCET_ADDRESS !== ZERO_ADDR
      ? {
          FakeUSDCFaucet: {
            abi: FakeUSDCFaucetAbi,
            chain: "anvil" as const,
            address: FAUCET_ADDRESS,
            startBlock: START_BLOCK,
          },
        }
      : {}),
    ...(STAKING_ADDRESS && STAKING_ADDRESS !== ZERO_ADDR
      ? {
          Staking: {
            abi: StakingAbi,
            chain: "anvil" as const,
            address: STAKING_ADDRESS,
            startBlock: START_BLOCK,
          },
        }
      : {}),
    ...(RGD_ADDRESS && RGD_ADDRESS !== ZERO_ADDR
      ? {
          RgdToken: {
            abi: Erc20Abi,
            chain: "anvil" as const,
            address: RGD_ADDRESS,
            startBlock: START_BLOCK,
          },
        }
      : {}),
  },
});