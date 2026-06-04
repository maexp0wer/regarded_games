// Shared cookie-domain strategy for cookies that must be readable across the
// app.* and community.* subdomains (the community session + the SSO handshake).
//
//   - In dev (*.localhost), `localhost` is on the Public Suffix List, so browsers
//     reject any cookie with `domain=localhost`. The only thing that works is a
//     host-only cookie (no `domain=` attribute) — so we return null / ''.
//   - In prod, return the registrable domain (last two labels) so the cookie is
//     shared across app.* and community.* subdomains.
//
// `host` is a Host header value, which may include a port (e.g. "app.localhost:3000").

/** Registrable domain to scope a cross-subdomain cookie to, or null for host-only (dev). */
export function cookieDomainFor(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostNoPort = host.split(':')[0];
  if (hostNoPort === 'localhost' || hostNoPort.endsWith('.localhost')) return null;
  const parts = hostNoPort.split('.');
  if (parts.length <= 2) return hostNoPort;
  return parts.slice(-2).join('.');
}
