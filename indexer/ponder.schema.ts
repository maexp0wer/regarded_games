import { onchainTable, primaryKey } from "ponder";

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
  netContribution: t.bigint().default(0n).notNull(),
  realizedPayout: t.bigint().default(0n).notNull(),
  totalPotentialPayout: t.bigint().default(0n).notNull(),
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
  timestamp: t.bigint().notNull(),
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
  
}));

