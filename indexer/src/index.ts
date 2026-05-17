import { ponder } from "ponder:registry";
import { seasons, playerSeasonStats, yieldEvents, protocolStats } from "ponder:schema";
import { eq } from "ponder";
import * as schema from "../ponder.schema";

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

  // Provision Discourse groups, categories, and chat channels
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const seasonNum = Number(event.args.seasonId) + 1;
  console.log(`[Indexer] SeasonDeployed: seasonId=${event.args.seasonId}, calling setup-season for seasonNum=${seasonNum}`);
  try {
    const res = await fetch(`${appUrl}/api/discourse/setup-season`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discourse-admin-token": process.env.DISCOURSE_INIT_SECRET || "",
      },
      body: JSON.stringify({ seasonNum }),
    });
    const body = await res.text();
    console.log(`[Indexer] setup-season response: ${res.status} ${body}`);
  } catch (e) {
    console.error(`[Indexer] setup-season fetch error:`, e);
  }
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
      .values({ seasonAddress: season.address, playerAddress: from, fimBalance: -value, fimBurned: value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({
        fimBalance: row.fimBalance - value,
        fimBurned: row.fimBurned + value,
      }));
  } 
  
  // --- SCENARIO C: EXCHANGE-MEDIATED TRANSFER (P2P) ---
  // FIM moves via the Exchange contract (sell order lock on creation, or fill to buyer).
  // Track both sides so fimBalance reflects real wallet balance, enabling accurate Gini during Trading.
  else {
    await context.db
      .insert(playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: from, fimBalance: -value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance - value }));
    await context.db
      .insert(playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: to, fimBalance: value, netContribution: 0n })
      .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance + value }));
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


    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
    
    try {
        // Run asynchronously so it doesn't block the indexer
        fetch(`${appUrl}/api/discourse/create-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress: buyer,
                seasonId: Number(season.seasonId)
            })
        }).catch(e => console.error(`[Indexer] Discourse API fetch failed:`, e));
        
        console.log(`[Indexer] Provisioning Discourse Account for Buyer: ${buyer}`);
    } catch (e) {
        console.error(`[Indexer] Failed to trigger player creation:`, e);
    }

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



ponder.on("Exchange:OrderCreated", async ({ event, context }) => {
  const { id, owner, isBuy, fimAmount, usdcPrice } = event.args; 
  
  // 1. Lookup Season Address (Keep your existing logic)
  const season = await context.db.sql
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.exchangeAddress, event.log.address))
    .limit(1);
  
  if (!season[0]) return;
  const seasonAddress = season[0].address;

  // 2. Construct the Deterministic String ID
  // Since you are grouping by Season, "${SeasonAddress}-${OrderId}" is the safest ID.
  const uniqueId = `${seasonAddress}-${id}`;

  // 3. Insert with the new 'id' field
  await context.db.insert(schema.orders).values({
    id: uniqueId,                 // <--- NEW: The Primary Key String
    orderId: id,                  // The contract's numeric ID
    seasonAddress: seasonAddress, 
    maker: owner,
    isBuy: isBuy,
    price: usdcPrice,
    initialAmount: fimAmount,
    remainingAmount: fimAmount,
    active: true,
    timestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

// 2. Order Filled (Fixing all issues)
ponder.on("Exchange:OrderFilled", async ({ event, context }) => {
  // 1. Destructure all required event arguments
  const { id, buyer, seller, fimAmount, usdcPrice } = event.args; 
  
  // 2. Find the season array from DB
  const seasonResult = await context.db.sql
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.exchangeAddress, event.log.address))
    .limit(1);
    
  // Extract the single object from the array!
  if (!seasonResult[0]) return;
  const currentSeason = seasonResult[0];
  const seasonAddress = currentSeason.address;

  // Recreate the primary key used in insert
  const uniqueId = `${seasonAddress}-${id}`;

  // 3. Find the current order state using the primary key 'id'
  const order = await context.db.find(schema.orders, { id: uniqueId });
  if (!order) return;

  // 4. Calculate new remaining amount (Critical step)
  const newRemaining = order.remainingAmount - fimAmount;

  // 5. Update the Order state (using primary key 'id')
  await context.db.update(schema.orders, { id: uniqueId }).set({
    remainingAmount: newRemaining,
    active: newRemaining > 0n 
  });

  // 6. Record the Trade History
  await context.db.insert(schema.trades).values({
    // Using Transaction Hash + Log Index for unique ID
    id: `${event.transaction.hash}-${event.log.logIndex}`, 
    seasonAddress: seasonAddress,
    buyer: buyer,
    seller: seller,
    fimAmount: fimAmount,
    usdcAmount: usdcPrice,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  // 7. ==========================================
  // NEW: TRIGGER DISCOURSE SYNC ON TRADE
  // ==========================================
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  try {
      // Fire-and-forget fetch to Next.js API
      fetch(`${appUrl}/api/discourse/sync-faction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              addresses: [buyer, seller], // Both buyer and seller balances changed!
              seasonAddress: currentSeason.address,
              fimAddress: currentSeason.fimAddress,
              seasonSlug: `season_${Number(currentSeason.seasonId) + 1}`
          })
      }).catch(e => console.error(`[Indexer] Discourse sync error:`, e));
      
      console.log(`[Indexer] 🔄 Faction Sync Triggered for Trade: ${buyer} & ${seller}`);
  } catch (e) {
      console.error(`[Indexer] ❌ Failed to trigger faction sync:`, e);
  }
});

// 3. Order Cancelled
ponder.on("Exchange:OrderCancelled", async ({ event, context }) => {
  const { id } = event.args; // Order ID
  
  // 1. Find seasonAddress (Dependency)
  const season = await context.db.sql.select().from(schema.seasons).where(eq(schema.seasons.exchangeAddress, event.log.address)).limit(1);
  if (!season[0]) return;
  const seasonAddress = season[0].address;

  // Recreate the primary key used in insert
  const uniqueId = `${seasonAddress}-${id}`;

  // 2. Update using the primary key 'id'
  await context.db.update(schema.orders, { id: uniqueId }).set({ // <-- FIXED
    active: false,
    remainingAmount: 0n
  });
});

ponder.on("GameSeason:PayoutClaimed", async ({ event, context }) => {
  const { user, amount } = event.args;
  const seasonAddress = event.log.address;
  const id = `${seasonAddress}:${user}`; // IMPORTANT: Must match the other handler's ID

  await context.db
    .insert(playerSeasonStats)
    // You must provide the ID here so onConflictDoUpdate knows which row to update
    .values({ 
      id: id,
      seasonAddress: seasonAddress,
      playerAddress: user,
      fimBalance: 0n, 
      netContribution: 0n,
      totalPotentialPayout: 0n, // Defaults
      realizedPayout: amount, 
    })
    .onConflictDoUpdate((row) => ({
      // Only update realizedPayout on claim
      realizedPayout: row.realizedPayout + amount,
    }));
});

ponder.on("GameSeason:PlayerSeasonStatsFinalized", async ({ event, context }) => {
  const { user, totalPotentialPayoutUSDC, netContributions, fimBalances } = event.args;
  const seasonAddress = event.log.address.toLowerCase() as `0x${string}`;
  const playerAddress = user.toLowerCase() as `0x${string}`;
  
  // LOGGING (Good practice)
  console.log(`Finalized for ${playerAddress}: Payout ${totalPotentialPayoutUSDC}`);

  await context.db
    .insert(playerSeasonStats)
    .values({
      // Provide the key fields
      seasonAddress: seasonAddress,
      playerAddress: playerAddress,
      
      // Provide all fields you want to set for this event
      fimBalance: fimBalances,
      netContribution: netContributions, // Ensure you handle int256 -> BigInt here!
      totalPotentialPayout: totalPotentialPayoutUSDC, 
      realizedPayout: 0n, // Explicitly set or re-set claimed to 0 if this is the only insert
    })
    .onConflictDoUpdate(() => ({
      totalPotentialPayout: totalPotentialPayoutUSDC,
      fimBalance: fimBalances,
    }));
});

ponder.on("Treasury:YieldHarvested", async ({ event, context }) => {
  // 1. Destructure using the EXACT names from your ABI
  const { season, totalYield, buyback, liquidity, reinvest, daoShare } = event.args;
  
  // 2. Format addresses and IDs
  const seasonAddress = season.toLowerCase() as `0x${string}`;
  const id = `${event.transaction.hash}:${event.log.logIndex}`;

  console.log(`Indexing Yield Harvest: ${totalYield} USDC from ${seasonAddress}`);

  // 3. Insert into the individual events table
  await context.db.insert(yieldEvents).values({
    id: id,
    seasonAddress: seasonAddress,
    totalYield: totalYield,
    buybackAmt: buyback,
    liquidityAmt: liquidity,
    reinvestAmt: reinvest,
    daoAmt: daoShare,
    timestamp: event.block.timestamp,
  });

  // 4. Update Global Aggregates
  await context.db
    .insert(protocolStats)
    .values({
      id: "global",
      totalYieldGenerated: totalYield,
      totalBuybacks: buyback,
    })
    .onConflictDoUpdate((row) => ({
      totalYieldGenerated: (row.totalYieldGenerated || 0n) + totalYield,
      totalBuybacks: (row.totalBuybacks || 0n) + buyback,
    }));
});


ponder.on("GameSeason:StateChanged", async ({ event, context }) => {
  const newState = event.args.newState;
  const seasonAddress = event.log.address.toLowerCase();

  // Assuming State.BOOTSTRAP is 0 in your Enum (Adjust if it's different!)
  if (newState === 0) { 
    console.log(`[Indexer] Season ${seasonAddress} entered BOOTSTRAP.`);

    const season = await context.db.find(schema.seasons, { address: seasonAddress as `0x${string}` });
    const seasonId = season?.seasonId || 1n;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

    try {
      await fetch(`${appUrl}/api/discourse/init-season`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-discourse-admin-token": process.env.DISCOURSE_INIT_SECRET || "",
        },
        body: JSON.stringify({
          seasonAddress: seasonAddress,
          seasonId: Number(seasonId)
        })
      });
      console.log(`[Indexer] Discourse Init Triggered Successfully.`);
    } catch (e) {
      console.error(`[Indexer] Failed to trigger Discourse Init:`, e);
    }
    
  }
});

