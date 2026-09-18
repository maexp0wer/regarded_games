// src/components/DeckChevron.tsx
import { motion, useReducedMotion } from 'framer-motion';

/* ---- Landing deck chevrons ----
   The deck swallows the wheel and never scrolls the document, so it has no
   scrollbar: nothing on a slide says the deck continues. These are that
   affordance — down at the foot of the stage, up at its head — and they are the
   deck's only focusable, labelled controls, so keyboard and screen-reader users
   have a way through it that isn't a wheel gesture.

   Deliberately plain against DeckRail's printed margin: one ornamental element
   per view is the budget, the rail spends it, and these stay quiet chrome in the
   muted ink. Both click through `step()`, so a press plays exactly the
   transition a wheel tick plays.

   The down chevron bobs until the reader takes their first step, then settles to
   a dimmer rest — the hint has landed by then, and it has the whole visit left
   to sit there. No bob under prefers-reduced-motion. */

const BOB = { y: [0, 5, 0] };
const BOB_TRANSITION = { duration: 2.1, repeat: Infinity, ease: 'easeInOut' as const };

export default function DeckChevron({
  dir,
  onClick,
  settled = false,
  className = '',
}: {
  dir: 'up' | 'down';
  onClick: () => void;
  /** True once the reader has stepped the deck at least once. */
  settled?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const down = dir === 'down';
  const bob = down && !settled && !reduceMotion;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={down ? 'Next section' : 'Previous section'}
      /* `bob` reads prefers-reduced-motion, which the server can't know: without
         this the server and the client's first render can disagree on the
         initial transform and trip hydration. Mount at rest, animate after —
         the same `initial={false}` every motion element on the landing uses. */
      initial={false}
      animate={bob ? BOB : { y: 0 }}
      transition={bob ? BOB_TRANSITION : { duration: 0.3 }}
      className={`cursor-pointer text-text2 transition-opacity duration-500 hover:text-text hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text2 motion-reduce:transition-none ${
        settled ? 'opacity-45' : 'opacity-100'
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={down ? 32 : 24}
        height={down ? 32 : 24}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={down ? undefined : 'rotate-180'}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </motion.button>
  );
}
