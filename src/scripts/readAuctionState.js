// scripts/readAuctionState.ts
import { ethers } from "hardhat";

async function main() {
  const auctionAddress = "0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762";
  
  console.log(`Reading public variables from Auction contract at: ${auctionAddress}`);

  // We can use a minimal ABI since we are just reading public state variables
  const auctionABI = [
    "function treasury() view returns (address)",
    "function usdcToken() view returns (address)",
    "function seasonId() view returns (uint256)"
  ];

  const auctionContract = await ethers.getContractAt(auctionABI, auctionAddress);

  const storedTreasuryAddress = await auctionContract.treasury();
  const storedUsdcAddress = await auctionContract.usdcToken();
  const storedSeasonId = await auctionContract.seasonId();

  console.log("\n--- Addresses Stored in Contract ---");
  console.log(`   Treasury Address: ${storedTreasuryAddress}`);
  console.log(`   USDC Address:     ${storedUsdcAddress}`);
  console.log(`   Season ID:        ${storedSeasonId.toString()}`);

  console.log("\n--- Addresses in Your Frontend ---");
  console.log(`   Treasury Address: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`);
  console.log(`   USDC Address:     0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`);
  
  if (storedTreasuryAddress.toLowerCase() !== "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853".toLowerCase()) {
    console.error("\n\n🔴 MISMATCH FOUND! The Treasury address in the contract does not match the frontend.");
  } else {
    console.log("\n\n✅ MATCH! The Treasury address in the contract matches the frontend.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});