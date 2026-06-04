// Small async key/value cache for server routes (faction sync, player provisioning).
//
// Today this is an in-process Map — correct for a single long-lived server, lost on
// restart, NOT shared across instances. That is fine until the app is deployed
// serverless or with >1 replica; at that point the entries below must live in a
// shared store or the per-instance caches disagree and re-do work.
//
// The interface is intentionally ASYNC so swapping in Redis later is a one-file
// change with zero edits at the call sites (see the drop-in block at the bottom).
//
// NOTE: every value cached through here is a pure optimisation. The faction routes
// re-verify against Discourse before writing and the threshold self-corrects next
// cycle, so a missed/stale/lost entry only costs extra API calls — never a wrong
// faction assignment. Keys must be tenant-scoped (use `nsKey(tenant.key, …)`).

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  /** ttlMs omitted/undefined → no expiry. */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  del(key: string): Promise<void>;
}

/** Join parts into a namespaced cache key. Always lead with the tenant key. */
export function nsKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

// --- In-memory store (default) -----------------------------------------------

interface Entry { value: unknown; expiresAt?: number }

class MemoryStore implements CacheStore {
  private map = new Map<string, Entry>();

  private live(key: string): Entry | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expiresAt !== undefined && Date.now() >= e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return e;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.live(key)?.value as T | undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.map.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined });
  }

  async has(key: string): Promise<boolean> {
    return this.live(key) !== undefined;
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
  }
}

export const cache: CacheStore = new MemoryStore();

// --- Redis driver (drop-in) --------------------------------------------------
//
// When the app moves to serverless / multi-replica, implement CacheStore against
// Redis and select it here based on env — no call-site changes needed. Mirror the
// singleton-client pattern in src/lib/db.ts (one client per process). Sketch:
//
//   import Redis from 'ioredis';                       // or @upstash/redis (HTTP)
//   class RedisStore implements CacheStore {
//     private c = new Redis(process.env.REDIS_URL!);
//     async get<T>(k: string)            { const v = await this.c.get(k); return v ? JSON.parse(v) as T : undefined; }
//     async set<T>(k: string, v: T, ttl?: number) { ttl ? await this.c.set(k, JSON.stringify(v), 'PX', ttl) : await this.c.set(k, JSON.stringify(v)); }
//     async has(k: string)               { return (await this.c.exists(k)) === 1; }
//     async del(k: string)               { await this.c.del(k); }
//   }
//
//   export const cache: CacheStore = process.env.REDIS_URL ? new RedisStore() : new MemoryStore();
//
// Activating it would add the `ioredis` (or `@upstash/redis`) dependency and the
// REDIS_URL / Upstash REST env vars — see .env.example.
