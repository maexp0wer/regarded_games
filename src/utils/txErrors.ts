export function extractRevertReason(err: unknown): string {
  const e = err as { shortMessage?: string; cause?: { reason?: string }; message?: string } | null;
  const raw: string = e?.shortMessage ?? e?.cause?.reason ?? e?.message ?? String(err);
  const match = raw.match(/reason:\s*(.+?)(?:\n|$)/i) ?? raw.match(/reverted with reason string '(.+?)'/i);
  return match ? match[1].trim() : raw.slice(0, 120);
}
