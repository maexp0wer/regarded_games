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