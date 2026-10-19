// src/components/FoilText.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';

/* ---- Foil text ----
   Display type that turns holographic under the pointer, the way the deck
   back's frame and the landing's stake note do: at rest it is plain print (its
   own className styles it), and on hover the words come up in the foil
   spectrum in a pool round the cursor, the bands sliding as the pointer crosses
   them. With reduced motion the foil holds its rest position but still shows.
   Put it inside a [data-foil-host] and the foil lights, and follows the
   pointer, anywhere on the host, not just over the words.

   The foil copy is the .foil-text ::after (globals.css), printed from
   `data-text` rather than a second copy of the words in the markup, so a
   heading that uses it still reads (and indexes) once. trackFoil writes the
   position variables straight onto the element; React never sets them after
   mount, so a re-render can't reset them. */
export default function FoilText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return trackFoil(element.closest<HTMLElement>('[data-foil-host]') ?? element, element);
  }, []);

  return (
    <span ref={ref} data-text={text} className={`foil-text ${className}`} style={FOIL_REST}>
      {text}
    </span>
  );
}
