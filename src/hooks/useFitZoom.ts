'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shrinks (never grows) `contentRef` via CSS `zoom` so it never exceeds the
 * available height of `boundsRef`. `zoom` — not `transform: scale` — is a
 * genuine layout resize: descendants' offsetTop/getBoundingClientRect
 * already reflect the shrunk size, so anything measuring them (e.g. the
 * character-flight overlay's settledRect in src/app/main/page.tsx) keeps
 * working unmodified.
 */
export function useFitZoom<
  Content extends HTMLElement = HTMLDivElement,
  Bounds extends HTMLElement = HTMLDivElement,
>() {
  const contentRef = useRef<Content>(null);
  const boundsRef = useRef<Bounds>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const measure = () => {
      const content = contentRef.current;
      const bounds = boundsRef.current;
      if (!content || !bounds) return;
      /* Read the UNZOOMED natural height (zoom out, measure, restore) —
         scrollHeight at the current zoom already bakes in the last factor,
         so reusing it directly would compound on every resize. */
      const prevZoom = content.style.zoom;
      content.style.zoom = '1';
      const natural = content.scrollHeight;
      content.style.zoom = prevZoom;
      const available = bounds.clientHeight;
      if (natural <= 0 || available <= 0) return;
      setZoom(Math.min(1, available / natural));
    };

    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    if (boundsRef.current) ro.observe(boundsRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  return { contentRef, boundsRef, zoom };
}
