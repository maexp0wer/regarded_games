import { onchainTable, primaryKey, index } from "ponder";

export const seasons = onchainTable("seasons", (t) => ({
  address: t.hex().primaryKey(),
  seasonId: t.bigint().notNull(),
  auctionAddress: t.hex().notNull(),
  exchangeAddress: t.hex().notNull(),
  fimAddress: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
  prizePool: t.bigint().default(0n).notNull(),
}));

export const playerSeasonStats = onchainTable("player_season_stats", (t) => ({
  seasonAddress: t.hex().notNull(),
  playerAddress: t.hex().notNull(),
  fimBalance: t.bigint().default(0n).notNull(),
  fimBurned: t.bigint().default(0n).notNull(),
  netContribution: t.bigint().default(0n).notNull(),
  realizedPayout: t.bigint().default(0n).notNull(),
  totalPotentialPayout: t.bigint().default(0n).notNull(),
  totalFeesPaid: t.bigint().default(0n).notNull(),
}), (table) => ({
  pk: primaryKey({ columns: [table.seasonAddress, table.playerAddress] }),
}));

export const auctionMints = onchainTable("auction_mints", (t) => ({
  id: t.text().primaryKey(),
  seasonAddress: t.hex().notNull(),
  playerAddress: t.hex().notNull(),
  usdcAmount: t.bigint().notNull(),
  fimAmount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));



export const orders = onchainTable("orders", (t) => ({
  id: t.text().primaryKey(), 
  orderId: t.bigint().notNull(),
  seasonAddress: t.hex().notNull(),
  maker: t.hex().notNull(),
  isBuy: t.boolean().notNull(), 
  price: t.bigint().notNull(),
  initialAmount: t.bigint().notNull(),
  remainingAmount: t.bigint().notNull(),
  active: t.boolean().notNull().default(true),
  isCancelled: t.boolean().notNull().default(false),
  timestamp: t.bigint().notNull(),
  settledAt: t.bigint(),
}));

export const trades = onchainTable("trades", (t) => ({
  id: t.text().primaryKey(),
  seasonAddress: t.hex().notNull(),
  buyer: t.hex().notNull(),
  seller: t.hex().notNull(),
  fimAmount: t.bigint().notNull(),
  usdcAmount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
  buyerBalance: t.bigint().notNull().default(0n),
  sellerBalance: t.bigint().notNull().default(0n),
  buyerPercentile: t.integer().notNull().default(50),
  sellerPercentile: t.integer().notNull().default(50),
  buyerIsCapitalist: t.boolean().notNull().default(false),
  sellerIsCapitalist: t.boolean().notNull().default(false),
  giniBps: t.integer().notNull().default(0),
}));

export const yieldEvents = onchainTable("yield_events", (t) => ({
  id: t.text().primaryKey(),
  seasonAddress: t.hex(),
  totalYield: t.bigint(),
  buybackAmt: t.bigint(),
  liquidityAmt: t.bigint(),
  reinvestAmt: t.bigint(),
  daoAmt: t.bigint(),
  timestamp: t.bigint(),
}));

export const protocolStats = onchainTable("protocol_stats", (t) => ({
  id: t.text().primaryKey(), // "global"
  totalYieldGenerated: t.bigint(),
  totalBuybacks: t.bigint(),
}));

export const capitalAuctionParticipant = onchainTable("capital_auction_participant", (t) => ({
  id: t.hex().primaryKey(),       // lowercased depositor address
  totalDeposited: t.bigint().notNull().default(0n),  // sum of all Deposited events (USDC, 6 decimals)
  rgdClaimed: t.bigint(),         // null until Claimed event; RGD amount (18 decimals)
}));

export const faucetClaims = onchainTable("faucet_claims", (t) => ({
  id: t.hex().primaryKey(),       // lowercase user address (one claim per user)
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const rgdSwaps = onchainTable("rgd_swaps", (t) => ({
  id: t.text().primaryKey(),         // `${txHash}-${logIndex}`
  sender: t.hex().notNull(),         // user that received RGD (lowercased)
  rgdOut: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  senderIdx: index("rgd_swaps_sender_idx").on(table.sender),
}));

export const rgdStakes = onchainTable("rgd_stakes", (t) => ({
  id: t.text().primaryKey(),         // `${txHash}-${logIndex}`
  staker: t.hex().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  stakerIdx: index("rgd_stakes_staker_idx").on(table.staker),
}));

export const candles = onchainTable("candles", (t) => ({
  seasonAddress:  t.hex().notNull(),
  timeframe:      t.text().notNull(),    // "5m" | "1h" | "4h" | "1d"
  bucketTs:       t.bigint().notNull(),  // Unix seconds, bucket start
  // storedPrice = usdcAmount * 10n**18n / fimAmount; human price = storedPrice / 1e6
  openPrice:      t.bigint().notNull(),
  highPrice:      t.bigint().notNull(),
  lowPrice:       t.bigint().notNull(),
  closePrice:     t.bigint().notNull(),
  // Raw fimAmount sums (18-decimal); frontend divides by 1e18
  capBuyerVolume: t.bigint().notNull().default(0n),
  socBuyerVolume: t.bigint().notNull().default(0n),
  // Gini OHLC in basis points. giniBps is the CLOSE (kept that name so downstream
  // that already reads it as the close is unaffected); open/high/low are new.
  giniOpen:       t.integer().notNull().default(0),
  giniHigh:       t.integer().notNull().default(0),
  giniLow:        t.integer().notNull().default(0),
  giniBps:        t.integer().notNull().default(0),
  tradeCount:     t.integer().notNull().default(0),
}), (table) => ({
  pk:  primaryKey({ columns: [table.seasonAddress, table.timeframe, table.bucketTs] }),
  idx: index("candles_season_tf_bucket").on(table.seasonAddress, table.timeframe, table.bucketTs),
}));