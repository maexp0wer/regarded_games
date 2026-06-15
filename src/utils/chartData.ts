import { SeasonTrade } from '@/hooks/useSeasonTrades';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  capBuyerVolume: number;
  socBuyerVolume: number;
  // Gini OHLC in basis points; giniBps is the CLOSE (kept that name for back-compat).
  giniOpen: number;
  giniHigh: number;
  giniLow: number;
  giniBps: number;
}

/** One timeframe bucket of auction activity, aligned to the candle buckets. */
export interface AuctionPoint {
  time: number;          // Unix seconds, bucket start
  prizePool: number;     // cumulative prize pool up to & including this bucket (USDC)
  mintVolume: number;    // FIM minted within this bucket (human FIM)
}

/** A raw mint as returned by the indexer (pre-scaled to human units). */
export interface AuctionMint {
  timestamp: number;     // Unix seconds
  usdcAmount: number;    // USDC spent (human, 6-dec divided out)
  fimAmount: number;     // FIM minted (human, 18-dec divided out)
}

const TIMEFRAME_SECONDS: Record<string, number> = {
  '5m':    300,
  '1h':  3_600,
  '4h': 14_400,
  '1d': 86_400,
};

/**
 * Bucket auction mints into the same timeframe grid the price candles use.
 *
 * Pane 1 plots `mintVolume` (FIM minted per bucket). Pane 0 plots `prizePool`,
 * the RUNNING TOTAL of USDC contributed by mints — accumulated across buckets so
 * the line only ever rises, matching the on-chain prize pool's monotonic growth
 * from mint contributions. Empty buckets between activity are filled so the area
 * line stays continuous rather than skipping gaps.
 *
 * When `seasonCreatedAt` is given, the series is anchored to the season's
 * creation bucket with a prizePool of 0, so the line starts flat at zero from
 * deployment and only rises once mints arrive (rather than jumping in at the
 * first mint).
 */
export function buildAuctionPoints(
  mints: AuctionMint[],
  timeframe: string,
  seasonCreatedAt?: number,
): AuctionPoint[] {
  const step = TIMEFRAME_SECONDS[timeframe] ?? 3_600;
  if (mints.length === 0) {
    // No mints yet: still draw a flat zero baseline from the creation bucket so
    // the pane reads "0 prize pool since deployment" instead of rendering empty.
    if (seasonCreatedAt === undefined) return [];
    const b = Math.floor(seasonCreatedAt / step) * step;
    return [{ time: b, prizePool: 0, mintVolume: 0 }];
  }

  // Sum mint USDC + FIM per bucket start.
  const usdcByBucket = new Map<number, number>();
  const fimByBucket = new Map<number, number>();
  let minBucket = Infinity;
  let maxBucket = -Infinity;
  for (const m of mints) {
    const bucket = Math.floor(m.timestamp / step) * step;
    usdcByBucket.set(bucket, (usdcByBucket.get(bucket) ?? 0) + m.usdcAmount);
    fimByBucket.set(bucket, (fimByBucket.get(bucket) ?? 0) + m.fimAmount);
    if (bucket < minBucket) minBucket = bucket;
    if (bucket > maxBucket) maxBucket = bucket;
  }

  // Anchor the series at a zero baseline so the line begins at 0 on deployment
  // and rises into the first mint. Use the season-creation bucket, but if that
  // shares (or follows) the first mint's bucket — common when the first mint
  // lands seconds after creation — step one bucket earlier so there's always a
  // distinct, strictly-earlier zero point before the data climbs.
  let startBucket = minBucket;
  if (seasonCreatedAt !== undefined) {
    const createdBucket = Math.floor(seasonCreatedAt / step) * step;
    startBucket = Math.min(createdBucket, minBucket - step);
  }

  const points: AuctionPoint[] = [];
  let cumulative = 0;
  for (let b = startBucket; b <= maxBucket; b += step) {
    cumulative += usdcByBucket.get(b) ?? 0;
    points.push({
      time: b,
      prizePool: cumulative,
      mintVolume: fimByBucket.get(b) ?? 0,
    });
  }
  return points;
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
    const label = isCapitalist ? `Capitalists ${pctLow}–${pctHigh}%` : `Proletarians ${pctLow}–${pctHigh}%`;
    return { index: i, isCapitalist, bandIndex, label, playerCount: playerSets[i].size };
  });

  return { groups, matrix };
}
