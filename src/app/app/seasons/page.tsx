'use client';

import { SeasonsList } from '../_components/SeasonsList'; 
import { useTheme } from '@/context/ThemeContext';



export default function Navbar() {
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  const { darkMode } = useTheme();
  return (
    <div>
    <nav className="flex justify-between items-center p-4 ">
      


      
      </nav>

      <div>
      <SeasonsList />
      </div>
    </div>
  );
}