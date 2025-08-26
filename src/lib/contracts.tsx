// src/lib/contracts.ts



type Address = `0x${string}`;

// Define the ABIs as before
export const auctionTemplateABI = [
  { "type": "function", "name": "buyFIM", "inputs": [{ "name": "usdcAmount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }
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
  { "type": "function", "name": "getSeason", "inputs": [{ "name": "seasonId", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "isActive", "type": "bool", "internalType": "bool" }, { "name": "gameSeason", "type": "address", "internalType": "address" }, { "name": "auction", "type": "address", "internalType": "address" }], "stateMutability": "view" },
  { "type": "function", "name": "getSeasonFinancialManifest", "inputs": [{ "name": "seasonId", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "yieldVenues", "type": "address[]", "internalType": "address[]" }, { "name": "allocationBps", "type": "uint256[]", "internalType": "uint256[]" }, { "name": "harvestGasPriceLimit", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "getTotalSeasons", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }
] as const;

export const treasuryABI = [
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
  // --- Views ---
  { "type": "function", "name": "orderCounter", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "orders", "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256" }, { "name": "creator", "type": "address" },
      { "name": "usdcAmountTotal", "type": "uint256" }, { "name": "usdcAmountFilled", "type": "uint256" },
      { "name": "fimPrice", "type": "uint256" }, { "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view"
  },
  // --- Mutations (Write Functions) ---
  {
    "type": "function", "name": "createBuyOrder",
    "inputs": [
      { "name": "usdcAmountToSpend", "type": "uint256" },
      { "name": "fimPricePerUsdc", "type": "uint256" }
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
  { "type": "event", "name": "OrderCreated", "inputs": [{ "name": "orderId", "type": "uint256", "indexed": true }, { "name": "creator", "type": "address", "indexed": true }, { "name": "usdcAmount", "type": "uint256" }, { "name": "fimPrice", "type": "uint256" }], "anonymous": false },
  { "type": "event", "name": "OrderFilled", "inputs": [{ "name": "orderId", "type": "uint256", "indexed": true }, { "name": "seller", "type": "address", "indexed": true }, { "name": "buyer", "type": "address", "indexed": true }, { "name": "fimAmount", "type": "uint256" }, { "name": "usdcAmount", "type": "uint256" }], "anonymous": false }
] as const;


// Define a type for a set of our contracts
type ContractSet = {
  auction: Address;
  usdc: Address;
  treasury: Address;
  gameController: Address;
  exchange: Address;
  fimToken: Address;
};

// --- Your Deployed Addresses ---
// We apply the strict `ContractSet` type here.
const localAddresses: ContractSet = {
  auction: '0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762',  // Use the Season 0 Auction address
  usdc: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',      
  treasury: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  gameController: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  exchange: '0x7ab4C4804197531f7ed6A6bc0f0781f706ff7953',
  fimToken: '0xc8CB5439c767A63aca1c01862252B2F3495fDcFE',
};

const sepoliaAddresses: ContractSet = {
  auction: '0x0000000000000000000000000000000000000000',
  usdc: '0x0000000000000000000000000000000000000000',
  treasury: '0x0000000000000000000000000000000000000000',
  gameController: '0x0000000000000000000000000000000000000000',
  exchange: '0x0000000000000000000000000000000000000000',
  fimToken: '0x0000000000000000000000000000000000000000',
};

// The main export, now fully typed.
export const contractAddresses: Record<number, ContractSet> = {
  31337: localAddresses,
  11155111: sepoliaAddresses,
};