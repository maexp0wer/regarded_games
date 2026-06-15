/**
 * Restrict a raw numeric input string to at most `decimals` fractional digits,
 * matching the token's on-chain precision (USDC 6, FIM/RGD 18). Used at input
 * onChange so a value can never carry more precision than parseUnits accepts.
 *
 * Preserves in-progress typing: an empty string and a lone trailing "." pass
 * through unchanged. Anything that isn't a valid number-in-progress is returned
 * as-is so callers' own validation/parse guards still see the user's keystrokes.
 */
export function clampDecimals(value: string, decimals: number): string {
  if (value === '') return value;

  const dot = value.indexOf('.');
  if (dot === -1) return value;

  // decimals === 0 → no fractional part allowed; drop the dot and everything after.
  if (decimals <= 0) return value.slice(0, dot);

  const fraction = value.slice(dot + 1);
  if (fraction.length <= decimals) return value;

  return value.slice(0, dot + 1 + decimals);
}
