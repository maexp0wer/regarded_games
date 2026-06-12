// src/components/CardDeck.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CardDeckProps {
  /** Which card is on top. Cards below this index are dealt off; above it peek behind. */
  activeIndex: number;
  /** Explicit deck height — the cards are absolutely stacked, so the container can't size itself. */
  height: string;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Stacked "playing card" deck for small screens. The active card sits on top with
 * upcoming cards peeking out behind it; dealt cards flick off to the side.
 * Decrementing activeIndex deals them back on (fully reversible).
 */
export default function CardDeck({ activeIndex, height, maxWidth = '400px', children }: CardDeckProps) {
  const cards = React.Children.toArray(children);

  return (
    <div className="relative w-full mx-auto" style={{ height, maxWidth }}>
      {cards.map((card, i) => {
        const rel = i - activeIndex;
        const dealt = rel < 0;
        return (
          <motion.div
            key={i}
            className="absolute inset-x-0 top-0"
            initial={false}
            animate={
              dealt
                ? { x: '-115%', y: 60, rotate: -18, opacity: 0, scale: 1 }
                : { x: 0, y: rel * -14, rotate: 0, opacity: 1, scale: 1 - rel * 0.05 }
            }
            transition={{ duration: 0.55, ease: [0.45, 0, 0.25, 1] }}
            style={{
              // Dealt cards fly over the rising card; waiting cards stack behind the active one.
              zIndex: dealt ? cards.length + 1 : cards.length - rel,
              pointerEvents: rel === 0 ? 'auto' : 'none',
              transformOrigin: 'top center',
            }}
          >
            {card}
          </motion.div>
        );
      })}
    </div>
  );
}
