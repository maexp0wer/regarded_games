import { ponder } from "ponder:registry";
import { seasons, playerSeasonStats } from "ponder:schema";
import { eq } from "ponder";
import * as schema from "../ponder.schema";
import { auctionMints } from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// 1. Listen for Season Deployment
ponder.on("GameController:SeasonDeployed", async ({ event, context }) => {
  await context.db.insert(schema.seasons).values({
    address: event.args.season.toLowerCase() as `0x${string}`,
    seasonId: event.args.seasonId,
    auctionAddress: event.args.auction.toLowerCase() as `0x${string}`, // <--- MAP THIS
    exchangeAddress: event.args.exchange.toLowerCase() as `0x${string}`,
    fimAddress: event.args.fim.toLowerCase() as `0x${string}`,
    createdAt: event.block.timestamp,
    prizePool: 0n,
  });
});

// 2. Track FIM Balances & Prize Pool (The Source of Truth)
ponder.on("FIM:Transfer", async ({ event, context }) => {
  // 1. Normalize Addresses (Crucial for 0.16.1 matching)
  const from = event.args.from.toLowerCase() as `0x${string}`;
  const to = event.args.to.toLowerCase() as `0x${string}`;
  const value = event.args.value;
  const fimAddress = event.log.address.toLowerCase() as `0x${string}`;

  // 2. Find the season linked to this FIM contract
  const results = await context.db.sql
    .select()
    .from(seasons)
    .where(eq(seasons.fimAddress, fimAddress))
    .limit(1);

  const season = results[0];

  if (!season) {
    console.warn(`[Indexer] ⚠️ Transfer ignored: No season found for FIM ${fimAddress}`);
    return;
  }

  // 3. Handle Scenarios Explicitly

  // --- SCENARIO A: MINT (Money In) ---
  if (from === ZERO_ADDRESS) {
    // 1. Update Prize Pool (1 FIM = 1 USDC, scale down 18->6 decimals)
    const usdcValue = value / 1000000000000n;
    await context.db
      .update(seasons, { address: season.address })
      .set((row) => ({
        prizePool: row.prizePool + usdcValue,
      }));

    // 2. Credit Recipient
    await context.db
      .insert(playerSeasonStats)
      .values({
        seasonAddress: season.address,
        playerAddress: to,
        fimBalance: value,
        netContribution: 0n,
      })
      .onConflictDoUpdate((row) => ({
        fimBalance: row.fimBalance + value,
      }));
      
    // console.log(`[Indexer] 🟢 Mint: +${value} to ${to}`);
  } 
  
  // --- SCENARIO B: BURN (Money Out) ---
  else if (to === ZERO_ADDRESS) {
    await context.db
      .insert(playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: from, fimBalance: -value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({
        fimBalance: row.fimBalance - value,
      }));
  } 
  
  // --- SCENARIO C: STANDARD TRANSFER (P2P) ---
  else {
    // Decrease Sender
    await context.db
      .insert(playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: from, fimBalance: -value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({
        fimBalance: row.fimBalance - value,
      }));

    // Increase Recipient
    await context.db
      .insert(playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: to, fimBalance: value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({
        fimBalance: row.fimBalance + value,
      }));
  }
});

ponder.on("Auction:FimPurchased", async ({ event, context }) => {
    // FimPurchased(address indexed buyer, uint256 usdcSpent, uint256 fimMinted);
    const { buyer, usdcSpent, fimMinted } = event.args;

    // Find the season linked to this Auction contract
    const results = await context.db.sql
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.auctionAddress, event.log.address.toLowerCase() as `0x${string}`))
        .limit(1);

    const season = results[0];

    if (!season) {
        console.warn(`[Indexer] ⚠️ Auction Mint ignored: No season found for Auction ${event.log.address}`);
        return;
    }
    
    // Insert into the auctionMints table
    await context.db.insert(schema.auctionMints).values({
        id: event.id,
        seasonAddress: season.address,
        playerAddress: buyer.toLowerCase() as `0x${string}`,
        usdcAmount: usdcSpent,
        fimAmount: fimMinted,
        timestamp: event.block.timestamp,
    });
    
    // Optional: Log success
    // console.log(`[Indexer] 💰 Auction Mint: +${formatUnits(fimMinted, 18)} to ${buyer}`);
});

// 3. Track Net Contribution (Wealth shift via EVENT)
// Note: This relies on you emitting 'emit LedgerUpdated(...)' in Solidity
ponder.on("GameSeason:LedgerUpdated", async ({ event, context }) => {
  const { buyer, seller, usdcAmount } = event.args;
  const b = buyer.toLowerCase() as `0x${string}`;
  const s = seller.toLowerCase() as `0x${string}`;
  const seasonAddress = event.log.address.toLowerCase() as `0x${string}`;

  // Buyer: Spent USDC (Positive Net Contribution)
  await context.db
    .insert(playerSeasonStats)
    .values({
      seasonAddress: seasonAddress,
      playerAddress: b,
      fimBalance: 0n,
      netContribution: usdcAmount,
    })
    .onConflictDoUpdate((row) => ({
      netContribution: row.netContribution + usdcAmount,
    }));

  // Seller: Received USDC (Negative Net Contribution)
  if (s !== ZERO_ADDRESS) {
    await context.db
      .insert(playerSeasonStats)
      .values({
        seasonAddress: seasonAddress,
        playerAddress: s,
        fimBalance: 0n,
        netContribution: -usdcAmount,
      })
      .onConflictDoUpdate((row) => ({
        netContribution: row.netContribution - usdcAmount,
      }));
  }
});