import { formatUnits } from 'viem';

// Constants matching Solidity contract
const BPS_SCALE = 10_000n;

export interface PlayerData {
  address: string;
  balance: bigint;
}

export interface GameMetrics {
  gini: number;        // in BPS (e.g., 4500 = 0.45)
  capProgress: number; // in BPS (e.g., 10000 = 100%)
  socProgress: number; // in BPS
  isCapWinning: boolean;
}

/**
 * Calculates Gini Coefficient and Victory Progress matching GameSeason.sol logic.
 * 
 * @param players Array of objects containing address and balance (in Wei)
 * @param totalSupply Total supply of FIM (in Wei)
 * @param gInitial Initial Gini from contract (in BPS)
 * @param beta The socialist multiplier beta from contract (in BPS)
 */
export function calculateGameMetrics(
  players: PlayerData[],
  totalSupply: bigint,
  gInitial: bigint,
  beta: bigint
): GameMetrics {
  
  // 1. Edge Case: No supply or players
  if (players.length === 0 || totalSupply === 0n) {
    return { gini: 0, capProgress: 0, socProgress: 0, isCapWinning: false };
  }

  // 2. Sort Players by Balance (Ascending)
  // CRITICAL: We use BigInt comparison, not subtraction, to prevent overflow issues
  // We create a copy ([...players]) to avoid mutating the original array
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.balance < b.balance) return -1;
    if (a.balance > b.balance) return 1;
    return 0;
  });

  const N = BigInt(sortedPlayers.length);

  // 3. Calculate Gini (Linear Formula)
  // Contract Formula: G = (2 * Sum(i * balance_i) / (N * TotalSupply)) - (N + 1) / N
  let accumulator = 0n;

  for (let i = 0; i < sortedPlayers.length; i++) {
    // Rank is 1-based (i + 1)
    const rank = BigInt(i + 1);
    accumulator += rank * sortedPlayers[i].balance;
  }

  const numerator = 2n * accumulator;
  const denominator = N * totalSupply;

  // Scale to BPS (10000) for term1
  const term1 = (numerator * BPS_SCALE) / denominator;
  
  // term2 calculation: ((N + 1) * 10000) / N
  const term2 = ((N + 1n) * BPS_SCALE) / N;

  // gCurrent cannot be negative in this context (if sort is correct)
  // Result is in BPS (e.g. 5000 = 0.5)
  const gCurrentBigInt = term1 > term2 ? term1 - term2 : 0n;


  // 4. Calculate Victory Progress
  const oneMinusGi = BPS_SCALE - gInitial;
  let capProgress = 0n;
  let socProgress = 0n;

  // A. Capitalist Progress Logic
  // Formula: (G_curr - G_init) / (1 - G_init)
  if (gCurrentBigInt > gInitial) {
    if (oneMinusGi > 0n) {
      capProgress = ((gCurrentBigInt - gInitial) * BPS_SCALE) / oneMinusGi;
    }
  }

  // B. Socialist Progress Logic
  // Formula: ((G_init - G_curr) / G_init) * M
  // M = Beta + (1 - G_init)^2
  if (gCurrentBigInt < gInitial) {
    // Calculate Multiplier (M)
    // Note: oneMinusGi is BPS. Square it = BPS^2. Divide by BPS_SCALE to normalize.
    const termSq = (oneMinusGi * oneMinusGi) / BPS_SCALE;
    const M = beta + termSq;

    if (gInitial > 0n) {
      // Delta * M / Initial
      const delta = gInitial - gCurrentBigInt;
      socProgress = (delta * M) / gInitial;
    }
  }

  return {
    gini: Number(gCurrentBigInt),
    capProgress: Number(capProgress),
    socProgress: Number(socProgress),
    isCapWinning: capProgress >= socProgress
  };
}

/**
 * Helper to format BPS into a readable percentage string
 * @param bps Value in Basis Points (e.g. 2500)
 * @returns String (e.g. "25.00%")
 */
export function formatBps(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}