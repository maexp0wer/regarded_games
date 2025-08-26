// src/lib/types.ts

// This type must exactly match the SeasonManifest struct in GameController.sol
export interface SeasonManifest {
  readonly gameSeasonTemplate: Address;
  readonly auctionTemplate: Address;
  readonly exchangeTemplate: Address;
  readonly fimTemplate: Address;
  readonly seasonDurationInBlocks: bigint;
  readonly victoryThresholdBps: number;
  readonly multiplierBaseBps: bigint;
  readonly multiplierScaleBps: bigint;
  readonly multiplierPower: bigint;
  readonly yieldVenues: readonly Address[];
  readonly allocationBps: readonly bigint[];
  readonly harvestGasPriceLimit: bigint;
}

// This type must exactly match the Season struct in GameController.sol
export interface Season {
  readonly id: bigint;
  readonly isActive: boolean;
  readonly gameSeason: Address;
  readonly auction: Address;
  readonly exchange: Address;
  readonly fimToken: Address;
  readonly manifest: SeasonManifest;
}

export type Address = `0x${string}`;

export interface ContractSet {
  auction: Address;
  usdc: Address;
  treasury: Address;
  gameController: Address;
}