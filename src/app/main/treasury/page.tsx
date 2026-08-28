import type { Metadata } from 'next';
import { getTreasuryReport, type Holding } from '@/lib/treasury';

/* Public treasury transparency page.
 *
 * Server-rendered rather than client hooks: it needs no wallet, it has SEO
 * value once seasons settle, and a 5-minute cache means the RPC/indexer see two
 * reads per window instead of one per visitor. A transparency ledger does not
 * need 3-second polling.
 *
 * The caching lives on the data function (unstable_cache in lib/treasury.ts),
 * NOT on the `revalidate` below: the root layout calls headers(), which makes
 * every route dynamic, so page-level ISR never engages. `revalidate` is kept
 * because it costs nothing and becomes correct if that ever changes.
 *
 * noindex until the first season settles — an all-zero ledger is not the page
 * we want crawled as the answer to "Regarded Games treasury". Drop the robots
 * block and add /treasury to src/app/sitemap.ts at that point. */

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Treasury',
  description:
    'Regarded Games treasury: player funds under management, lifetime yield ' +
    'distribution across buybacks, liquidity and prize pool bonuses, and ' +
    'current protocol-owned holdings.',
  alternates: { canonical: '/treasury' },
  robots: { index: false, follow: true },
};

const nf = (v: string | number | null, digits = 2) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? '—'
    : Number(v).toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const usdFmt = (v: number | null) => (v === null ? '—' : `$${nf(v)}`);

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="terminal-pane flex flex-col gap-1.5 p-5">
      <span className="h4-app">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums text-text">{value}</span>
      {hint && <span className="font-mono text-[10px] text-text2 opacity-70">{hint}</span>}
    </div>
  );
}

function HoldingRow({ holding }: { holding: Holding }) {
  return (
    <div className="ledger-row">
      <div className="flex flex-col">
        <span className="font-mono text-[13px] font-bold text-text">{holding.symbol}</span>
        <span className="ledger-cell-secondary">{holding.label}</span>
      </div>
      <div className="ledger-cell-metric">
        <span className="font-mono tabular-nums text-text">{nf(holding.amount, 4)}</span>
      </div>
      <div className="ledger-cell-metric">
        <span className="font-mono tabular-nums text-text2">{usdFmt(holding.usd)}</span>
      </div>
    </div>
  );
}

export default async function TreasuryPage() {
  const report = await getTreasuryReport();

  const holdingsUsdTotal = report.holdings.reduce<number | null>((acc, h) => {
    if (h.usd === null || acc === null) return acc === null ? null : acc;
    return acc + h.usd;
  }, 0);

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-16">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">

        <header className="flex flex-col gap-4">
          <span className="section-label">Regarded Games</span>
          <h1 className="h2-app">Treasury</h1>
          <p className="font-sans text-text2 text-base leading-relaxed max-w-2xl">
            Every dollar the protocol touches, on one page. Prize pool capital is
            deployed to blue-chip DeFi during a season; the yield it earns is
            split four ways and the DAO&rsquo;s share accumulates here.
          </p>
        </header>

        {report.errors.length > 0 && (
          <div className="surface-pink-warn rounded-xl p-4 flex flex-col gap-1">
            {report.errors.map((e) => (
              <span key={e} className="font-mono text-[11px] text-[--color-red]">
                {e}
              </span>
            ))}
          </div>
        )}

        {/* ---- Band 1: custodied ------------------------------------------ */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="h3-app">Under Management</h2>
            <p className="font-sans text-sm text-text2 leading-relaxed max-w-2xl">
              Player prize-pool capital deployed to earn yield. These funds are
              custodied for players and are <strong className="text-text">not</strong> owned
              by the DAO — they are paid out at settlement.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Figure
              label="Principal Deployed"
              value={report.principalDeployed === null ? '—' : `$${nf(report.principalDeployed)}`}
              hint="Season prize pools currently supplied to Aave"
            />
            <Figure
              label="Lifetime Yield Generated"
              value={report.lifetimeYield === null ? '—' : `$${nf(report.lifetimeYield)}`}
              hint="Total interest earned across all seasons"
            />
          </div>
        </section>

        {/* ---- Band 2: flows ---------------------------------------------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="h3-app">Where the Yield Went</h2>
            <p className="font-sans text-sm text-text2 leading-relaxed max-w-2xl">
              Lifetime distribution of harvested yield, across every season.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.flows.length === 0 ? (
              <p className="section-label opacity-40">Awaiting Season 01</p>
            ) : (
              report.flows.map((f) => (
                <Figure key={f.label} label={f.label} value={`$${nf(f.amount)}`} />
              ))
            )}
          </div>
        </section>

        {/* ---- Band 3: holdings ------------------------------------------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="h3-app">Treasury Holdings</h2>
            <p className="font-sans text-sm text-text2 leading-relaxed max-w-2xl">
              Protocol-owned assets held by the Treasury contract right now.
            </p>
          </div>

          {report.holdings.length === 0 ? (
            <div className="card-app text-center py-16">
              <p className="section-label opacity-40">No holdings recorded yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="ledger-header">
                <span>Asset</span>
                <span className="ledger-cell-metric">Balance</span>
                <span className="ledger-cell-metric">USD Equivalent</span>
              </div>
              {report.holdings.map((h) => (
                <HoldingRow key={h.symbol} holding={h} />
              ))}
              <div className="ledger-row ledger-row-passive">
                <span className="font-mono text-[13px] font-bold text-text">Total</span>
                <span className="ledger-cell-metric" />
                <span className="ledger-cell-metric font-mono tabular-nums font-bold text-text">
                  {usdFmt(holdingsUsdTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Spot price off a single pool is manipulable; the balance is the fact,
              the dollar figure is an estimate, and the page should say so. */}
          <p className="font-mono text-[10px] text-text2 opacity-60 leading-relaxed">
            USD equivalents are indicative. RGD and LP positions are valued from
            the RGD/USDC pool&rsquo;s current reserves
            {report.rgdUsdPrice !== null && ` (RGD ≈ $${nf(report.rgdUsdPrice, 4)})`}; a
            thin pool can move that price sharply. Token balances are the
            authoritative figures.
          </p>
        </section>

        <div>
          <a href="/" className="btn-game-secondary">
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
