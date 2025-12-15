'use client';

import { useEffect } from 'react';

export default function AutoScroll({ slug }: { slug: string }) {
  useEffect(() => {
    // Wait a tick for rendering to finish
    const timer = setTimeout(() => {
      const element = document.getElementById(slug);
      if (element) {
        // Scroll into view nicely
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}