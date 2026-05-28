// src/lib/contracts.ts

import FakeUSDCFaucetAbiRaw from '@/deployments/abis/FakeUSDCFaucet.json';
export const FakeUSDCFaucetABI = FakeUSDCFaucetAbiRaw as const;

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
  {
    "type": "function",
    "name": "getSeasonParameters",
    "inputs": [{ "name": "seasonId", "type": "uint256" }],
    "outputs": [
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
