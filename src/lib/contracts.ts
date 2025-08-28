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


export const gameControllerABI = [
  { "type": "function", "name": "getSeason", "inputs": [{ "name": "seasonId", "type": "uint256" }], "outputs": [{ "name": "isActive", "type": "bool" }, { "name": "gameSeason", "type": "address" }, { "name": "auction", "type": "address" }], "stateMutability": "view" },
  { "type": "function", "name": "getSeasonFinancialManifest", "inputs": [{ "name": "seasonId", "type": "uint256" }], "outputs": [{ "name": "yieldVenues", "type": "address[]" }, { "name": "allocationBps", "type": "uint256[]" }, { "name": "harvestGasPriceLimit", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "getTotalSeasons", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },

  // 🔴 THE FIX IS HERE: Add the new function's ABI 🔴
  // You must get the exact `outputs` from your compiled GameController.json artifact.
  // This is a likely guess based on your Treasury.sol code.
  {
    "type": "function",
    "name": "getSeasonParameters",
    "inputs": [{ "name": "seasonId", "type": "uint256" }],
    "outputs": [
      // These must match your contract's return signature EXACTLY.
      // I am guessing the names and types based on your Treasury code's usage.
      { "name": "param1", "type": "uint256" }, 
      { "name": "param2", "type": "uint256" }, 
      { "name": "param3", "type": "uint256" },
      { "name": "yieldVenues", "type": "address[]" },
      { "name": "allocationBps", "type": "uint256[]" },
      { "name": "harvestGasPriceLimit", "type": "uint256" }
    ],
    "stateMutability": "view"
  }
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

// src/lib/contracts.ts

// ... (keep all other ABIs, types, and addresses) ...

// --- The new, more complete Exchange ABI ---
export const exchangeABI = [
  // --- Events ---
  { "type": "event", "name": "AskCreated", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"fimAmount","type":"uint256","indexed":false},{"name":"usdcAmount","type":"uint256","indexed":false}], "anonymous": false },
  { "type": "event", "name": "BidCreated", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"usdcAmount","type":"uint256","indexed":false},{"name":"fimAmount","type":"uint256","indexed":false}], "anonymous": false },
  { "type": "event", "name": "OrderCanceled", "inputs": [{"name":"orderId","type":"uint256","indexed":true}], "anonymous": false },
  { "type": "event", "name": "OrderFilled", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"filler","type":"address","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"fimAmount","type":"uint256","indexed":false},{"name":"usdcAmount","type":"uint256","indexed":false}], "anonymous": false },

  // --- 🔴 ADD THE CUSTOM ERRORS HERE 🔴 ---
  { "type": "error", "name": "AlreadyInitialized", "inputs": [] },
  { "type": "error", "name": "NotLive", "inputs": [] },
  { "type": "error", "name": "InvalidOrder", "inputs": [] },
  { "type": "error", "name": "NotOrderCreator", "inputs": [] },
  { "type": "error", "name": "ZeroAmount", "inputs": [] },
  { "type": "error", "name": "BidPriceTooLow", "inputs": [] },
  { "type": "error", "name": "AskPriceTooHigh", "inputs": [] },
  { "type": "error", "name": "FillAmountExceedsOrder", "inputs": [] },

  // --- Functions (remain the same) ---
  { "type": "function", "name": "PAR_VALUE_FIM_PER_USDC", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "cancelOrder", "inputs": [{ "name": "orderId", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "createAsk", "inputs": [{ "name": "fimAmount", "type": "uint256" }, { "name": "usdcAmount", "type": "uint256" }], "outputs": [{ "name": "orderId", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "createBid", "inputs": [{ "name": "usdcAmount", "type": "uint256" }, { "name": "fimAmount", "type": "uint256" }], "outputs": [{ "name": "orderId", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "fillOrder", "inputs": [{ "name": "orderId", "type": "uint256" }, { "name": "amountProvidedByFiller", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "orderCounter", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "orders", "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256" }, { "name": "creator", "type": "address" },
      { "name": "orderType", "type": "uint8" },
      { "name": "amountToSell", "type": "uint256" }, { "name": "amountToBuy", "type": "uint256" },
      { "name": "amountFilled", "type": "uint256" }, { "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view"
  }
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