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
  subQuests: QuestSubQuest[];
}

export interface QuestsData {
  mainQuests: QuestMainQuest[];
  totalPoints: number;
  tgeConversionRate: string;
  captchaVerified: boolean;
}

export function useQuests(address: string | undefined) {
  return useQuery<QuestsData>({
    queryKey: ['quests', address?.toLowerCase() ?? null],
    queryFn: async () => {
      // No address → fetch the anonymous catalogue (nothing completed) so the
      // board can render before a wallet is connected.
      const res = await fetch(address ? `/api/quests?address=${address}` : '/api/quests');
      if (!res.ok) throw new Error('Failed to load quests');
      const json = await res.json();
      return json.data as QuestsData;
    },
    refetchInterval: 15000,
  });
}
