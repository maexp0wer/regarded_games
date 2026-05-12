'use client';

import { SeasonsList } from '../_components/SeasonsList'; 
import { useTheme } from '@/context/ThemeContext';



export default function SeasonList() {
    return (
    <main className="w-full py-8">
      <SeasonsList />
    </main>
  );
}