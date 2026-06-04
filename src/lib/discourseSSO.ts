import crypto from 'crypto';

const DEBUG = process.env.APP_DEBUG === 'true';

interface SSOOpts {
  maxRetries?: number;
  baseBackoffMs?: number;
}

export async function ssoSync(
  url: string,
  headers: Record<string, string>,
  ssoSecret: string,
  wallet: string,
  opts: SSOOpts = {},
): Promise<boolean> {
  const { maxRetries = 4, baseBackoffMs = 2000 } = opts;

  const ssoParams = new URLSearchParams({
    external_id: wallet,
    email: `${wallet}@regarded.local`,
    username: wallet,
    name: `Player ${wallet.slice(2, 8)}`,
  });
  const payloadBase64 = Buffer.from(ssoParams.toString(), 'utf8').toString('base64');
  const sig = crypto.createHmac('sha256', ssoSecret).update(payloadBase64).digest('hex');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${url}/admin/users/sync_sso`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sso: payloadBase64, sig }).toString(),
    });
    if (res.ok) return true;
    if (res.status === 429) {
      const wait = baseBackoffMs * 2 ** attempt;
      if (DEBUG) console.log(`[ssoSync] 429 for ${wallet}, retrying in ${wait}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    console.warn(`[ssoSync] failed for ${wallet} (${res.status})`);
    return false;
  }
  console.warn(`[ssoSync] exhausted retries for ${wallet}`);
  return false;
}
