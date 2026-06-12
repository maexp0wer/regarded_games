/**
 * Maps on-chain revert reasons to friendly, player-facing copy.
 *
 * Pure: takes a caught error (or its message) and returns the best human string.
 * The contract's `require` reason is buried in viem's error — we match against
 * the known canonical reasons rather than show the raw revert. Anything we don't
 * recognise falls back to a generic message (and is NOT mistaken for a known
 * one), so new contract reasons degrade gracefully instead of leaking jargon.
 */

const GENERIC = 'Something went wrong. Check your wallet and retry.';

/**
 * Canonical contract revert reason → friendly copy. Keys are matched as
 * case-insensitive substrings of the error message (viem wraps the reason in a
 * longer string). Order matters only if two keys could co-occur — keep the most
 * specific first.
 */
const REVERT_COPY: ReadonlyArray<readonly [needle: string, friendly: string]> = [
  [
    'Insufficient Collateral',
    'You need more staked RGD to hold this much FIM. Stake more RGD or buy a smaller amount.',
  ],
  [
    'Funds Locked by Active Season',
    'That RGD is locked as collateral for an active season. You can only unstake the free portion.',
  ],
  [
    'Game not active',
    'Trading is closed for this season right now.',
  ],
  [
    'Self fill',
    "You can't fill your own order.",
  ],
  [
    'Too early',
    'This action is not available yet.',
  ],
  // "Not active" is broad — keep it last so the more specific reasons above win.
  [
    'Not active',
    'That order is no longer available.',
  ],
];

/** Extract the most useful message string from a thrown wallet/contract error. */
function errorText(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as { shortMessage?: string; message?: string; details?: string };
    return e.shortMessage || e.details || e.message || '';
  }
  return '';
}

/** True if the user rejected the tx in their wallet (not a contract revert). */
export function isUserRejection(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  return text.includes('rejected') || text.includes('user denied') || text.includes('user rejected');
}

/** True if the wallet lacks gas funds (distinct from a contract revert). */
export function isInsufficientGas(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  return (
    text.includes('insufficient funds') ||
    (err as { name?: string })?.name === 'InsufficientFundsError'
  );
}

/**
 * Friendly message for a caught error, or `null` if it's a user rejection
 * (callers usually want to show nothing / a "canceled" state for those).
 */
export function friendlyRevertReason(err: unknown): string | null {
  if (isUserRejection(err)) return null;
  if (isInsufficientGas(err)) return 'Insufficient gas funds in your wallet.';

  const text = errorText(err);
  for (const [needle, friendly] of REVERT_COPY) {
    if (text.toLowerCase().includes(needle.toLowerCase())) return friendly;
  }
  return GENERIC;
}
