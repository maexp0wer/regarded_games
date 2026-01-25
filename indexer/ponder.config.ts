import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { GameControllerAbi } from "./abis/GameControllerAbi";
import { GameSeasonAbi } from "./abis/GameSeasonAbi";
import { FimAbi } from "./abis/FimAbi";
import { ExchangeAbi } from "./abis/ExchangeAbi";
import { AuctionAbi } from "./abis/AuctionAbi";

const CONTROLLER_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

export default createConfig({
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
      startBlock: 0,
    },
    GameSeason: {
      abi: GameSeasonAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "season",
      }),
    },
    FIM: {
      abi: FimAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "fim",
      }),
    },
    Exchange: {
      abi: ExchangeAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "exchange",
      }),
    },
     Auction: { // <--- NEW CONTRACT BLOCK
      abi: AuctionAbi,
      chain: "anvil",
      address: factory({
        address: CONTROLLER_ADDRESS,
        event: parseAbiItem("event SeasonDeployed(uint256 indexed seasonId, address season, address auction, address exchange, address fim)"),
        parameter: "auction",
      }),
    },
  },
});