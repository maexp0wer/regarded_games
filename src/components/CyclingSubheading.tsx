import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const entries: [string, number][] = [
  ['insider knowledge',       3500],
  ['market manipulation',     3500],
  ['centralization',          1200],
  ['front running',           1000],
  ['dark pools',               800],
  ['wash trading',             700],
  ['payment for order flow',   600],
];

const words    = entries.map(([w]) => w);
const durations = entries.map(([, d]) => d);

// Automatically find the longest word to set the container width
const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b));

export default function CyclingSubheading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, durations[index]);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <span className="flex flex-col items-center text-center">
      <span>where capital fights coordination in a market free from</span>
      {/* 
        Using inline-grid + place-items-center ensures that even 
        shorter words are perfectly centered in the reserved space.
      */}
      <span className="relative inline-grid place-items-center">
        {/* The Ghost: Sets the max width, invisible to the eye and screen readers */}
        <span className="invisible row-start-1 col-start-1 px-1" aria-hidden="true">
          {longestWord}
        </span>
        
        <AnimatePresence mode="wait">
          <motion.span
            key={words[index]}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="row-start-1 col-start-1 whitespace-nowrap"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}