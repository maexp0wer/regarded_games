import { ponder } from "ponder:registry";
import { seasons, playerSeasonStats, yieldEvents, protocolStats, capitalAuctionParticipant, faucetClaims } from "ponder:schema";
import { eq, and } from "ponder";
import * as schema from "../ponder.schema";

// Gini coefficient in basis points (0–10 000) from a balance map.
// Divides by 1e15 before summing to stay within safe Number range.
function computeGiniBps(bals: Map<string, bigint>): number {
  const vals = Array.from(bals.values())
    .map(v => Number(v / 1_000_000_000_000_000n))
    .filter(v => v > 0)
    .sort((a, b) => a - b);
  const n = vals.length;
  if (n <= 1) return 0;
  const total = vals.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  let num = 0;
  for (let i = 0; i < n; i++) num += i * vals[i];
  const gini = (2 * num - (n - 1) * total) / (n * total);
  return Math.round(Math.max(0, Math.min(1, gini)) * 10_000);
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const CANDLE_TIMEFRAMES = [
  { key: "5m",  seconds: 300n },
  { key: "1h",  seconds: 3_600n },
  { key: "4h",  seconds: 14_400n },
  { key: "1d",  seconds: 86_400n },
] as const;

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
    active: newRemaining > 0n,
    ...(newRemaining === 0n ? { settledAt: event.block.timestamp } : {}),
  });

  // 6. Snapshot pre-trade balances (FIM:Transfer hasn't fired yet in this block's log order)
  const [buyerStats, sellerStats] = await Promise.all([
    context.db.find(schema.playerSeasonStats, { seasonAddress, playerAddress: buyer }),
    context.db.find(schema.playerSeasonStats, { seasonAddress, playerAddress: seller }),
  ]);
  const buyerBalance = buyerStats ? buyerStats.fimBalance + buyerStats.fimBurned : 0n;
  const sellerBalance = sellerStats ? sellerStats.fimBalance + sellerStats.fimBurned : 0n;

  // 6b. Compute historical rank: query full distribution + active locked orders
  const [allPlayerStats, activeSellOrders] = await Promise.all([
    context.db.sql
      .select({
        playerAddress: schema.playerSeasonStats.playerAddress,
        fimBalance: schema.playerSeasonStats.fimBalance,
        fimBurned: schema.playerSeasonStats.fimBurned,
      })
      .from(schema.playerSeasonStats)
      .where(eq(schema.playerSeasonStats.seasonAddress, seasonAddress)),
    context.db.sql
      .select({ maker: schema.orders.maker, remainingAmount: schema.orders.remainingAmount })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.seasonAddress, seasonAddress),
        eq(schema.orders.active, true),
        eq(schema.orders.isBuy, false),
      )),
  ]);

  // Effective balance per player: fimBalance + fimBurned + FIM locked in active sell orders
  const effectiveBals = new Map<string, bigint>();
  for (const p of allPlayerStats) {
    effectiveBals.set(p.playerAddress.toLowerCase(), p.fimBalance + p.fimBurned);
  }
  for (const o of activeSellOrders) {
    const maker = o.maker.toLowerCase();
    effectiveBals.set(maker, (effectiveBals.get(maker) ?? 0n) + o.remainingAmount);
  }
  // Remove exchange phantom (its balance = total locked FIM already added back above)
  effectiveBals.delete(currentSeason.exchangeAddress.toLowerCase());

  // Mass threshold: lowest balance such that all balances ≤ it sum to ≤ half supply
  const sortedBals = Array.from(effectiveBals.values()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const totalSupply = sortedBals.reduce((s, v) => s + v, 0n);
  const half = totalSupply / 2n;
  let accumulated = 0n;
  let massThreshold = 0n;
  for (const bal of sortedBals) {
    accumulated += bal;
    if (accumulated <= half) massThreshold = bal;
    else break;
  }

  // Distance-based percentile (mirrors useBatchPlayerPercentiles algorithm)
  const capBals = sortedBals.filter(b => b > massThreshold);
  const socBals = sortedBals.filter(b => b <= massThreshold);
  const thresholdNum = Number(massThreshold);
  const maxCapNum = capBals.length > 0 ? Number(capBals[capBals.length - 1]) : thresholdNum;
  const minSocNum = socBals.length > 0 ? Number(socBals[0]) : 0;

  function distancePercentile(balRaw: bigint, isCap: boolean): number {
    const bal = Number(balRaw);
    if (isCap) {
      const range = maxCapNum - thresholdNum;
      return range > 0 ? Math.min(100, Math.max(0, ((bal - thresholdNum) / range) * 100)) : 100;
    } else {
      const range = thresholdNum - minSocNum;
      return range > 0 ? Math.min(100, Math.max(0, ((thresholdNum - bal) / range) * 100)) : 100;
    }
  }

  const buyerEffBal = effectiveBals.get(buyer.toLowerCase()) ?? buyerBalance;
  const sellerEffBal = effectiveBals.get(seller.toLowerCase()) ?? sellerBalance;
  const buyerIsCapitalist = buyerEffBal > massThreshold;
  const sellerIsCapitalist = sellerEffBal > massThreshold;
  const buyerPercentile = Math.round(distancePercentile(buyerEffBal, buyerIsCapitalist));
  const sellerPercentile = Math.round(distancePercentile(sellerEffBal, sellerIsCapitalist));

  const giniBps = computeGiniBps(effectiveBals);

  // 7. Record the Trade History
  await context.db.insert(schema.trades).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    seasonAddress: seasonAddress,
    buyer: buyer,
    seller: seller,
    fimAmount: fimAmount,
    usdcAmount: usdcPrice,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    buyerBalance,
    sellerBalance,
    buyerPercentile,
    sellerPercentile,
    buyerIsCapitalist,
    sellerIsCapitalist,
    giniBps,
  });

  // 8. Upsert pre-computed candle buckets for all timeframes
  const tradePrice = fimAmount > 0n ? (usdcPrice * 10n ** 18n) / fimAmount : 0n;
  if (tradePrice > 0n) {
    const capVol = buyerIsCapitalist ? fimAmount : 0n;
    const socVol = buyerIsCapitalist ? 0n : fimAmount;
    await Promise.all(
      CANDLE_TIMEFRAMES.map(({ key, seconds }) => {
        const bucketTs = (event.block.timestamp / seconds) * seconds;
        return context.db
          .insert(schema.candles)
          .values({
            seasonAddress,
            timeframe: key,
            bucketTs,
            openPrice:      tradePrice,
            highPrice:      tradePrice,
            lowPrice:       tradePrice,
            closePrice:     tradePrice,
            capBuyerVolume: capVol,
            socBuyerVolume: socVol,
            giniBps,
            tradeCount:     1,
          })
          .onConflictDoUpdate((row) => ({
            // openPrice intentionally omitted — first trade in bucket wins
            highPrice:      row.highPrice < tradePrice ? tradePrice : row.highPrice,
            lowPrice:       row.lowPrice  > tradePrice ? tradePrice : row.lowPrice,
            closePrice:     tradePrice,
            capBuyerVolume: row.capBuyerVolume + capVol,
            socBuyerVolume: row.socBuyerVolume + socVol,
            giniBps,
            tradeCount:     row.tradeCount + 1,
          }));
      })
    );
  }

  // 9. ==========================================
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
  // remainingAmount is preserved (not zeroed) so we know how much was unfilled at cancellation
  await context.db.update(schema.orders, { id: uniqueId }).set({
    active: false,
    isCancelled: true,
    settledAt: event.block.timestamp,
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


ponder.on("CapitalAuction:Deposited", async ({ event, context }) => {
  const address = event.args.user.toLowerCase() as `0x${string}`;
  await context.db
    .insert(capitalAuctionParticipant)
    .values({ id: address, totalDeposited: event.args.usdcAmount, rgdClaimed: null })
    .onConflictDoUpdate((row) => ({
      totalDeposited: row.totalDeposited + event.args.usdcAmount,
    }));
});

ponder.on("CapitalAuction:Claimed", async ({ event, context }) => {
  const address = event.args.user.toLowerCase() as `0x${string}`;
  await context.db
    .insert(capitalAuctionParticipant)
    .values({ id: address, totalDeposited: 0n, rgdClaimed: event.args.rgdAmount })
    .onConflictDoUpdate(() => ({
      rgdClaimed: event.args.rgdAmount,
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

if ((process.env.PONDER_DEPLOYMENT ?? "mainnet").toLowerCase() === "sepolia") {
  ponder.on("FakeUSDCFaucet:Claimed", async ({ event, context }) => {
    await context.db.insert(schema.faucetClaims).values({
      id: event.args.user.toLowerCase() as `0x${string}`,
      amount: event.args.amount,
      timestamp: event.block.timestamp,
    });
  });
}

