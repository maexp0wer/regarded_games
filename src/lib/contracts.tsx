// src/lib/contracts.ts
import { ContractSet } from "./types";
import { Address } from "viem";

import localConfig from '../../deployment-config-localhost.json';

// Define the ABIs as before
export const AuctionTemplateABI = [
  { "type": "function", "name": "buyFIM", "inputs": [{ "name": "USDCAmount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }
] as const;

export const erc20ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "spender", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  }
] as const;


export const GameControllerABI = [
  { "type": "function", "name": "getSeason", "inputs": [{ "name": "seasonId", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "isActive", "type": "bool", "internalType": "bool" }, { "name": "gameSeason", "type": "address", "internalType": "address" }, { "name": "Auction", "type": "address", "internalType": "address" }], "stateMutability": "view" },
  { "type": "function", "name": "getSeasonFinancialManifest", "inputs": [{ "name": "seasonId", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "yieldVenues", "type": "address[]", "internalType": "address[]" }, { "name": "allocationBps", "type": "uint256[]", "internalType": "uint256[]" }, { "name": "harvestGasPriceLimit", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "getTotalSeasons", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }
] as const;

export const TreasuryABI = [
  {
    "type": "function",
    "name": "seasonPrizePool",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  }
] as const;

export const gameSeasonABI = [
  {
    "type": "function",
    "name": "fimBalances",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "currentState",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8", "internalType": "enum GameSeasonTemplate.State" }],
    "stateMutability": "view"
  }
] as const;

export const ExchangeABI = [
  // --- Views ---
  { "type": "function", "name": "orderCounter", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "orders", "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256" }, { "name": "creator", "type": "address" },
      { "name": "USDCAmountTotal", "type": "uint256" }, { "name": "USDCAmountFilled", "type": "uint256" },
      { "name": "fimPrice", "type": "uint256" }, { "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view"
  },
  // --- Mutations (Write Functions) ---
  {
    "type": "function", "name": "createBuyOrder",
    "inputs": [
      { "name": "USDCAmountToSpend", "type": "uint256" },
      { "name": "fimPricePerUSDC", "type": "uint256" }
    ],
    "outputs": [{ "name": "orderId", "type": "uint256" }], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "fillBuyOrder",
    "inputs": [
      { "name": "orderId", "type": "uint256" },
      { "name": "fimAmountToSell", "type": "uint256" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  // --- Events ---
  { "type": "event", "name": "OrderCreated", "inputs": [{ "name": "orderId", "type": "uint256", "indexed": true }, { "name": "creator", "type": "address", "indexed": true }, { "name": "USDCAmount", "type": "uint256" }, { "name": "fimPrice", "type": "uint256" }], "anonymous": false },
  { "type": "event", "name": "OrderFilled", "inputs": [{ "name": "orderId", "type": "uint256", "indexed": true }, { "name": "seller", "type": "address", "indexed": true }, { "name": "buyer", "type": "address", "indexed": true }, { "name": "fimAmount", "type": "uint256" }, { "name": "USDCAmount", "type": "uint256" }], "anonymous": false }
] as const;





// --- Your Deployed Addresses ---
// We apply the strict `ContractSet` type here.
function parseConfig(config: any): ContractSet {
  // We use type assertion here because we are validating the structure.
  return {
    // From genesisSeason (ensure keys are lowercase)
    Auction: config.genesisSeason.Auction as Address,
    Exchange: config.genesisSeason.Exchange as Address,
    FIMToken: config.genesisSeason.FIMToken as Address,
    GameSeason: config.genesisSeason.GameSeason as Address,
    
    // From permanentInfrastructure (ensure keys are lowercase)
    USDC: config.permanentInfrastructure.USDC as Address,
    Treasury: config.permanentInfrastructure.Treasury as Address,
    GameController: config.permanentInfrastructure.GameController as Address,
  };
}

// 2. Parse both configuration files into our clean format.
const localAddresses: ContractSet = parseConfig(localConfig);



// The main export, now fully typed.
export const contractAddresses: Record<number, ContractSet> = {
  31337: localAddresses,
  //11155111: sepoliaAddresses,
};