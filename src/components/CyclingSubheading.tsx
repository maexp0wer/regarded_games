import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const words = [
  'insider knowledge',
  'market manipulation',
  'centralization',
  'front running',
  'dark pools',
  'wash trading',
  'payment for order flow',
];

// Automatically find the longest word to set the container width
const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b));

export default function CyclingSubheading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

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