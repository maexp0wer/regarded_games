'use client';

import { SeasonsList } from '../_components/SeasonsList'; 
import { useTheme } from '@/context/ThemeContext';



export default function SeasonList() {
    return (
    <main className="w-full px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <SeasonsList />
      </div>
    </main>
  );
}