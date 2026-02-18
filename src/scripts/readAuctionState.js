// scripts/readAuctionState.ts
import { ethers } from "hardhat";


async function main() {
  const AuctionAddress = "0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762";
  
  console.log(`Reading public variables from Auction contract at: ${AuctionAddress}`);

  // We can use a minimal ABI since we are just reading public state variables
  const AuctionABI = [
    "function Treasury() view returns (address)",
    "function USDCToken() view returns (address)",
    "function seasonId() view returns (uint256)"
  ];

  const AuctionContract = await ethers.getContractAt(AuctionABI, AuctionAddress);

  const storedTreasuryAddress = await AuctionContract.Treasury();
  //const storedUSDCAddress = await AuctionContract.USDCToken();
  // const storedSeasonId = await AuctionContract.seasonId();

  /*
  console.log("\n--- Addresses Stored in Contract ---");
  console.log(`   Treasury Address: ${storedTreasuryAddress}`);
  console.log(`   USDC Address:     ${storedUSDCAddress}`);
  console.log(`   Season ID:        ${storedSeasonId.toString()}`);

  console.log("\n--- Addresses in Your Frontend ---");
  console.log(`   Treasury Address: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`);
  console.log(`   USDC Address:     0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`);
  */
  if (storedTreasuryAddress.toLowerCase() !== "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853".toLowerCase()) {
    console.error("\n\n🔴 MISMATCH FOUND! The Treasury address in the contract does not match the frontend.");
  } else {
    // console.log("\n\n✅ MATCH! The Treasury address in the contract matches the frontend.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});