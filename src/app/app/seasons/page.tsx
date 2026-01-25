'use client';

import { SeasonsList } from '../_components/SeasonsList'; 
import { useTheme } from '@/context/ThemeContext';



export default function Navbar() {
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  const { darkMode } = useTheme();
  return (
    <div className='items-center justify-center'>
    
      <div>

      <SeasonsList />

      </div>
    </div>
  );
}