import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import styles from './CyclingSubheading.module.css';

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
    <span className={styles.wrapper}>
      <span>where capital fights coordination in a market free from</span>
      {/*
        inline-grid + place-items-center keeps even the shorter words
        perfectly centered in the reserved space.
      */}
      <span className={styles.swap}>
        {/* The Ghost: reserves the max width, invisible to eye and screen readers */}
        <span className={styles.ghost} aria-hidden="true">
          {longestWord}
        </span>

        <AnimatePresence mode="wait">
          <motion.span
            key={words[index]}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={styles.word}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
