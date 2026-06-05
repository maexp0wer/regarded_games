'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Resolves player display names from the `player_profiles` store for a set of
 * wallet addresses. Returns a Map keyed by lowercased address → name. Addresses
 * without a saved profile are simply absent (callers fall back to the address).
 *
 * Batches into a single request via `/api/profile?addresses=`. The query key is
 * the sorted address set, so the same leaderboard roster reuses one cache entry.
 */
export function usePlayerNames(addresses: string[]) {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))].sort();

  return useQuery<Map<string, string>>({
    queryKey: ['playerNames', unique],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/profile?addresses=${unique.join(',')}`, { cache: 'no-store' });
      const map = new Map<string, string>();
      if (!res.ok) return map;
      const data = await res.json();
      const profiles: Record<string, { name?: string | null }> = data?.profiles ?? {};
      for (const [addr, profile] of Object.entries(profiles)) {
        const name = profile?.name?.trim();
        if (name) map.set(addr.toLowerCase(), name);
      }
      return map;
    },
  });
}
