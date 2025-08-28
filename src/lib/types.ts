// src/lib/types.ts
import { Address } from 'viem';

// This type must exactly match the SeasonManifest struct in GameController.sol
export interface SeasonManifest {
  readonly gameSeasonTemplate: Address;
  readonly AuctionTemplate: Address;
  readonly ExchangeTemplate: Address;
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
  readonly Auction: Address;
  readonly Exchange: Address;
  readonly FIMToken: Address;
  readonly manifest: SeasonManifest;
}


export interface ContractSet {
  // From genesisSeason
  Auction: Address;
  Exchange: Address;
  FIMToken: Address;
  GameSeason: Address;

  // From permanentInfrastructure
  USDC: Address;
  Treasury: Address;
  GameController: Address;
}