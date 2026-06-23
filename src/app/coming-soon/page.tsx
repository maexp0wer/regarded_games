import { headers } from 'next/headers';

/* Soft-launch placeholder. The middleware rewrites every gated app.* /
   app.sepolia.* request here while APP_LIVE / TESTNET_APP_LIVE are unset, so the
   trading app is never reachable before launch. Self-contained on purpose: it
   must not pull in TenantContext / wallet providers, which only belong on the
   live app subtree. */
export default async function ComingSoon() {
  /* This page renders ON the app.* / app.sepolia.* subdomain, so a relative "/"
     would stay there and the middleware would gate it straight back here.
     Derive the root domain by stripping the app subdomain off the live host —
     works in dev and prod regardless of how NEXT_PUBLIC_MAIN_DOMAIN is written. */
  const host = (await headers()).get('host') ?? '';
  const rootHost = host.replace(/^app\.(sepolia\.)?/, '');
  const homeHref = rootHost ? `//${rootHost}/` : '/';

  return (
    <main className="dark min-h-screen flex flex-col items-center justify-center bg-bg text-text px-6 text-center">
      <div className="[background:var(--sunset-15)] absolute inset-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl">
        <span className="section-label">Regarded Games</span>
        <h1 className="h2-app hero-gradient-text text-[2.5rem] leading-tight">
          Coming Soon
        </h1>
        <p className="font-sans text-text2 text-base leading-relaxed">
          The arena is being prepared. Trading opens shortly — read the rules and
          follow along in the meantime.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          {/* Plain <a>, not next/link: this navigates across subdomains
              (app.* → root), so client-side routing must not intercept it. */}
          <a href={homeHref} className="btn-game-secondary">
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
