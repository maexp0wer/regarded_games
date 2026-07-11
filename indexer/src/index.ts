import { ponder } from "ponder:registry";
import { seasons, playerSeasonStats, yieldEvents, protocolStats, capitalAuctionParticipant, faucetClaims } from "ponder:schema";
import { eq, and } from "ponder";
import * as schema from "../ponder.schema";
import { ExchangeAbi } from "../abis/ExchangeAbi";
import { GameSeasonAbi } from "../abis/GameSeasonAbi";
import mainnetCore from "../../src/deployments/mainnet/core.json";
import sepoliaCore from "../../src/deployments/sepolia/core.json";
// Single source of truth for Gini — the exact integer replay of the contract's
// _calculateReg(). Shared with the frontend so candle/chart Gini, the live
// headline Gini, and the on-chain value are byte-for-byte identical.
import { giniBpsFromBalances, giniPpmFromBalances } from "../../src/utils/gini";
// Event-driven quest crediting — writes provable on-chain completions straight to
// the quest DB the instant the event is indexed, so quests conclude without the
// user ever opening the board. See src/questCredits.ts.
import { creditQuest, creditWinScore } from "./questCredits";
import { relativePnl, computeWinScoreForSeason } from "../../src/utils/quests";

const TENANT: "mainnet" | "sepolia" =
  (process.env.PONDER_DEPLOYMENT ?? "mainnet").toLowerCase() === "sepolia" ? "sepolia" : "mainnet";
const _coreDeployment = TENANT === "sepolia" ? sepoliaCore : mainnetCore;
const ROUTER_ADDRESS_LC = ((_coreDeployment as any).Router as string | undefined)?.toLowerCase();

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// existentialThresholdFim is immutable per season; cache it to avoid an RPC read
// on every OrderFilled. Keyed by lowercased season address.
const _thresholdCache = new Map<string, bigint>();
async function getExistentialThreshold(
  client: { readContract: (args: any) => Promise<unknown> },
  seasonAddress: `0x${string}`,
): Promise<bigint> {
  const key = seasonAddress.toLowerCase();
  const cached = _thresholdCache.get(key);
  if (cached !== undefined) return cached;
  const raw = (await client.readContract({
    address: seasonAddress,
    abi: GameSeasonAbi,
    functionName: "existentialThresholdFim",
  })) as bigint;
  _thresholdCache.set(key, raw);
  return raw;
}

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
      body: JSON.stringify({ seasonNum, tenant: TENANT }),
    });
    const body = await res.text();
    console.log(`[Indexer] setup-season response: ${res.status} ${body}`);
  } catch (e) {
    console.error(`[Indexer] setup-season fetch error:`, e);
  }
});

// 2. FIM Burn handler
// Ponder dispatches the ERC-20 `Transfer` event under the key `FIM:Transfer`,
// so the registration name is fixed by the ABI. Mints and exchange-direction
// transfers are handled by Auction:FimPurchased and Exchange:OrderFilled —
// this handler exclusively processes BURNS (transfers to the zero address).
ponder.on("FIM:Transfer", async ({ event, context }) => {
  const to = event.args.to.toLowerCase() as `0x${string}`;
  // Burn-only guard: ignore mints and peer-to-peer / exchange transfers.
  if (to !== ZERO_ADDRESS) return;

  const burner = event.args.from.toLowerCase() as `0x${string}`;
  const burnedAmount = event.args.value;
  const fimAddress = event.log.address.toLowerCase() as `0x${string}`;

  const results = await context.db.sql
    .select()
    .from(seasons)
    .where(eq(seasons.fimAddress, fimAddress))
    .limit(1);

  const season = results[0];
  if (!season) {
    console.warn(`[Indexer] ⚠️ Burn ignored: No season found for FIM ${fimAddress}`);
    return;
  }

  await context.db
    .insert(playerSeasonStats)
    .values({ seasonAddress: season.address, playerAddress: burner, fimBalance: -burnedAmount, fimBurned: burnedAmount, netContribution: 0n })
    .onConflictDoUpdate((row) => ({
      fimBalance: row.fimBalance - burnedAmount,
      fimBurned: row.fimBurned + burnedAmount,
    }));
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
                seasonId: Number(season.seasonId),
                tenant: TENANT
            })
        }).catch(e => console.error(`[Indexer] Discourse API fetch failed:`, e));
        
        console.log(`[Indexer] Provisioning Discourse Account for Buyer: ${buyer}`);
    } catch (e) {
        console.error(`[Indexer] Failed to trigger player creation:`, e);
    }

    // Credit buyer fimBalance and update prize pool (1 FIM = 1 USDC, scale 18→6 decimals)
    await context.db
      .insert(schema.playerSeasonStats)
      .values({ seasonAddress: season.address, playerAddress: buyer.toLowerCase() as `0x${string}`, fimBalance: fimMinted, netContribution: 0n })
      .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance + fimMinted }));

    await context.db
      .update(schema.seasons, { address: season.address })
      .set((row) => ({ prizePool: row.prizePool + fimMinted / 1_000_000_000_000n }));

    // Quest: bought FIM in the auction.
    await creditQuest(buyer, "buy_fim_auction");

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
  // exchangeAddress is stored lowercased (SeasonDeployed handler), but
  // event.log.address arrives EIP-55 checksummed — lowercase it or this
  // case-sensitive eq() never matches and every order is silently dropped.
  const season = await context.db.sql
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.exchangeAddress, event.log.address.toLowerCase() as `0x${string}`))
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
    // Lowercase to match every other address column (and the lowercased query
    // filters); event args arrive EIP-55 checksummed.
    maker: owner.toLowerCase() as `0x${string}`,
    isBuy: isBuy,
    price: usdcPrice,
    initialAmount: fimAmount,
    remainingAmount: fimAmount,
    active: true,
    timestamp: event.block.timestamp,
  }).onConflictDoNothing();

  // Sell orders lock FIM in the exchange — debit seller's balance immediately
  if (!isBuy) {
    await context.db
      .insert(schema.playerSeasonStats)
      .values({ seasonAddress, playerAddress: owner.toLowerCase() as `0x${string}`, fimBalance: -fimAmount, netContribution: 0n })
      .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance - fimAmount }));
  }

  // Quest: placed a maker order (buy or sell). Later fills/cancellations don't
  // matter — creating the order is the qualifying act.
  await creditQuest(owner, "create_order");
});

// 2. Order Filled (Fixing all issues)
ponder.on("Exchange:OrderFilled", async ({ event, context }) => {
  // 1. Destructure all required event arguments
  const { id, buyer, seller, fimAmount, usdcPrice } = event.args; 
  
  // 2. Find the season array from DB
  // exchangeAddress stored lowercased; event.log.address is checksummed — match casing.
  const seasonResult = await context.db.sql
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.exchangeAddress, event.log.address.toLowerCase() as `0x${string}`))
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

  // 3b. Resolve the TRUE buyer/seller. The OrderFilled event always emits
  // (buyer=msg.sender=taker, seller=order.owner=maker) regardless of side — the
  // arg names are really (taker, maker), NOT economic roles. When the resting
  // order is a BUY, the taker is selling and the maker is buying, so the event's
  // buyer/seller are swapped. Use order.isBuy (the reliable signal) to correct it.
  // Everything downstream (balances, percentiles, the trade row) keys off these.
  const taker = buyer;        // event 'buyer' arg = msg.sender = taker
  const maker = seller;       // event 'seller' arg = order.owner = maker
  const trueBuyer = order.isBuy ? maker : taker;
  const trueSeller = order.isBuy ? taker : maker;

  // 4. Calculate new remaining amount (Critical step)
  const newRemaining = order.remainingAmount - fimAmount;

  // 5. Update the Order state (using primary key 'id')
  await context.db.update(schema.orders, { id: uniqueId }).set({
    remainingAmount: newRemaining,
    active: newRemaining > 0n,
    ...(newRemaining === 0n ? { settledAt: event.block.timestamp } : {}),
  });

  // 6. Snapshot pre-trade balances (the FIM burn handler hasn't fired yet in this block's log order)
  const [buyerStats, sellerStats] = await Promise.all([
    context.db.find(schema.playerSeasonStats, { seasonAddress, playerAddress: trueBuyer }),
    context.db.find(schema.playerSeasonStats, { seasonAddress, playerAddress: trueSeller }),
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

  // Distance-based percentile within a class (mirrors useBatchPlayerClass algorithm)
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

  const buyerEffBal = effectiveBals.get(trueBuyer.toLowerCase()) ?? buyerBalance;
  const sellerEffBal = effectiveBals.get(trueSeller.toLowerCase()) ?? sellerBalance;
  const buyerIsCapitalist = buyerEffBal > massThreshold;
  const sellerIsCapitalist = sellerEffBal > massThreshold;
  const buyerPercentile = Math.round(distancePercentile(buyerEffBal, buyerIsCapitalist));
  const sellerPercentile = Math.round(distancePercentile(sellerEffBal, sellerIsCapitalist));

  // Contract-exact Gini: raw-wei balances + the season's existential threshold,
  // replayed through the same integer math as GameSeason._calculateReg().
  const existentialThreshold = await getExistentialThreshold(context.client, seasonAddress as `0x${string}`);
  const preFillBals = Array.from(effectiveBals.values());
  const giniBps = giniBpsFromBalances(preFillBals, existentialThreshold);
  // PPM (BPS ×100) of the same pre-fill distribution — finer resolution so a
  // sub-BPS shuffle isn't truncated to a tie. trunc(giniPpm/100) === giniBps.
  const giniPpm = giniPpmFromBalances(preFillBals, existentialThreshold);

  // Post-fill Gini: the distribution with THIS fill applied. The buyer gains
  // fimAmount; on a resting BUY the taker-seller loses it, while on a resting
  // SELL the maker's side was already reflected via the step-5 remainingAmount
  // reduction. Stamped on the trade row (giniBpsAfter) so the net Gini move of
  // a multi-leg tx is readable from stamped data alone.
  const postFillBals = new Map(effectiveBals);
  const buyerKey = trueBuyer.toLowerCase();
  postFillBals.set(buyerKey, (postFillBals.get(buyerKey) ?? 0n) + fimAmount);
  if (order.isBuy) {
    const sellerKey = trueSeller.toLowerCase();
    postFillBals.set(sellerKey, (postFillBals.get(sellerKey) ?? 0n) - fimAmount);
  }
  const postFillVals = Array.from(postFillBals.values());
  const giniBpsAfter = giniBpsFromBalances(postFillVals, existentialThreshold);
  const giniPpmAfter = giniPpmFromBalances(postFillVals, existentialThreshold);

  // 6c. Buyer-pays trading fee for THIS fill (fee = usdcPrice × tradeFeeBps / 10_000).
  // Computed here so it can be stamped on the trade row below; reused at step 9b.
  const feeBps = await context.client.readContract({
    address: event.log.address,
    abi: ExchangeAbi,
    functionName: 'tradeFeeBps',
  });
  const feePaid = (usdcPrice * feeBps) / 10_000n;

  // 7. Record the Trade History
  await context.db.insert(schema.trades).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    seasonAddress: seasonAddress,
    buyer: trueBuyer,
    seller: trueSeller,
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
    giniBpsAfter,
    giniPpm,
    giniPpmAfter,
    taker,
    feePaid,
  });

  // Quest: executed a class-aligned shuffle. A mixed taker queue settles through
  // ONE fillBatch transaction, so every leg's OrderFilled shares this txHash with
  // the same taker (msg.sender): the taker is trueBuyer on legs that hit resting
  // sells and trueSeller on legs that hit resting buys. It qualifies when, at a
  // leg by which both roles have appeared, the Gini has net-moved from its
  // pre-shuffle value (first leg's giniBps) toward the taker's class pole — up
  // for a Capitalist, down for a Proletarian (class read from the first leg,
  // i.e. as the wallet entered the shuffle). This runs on every leg and
  // creditQuest is idempotent, so the last leg's pass evaluates the completed
  // batch; strict inequality also rules out self-fills (no net Gini move).
  const txTrades = await context.db.sql
    .select({
      id: schema.trades.id,
      buyer: schema.trades.buyer,
      seller: schema.trades.seller,
      taker: schema.trades.taker,
      giniPpm: schema.trades.giniPpm,
      giniPpmAfter: schema.trades.giniPpmAfter,
      buyerIsCapitalist: schema.trades.buyerIsCapitalist,
      sellerIsCapitalist: schema.trades.sellerIsCapitalist,
    })
    .from(schema.trades)
    .where(eq(schema.trades.txHash, event.transaction.hash));
  const takerLc = taker.toLowerCase();
  const legs = txTrades
    .filter((t) => t.taker.toLowerCase() === takerLc)
    .sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
  const first = legs[0];
  if (first) {
    // PPM (BPS ×100) so a sub-BPS shuffle still resolves as a real move rather
    // than truncating to a whole-BPS tie and silently failing the strict-<>.
    const preShuffleGini = first.giniPpm;
    const takerIsCapitalist = first.buyer.toLowerCase() === takerLc
      ? first.buyerIsCapitalist
      : first.sellerIsCapitalist;
    let takerBought = false;
    let takerSold = false;
    for (const leg of legs) {
      if (leg.buyer.toLowerCase() === takerLc) takerBought = true;
      if (leg.seller.toLowerCase() === takerLc) takerSold = true;
      if (!(takerBought && takerSold)) continue;
      // 0 is the "no meaningful sample" sentinel — never judge direction on it.
      if (preShuffleGini <= 0 || leg.giniPpmAfter <= 0) continue;
      const movedTowardClassPole = takerIsCapitalist
        ? leg.giniPpmAfter > preShuffleGini
        : leg.giniPpmAfter < preShuffleGini;
      if (movedTowardClassPole) {
        await creditQuest(taker, "execute_shuffle");
        break;
      }
    }
  }

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
            giniOpen:       giniBps,
            giniHigh:       giniBps,
            giniLow:        giniBps,
            giniBps,        // close
            tradeCount:     1,
          })
          .onConflictDoUpdate((row) => ({
            // openPrice intentionally omitted — first trade in bucket wins
            highPrice:      row.highPrice < tradePrice ? tradePrice : row.highPrice,
            lowPrice:       row.lowPrice  > tradePrice ? tradePrice : row.lowPrice,
            closePrice:     tradePrice,
            capBuyerVolume: row.capBuyerVolume + capVol,
            socBuyerVolume: row.socBuyerVolume + socVol,
            // Gini OHLC: only real samples (giniBps>0) move the bucket; giniBps===0
            // means "no meaningful sample" (≤1 player → computeGiniBps returns 0,
            // and such trades are filtered out anyway), so carry the bucket forward.
            // The first NON-ZERO trade sets the open and REPLACES the seeded 0 in
            // high/low (row.gini{Open,Low}===0 sentinels) — without this, giniLow
            // would lock at 0 and draw a body spanning 0→the real value.
            giniOpen:       (row.giniOpen === 0 && giniBps > 0) ? giniBps : row.giniOpen,
            giniHigh:       giniBps > 0 ? (row.giniHigh < giniBps ? giniBps : row.giniHigh) : row.giniHigh,
            giniLow:        giniBps > 0 ? (row.giniLow === 0 ? giniBps : (row.giniLow > giniBps ? giniBps : row.giniLow)) : row.giniLow,
            giniBps:        giniBps > 0 ? giniBps : row.giniBps, // close, carry forward when 0
            tradeCount:     row.tradeCount + 1,
          }));
      })
    );
  }

  // 9. Credit buyer fimBalance (placed after trade/candle recording to preserve pre-fill Gini semantics).
  // The FIM always ends up with the true buyer (maker on a buy order, taker on a sell order).
  await context.db
    .insert(schema.playerSeasonStats)
    .values({ seasonAddress, playerAddress: trueBuyer.toLowerCase() as `0x${string}`, fimBalance: fimAmount, netContribution: 0n })
    .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance + fimAmount }));

  // 9a. Debit the seller's FIM. On a SELL order the maker-seller was already
  // debited at placement (OrderCreated locks the FIM), so only the BUY-order case
  // needs it here: the taker is the seller and sends their own (un-pre-debited)
  // FIM to the maker. Without this the taker-seller's balance never drops, which
  // skews balances / Gini / thresholds over time.
  if (order.isBuy) {
    await context.db
      .insert(schema.playerSeasonStats)
      .values({ seasonAddress, playerAddress: trueSeller.toLowerCase() as `0x${string}`, fimBalance: -fimAmount, netContribution: 0n })
      .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance - fimAmount }));
  }

  // 9b. Accumulate trading fees, always paid by the TAKER (msg.sender) regardless
  // of side — the maker never pays a fee (Exchange.sol:145 / :157). feePaid is
  // computed at step 6c and also stamped on the trade row for per-trade display.
  if (feePaid > 0n) {
    await context.db
      .insert(schema.playerSeasonStats)
      .values({ seasonAddress, playerAddress: taker.toLowerCase() as `0x${string}`, fimBalance: 0n, netContribution: 0n, totalFeesPaid: feePaid })
      .onConflictDoUpdate((row) => ({ totalFeesPaid: row.totalFeesPaid + feePaid }));
  }

  // 10. ==========================================
  // TRIGGER DISCOURSE SYNC ON TRADE
  // ==========================================
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  try {
      // Fire-and-forget fetch to Next.js API
      fetch(`${appUrl}/api/discourse/sync-faction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-discourse-admin-token": process.env.DISCOURSE_INIT_SECRET || "",
          },
          body: JSON.stringify({
              addresses: [buyer, seller], // Both buyer and seller balances changed!
              seasonAddress: currentSeason.address,
              fimAddress: currentSeason.fimAddress,
              seasonSlug: `season_${Number(currentSeason.seasonId) + 1}`,
              tenant: TENANT
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
  // exchangeAddress stored lowercased; event.log.address is checksummed — match casing.
  const season = await context.db.sql.select().from(schema.seasons).where(eq(schema.seasons.exchangeAddress, event.log.address.toLowerCase() as `0x${string}`)).limit(1);
  if (!season[0]) return;
  const seasonAddress = season[0].address;

  // Recreate the primary key used in insert
  const uniqueId = `${seasonAddress}-${id}`;

  // Read order before updating to get maker address and remaining amount
  const order = await context.db.find(schema.orders, { id: uniqueId });
  if (!order) return;

  // remainingAmount is preserved (not zeroed) so we know how much was unfilled at cancellation
  await context.db.update(schema.orders, { id: uniqueId }).set({
    active: false,
    isCancelled: true,
    settledAt: event.block.timestamp,
  });

  // Re-credit seller's fimBalance with the unlocked remaining amount
  await context.db
    .insert(schema.playerSeasonStats)
    .values({ seasonAddress, playerAddress: order.maker.toLowerCase() as `0x${string}`, fimBalance: order.remainingAmount, netContribution: 0n })
    .onConflictDoUpdate((row) => ({ fimBalance: row.fimBalance + order.remainingAmount }));
});

ponder.on("GameSeason:PayoutClaimed", async ({ event, context }) => {
  const { user, amount } = event.args;
  // playerSeasonStats is keyed on the composite PK [seasonAddress, playerAddress]
  // (there is no `id` column). Both must be lowercased so this row collides with
  // the one written at finalization and the one the quests API queries by
  // lowercase address — otherwise the claim lands on a divergent checksummed key
  // and `realizedPayout` never surfaces (claim_payout quest never completes).
  const seasonAddress = event.log.address.toLowerCase() as `0x${string}`;
  const playerAddress = user.toLowerCase() as `0x${string}`;

  await context.db
    .insert(playerSeasonStats)
    .values({
      seasonAddress,
      playerAddress,
      fimBalance: 0n,
      netContribution: 0n,
      totalPotentialPayout: 0n, // Defaults
      realizedPayout: amount,
    })
    .onConflictDoUpdate((row) => ({
      // Only update realizedPayout on claim
      realizedPayout: row.realizedPayout + amount,
    }));

  // Quest: claimed a payout. Mirrors the app's `realizedPayout > 0` check —
  // a zero-value claim (swept/flagged/dust) doesn't count.
  if (amount > 0n) await creditQuest(playerAddress, "claim_payout");
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
      finalized: true,
    })
    .onConflictDoUpdate(() => ({
      totalPotentialPayout: totalPotentialPayoutUSDC,
      netContribution: netContributions,
      fimBalance: fimBalances,
      finalized: true,
    }));
});

// Quest: Win the Game (variable, 0–1000 pts by relative-PnL rank within a season).
// DistributionOpened fires once, after every PlayerSeasonStatsFinalized for the
// season — so the full final PnL distribution is now in Ponder and each player's
// rank is fixed. We score every finalized participant here instead of lazily on a
// board visit, so the credit concludes for everyone the moment the season settles.
// creditWinScore only ever raises a wallet's score (best across seasons), matching
// the app's `bestWin > existingWin` semantics.
ponder.on("GameSeason:DistributionOpened", async ({ event, context }) => {
  const seasonAddress = event.log.address.toLowerCase() as `0x${string}`;

  const rows = await context.db.sql
    .select({
      playerAddress: schema.playerSeasonStats.playerAddress,
      totalPotentialPayout: schema.playerSeasonStats.totalPotentialPayout,
      netContribution: schema.playerSeasonStats.netContribution,
    })
    .from(schema.playerSeasonStats)
    .where(
      and(
        eq(schema.playerSeasonStats.seasonAddress, seasonAddress),
        eq(schema.playerSeasonStats.finalized, true),
      ),
    );

  // Build the season's PnL vector (players with a defined relative PnL), then
  // score each player against it. Fewer than 2 valid PnLs → no meaningful rank.
  const pnlByPlayer = new Map<string, number>();
  for (const r of rows) {
    const pnl = relativePnl(BigInt(r.totalPotentialPayout), BigInt(r.netContribution));
    if (pnl !== null) pnlByPlayer.set(r.playerAddress.toLowerCase(), pnl);
  }
  const allPnls = Array.from(pnlByPlayer.values());
  if (allPnls.length < 2) {
    console.log(`[Indexer] DistributionOpened ${seasonAddress}: <2 ranked players, skipping win scores.`);
    return;
  }

  for (const [addr, pnl] of pnlByPlayer) {
    const score = computeWinScoreForSeason(pnl, allPnls);
    if (score > 0) await creditWinScore(addr, score);
  }
  console.log(`[Indexer] DistributionOpened ${seasonAddress}: scored ${pnlByPlayer.size} players for win_the_game.`);
});

ponder.on("GameSeason:WalletFlagged", async ({ event, context }) => {
  const seasonAddress = event.log.address.toLowerCase() as `0x${string}`;
  const walletAddress = event.args.wallet.toLowerCase() as `0x${string}`;

  // Per-season flag on the player's stats row. flagWallets() requires an indexed
  // player, so the row exists on-chain — upsert anyway to stay total.
  await context.db
    .insert(playerSeasonStats)
    .values({ seasonAddress, playerAddress: walletAddress, isFlagged: true })
    .onConflictDoUpdate(() => ({ isFlagged: true }));

  // Cross-season registry (display only, no protocol enforcement): lets later
  // seasons show "Flagged — Season N" as neutral, season-scoped history.
  const season = await context.db.find(seasons, { address: seasonAddress });
  const seasonNumber = Number(season?.seasonId ?? 0n) + 1;
  await context.db
    .insert(schema.flaggedWallets)
    .values({
      walletAddress,
      seasonAddress,
      seasonNumber,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();
});

ponder.on("Treasury:YieldHarvested", async ({ event, context }) => {
  // 1. Destructure using the EXACT names from your ABI. The audit-fix release
  //    renamed the event arg `reinvest` → `prizePool` (same value: the yield
  //    slice reinvested into the season prize pool); the column keeps its name
  //    so downstream readers (useYieldTotals) are unaffected.
  const { season, totalYield, buyback, liquidity, prizePool, daoShare } = event.args;

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
    reinvestAmt: prizePool,
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


// Trade fees collected by the Exchange flow into the season prize pool on-chain.
// Mirror that here so the indexed `seasons.prizePool` reflects fees, not just mints.
ponder.on("Treasury:TradingFeeCollected", async ({ event, context }) => {
  const seasonAddress = event.args.season.toLowerCase() as `0x${string}`;
  const amount = event.args.amount;

  await context.db
    .update(schema.seasons, { address: seasonAddress })
    .set((row) => ({ prizePool: row.prizePool + amount }));
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
    const onchainSeasonId = season?.seasonId ?? 0n;
    // Discourse groups are named with the 1-based display number (S1_*, S2_*, ...),
    // matching the convention used by SeasonDeployed → setup-season.
    const seasonNum = Number(onchainSeasonId) + 1;

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
          seasonId: seasonNum,
          tenant: TENANT
        })
      });
      console.log(`[Indexer] Discourse Init Triggered Successfully.`);
    } catch (e) {
      console.error(`[Indexer] Failed to trigger Discourse Init:`, e);
    }

  }
});

if ((process.env.PONDER_DEPLOYMENT ?? "mainnet").toLowerCase() === "sepolia") {
  // @ts-expect-error FakeUSDCFaucet is conditionally registered in ponder.config.ts
  ponder.on("FakeUSDCFaucet:Claimed", async ({ event, context }: any) => {
    await context.db.insert(schema.faucetClaims).values({
      id: (event.args.user as string).toLowerCase() as `0x${string}`,
      amount: event.args.amount as bigint,
      timestamp: event.block.timestamp,
    });
    // Quest: used the faucet.
    await creditQuest(event.args.user as string, "use_faucet");
  });
}

// Staking: track Staked events so the quest board can credit `stake_rgd`.
// @ts-expect-error Staking is conditionally registered in ponder.config.ts
ponder.on("Staking:Staked", async ({ event, context }: any) => {
  await context.db.insert(schema.rgdStakes).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    staker: (event.args.user as string).toLowerCase() as `0x${string}`,
    amount: event.args.amount as bigint,
    timestamp: event.block.timestamp,
  });
  // Quest: staked RGD.
  await creditQuest(event.args.user as string, "stake_rgd");
});

// MockUniswapV2Router has no Swap event, so we detect a USDC→RGD swap via
// an RGD Transfer where the sender is the router. The recipient is the user.
// @ts-expect-error RgdToken is conditionally registered in ponder.config.ts
ponder.on("RgdToken:Transfer", async ({ event, context }: any) => {
  if (!ROUTER_ADDRESS_LC) return;
  if ((event.args.from as string).toLowerCase() !== ROUTER_ADDRESS_LC) return;
  if ((event.args.value as bigint) === 0n) return;

  await context.db.insert(schema.rgdSwaps).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    sender: (event.args.to as string).toLowerCase() as `0x${string}`,
    rgdOut: event.args.value as bigint,
    timestamp: event.block.timestamp,
  });
  // Quest: swapped USDC → RGD (recipient of the router transfer is the user).
  await creditQuest(event.args.to as string, "swap_usdc_rgd");
});

