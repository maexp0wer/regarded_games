// Pure builder for the community sign-in message. Imported by BOTH the client
// (which asks the wallet to sign it) and the server (which reconstructs it to
// verify the signature). The two MUST produce a byte-for-byte identical string,
// so this lives in one place and is never inlined.

export const LOGIN_FRESHNESS_MS = 5 * 60 * 1000; // reject signatures older than 5 min

export function buildLoginMessage(address: string, issuedAt: number): string {
  return `Sign in to the Regarded Games Forum.\n\nWallet: ${address.toLowerCase()}\nIssued: ${issuedAt}`;
}
