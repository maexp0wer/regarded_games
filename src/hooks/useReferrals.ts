'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReferralTier } from '@/utils/quests';

export interface ReferralEntry {
  address: string;
  points: number;
  qualified: boolean;
}

export interface ReferralsData {
  referrals: ReferralEntry[];
  qualifiedCount: number;
  totalReferralPoints: number;
  threshold: number;
  tiers: ReferralTier[];
}

export function useReferrals(address: string | undefined, enabled = true) {
  return useQuery<ReferralsData>({
    queryKey: ['referrals', address?.toLowerCase() ?? null],
    queryFn: async () => {
      const res = await fetch(`/api/quests/referrals?address=${address}`);
      if (!res.ok) throw new Error('Failed to load referrals');
      const json = await res.json();
      return json.data as ReferralsData;
    },
    enabled: enabled && !!address,
    refetchInterval: 15000,
  });
}
