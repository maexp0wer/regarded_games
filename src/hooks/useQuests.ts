'use client';

import { useQuery } from '@tanstack/react-query';

export interface QuestSubQuest {
  id: string;
  title: string;
  points: number;
  type: 'galxe' | 'internal';
  isCompleted: boolean;
  actionUrl?: string;
  note?: string;
}

export interface QuestMainQuest {
  id: string;
  title: string;
  description: string;
  subQuests: QuestSubQuest[];
}

export interface QuestsData {
  mainQuests: QuestMainQuest[];
  totalPoints: number;
  tgeConversionRate: string;
}

export function useQuests(address: string | undefined) {
  return useQuery<QuestsData>({
    queryKey: ['quests', address?.toLowerCase()],
    queryFn: async () => {
      const res = await fetch(`/api/quests?address=${address}`);
      if (!res.ok) throw new Error('Failed to load quests');
      const json = await res.json();
      return json.data as QuestsData;
    },
    enabled: !!address,
    refetchInterval: 15000,
  });
}
