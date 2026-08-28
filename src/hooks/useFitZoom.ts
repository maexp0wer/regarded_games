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
         so reusing it directly would compound on every resize. offsetHeight,
         not scrollHeight: a card parked off-screen by CardThrow (pre-first-
         activation) sits under a large translateX + rotateY, and browsers
         fold a transformed descendant's post-transform bounds into an
         ancestor's *scrollable overflow* — inflating scrollHeight by however
         far the card is thrown, even though it never actually renders there.
         offsetHeight reflects only the normal-flow border-box, immune to
         that transform-driven overflow. */
      const prevZoom = content.style.zoom;
      content.style.zoom = '1';
      const natural = content.offsetHeight;
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
