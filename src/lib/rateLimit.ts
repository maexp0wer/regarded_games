// Lightweight per-client rate limiting + same-origin guard for API routes.
//
// Today this is an in-process fixed-window counter — correct for a single
// long-lived server, reset on restart, NOT shared across instances. That is fine
// until the app is deployed serverless or with >1 replica; at that point the
// counters below must live in a shared store (Redis/Upstash) or each instance
// enforces only a fraction of the intended limit. The interface is kept small so
// swapping in a shared backend is a one-file change (mirror src/lib/serverCache.ts).
//
// NOTE: rate limiting here is a DoS/abuse backstop, not an authZ mechanism. Routes
// that mutate state must still verify identity (community session / admin token).

import { NextResponse } from 'next/server';
import { extractClientIp } from '@/utils/ipHash';

interface Window { count: number; resetAt: number }

// bucketName → (clientKey → window)
const store = new Map<string, Map<string, Window>>();

/** Stable per-caller key: client IP when resolvable, else a shared fallback. */
export function clientKey(req: Request): string {
  return extractClientIp(req.headers) ?? 'unknown';
}

export interface RateLimitOptions {
  /** Logical bucket, e.g. 'rpc' or 'profile-write'. Keeps counters independent. */
  bucket: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
  /** Override the caller key (defaults to client IP). */
  key?: string;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

/**
 * Fixed-window rate limit check. Returns `ok:false` once the caller exceeds
 * `limit` within the current `windowMs`. Never throws.
 */
export function checkRateLimit(req: Request, opts: RateLimitOptions): RateLimitResult {
  const { bucket, limit, windowMs } = opts;
  const k = opts.key ?? clientKey(req);
  const now = Date.now();

  let buckets = store.get(bucket);
  if (!buckets) {
    buckets = new Map();
    store.set(bucket, buckets);
  }

  const w = buckets.get(k);
  if (!w || now >= w.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 };
  }

  if (w.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((w.resetAt - now) / 1000)), remaining: 0 };
  }

  w.count += 1;
  return { ok: true, retryAfterSec: 0, remaining: limit - w.count };
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSec)) } },
  );
}

// ── Same-origin guard ────────────────────────────────────────────────────────
// Derives the set of hosts this app is served from (bare domain + app.* /
// app.sepolia.* subdomains, plus localhost in dev) and rejects a request whose
// Origin/Referer is *present and foreign*. A request with neither header is
// allowed through (non-browser clients omit both) — rate limiting is the backstop
// for those. This blocks the drive-by browser abuse that carries a foreign Origin.

function allowedHosts(): Set<string> {
  const hosts = new Set<string>();
  const raw = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  if (raw) {
    try {
      const bare = new URL(raw.includes('://') ? raw : `https://${raw}`).host;
      hosts.add(bare);
      hosts.add(`app.${bare}`);
      hosts.add(`app.sepolia.${bare}`);
      hosts.add(`www.${bare}`);
    } catch {
      /* ignore malformed env */
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    for (const h of ['localhost:3000', 'app.localhost:3000', 'app.sepolia.localhost:3000']) {
      hosts.add(h);
    }
  }
  return hosts;
}

/** True unless an Origin/Referer header is present AND its host is not ours. */
export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  if (!origin) return true; // no header to judge — defer to rate limiting
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return allowedHosts().has(host);
}
