// Pure builder + validators for the profile-update signature. Imported by BOTH
// the client (which asks the wallet to sign it) and the server (which reconstructs
// it to verify). The two MUST produce a byte-for-byte identical string, so this
// lives in one place and is never inlined. Mirrors utils/communityAuthMessage.ts.

export const PROFILE_FRESHNESS_MS = 5 * 60 * 1000; // reject signatures older than 5 min

export const PROFILE_NAME_MAX = 64;
export const PROFILE_IMAGE_URL_MAX = 512;

/** The exact message the wallet signs to authorise a profile update. */
export function buildProfileMessage(
  address: string,
  name: string,
  imageUrl: string,
  issuedAt: number,
): string {
  return `Update profile for ${address.toLowerCase()}\nName: ${name}\nImage: ${imageUrl}\nIssued: ${issuedAt}`;
}

/**
 * Accept only an empty string or an `https://` URL to a public host. Rejects
 * `http:`, `data:`, `javascript:`, blob:, and anything targeting a private /
 * loopback / link-local host — the stored value is later handed to Discourse's
 * server-side avatar fetcher, so an unvalidated URL is an SSRF vector.
 */
export function isValidProfileImageUrl(url: string): boolean {
  if (url === '') return true;
  if (url.length > PROFILE_IMAGE_URL_MAX) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;

  const host = u.hostname.toLowerCase();
  // Block obvious internal targets. This is a coarse allowlist-of-shape, not a
  // full SSRF filter (DNS can still rebind) — Discourse also filters — but it
  // rejects the trivial metadata/loopback/private cases at the front door.
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '169.254.169.254' ||          // cloud metadata
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    /^10\./.test(host) ||                   // 10.0.0.0/8
    /^192\.168\./.test(host) ||             // 192.168.0.0/16
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) // 172.16.0.0/12
  ) {
    return false;
  }
  return true;
}

/** Validate a display name: length only (rendering escapes it). */
export function isValidProfileName(name: string): boolean {
  return name.length <= PROFILE_NAME_MAX;
}
