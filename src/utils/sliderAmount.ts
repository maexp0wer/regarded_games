export function sliderPctToAmount(pct: number, maxNum: number): string {
  if (maxNum <= 0) return '0';
  const inc = maxNum < 10 ? 0.001 : maxNum < 100 ? 0.01 : maxNum < 1000 ? 0.1 : 1;
  const dp  = inc < 0.01 ? 3 : inc < 0.1 ? 2 : inc < 1 ? 1 : 0;
  const raw = maxNum * pct / 100;
  return (Math.min(maxNum, Math.round(raw / inc) * inc)).toFixed(dp);
}
