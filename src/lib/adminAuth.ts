// Constant-time comparison for the admin bearer token that gates the privileged
// season/quest routes. A plain `===`/`!==` on the secret is timing-attackable in
// principle; with a high-entropy secret over the network it's not practically
// exploitable, but this keeps the check consistent with the timing-safe session
// verification in src/lib/communitySession.ts.

import crypto from 'crypto';

/** True iff `token` equals DISCOURSE_INIT_SECRET (constant-time). */
export function isValidAdminToken(token: string | null | undefined): boolean {
  const secret = process.env.DISCOURSE_INIT_SECRET;
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
