// src/lib/contracts.ts



type Address = `0x${string}`;

// Define the ABIs as before
export const auctionTemplateABI = [
  { "type": "function", "name": "buyFIM", "inputs": [{ "name": "usdcAmount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }
] as const;

export const erc20ABI = [
  { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "allowance", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }
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


// Define a type for a set of our contracts
type ContractSet = {
  auction: Address;
  usdc: Address;
  treasury: Address;
  gameController: Address;
};

// --- Your Deployed Addresses ---
// We apply the strict `ContractSet` type here.
const localAddresses: ContractSet = {
  auction: '0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762',  // Use the Season 0 Auction address
  usdc: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',      
  treasury: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  gameController: '0x0165878A594ca255338adfa4d48449f69242Eb8F'
};

const sepoliaAddresses: ContractSet = {
  auction: '0x0000000000000000000000000000000000000000',
  usdc: '0x0000000000000000000000000000000000000000',
  treasury: '0x0000000000000000000000000000000000000000',
  gameController: '0x0000000000000000000000000000000000000000',
};

// The main export, now fully typed.
export const contractAddresses: Record<number, ContractSet> = {
  31337: localAddresses,
  11155111: sepoliaAddresses,
};