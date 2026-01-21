// src/hooks/useDocNavigation.ts
'use client';

export const useDocNavigation = () => {
  const navigateToDocs = (docSlug: string, sectionId?: string, openInNewTab: boolean = true) => {
    
    const mainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';

    const docsBaseUrl = mainUrl.replace("://", "://docs.");

    // 3. Construct the absolute URL
    // Ensure we don't end up with double slashes if docSlug starts with one
    const cleanSlug = docSlug.startsWith('/') ? docSlug.slice(1) : docSlug;
    
    let url = `${docsBaseUrl}/${cleanSlug}`;

    if (sectionId) {
      url += `#${sectionId}`;
    }

    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // 4. Use window.location.href for subdomain navigation
      // (Next.js router is for same-domain client-side transitions)
      window.location.href = url;
    }
  };

  return navigateToDocs;
};