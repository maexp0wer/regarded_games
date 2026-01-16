// src/hooks/useDocNavigation.ts
'use client';

import { useRouter } from 'next/navigation';

export const useDocNavigation = () => {
  const router = useRouter(); 

  // --- CRITICAL CHANGE: Default value for openInNewTab is now TRUE ---
  const navigateToDocs = (docSlug: string, sectionId?: string, openInNewTab: boolean = true) => {
    let url = `/docs/${docSlug}`;
    if (sectionId) {
      // NOTE: Assume the caller is passing the correctly slugified sectionId
      url += `#${sectionId}`;
    }

    if (openInNewTab) {
      // Use window.open for opening a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Use router.push for internal navigation
      router.push(url); 
    }
  };

  return navigateToDocs; // Return the navigation function
};