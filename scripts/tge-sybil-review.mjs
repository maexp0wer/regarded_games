/**
 * TGE Sybil Review — run before token distribution to identify bot farms.
 *
 * Usage:
 *   node scripts/tge-sybil-review.mjs [--ip-threshold=N] [--chain-threshold=N] [--format=csv|json]
 *
 * Outputs one section per analysis query. Default format: JSON-lines.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

const envText = readFileSync(envPath, 'utf8');
const match = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m);
if (!match) {
  console.error('POSTGRES_URL not found in .env');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }),
);
const ipThreshold    = parseInt(args['ip-threshold']    ?? '3',  10);
const chainThreshold = parseInt(args['chain-threshold'] ?? '5',  10);
const format         = args['format'] ?? 'json';

const client = new pg.Client({ connectionString: match[1] });
await client.connect();

function emit(label, rows) {
  console.log(`\n=== ${label} (${rows.length} cluster${rows.length === 1 ? '' : 's'}) ===`);
  if (rows.length === 0) { console.log('  none'); return; }
  if (format === 'csv') {
    const keys = Object.keys(rows[0]);
    console.log(keys.join(','));
    for (const r of rows) console.log(keys.map(k => JSON.stringify(r[k] ?? '')).join(','));
  } else {
    for (const r of rows) console.log(JSON.stringify(r));
  }
}

// A — IP clustering: wallets sharing the same session IP
const { rows: ipClusters } = await client.query(`
  SELECT
    ip_hash,
    COUNT(DISTINCT address)                         AS wallet_count,
    ARRAY_AGG(DISTINCT address ORDER BY address)   AS wallets,
    MIN(created_at)                                 AS first_seen,
    MAX(created_at)                                 AS last_seen
  FROM session_fingerprints
  WHERE ip_hash IS NOT NULL
  GROUP BY ip_hash
  HAVING COUNT(DISTINCT address) >= $1
  ORDER BY wallet_count DESC
`, [ipThreshold]);
emit(`A: IP clusters (≥${ipThreshold} wallets/IP)`, ipClusters);

// B — Referral chains: recursive chains of N+ wallets
const { rows: referralChains } = await client.query(`
  WITH RECURSIVE chain AS (
    SELECT referrer_address AS root, referee_address, 1 AS depth
    FROM faucet_referrals
    UNION ALL
    SELECT c.root, fr.referee_address, c.depth + 1
    FROM faucet_referrals fr
    JOIN chain c ON c.referee_address = fr.referrer_address
    WHERE c.depth < 10
  )
  SELECT
    root,
    COUNT(*)                                          AS chain_length,
    ARRAY_AGG(referee_address ORDER BY depth)         AS chain_wallets
  FROM chain
  GROUP BY root
  HAVING COUNT(*) >= $1
  ORDER BY chain_length DESC
`, [chainThreshold]);
emit(`B: Referral chains (≥${chainThreshold} hops)`, referralChains);

// C — Timestamp clustering: many wallets completing the same quest within the same minute
const { rows: timeClusters } = await client.query(`
  SELECT
    DATE_TRUNC('minute', awarded_at)                AS minute_bucket,
    quest_id,
    COUNT(DISTINCT address)                         AS wallet_count,
    ARRAY_AGG(address ORDER BY awarded_at)          AS wallets
  FROM quest_completions
  GROUP BY minute_bucket, quest_id
  HAVING COUNT(DISTINCT address) >= 5
  ORDER BY wallet_count DESC
  LIMIT 100
`);
emit('C: Same-minute quest completions (≥5 wallets)', timeClusters);

// D — All wallets with significant points: export for manual review
const { rows: allWallets } = await client.query(`
  SELECT
    address,
    COUNT(*)::int   AS quests_done,
    SUM(points)     AS total_points,
    MIN(awarded_at) AS first_completion,
    MAX(awarded_at) AS last_completion
  FROM quest_completions
  GROUP BY address
  HAVING SUM(points) >= 300
  ORDER BY total_points DESC
`);
emit('D: All wallets with ≥300 points (manual review)', allWallets);

await client.end();
console.log('\nDone. Cross-reference clusters A+B+C against list D to identify likely bot farms.');
