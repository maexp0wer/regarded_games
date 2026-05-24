export function extractRevertReason(err: any): string {
  const raw: string = err?.shortMessage ?? err?.cause?.reason ?? err?.message ?? String(err);
  const match = raw.match(/reason:\s*(.+?)(?:\n|$)/i) ?? raw.match(/reverted with reason string '(.+?)'/i);
  return match ? match[1].trim() : raw.slice(0, 120);
}
