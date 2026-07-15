// End-to-end replay of the app→forum SSO "return to the page I clicked" journey
// against the local fork-mode stack (Next.js :3000 + Discourse on
// community.localhost). Emulates the browser: per-host cookie jar, manual
// redirect following, a throwaway wallet whose signature is scripted, and the
// /community-login page's effect logic. PASSES only if the chain terminates on
// the exact target path.
//
// Usage:
//   node scripts/sso-return-path-replay.mjs [mode]
//     mode: cold  — fresh wallet signs in mid-flow (default)
//           warm  — app session established before the click
//           twice — full flow, then a second pass with Discourse already logged in
//   PAUSE_MS=20000 … — simulate the human taking that long to sign (the condition
//                      that used to lose Discourse's return_path binding)
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');

const TARGET = '/t/foo/123';
const mode = process.argv[2] ?? 'cold';
const APP = 'http://app.localhost:3000';
const DISCOURSE = 'http://community.localhost';

const account = privateKeyToAccount(generatePrivateKey());

// ── cookie jar: host → Map(name → value); port-agnostic like real browsers ──
const jar = new Map();
function jarFor(host) {
  const h = host.split(':')[0];
  if (!jar.has(h)) jar.set(h, new Map());
  return jar.get(h);
}
function storeCookies(host, setCookies) {
  for (const sc of setCookies ?? []) {
    const [pair, ...attrs] = sc.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const maxAge = attrs.map((a) => a.trim().toLowerCase()).find((a) => a.startsWith('max-age='));
    if (maxAge && Number(maxAge.slice(8)) <= 0) jarFor(host).delete(name);
    else jarFor(host).set(name, value);
  }
}
function cookieHeader(host) {
  return [...jarFor(host).entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

// ── raw HTTP against 127.0.0.1 with Host header (avoids *.localhost DNS) ──
function req(url, { method = 'GET', body = null, headers = {} } = {}) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: '127.0.0.1', port: u.port || 80, path: u.pathname + u.search, method,
        headers: { Host: u.host, Cookie: cookieHeader(u.host), Accept: 'text/html', ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          storeCookies(u.host, res.headers['set-cookie']);
          resolve({ status: res.statusCode, location: res.headers.location, body: data });
        });
      },
    );
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function signIn(origin) {
  const pause = Number(process.env.PAUSE_MS ?? 0);
  if (pause > 0) {
    console.log(`  [sign-in] simulating ${pause}ms of human wallet interaction…`);
    await new Promise((r) => setTimeout(r, pause));
  }
  const issuedAt = Date.now();
  const message = `Sign in to the Regarded Games Forum.\n\nWallet: ${account.address.toLowerCase()}\nIssued: ${issuedAt}`;
  const signature = await account.signMessage({ message });
  const res = await req(`${origin}/api/auth/community-session`, {
    method: 'POST',
    body: JSON.stringify({ address: account.address, issuedAt, signature }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status !== 200) throw new Error(`sign-in failed on ${origin}: ${res.status} ${res.body.slice(0, 200)}`);
  console.log(`  [sign-in] session established on ${origin} as ${account.address.slice(0, 10)}…`);
}

// Emulate the /community-login page's effect for a given URL (mirrors
// src/app/app/community-login/page.tsx — keep in sync if that logic changes).
async function communityLoginPage(pageUrl) {
  const u = new URL(pageUrl);
  const sso = u.searchParams.get('sso') ?? '';
  const sig = u.searchParams.get('sig') ?? '';
  const returnPath = u.searchParams.get('return_path') ?? '';

  if (!jarFor(u.host).has('rg_community')) await signIn(u.origin);

  if (returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//')) {
    console.log(`  [page] start-SSO branch → ${DISCOURSE}/session/sso?return_path=${returnPath}`);
    return `${DISCOURSE}/session/sso?return_path=${encodeURIComponent(returnPath)}`;
  }
  if (!sso || !sig) { console.log('  [page] no sso/sig and no return_path — page would sit idle. DEAD END.'); return null; }
  const nonce = new URLSearchParams(Buffer.from(sso, 'base64').toString()).get('nonce');
  const c = await req(`${u.origin}/api/auth/discourse/confirm?nonce=${encodeURIComponent(nonce)}`);
  if (c.status !== 200) { console.log(`  [page] confirm fetch failed: ${c.status} ${c.body.slice(0, 120)}`); return null; }
  const { confirm } = JSON.parse(c.body);
  console.log('  [page] resume branch → provider with confirm token');
  return `${u.origin}/api/auth/discourse?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}&confirm=${encodeURIComponent(confirm)}`;
}

async function runOnce(label) {
  console.log(`=== replay(${label}): mode=${mode} target=${TARGET} ===`);
  let url = `${APP}/community-login?return_path=${encodeURIComponent(TARGET)}`;
  for (let hop = 1; hop <= 15; hop++) {
    const u = new URL(url);
    if (u.pathname === '/community-login') {
      console.log(`${hop}. [community-login page] ${url.slice(0, 110)}`);
      url = await communityLoginPage(url);
      if (!url) { console.log('RESULT: FAIL (dead end on community-login)'); return false; }
      continue;
    }
    const res = await req(url);
    console.log(`${hop}. ${res.status} ${u.host}${u.pathname}${u.search ? '?' + u.search.slice(1, 60) + '…' : ''}`);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url).href;
      continue;
    }
    // terminal response; the target topic may 404 (fake id) — the landing PATH is the win
    if (u.host.startsWith('community.') && u.pathname === TARGET) {
      console.log(`RESULT: PASS — landed on ${u.host}${u.pathname} (status ${res.status})`);
      return true;
    }
    console.log(`RESULT: FAIL — terminal ${res.status} at ${u.host}${u.pathname} (expected ${TARGET})`);
    console.log(res.body.slice(0, 300));
    return false;
  }
  console.log('RESULT: FAIL — redirect loop (15 hops)');
  return false;
}

async function run() {
  if (mode === 'warm') await signIn(APP);
  let ok = await runOnce('first');
  if (ok && mode === 'twice') {
    // Second pass with the SAME jar: Discourse login cookies now present, so
    // /session/sso should short-circuit straight to the target.
    ok = await runOnce('second/discourse-warm');
  }
  process.exit(ok ? 0 : 1);
}
run().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
