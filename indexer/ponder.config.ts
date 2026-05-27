import dotenv from "dotenv";
dotenv.config({ path: "../.env.local", override: true });
dotenv.config({ path: "../.env" });

import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { GameControllerAbi } from "./abis/GameControllerAbi";
import { GameSeasonAbi } from "./abis/GameSeasonAbi";
import { FimAbi } from "./abis/FimAbi";
import { ExchangeAbi } from "./abis/ExchangeAbi";
import { AuctionAbi } from "./abis/AuctionAbi";
import { TreasuryAbi } from "./abis/TreasuryAbi";
import { CapitalAuctionAbi } from "./abis/CapitalAuctionAbi";
import coreDeployment from "../src/deployments/local/core.json";

const CONTROLLER_ADDRESS = coreDeployment.Controller as `0x${string}`;
const TREASURY_ADDRESS = coreDeployment.Treasury as `0x${string}`;
const CAPITAL_AUCTION_ADDRESS = coreDeployment.CapitalAuction as `0x${string}`;
const START_BLOCK = parseInt(process.env.PONDER_START_BLOCK ?? "0");

export default createConfig({
  database: {
    kind: "postgres",
    // Trim to guard against trailing whitespace from Windows `set VAR=value &&` in cmd.exe
    connectionString: process.env.DATABASE_URL?.trim(),
  },
  chains: {
    anvil: {
      id: 31337,
      rpc: process.env.PONDER_RPC_URL_31337,
    }/*,
    baseSepolia: {
      id: 84532,
      rpc: process.env.PONDER_RPC_URL_84532,
    },
    base: {
      id: 8453,
      rpc: process.env.PONDER_RPC_URL_8453,
    },*/
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
  },
});