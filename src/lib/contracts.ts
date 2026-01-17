// src/lib/contracts.ts

import { type Address, getAddress } from "viem";

import localConfig from '../../deployment-config-localhost.json';

export interface ContractSet {
  Auction: Address;
  Exchange: Address;
  FIMToken: Address;
  GameSeason: Address;
  USDC: Address;
  Treasury: Address;
  GameController: Address;
}

interface RawConfig {
  genesisSeason: {
    Auction: string;
    Exchange: string;
    FIMToken: string;
    GameSeason: string;
  };
  permanentInfrastructure: {
    USDC: string;
    Treasury: string;
    GameController: string;
  };
}

// Define the ABIs as before
export const AuctionTemplateABI = [
  { "type": "function", "name": "buyFIM", "inputs": [{ "name": "USDCAmount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }
] as const;

export const erc20ABI = [
  { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "allowance", "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "balanceOf", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" }
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
  { "type": "event", "name": "AskCreated", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"fimAmount","type":"uint256","indexed":false},{"name":"usdcAmount","type":"uint256","indexed":false}], "anonymous": false },
  { "type": "event", "name": "BidCreated", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"usdcAmount","type":"uint256","indexed":false},{"name":"fimAmount","type":"uint256","indexed":false}], "anonymous": false },
  { "type": "event", "name": "OrderCanceled", "inputs": [{"name":"orderId","type":"uint256","indexed":true}], "anonymous": false },
  { "type": "event", "name": "OrderFilled", "inputs": [{"name":"orderId","type":"uint256","indexed":true},{"name":"filler","type":"address","indexed":true},{"name":"creator","type":"address","indexed":true},{"name":"fimAmount","type":"uint256","indexed":false},{"name":"usdcAmount","type":"uint256","indexed":false}], "anonymous": false },
  { "type": "error", "name": "AskPriceTooHigh", "inputs": [] },
  { "type": "error", "name": "BidPriceTooLow", "inputs": [] },
  { "type": "function", "name": "cancelOrder", "inputs": [{ "name": "orderId", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "createAsk", "inputs": [{ "name": "fimAmount", "type": "uint256" }, { "name": "usdcAmount", "type": "uint256" }], "outputs": [{ "name": "orderId", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "createBid", "inputs": [{ "name": "usdcAmount", "type": "uint256" }, { "name": "fimAmount", "type": "uint256" }], "outputs": [{ "name": "orderId", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "fillOrder", "inputs": [{ "name": "orderId", "type": "uint256" }, { "name": "amountProvidedByFiller", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "orderCounter", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "orders", "inputs": [{ "name": "", "type": "uint256" }], "outputs": [{ "name": "id", "type": "uint256" }, { "name": "creator", "type": "address" }, { "name": "orderType", "type": "uint8" }, { "name": "amountToSell", "type": "uint256" }, { "name": "amountToBuy", "type": "uint256" }, { "name": "amountFilled", "type": "uint256" }, { "name": "status", "type": "uint8" }], "stateMutability": "view" }
] as const;


// --- Your Deployed Addresses ---
// We apply the strict `ContractSet` type here.
export function parseConfig(config: RawConfig): ContractSet {
  // Helper: Validates that a string is a real Ethereum address
  // 'getAddress' from viem automatically checksums and throws if invalid.
  const validate = (addr: string, fieldName: string): Address => {
    try {
      return getAddress(addr); 
    } catch {
      console.error(`Invalid address found for ${fieldName}: ${addr}`);
      // Fallback to a zero address or re-throw depending on strictness
      throw new Error(`Config Error: ${fieldName} is not a valid Ethereum address.`);
    }
  };

  return {
    // Genesis Season
    Auction: validate(config.genesisSeason.Auction, 'Auction'),
    Exchange: validate(config.genesisSeason.Exchange, 'Exchange'),
    FIMToken: validate(config.genesisSeason.FIMToken, 'FIMToken'),
    GameSeason: validate(config.genesisSeason.GameSeason, 'GameSeason'),
    
    // Permanent Infrastructure
    USDC: validate(config.permanentInfrastructure.USDC, 'USDC'),
    Treasury: validate(config.permanentInfrastructure.Treasury, 'Treasury'),
    GameController: validate(config.permanentInfrastructure.GameController, 'GameController'),
  };
}

// 2. Parse both configuration files into our clean format.
const localAddresses: ContractSet = parseConfig(localConfig);



// The main export, now fully typed.
export const contractAddresses: Record<number, ContractSet> = {
  31337: localAddresses,
  //11155111: sepoliaAddresses,
};