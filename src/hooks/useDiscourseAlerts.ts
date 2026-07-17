import { useQuery } from '@tanstack/react-query';
import type { PendingPoll, ReplyGroup } from '@/app/api/discourse/alerts/route';

export type { PendingPoll, ReplyGroup };

export type DiscourseAlerts = {
  pendingPolls: PendingPoll[];
  replies: ReplyGroup[];
};

export function useDiscourseAlerts(walletAddress: string | undefined) {
  return useQuery<DiscourseAlerts | null>({
    queryKey: ['discourse-alerts', walletAddress?.toLowerCase()],
    queryFn: async () => {
      // Identity is read from the verified session cookie server-side; the wallet
      // arg only drives the query key / enabled guard here.
      const res = await fetch('/api/discourse/alerts');
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    },
    enabled: !!walletAddress,
    refetchInterval: 30_000,
  });
}
