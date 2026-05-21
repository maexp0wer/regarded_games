import { SeasonTrade } from '@/hooks/useSeasonTrades';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  capBuyerVolume: number;
  socBuyerVolume: number;
  giniBps: number;
}

export interface ChordGroup {
  index: number;
  isCapitalist: boolean;
  bandIndex: number;
  label: string;
  playerCount: number;
}

export interface ChordData {
  groups: ChordGroup[];
  matrix: number[][];
}

const DECIMALS = 1e18;

export function buildChordData(
  trades: SeasonTrade[],
  timeStart: number,
  timeEnd: number,
): ChordData {
  const startSec = timeStart / 1000;
  const endSec = timeEnd / 1000;

  const windowTrades = trades.filter((t) => {
    const ts = Number(BigInt(t.timestamp));
    return ts >= startSec && ts <= endSec;
  });

  if (windowTrades.length === 0) {
    return { groups: [], matrix: [] };
  }

  // 20 bands of 5% per faction → 40 groups total.
  // Cap: 0 = richest (9 o'clock) … 19 = threshold (3 o'clock).
  // Soc: 20 = threshold (3 o'clock) … 39 = most socialist (9 o'clock).
  const NUM_BANDS = 20;
  const TOTAL = NUM_BANDS * 2;
  const STEP = 100 / NUM_BANDS;

  function partyToGroup(isCapitalist: boolean, percentile: number): number {
    const band = Math.min(NUM_BANDS - 1, Math.floor(percentile / STEP));
    return isCapitalist ? (NUM_BANDS - 1 - band) : (NUM_BANDS + band);
  }

  const matrix: number[][] = Array.from({ length: TOTAL }, () => new Array(TOTAL).fill(0));
  const playerSets: Set<string>[] = Array.from({ length: TOTAL }, () => new Set());

  for (const t of windowTrades) {
    const sg = partyToGroup(t.sellerIsCapitalist, t.sellerPercentile);
    const bg = partyToGroup(t.buyerIsCapitalist, t.buyerPercentile);
    const fim = Number(BigInt(t.fimAmount)) / DECIMALS;
    matrix[sg][bg] += fim;
    playerSets[sg].add(t.seller.toLowerCase());
    playerSets[bg].add(t.buyer.toLowerCase());
  }

  const groups: ChordGroup[] = Array.from({ length: TOTAL }, (_, i) => {
    const isCapitalist = i < NUM_BANDS;
    const bandIndex = isCapitalist ? (NUM_BANDS - 1 - i) : (i - NUM_BANDS);
    const pctLow = Math.round(bandIndex * STEP);
    const pctHigh = Math.round(pctLow + STEP);
    const label = isCapitalist ? `Cap ${pctLow}–${pctHigh}%` : `Soc ${pctLow}–${pctHigh}%`;
    return { index: i, isCapitalist, bandIndex, label, playerCount: playerSets[i].size };
  });

  return { groups, matrix };
}
