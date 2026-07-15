// Helpers for linking from the app into the Discourse forum.
//
// Modern Discourse (2026+) blocks the old hidden-iframe SSO trick: it sends
// `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`, and its session
// cookie is `SameSite=Lax`, so a cross-site iframe can neither load nor hold a
// session. The documented DiscourseConnect flow is a *top-level* redirect through
// `/session/sso`, which establishes a first-party session and then forwards the
// user to `return_path`.
//
// `forumLoginUrl` wraps a forum path so that opening it performs that login as the
// signed-in wallet and lands the user on the requested page already authenticated.
//
// It points at OUR /community-login page, NOT Discourse's /session/sso. Discourse
// binds `return_path` to the login nonce inside its anonymous session; if the SSO
// round-trip detours through a sign-in (cold login), that binding is unreliable and
// the user lands on the forum home. So we invert the order: establish the app
// session FIRST on /community-login, and only then fire /session/sso?return_path —
// that warm round-trip is pure redirects with no human pause, so Discourse's
// binding survives and the user lands on the exact page.
//
// Always the canonical `app.` host (never the sepolia host): the SSO provider's
// cold-login bounce lands there, so that host is where the community session
// cookie must live. Links open in a new tab, so the origin switch is invisible.

export const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL ?? '';

function appOrigin(): string {
  const main = new URL(process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'http://localhost:3000');
  return `${main.protocol}//app.${main.host}`;
}

export function forumLoginUrl(returnPath: string): string {
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  return `${appOrigin()}/community-login?return_path=${encodeURIComponent(path)}`;
}

/**
 * True only for a safe root-relative forum path (not "//host" or an absolute
 * URL). The path is echoed into a redirect on /community-login, so it must never
 * be attacker-steerable to another origin.
 */
export function isSafeReturnPath(raw: string | null | undefined): raw is string {
  return !!raw && raw.startsWith('/') && !raw.startsWith('//');
}
