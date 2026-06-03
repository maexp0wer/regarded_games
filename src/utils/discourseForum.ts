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
// currently connected wallet (the SSO provider route reads the `current_wallet`
// cookie) and lands the user on the requested page already authenticated.

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL ?? '';

export function forumLoginUrl(returnPath: string): string {
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  return `${DISCOURSE_URL}/session/sso?return_path=${encodeURIComponent(path)}`;
}
