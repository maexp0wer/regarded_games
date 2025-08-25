// src/lib/contracts.ts

/**
 * ABIs
 * 
 * We only need the fragments of the ABIs for the functions we want to call.
 * This is a good practice to keep the frontend bundle size small.
 * The `as const` assertion is a TypeScript feature that provides strict type-safety.
 */

// Minimal ABI for your AuctionTemplate contract, only including the `buyFIM` function.
export const auctionTemplateABI = [
  {
    "type": "function",
    "name": "buyFIM",
    "inputs": [
      { "name": "usdcAmount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

// Minimal ABI for a standard ERC20 token, only including the `approve` function.
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
  }
] as const;


/**
 * Contract Addresses
 * 
 * This is where you will define the deployed addresses of your contracts.
 * The structure allows your app to dynamically pick the right address based on
 * the network the user's wallet is connected to.
 * 
 * !!! IMPORTANT !!!
 * You MUST replace the placeholder addresses below with the actual addresses
 * from your deployments on Hardhat (local) and Sepolia (public).
 */

// Addresses for your local Hardhat network
const localAddresses = {
  // Example addresses from a `npx hardhat run scripts/deploy.ts` command
  auction: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  usdc: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  treasury: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

// Addresses for the public Sepolia testnet
const sepoliaAddresses = {
  // You need to deploy your contracts to Sepolia and paste the addresses here
  auction: '0x...', 
  usdc: '0x...',    
  treasury: '0x...',
};

// --- Main export ---
// This object maps a chain ID to the set of addresses for that network.
export const contractAddresses = {
  31337: localAddresses,    // Chain ID for Hardhat
  11155111: sepoliaAddresses, // Chain ID for Sepolia
};