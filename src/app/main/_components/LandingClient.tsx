'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { motion, LayoutGroup, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import '@/app/globals.css';
import { useTheme } from '@/context/ThemeContext';
import { MoonIcon, SunIcon } from '@/components/icons/svg';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';
import { useDocNavigation } from '@/hooks/useDocNavigation';
import Rulebook, { RULEBOOK_PAGES, RULEBOOK_PAGES_BELOW_LG } from '@/components/Rulebook';
import FitToViewport from '@/components/FitToViewport';
import CyclingSubheading from '@/components/CyclingSubheading';
import AnimatedAuctionChart from '@/components/AnimatedAuctionChart';
import AnimatedTradeFlows from '@/components/AnimatedTradeFlows';
import DaoVote from '@/components/DaoVote';
import AirdropQuestBoard from '@/components/AirdropQuestBoard';
import AnimatedCapitalAuction from '@/components/AnimatedCapitalAuction';
import YieldDistribution from '@/components/YieldDistribution';
import RoundTable from '@/components/RoundTable';
import HeroCard from '@/components/HeroCard';
import BanknoteButton from '@/components/BanknoteButton';
import BanknoteGround from '@/components/BanknoteGround';
import AnimatedGiniCard from '@/components/AnimatedGiniCard';
import CardDeck from '@/components/CardDeck';
import ComingSoonModal from '@/components/ComingSoonModal';
import DeckChevron from '@/components/DeckChevron';
import DeckRail from '@/components/DeckRail';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import type { LaunchState } from '@/config/stage';
import { docsOrigin } from '@/utils/appUrls';
import { resolveAppTarget, resolveDiscourseTarget, resolveMainTarget, type CardTarget, type CardHost } from '@/utils/cardLinks';


/* Section scroll-stops in page order. `cards` > 1 marks sections that collapse
   into a one-card-at-a-time deck below lg; the wheel/touch handler deals through
   the deck before releasing to the neighboring section. */
/* `cards`: below-lg deck stops, dealt one per scroll tick. `pages`: rulebook
   page flips inside the section, applied at every breakpoint. `pagesBelowLg`:
   overrides `pages` below lg, where the single-page mobile rulebook needs one
   stop more than the desktop spread (Campaign Sequence runs across two mobile
   pages — see the mobile leaf stack in src/components/Rulebook.tsx). Both
   counts come from the Rulebook itself, and their LAST stop is the book's back
   cover — scrolled on from the final content page rather than clicked. */
/* `label` names the section in the deck rail — on hover and to assistive tech. */
const SECTIONS: { id: string; label: string; cards: number; pages?: number; pagesBelowLg?: number }[] = [
  { id: 'hero', label: 'Class War', cards: 0 },
  { id: 'sectionHero', label: 'Choose Your Hero', cards: 2 },
  { id: 'sectionPlay', label: 'Play the Game', cards: 3 },
  { id: 'sectionOwnMarket', label: 'Own the Project', cards: 3 },
  { id: 'sectionSecureYourStake', label: 'Secure Your Stake', cards: 2 },
  { id: 'sectionDistribution', label: 'The Rulebook', cards: 0, pages: RULEBOOK_PAGES, pagesBelowLg: RULEBOOK_PAGES_BELOW_LG },
];

/* Intra-section stops a tick consumes before leaving the section: below-lg card
   decks deal one card per tick; rulebook `pages` flip at every breakpoint.
   Shared by the scroll handler (off a ref) and the rail (off render state). */
function sectionStops(cfg: (typeof SECTIONS)[number] | undefined, belowLg: boolean) {
  if (!cfg) return 0;
  if (cfg.pages && cfg.pages > 1) return belowLg ? (cfg.pagesBelowLg ?? cfg.pages) : cfg.pages;
  return belowLg ? cfg.cards : 0;
}

/* The Gini card ("Enforce Ideology") is the characters' final home. */
const GINI_SECTION_ID = 'sectionPlay';
const GINI_CARD_INDEX = 2;

/* Launch state arrives as a prop from the server wrapper (src/app/main/page.tsx),
   which reads the same server-only APP_LIVE / TESTNET_APP_LIVE flags middleware
   uses as the real gate. There is deliberately no NEXT_PUBLIC_ mirror to drift
   out of sync with it. */

/* Docs subdomain base, derived the same way useDocNavigation + docusaurus.config
   build it: the main domain with a `docs.` prefix (e.g. http://docs.localhost:3000
   locally, https://docs.<domain> in prod). The HeroCard info buttons render as
   raw <a href> on the main app domain, so a bare "intro#..." would resolve against
   the app domain and 404 — these must be absolute docs URLs. */
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
const DOCS_URL = docsOrigin(MAIN_DOMAIN);

/* Copy for the "not open yet" modal, one per destination that can be gated.
   Each says what is missing and what the visitor can do instead, rather than
   just repeating "coming soon". */
type SoonCopy = { title: string; body: string };

const SOON: Record<'game' | 'ico' | 'quests' | 'governance' | 'forum' | 'treasury', SoonCopy> = {
  game: {
    title: 'The Arena Is Closed',
    body:
      'Season 01 has not opened yet. The full ruleset is already published — ' +
      'flip any card for its doctrine, or read the docs to arrive prepared.',
  },
  ico: {
    title: 'Capital Auction Pending',
    body:
      'The Regarded Token auction has not started. Everyone buys in at one ' +
      'market-clearing price when it does — there is no early access to miss.',
  },
  quests: {
    title: 'Testnet Not Open',
    body:
      'The testnet campaign has not started yet. Quest points earned there ' +
      'convert to $RGD at TGE, so nothing is being missed while it is closed.',
  },
  governance: {
    title: 'Governance Opens With the Forum',
    body:
      'The DAO governance category lives on the community forum, which is ' +
      'still being prepared. Proposals and votes move there the day it opens.',
  },
  treasury: {
    title: 'Treasury Not Funded Yet',
    body:
      'The treasury fills from the Capital Auction and the first season, so ' +
      'there is nothing under management to report yet. How every cent is ' +
      'allocated is already written down in the docs.',
  },
  forum: {
    title: 'Forum Coming Soon',
    body:
      'The community forum is being prepared. It will be the home for ' +
      'governance, class coordination, and everything that is not on-chain.',
  },
};

/* Where Carlo & Regardo currently live: giant ghosts behind the headline, inside
   their hero cards, or docked on the Gini card. Exactly one home mounts each
   layoutId element at a time — framer-motion flies the character between homes. */
type CharacterHome = 'headline' | 'cards' | 'gini';

const HOME_OPACITY: Record<CharacterHome, number> = {
  headline: 0.07,
  cards: 1,
  gini: 1,
};

/* ---- Card flight ----
   Each section's cards know four poses, paired by scroll direction so every
   transition plays backwards when the user reverses:

   - enter-down: thrown in from the top right, fanning out to the grid slots.
   - exit-down:  the grid sweeps onto the leftmost slot in one continuous
                 motion (the rightmost card gliding over its neighbors), the
                 stack folds over its left edge past 90° so the card BACK
                 shows at an angle, then slides off-screen left.
   - enter-up:   exit-down played exactly backwards (slide in folded, unfold,
                 fan back out).
   - exit-up:    enter-down played backwards (fly out to the top right).

   The below-lg deck (no index/total) is already a single stack, so it skips
   the stacking phase and just folds + slides. */
const FOLD_DEG = -110; // a bit past 90° — the back stays visible at an angle
const STACK_S = 0.55; // continuous sweep onto the left slot
const FOLD_S = 0.65; // fold over the left edge
const SLIDE_S = 0.7; // slide the folded stack off-screen

type Ease = 'easeIn' | 'easeOut' | 'easeInOut' | 'linear';
const MIRROR_EASE: Record<Ease, Ease> = {
  easeIn: 'easeOut',
  easeOut: 'easeIn',
  easeInOut: 'easeInOut',
  linear: 'linear',
};

/* One shared timeline drives both motion layers (outer x, inner rotateY) so
   the stack → fold → slide phases stay in sync via identical `times`. */
function exitTimeline(index: number, total: number, spacing: number, screenW: number) {
  const stackDur = total > 1 ? STACK_S : 0;
  const dur = stackDur + FOLD_S + SLIDE_S;
  const stackX = -index * spacing;
  const xs: (number | null)[] = [];
  const rys: (number | null)[] = [];
  const times: number[] = [];
  const eases: Ease[] = [];
  xs.push(0);
  rys.push(0);
  times.push(0);
  if (stackDur > 0) {
    /* Stack phase: one uninterrupted sweep per card onto the left slot —
       cards further right launch a beat earlier, everyone lands together. */
    const start = index > 0 ? (total - 1 - index) * 0.3 * stackDur : 0;
    if (start > 0) {
      xs.push(0);
      rys.push(0);
      times.push(start / dur);
      eases.push('linear');
    }
    xs.push(stackX);
    rys.push(0);
    times.push(stackDur / dur);
    eases.push('easeInOut');
  }
  /* Fold + slide overlap: the fold begins as soon as stacking ends and
     continues into the slide — so rotation and lateral movement happen
     together for a single fluid motion. The card reaches FOLD_DEG at the
     midpoint of the slide, then holds that angle for the rest of the exit. */
  const foldMidT = stackDur + FOLD_S;           // fold completes here
  const foldMidX = stackX - screenW * (FOLD_S / SLIDE_S) * 0.2; // slight drift during fold
  xs.push(foldMidX);
  rys.push(FOLD_DEG);
  times.push(foldMidT / dur);
  eases.push('easeInOut');
  // Slide remainder: still folded, accelerate the rest of the way off-screen.
  xs.push(stackX - screenW);
  rys.push(FOLD_DEG);
  times.push(1);
  eases.push('easeIn');
  return { xs, rys, times, eases, dur };
}

function CardThrow({
  active,
  dir = 1,
  index = 0,
  total = 1,
  spacing = 400,
  cardMaxWidth,
  enterDelay = 0.5,
  className,
  children,
}: {
  active: boolean;
  /** Scroll direction: 1 = scrolling down, -1 = scrolling up. */
  dir?: 1 | -1;
  index?: number;
  total?: number;
  spacing?: number;
  /** The card's own max width — the fold hinge must sit on the card's left
      edge, not the (possibly wider) grid cell's. */
  cardMaxWidth?: string;
  /** Base delay before the enter-down throw fires, giving the previous
      section's cards time to slide out first. Set to 0 when entering from a
      section that has no outgoing cards to clear (e.g. the header → first
      card section). */
  enterDelay?: number;
  className?: string;
  children: ReactNode;
}) {
  /* The parked pose depends on which way the user scrolled PAST the section,
     frozen at deactivation — later `dir` flips (from scrolling between other
     sections) must not drag parked cards across the screen. */
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [prevActive, setPrevActive] = useState(active);
  /* Cards that mount already-inactive (every off-screen section on first load)
     must NOT play an exit: the exit keyframes start from the on-screen slot, so
     animating one flickers the parked cards across the viewport before they
     leave. Snap straight to the parked pose until the section is first shown. */
  const [hasBeenActive, setHasBeenActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setHasBeenActive(true);
    if (!active) setExitDir(dir);
  }

  /* Viewport width, read only after hydration — the parked-card transforms
     below are inline styles, so a render-time `window` read would disagree
     with the server HTML. */
  const screenW = useViewportWidth();
  // Offset from this card's grid slot to the shared throw launch point.
  const splitX = ((total - 1) / 2 - index) * spacing;

  let throwAnim: TargetAndTransition;
  let foldAnim: TargetAndTransition;

  if (!active && !hasBeenActive) {
    // Never shown: jump to the final parked pose with no animation so nothing
    // sweeps across the screen on load. Matches exitDir's settled end state.
    if (exitDir === 1) {
      const t = exitTimeline(index, total, spacing, screenW);
      throwAnim = { x: t.xs[t.xs.length - 1] as number, y: 0, rotate: 0, opacity: 1, transition: { duration: 0 } };
      foldAnim = { rotateY: FOLD_DEG, transition: { duration: 0 } };
    } else {
      throwAnim = { x: splitX + 520, y: -560, rotate: 70 + index * 8, opacity: 0, transition: { duration: 0 } };
      foldAnim = { rotateY: 0, transition: { duration: 0 } };
    }
  } else if (active && dir === 1) {
    // Enter-down: all cards share one launch point (slot offset + throw
    // offset) and diverge immediately — one continuous fan-out, no hold.
    throwAnim = {
      x: [splitX + 520, 0],
      y: [-560, 0],
      rotate: [70 + index * 8, 0],
      opacity: [0, 1],
      transition: {
        duration: 1.0,
        ease: 'easeOut',
        delay: enterDelay + index * 0.08,
        opacity: { duration: 0.35, delay: enterDelay + index * 0.08 }
      },
    };
    foldAnim = { rotateY: 0, transition: { duration: 0 } };
  } else if (active) {
    // Enter-up: the exit-down timeline reversed. Leading nulls pick up from
    // the current pose so an interrupted exit continues smoothly.
    const t = exitTimeline(index, total, spacing, screenW);
    const n = t.times.length;
    const xs = [...t.xs].reverse();
    const rys = [...t.rys].reverse();
    xs[0] = null;
    rys[0] = null;
    const times = t.times.map((_, i) => 1 - t.times[n - 1 - i]);
    const eases = [...t.eases].reverse().map((e) => MIRROR_EASE[e]);
    throwAnim = {
      x: xs,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: { duration: t.dur, times, ease: eases },
    };
    foldAnim = { rotateY: rys, transition: { duration: t.dur, times, ease: eases } };
  } else if (exitDir === 1) {
    // Exit-down: stack left → fold → slide out.
    const t = exitTimeline(index, total, spacing, screenW);
    t.xs[0] = null;
    t.rys[0] = null;
    throwAnim = {
      x: t.xs,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: { duration: t.dur, times: t.times, ease: t.eases },
    };
    foldAnim = { rotateY: t.rys, transition: { duration: t.dur, times: t.times, ease: t.eases } };
  } else {
    // Exit-up: reverse the throw — rightmost card leaves first.
    const delay = (total - 1 - index) * 0.08;
    throwAnim = {
      x: [null, splitX + 520],
      y: [null, -560],
      rotate: [null, 70 + index * 8],
      opacity: [null, 0],
      transition: { duration: 0.55, ease: 'easeIn', delay },
    };
    foldAnim = { rotateY: 0, transition: { duration: 0.2 } };
  }

  return (
    <motion.div
      initial={false}
      animate={throwAnim}
      /* Higher index on top so the rightmost card visibly glides OVER its
         neighbors while the stack forms. position: relative because z-index
         is ignored on static elements — some cards sit in wrapper divs and
         are not grid items. */
      style={{ position: 'relative', pointerEvents: active ? 'auto' : 'none', zIndex: index }}
      className={className}
    >
      <motion.div
        initial={false}
        animate={foldAnim}
        className="relative w-full mx-auto"
        style={{
          maxWidth: cardMaxWidth,
          transformPerspective: 1200,
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
        }}
      >
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {children}
        </div>
        {/* Card back, revealed once the fold passes 90°. One generic design for
            every card — at the fold angle it reads as the card chassis. */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-md p-2.5 pointer-events-none"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundColor: '#070709',
          }}
        >
          <div
            className="w-full h-full rounded-md border flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: '#0D0B14', borderColor: '#251F3D' }}
          >
            <div
              className="w-28 h-28 rounded-full border border-dashed opacity-25"
              style={{ borderColor: '#9E97BD' }}
            />
            <div
              className="flex flex-col items-center gap-1 text-[10px] tracking-[0.3em] font-bold uppercase opacity-50 text-center"
              style={{ fontFamily: 'var(--font-mono)', color: '#9E97BD' }}
            >
              <span>REGARDED</span>
              <span>GAMES</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* On-card icon metrics — the always-mounted sizer divs reproduce these boxes
   so overlay flights can measure launch and landing spots while the real
   icons are unmounted. */
const CARD_ICON_H = 250;
const GINI_ICON_H = 80; // h-20 docks on the Gini card
const REGARDO_ASPECT = 491.52783 / 788.49512;
/* Regardo wears a hat (~15% of his total height); Carlo is bare-headed and
   reaches the top of his own frame, so at equal render height his body reads
   larger. We pad empty space above Carlo equal to Regardo's hat so the two
   bodies match: Carlo's content (781.15955) becomes the 85% body of a taller
   frame, extended upward by ~138 units. Every Carlo render uses CARLO_VIEWBOX
   (and the matching CARLO_ASPECT) so the headline→cards→gini flights stay in
   register. */
const CARLO_VIEWBOX = '0 -137.85 579.04352 919.01';
const CARLO_ASPECT = 579.04352 / 919.01;

type FlightRect = { x: number; y: number; w: number; h: number };

/* Nearest ancestor zoom factor affecting `el`'s rendering (1 if none). Walks
   real `parentElement` rather than `offsetParent`, since FitToViewport's
   zoomed wrapper is `position: static` and offsetParent silently skips it. */
function ancestorZoom(el: HTMLElement): { zoom: number; zoomEl: HTMLElement | null } {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const z = parseFloat(getComputedStyle(p).zoom);
    if (!Number.isNaN(z) && z !== 1) return { zoom: z, zoomEl: p };
  }
  return { zoom: 1, zoomEl: null };
}

/* Transform-free document rect: offsetLeft/offsetTop ignore CSS transforms,
   so this reads the rect an element will occupy once its animated ancestors
   settle at transform identity — i.e. the card's landing pose, measurable
   while the card is still mid-throw.

   Desktop card sections are now wrapped in FitToViewport (see useFitZoom),
   which shrinks them via CSS `zoom`. That zoomed wrapper (contentRef) is
   `position: static`, so `offsetParent` walks straight past it — every
   offsetLeft/offsetTop reported by a node still *inside* the zoomed subtree
   comes out in unscaled local units, not real page pixels. Detect the
   nearest zoomed ancestor and scale each contribution while `node` is still
   contained within it. */
function settledRect(el: HTMLElement): FlightRect {
  const { zoom, zoomEl } = ancestorZoom(el);
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    const scale = zoomEl && zoomEl.contains(node) && node !== zoomEl ? zoom : 1;
    x += node.offsetLeft * scale;
    y += node.offsetTop * scale;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth * zoom, h: el.offsetHeight * zoom };
}

function TravelIcon({
  id,
  opacity = 1,
  fromOpacity,
  duration = 0.8,
  children,
}: { id: string; opacity?: number; fromOpacity?: number; duration?: number; children: ReactNode }) {
  return (
    <motion.div
      layoutId={id}
      /* Mount at the previous home's opacity so the character stays visible for
         the whole flight instead of fading in from nothing at the destination. */
      initial={{ opacity: fromOpacity ?? opacity }}
      animate={{ opacity }}
      transition={{
        layout: { duration, ease: [0.45, 0, 0.25, 1] },
        opacity: { duration, ease: [0.45, 0, 0.25, 1] },
      }}
    >
      {children}
    </motion.div>
  );
}

/* Knocks the security-print ground (BanknoteGround) out from behind a hero
   ghost. The ghosts are translucent (HOME_OPACITY.headline), so without this
   the wave pattern runs straight through them. The child is a second render of
   the ghost's art, sized identically and sitting opaque behind it, flood-filled
   with the page colour by GHOST_KNOCKOUT_FILTER — so it covers exactly the
   character's silhouette and nothing around it.

   On a return flight the ghost glides in from the cards; the knockout waits for
   the second half of that flight before fading in, instead of cutting a
   silhouette-shaped hole in the pattern ahead of the arriving character. */
const GHOST_KNOCKOUT_FILTER = 'ghost-knockout';

function GhostKnockout({ arriving, children }: { arriving: boolean; children: ReactNode }) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute top-0 left-0 pointer-events-none"
      style={{ filter: `url(#${GHOST_KNOCKOUT_FILTER})` }}
      initial={{ opacity: arriving ? 0 : 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: arriving ? 0.4 : 0 }}
    >
      {children}
    </motion.div>
  );
}

export function LandingClient({ launch }: { launch: LaunchState }) {
  /* Which "not open yet" notice is showing, if any. */
  const [comingSoon, setComingSoon] = useState<SoonCopy | null>(null);

  const { darkMode, toggleTheme } = useTheme();
  const navigateToDocs = useDocNavigation();

  const breakpoint = useBreakpoint();
  const belowLg = breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md';

  const [regardoFlipped, setRegardoFlipped] = useState(false);
  const [carloFlipped, setCarloFlipped] = useState(false);

  const [action1Flipped , setAction1Flipped] = useState(false);
  const [action2Flipped , setAction2Flipped] = useState(false);
  const [action3Flipped , setAction3Flipped] = useState(false);

  const [action1Hovered, setaction1Hovered] = useState(false);
  const [action2Hovered, setaction2Hovered] = useState(false);
  const [action3Hovered, setaction3Hovered] = useState(false);

  const [own1Flipped , setOwn1Flipped] = useState(false);
  const [own2Flipped , setOwn2Flipped] = useState(false);
  const [own3Flipped , setOwn3Flipped] = useState(false);
  const [own2Hovered, setOwn2Hovered] = useState(false);
  const [own3Hovered, setOwn3Hovered] = useState(false);

  const [stake1Flipped, setStake1Flipped] = useState(false);
  const [stake2Flipped, setStake2Flipped] = useState(false);

  const [stake1Hovered, setStake1Hovered] = useState(false);

  /* The page is a fixed-viewport slide deck — there is no document scrolling.
     Wheel / touch / key ticks move this index and the transition plays out in
     place: the old section's cards exit while the new section's cards fly in,
     and the headers cross-fade. */
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  /* Per-section deck position (below lg). Mirrored into refs so the
     once-registered wheel/touch handlers always read the latest values. */
  const [cardIndices, setCardIndices] = useState<Record<string, number>>({});
  const cardIndicesRef = useRef(cardIndices);
  useEffect(() => { cardIndicesRef.current = cardIndices; }, [cardIndices]);
  const belowLgRef = useRef(belowLg);
  useEffect(() => { belowLgRef.current = belowLg; }, [belowLg]);

  /* The reader has moved the deck at least once, by any means. The down chevron
     stops bobbing and settles to a dimmer rest once this is true: past the first
     step the gesture is known, and the chevron has the rest of the visit to sit
     there. */
  const [hasStepped, setHasStepped] = useState(false);

  /* Jump target for the hero CTAs. A jump always enters the target from above
     (throwDir resolves to 1), so decks open at their first card.

     A jump crosses several sections at once, skipping every intermediate
     transition. Two bits of state are normally accumulated by passing through
     those sections and are relied on by the *scroll-up* flights that play
     afterwards:
       1. throwDir / prevSectionIdx — resolved during render, so a jump that
          moves the index forward already yields throwDir === 1 (enter from
          above); nothing to seed there.
       2. characterHome + its history refs — the traveling-character effect only
          knows the IMMEDIATE previous home, so a jump straight from 'headline'
          to a past-gini target lands in the effect's `else` (instant snap) with
          prevTarget='headline'. That leaves the gini dock never established as a
          *settled* home, so the first scroll-up into Choose Your Hero runs its
          gini→cards reverse-descent flight from a home the characters only
          teleported into — the icons fly in from the wrong origin.
     Seed the character home to the jump target's settled home here (and align
     the history refs so no stale flight fires), making the post-jump state
     identical to having scrolled down: the subsequent scroll-up then plays the
     same, correct reverse flights whether the user scrolled or jumped. */
  const goToSection = (id: string) => {
    const targetIndex = SECTIONS.findIndex((s) => s.id === id);
    if (targetIndex < 0) return;
    setHasStepped(true);
    setCardIndices((prev) => ({ ...prev, [id]: 0 }));

    /* Resolve the target's settled character home the same way the render does
       (see the "Traveling character home" block), then snap directly to it and
       record it as the settled history so the [targetHome] effect no-ops on the
       arrival instead of flying a bogus headline→target flight. */
    const cardsIdxLocal = SECTIONS.findIndex((s) => s.id === 'sectionHero');
    const giniIdxLocal = SECTIONS.findIndex((s) => s.id === GINI_SECTION_ID);
    let jumpHome: CharacterHome = 'headline';
    if (targetIndex >= giniIdxLocal) {
      /* Mirror the render derivation: below-lg the characters only dock at gini
         once the Gini card is the top of its deck. A jump lands PAST gini (or,
         on desktop, always) so giniOnTop holds; only a same-index jump to
         sectionPlay itself could sit on an earlier deck card → 'cards'. */
      const giniOnTop =
        !belowLgRef.current ||
        targetIndex > giniIdxLocal ||
        (cardIndicesRef.current[GINI_SECTION_ID] ?? 0) === GINI_CARD_INDEX;
      jumpHome = giniOnTop ? 'gini' : 'cards';
    } else if (targetIndex >= cardsIdxLocal) {
      jumpHome = 'cards';
    }
    clearTimeout(flipTimerRef.current);
    clearTimeout(giniRetargetTimerRef.current);
    setCharOverlay(null);
    setCharacterHome(jumpHome);
    prevTargetRef.current = jumpHome;
    prevHomeRef.current = jumpHome;

    activeIdxRef.current = targetIndex;
    setActiveIdx(targetIndex);
  };

  /* Shared by the wheel/touch/keyboard handlers below AND the hero's "scroll to
     next section" affordance button, so a click plays exactly the same
     transition as an actual scroll tick — see the button's onClick. */
  const lockedRef = useRef(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const lock = useCallback((ms: number) => {
    lockedRef.current = true;
    clearTimeout(lockTimeoutRef.current);
    lockTimeoutRef.current = setTimeout(() => { lockedRef.current = false; }, ms);
  }, []);

  /* The scroll handler's view of `sectionStops`, off the ref so the
     once-registered wheel/touch listeners always read the live breakpoint. */
  const innerStops = useCallback(
    (cfg?: (typeof SECTIONS)[number]) => sectionStops(cfg, belowLgRef.current),
    [],
  );

  /* One tick = one stop: deal a card within the active deck if it has cards
     left in that direction, otherwise advance to the neighboring slide.
     Decks are entered at their near edge so dealing reverses symmetrically. */
  const step = useCallback((dir: 1 | -1) => {
    if (lockedRef.current) return;
    setHasStepped(true);

    const currentIndex = activeIdxRef.current;
    const currentCfg = SECTIONS[currentIndex];
    const currentStops = innerStops(currentCfg);
    if (currentStops > 1) {
      const idx = cardIndicesRef.current[currentCfg.id] ?? 0;
      const next = idx + dir;
      if (next >= 0 && next < currentStops) {
        setCardIndices((prev) => ({ ...prev, [currentCfg.id]: next }));
        lock(currentCfg.pages ? 1000 : 600);
        return;
      }
    }

    const targetIndex = currentIndex + dir;
    if (targetIndex < 0 || targetIndex >= SECTIONS.length) return;

    const targetCfg = SECTIONS[targetIndex];
    const targetStops = innerStops(targetCfg);
    if (targetStops > 1) {
      setCardIndices((prev) => ({
        ...prev,
        [targetCfg.id]: dir > 0 ? 0 : targetStops - 1,
      }));
    }

    lock(1000);
    activeIdxRef.current = targetIndex;
    setActiveIdx(targetIndex);
  }, [innerStops, lock]);

  useEffect(() => {
    /* A gesture belongs to a scrollable pane under the pointer only while that
       pane can still MOVE in the gesture's direction. Matching on the class
       alone (the old `.overflow-y-auto` check) exempted panes whose content
       fits and panes already at the end of their travel, so they silently
       swallowed the tick instead of flipping the page — the rulebook's Campaign
       Sequence and Links pages fit their page exactly, which left every stop
       past Distribution of Power inert. Dialogs stay exempt unconditionally.
       `dir`: 1 = the gesture scrolls content down, -1 = up. */
    const EDGE_SLACK = 1; // px tolerance for "already at the end"
    const isExemptTarget = (target: EventTarget | null, dir: 1 | -1) => {
      let el = target as HTMLElement | null;
      if (el?.closest?.('[role="dialog"]')) return true;
      while (el && el !== document.body) {
        const overflowY = getComputedStyle(el).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          const room = el.scrollHeight - el.clientHeight;
          const canMove = dir > 0
            ? el.scrollTop < room - EDGE_SLACK
            : el.scrollTop > EDGE_SLACK;
          if (room > EDGE_SLACK && canMove) return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaY) < 30) return;
      if (isExemptTarget(e.target, e.deltaY > 0 ? 1 : -1)) return;
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      /* Finger up (dy < 0) drags the content down, hence the inverted dir. */
      if (isExemptTarget(e.target, e.touches[0].clientY - touchStartY < 0 ? 1 : -1)) return;
      const dy = e.touches[0].clientY - touchStartY;
      const dx = e.touches[0].clientX - touchStartX;
      // Suppress native scrolling for vertical gestures — the deck/section snap owns them.
      if (Math.abs(dy) > Math.abs(dx)) e.preventDefault();
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (isExemptTarget(e.target, e.changedTouches[0].clientY - touchStartY < 0 ? 1 : -1)) return;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return;
      step(dy < 0 ? 1 : -1);
    };

    /* With no document scrolling, keyboard navigation must step the deck too. */
    const handleKeyDown = (e: KeyboardEvent) => {
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
      const up = e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!down && !up) return;
      if (isExemptTarget(e.target, down ? 1 : -1)) return;
      e.preventDefault();
      step(down ? 1 : -1);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(lockTimeoutRef.current);
    };
  }, [step]);

  /* ---- Traveling character home ----
     headline → hero cards → Gini docks, advancing with the active slide.
     Below lg the Gini card must also be on top of its deck before the
     characters dock there; past the Gini section they simply stay docked
     (offscreen), so stepping back up always reverses cleanly. */
  const effectiveSection = SECTIONS[activeIdx].id;
  const sectionIdx = activeIdx;
  const cardsIdx = SECTIONS.findIndex((s) => s.id === 'sectionHero');
  const giniIdx = SECTIONS.findIndex((s) => s.id === GINI_SECTION_ID);

  let targetHome: CharacterHome = 'headline';
  if (sectionIdx >= giniIdx) {
    const giniOnTop =
      !belowLg || sectionIdx > giniIdx || (cardIndices[GINI_SECTION_ID] ?? 0) === GINI_CARD_INDEX;
    targetHome = giniOnTop ? 'gini' : 'cards';
  } else if (sectionIdx >= cardsIdx) {
    targetHome = 'cards';
  }

  /* ---- Scroll-down descents: concurrent overlay flights ----
     A layoutId morph run WHILE the destination card is still flying in fights
     the throw's transform — the destination is measured mid-flight, so the
     icon flickers. Instead, free-flying copies of the characters tween onto
     the receiving card's SETTLED icon slots — measured transform-free via
     settledRect, so they aim at where the card WILL land while it is still
     moving — concurrently with the throw. Once the card has landed, the
     real slot icons mount exactly in place (duration 0) and the overlay
     unmounts. Three transitions fly this way: header ghosts → hero cards,
     hero cards → the Gini dock on "Enforce Your Ideology", and that dock
     back onto the hero cards when scrolling up. Every other home change
     keeps its immediate layoutId flight. */
  const [characterHome, setCharacterHome] = useState<CharacterHome>(targetHome);
  const [charOverlay, setCharOverlay] = useState<{
    regardo: { from: FlightRect; to: FlightRect };
    carlo: { from: FlightRect; to: FlightRect };
    duration: number;
    fromOpacity: number;
    /* Descent into Choose Your Hero only: render Carlo's flight beneath the
       card layer so he tucks behind the Regardo icon and the Regardo card his
       path crosses, instead of riding over them. The real on-card icon takes
       over at landing, so passing under the cards mid-flight is invisible at
       the end. */
    carloBehindCards?: boolean;
    /* Ambient zoom affecting the carloBehindCards overlay specifically — see
       the "carlo behind cards" render site's zoom-compensation comment.
       Unused (defaults to 1, a no-op) by every other flight, which renders
       through the top-level overlay outside any zoomed ancestor. */
    carloOverlayZoom?: number;
  } | null>(null);
  const ghostRegardoRef = useRef<HTMLDivElement>(null);
  const ghostCarloRef = useRef<HTMLDivElement>(null);
  const cardRegardoSlotRef = useRef<HTMLDivElement>(null);
  const cardCarloSlotRef = useRef<HTMLDivElement>(null);
  const giniRegardoSlotRef = useRef<HTMLDivElement>(null);
  const giniCarloSlotRef = useRef<HTMLDivElement>(null);
  const prevTargetRef = useRef<CharacterHome>(targetHome);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* headline→cards hands off on real animation completion (see
     headlineFlightComplete below) rather than a guessed timer — this token
     lets a completion callback from an interrupted/superseded flight
     recognize it's stale and no-op instead of firing a bogus handoff. */
  const headlineFlightTokenRef = useRef(0);
  const headlineFlightCompleteCountRef = useRef(0);
  /* Fires mid-descent to retarget the gini flight onto the now-settled dock's
     true viewport rect (see the cards→gini branch); cleared alongside flipTimer. */
  const giniRetargetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const prevTarget = prevTargetRef.current;
    prevTargetRef.current = targetHome;
    clearTimeout(flipTimerRef.current);
    clearTimeout(giniRetargetTimerRef.current);

    if (prevTarget === 'headline' && targetHome === 'cards') {
      const gR = ghostRegardoRef.current;
      const gC = ghostCarloRef.current;
      const dR = cardRegardoSlotRef.current;
      const dC = cardCarloSlotRef.current;
      const flightToken = ++headlineFlightTokenRef.current;
      headlineFlightCompleteCountRef.current = 0;
      if (gR && gC && dR && dC) {
        /* Ghosts are static (untransformed), so their live rect is exact. */
        const rectOf = (el: HTMLElement): FlightRect => {
          const r = el.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        };
        setCharOverlay({
          regardo: { from: rectOf(gR), to: settledRect(dR) },
          carlo: { from: rectOf(gC), to: settledRect(dC) },
          /* Hero-card throws fire with enterDelay 0 and land at ~1.0s. */
          duration: 1.0,
          fromOpacity: HOME_OPACITY.headline,
          carloBehindCards: true,
          /* dC sits inside sectionHero's zoomed FitToViewport subtree, and so
             does the carloBehindCards overlay itself (see that render site) —
             reuse the same ambient zoom detected for the destination. */
          carloOverlayZoom: ancestorZoom(dC).zoom,
        });
      }
      /* Hand off once BOTH flying copies report their own tween actually
         finished (see headlineFlightComplete / onAnimationComplete below),
         not a guessed timer — a fixed delay can't account for real-device
         frame-timing variance under concurrent card-throw animation load. */
      flipTimerRef.current = setTimeout(() => {
        if (headlineFlightTokenRef.current !== flightToken) return;
        setCharacterHome('cards');
        setCharOverlay(null);
      }, 2500);
    } else if (prevTarget === 'cards' && targetHome === 'gini' && !belowLgRef.current) {
      /* Hero cards rest at transform identity when this descent starts (their
         exit animates transforms only), so settledRect doubles as the live
         launch rect even though the exit has just begun. */
      const fR = cardRegardoSlotRef.current;
      const fC = cardCarloSlotRef.current;
      const dR = giniRegardoSlotRef.current;
      const dC = giniCarloSlotRef.current;
      if (fR && fC && dR && dC) {
        setCharOverlay({
          regardo: { from: settledRect(fR), to: settledRect(dR) },
          carlo: { from: settledRect(fC), to: settledRect(dC) },
          /* The Gini card is throw index 2 of 3: 0.5s enterDelay + 0.16s
             stagger + 1.0s flight ≈ 1.66s. */
          duration: 1.66,
          fromOpacity: 1,
        });
        /* settledRect sums per-level offsetLeft/offsetTop, which round to whole
           px at each ancestor — over the gauge-card chain that compounds to a
           ~2px constant error vs. the icon's true sub-pixel render, so the
           overlay lands ~2px off and the in-place handoff visibly pops. Once the
           primary flight has fully LANDED (~1.66s, velocity ≈ 0) and the gini
           card is settled (transform identity, scroll 0), re-read the dock's true
           viewport rect — matching the fixed-overlay coordinate space — and ease
           the small residual into the exact spot. Retargeting only after the
           primary stops avoids the velocity discontinuity (a visible bob) that
           re-aiming mid-flight caused; handoff waits for this correction. */
        giniRetargetTimerRef.current = setTimeout(() => {
          const liveR = dR.getBoundingClientRect();
          const liveC = dC.getBoundingClientRect();
          const rectOf = (r: DOMRect): FlightRect => ({ x: r.left, y: r.top, w: r.width, h: r.height });
          setCharOverlay((prev) =>
            prev
              ? { ...prev, duration: 0.25, regardo: { ...prev.regardo, to: rectOf(liveR) }, carlo: { ...prev.carlo, to: rectOf(liveC) } }
              : prev,
          );
        }, 1680);
        flipTimerRef.current = setTimeout(() => {
          setCharacterHome('gini');
          setCharOverlay(null);
        }, 1980);
      } else {
        setCharacterHome('gini');
      }
    } else if (prevTarget === 'gini' && targetHome === 'cards' && !belowLgRef.current) {
      /* Reverse descent (Play → Choose Your Hero): the Gini dock rests at
         identity when the ascent starts (the Play cards' exit-up animates
         transforms only), so settledRect is the live launch rect; the hero
         card slots give the pose their enter-up will settle back into. */
      const fR = giniRegardoSlotRef.current;
      const fC = giniCarloSlotRef.current;
      const dR = cardRegardoSlotRef.current;
      const dC = cardCarloSlotRef.current;
      if (fR && fC && dR && dC) {
        setCharOverlay({
          regardo: { from: settledRect(fR), to: settledRect(dR) },
          carlo: { from: settledRect(fC), to: settledRect(dC) },
          /* Hero cards enter-up plays the full reversed exit timeline:
             0.55s stack + 0.65s fold + 0.7s slide ≈ 1.9s. */
          duration: 1.9,
          fromOpacity: 1,
        });
        flipTimerRef.current = setTimeout(() => {
          setCharacterHome('cards');
          setCharOverlay(null);
        }, 1950);
      } else {
        setCharacterHome('cards');
      }
    } else {
      setCharOverlay(null);
      setCharacterHome(targetHome);
    }
    return () => {
      clearTimeout(flipTimerRef.current);
      clearTimeout(giniRetargetTimerRef.current);
    };
  }, [targetHome]);

  /* Previous home, read during the render where the home flips so each new
     TravelIcon can mount at the opacity the character just had. */
  const prevHomeRef = useRef<CharacterHome>(characterHome);
  useEffect(() => {
    prevHomeRef.current = characterHome;
  });
  const charFromOpacity = HOME_OPACITY[prevHomeRef.current];

  /* Entry direction for the card throws, resolved during render (not in an
     effect) so the same render that activates a section already animates from
     the correct origin. */
  const [prevSectionIdx, setPrevSectionIdx] = useState(sectionIdx);
  const [throwDir, setThrowDir] = useState<1 | -1>(1);
  if (sectionIdx !== prevSectionIdx) {
    setPrevSectionIdx(sectionIdx);
    if (sectionIdx >= 0 && prevSectionIdx >= 0) {
      setThrowDir(sectionIdx > prevSectionIdx ? 1 : -1);
    }
  }

  /* Per-slide active flags driving the card flights and header/content fades. */
  const heroActive = effectiveSection === 'hero';
  const heroCardsActive = effectiveSection === 'sectionHero';

  /* When an overlay flight hands off, the receiving slot's icons must mount
     exactly where the overlay stopped — already opaque, no second flight.
     All other home changes keep the layoutId morph. (Below lg the cards →
     gini descent doesn't fly an overlay, so the gini dock keeps its morph.) */
  const handedOffToCards =
    (characterHome === 'cards' && prevHomeRef.current === 'headline' && throwDir === 1) ||
    (!belowLg && characterHome === 'cards' && prevHomeRef.current === 'gini' && throwDir === -1);
  const charFlightDuration = handedOffToCards ? 0 : 0.8;
  const cardIconFromOpacity = handedOffToCards ? 1 : charFromOpacity;
  const handedOffToGini =
    !belowLg && characterHome === 'gini' && prevHomeRef.current === 'cards' && throwDir === 1;
  const giniFlightDuration = handedOffToGini ? 0 : 0.8;
  const giniIconFromOpacity = handedOffToGini ? 1 : charFromOpacity;
  const playActive = effectiveSection === 'sectionPlay';
  const ownActive = effectiveSection === 'sectionOwnMarket';
  const distributionActive = effectiveSection === 'sectionDistribution';
  const stakeActive = effectiveSection === 'sectionSecureYourStake';

  /* The Play cards' decorative animations (auction chart, trade flows, Gini
     gauge) run while the cards fly in and for 2s after the flight (~1.2s incl.
     stagger) lands, then fall back to hover-driven. */
  const [playCardsLive, setPlayCardsLive] = useState(false);
  useEffect(() => {
    if (!playActive) {
      setPlayCardsLive(false);
      return;
    }
    setPlayCardsLive(true);
    const timer = setTimeout(() => setPlayCardsLive(false), 3200);
    return () => clearTimeout(timer);
  }, [playActive]);

  /* Same fixed window for the Own deck's round table, so the REDEFINE MARKETS
     crowd chatters while the cards fly in and then freezes exactly like the
     Play cards' graphics above. Past the window it is hover-driven; below lg,
     where there is no hover to fall back on, the card ORs in belowLg and the
     graphic simply runs for as long as it is mounted. */
  const [ownCardsLive, setOwnCardsLive] = useState(false);
  useEffect(() => {
    if (!ownActive) {
      setOwnCardsLive(false);
      return;
    }
    setOwnCardsLive(true);
    const timer = setTimeout(() => setOwnCardsLive(false), 3200);
    return () => clearTimeout(timer);
  }, [ownActive]);

  /* Same fixed window for the Secure-Your-Stake deck's capital auction, so the
     auction runs while the cards fly in and then freezes where it stands, like
     the Play cards' graphics above. Past the window it is hover-driven, and a
     hover picks the auction up from the deposit it stopped on; below lg, where
     there is no hover to fall back on, the card ORs in belowLg and the auction
     simply plays through to its end. */
  const [stakeCardsLive, setStakeCardsLive] = useState(false);
  useEffect(() => {
    if (!stakeActive) {
      setStakeCardsLive(false);
      return;
    }
    setStakeCardsLive(true);
    const timer = setTimeout(() => setStakeCardsLive(false), 3200);
    return () => clearTimeout(timer);
  }, [stakeActive]);

  /* Fires when a headline→cards flying copy's own tween genuinely completes.
     Both regardo and carlo must report in (they share a duration but not
     necessarily a frame) before handing off, so a still-easing copy is never
     swapped early for its instantly-mounted real icon — that swap is what
     was popping visibly for Carlo. The token guard drops a stray callback
     from a flight that's since been superseded (e.g. a fast re-scroll). */
  const headlineFlightComplete = (token: number) => {
    if (headlineFlightTokenRef.current !== token) return;
    headlineFlightCompleteCountRef.current += 1;
    if (headlineFlightCompleteCountRef.current < 2) return;
    clearTimeout(flipTimerRef.current);
    setCharacterHome('cards');
    setCharOverlay(null);
  };

  /* One flying character copy: launches at its previous home's rect/opacity and
     animates to the receiving slot. Shared by the detached overlay (Regardo, and
     Carlo on non-descent flights) and the in-grid Carlo flight on the Choose
     Your Hero descent, so both stay in lockstep.

     `overlayZoom` (default 1, a no-op everywhere except the carloBehindCards
     render site): a `position: fixed` element that also carries a CSS
     `transform` renders its ENTIRE box — left/top/width/height AND the
     transform's own translate — scaled by an ambient `zoom` ancestor, even
     though a fixed element with no transform at all would ignore that same
     zoom entirely. (Verified directly: identical fixed+transform markup
     inside a `zoom: 0.6` ancestor renders at exactly 0.6× the intended rect
     in every dimension.) The carloBehindCards overlay sits inside
     sectionHero's zoomed FitToViewport subtree for z-stacking reasons (see
     that render site), so it hits exactly this case — Carlo's flight target
     was landing at zoom× the real card position instead of on it, worse the
     more a window's height forced the section to shrink. Dividing every
     geometric input by that same zoom before handing it to the browser
     cancels the ambient scaling out again. */
  const renderCharFlight = (
    key: 'regardo' | 'carlo',
    flight: { from: FlightRect; to: FlightRect },
    onComplete?: () => void,
    overlayZoom = 1,
  ) =>
    charOverlay && (
      <motion.div
        key={key}
        className="absolute"
        style={{
          left: flight.from.x / overlayZoom,
          top: flight.from.y / overlayZoom,
          width: flight.from.w / overlayZoom,
          height: flight.from.h / overlayZoom,
          transformOrigin: 'top left',
        }}
        initial={{ x: 0, y: 0, scale: 1, opacity: charOverlay.fromOpacity }}
        animate={{
          x: (flight.to.x - flight.from.x) / overlayZoom,
          y: (flight.to.y - flight.from.y) / overlayZoom,
          /* Uniform scale: every home renders the same SVG aspect. A ratio
             between two already-real-pixel heights, so it's unaffected by
             the ambient-zoom scaling that left/top/width/height above are
             compensating for — dividing it too would double-correct. */
          scale: flight.to.h / flight.from.h,
          opacity: 1,
        }}
        transition={{ duration: charOverlay.duration, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        {key === 'regardo' ? (
          <Regardo className="w-full h-full text-gold" viewBox="0 0 491.52783 788.49512" />
        ) : (
          <Carlo className="w-full h-full text-purple" viewBox={CARLO_VIEWBOX} />
        )}
      </motion.div>
    );

  /* ---- Card header destinations ----
     A card's header is its way out to its app surface. The class cards
     (Regardo, Carlo) have none: their only link is the docs, which the coin on
     every card's back already carries. Liveness is decided per TARGET
     HOST, not by the coarse stage: the ICO is pinned to mainnet and the quests
     to sepolia, so in a testnet-only launch one of the Secure-Your-Stake cards
     links through while its neighbour pops the modal.

     A gated target opens the modal rather than navigating. The middleware still
     rewrites gated app.* requests to /coming-soon — that remains the real gate —
     but these links open in a NEW TAB, and a fresh tab containing only the words
     "Coming Soon" is a poor destination. */

  const appTarget = (host: CardHost, path: string) =>
    resolveAppTarget(launch, MAIN_DOMAIN, host, path);

  const openTarget = (target: CardTarget, soon: SoonCopy) => {
    if (target.kind === 'link') window.open(target.href, '_blank', 'noopener,noreferrer');
    else setComingSoon(soon);
  };

  /* Spread onto a HeroCard: wires its header to either a real anchor or the
     modal. The label is the control's accessible name. */
  const headerLink = (target: CardTarget, label: string, soon: SoonCopy) =>
    target.kind === 'link'
      ? { headerLabel: label, headerHref: target.href }
      : { headerLabel: label, headerOnClick: () => setComingSoon(soon) };

  /* ---- Cards (shared between the lg grid and the below-lg deck) ---- */

  const regardoCard = (
    <HeroCard
      isFlipped={regardoFlipped}
      onFlip={() => setRegardoFlipped(!regardoFlipped)}
      maxWidth="425px"
      height="675px"
      themeColor="var(--color-gold)"
      themeColorHover="var(--color-gold-hover)"
      themeColorRgba="212, 175, 55"
      chassisGradient="linear-gradient(135deg, #7c6225 0%, #dfc482 25%, #977636 50%, #ebdba4 75%, #6a501c 100%)"
      headerTag="Hero"
      title="Regardo"
      symbol={<span className="font-sans">$</span>}
      classTitle="Class: Capitalist"
      classSymbol={<span className="font-sans text-xs">★</span>}
      classDesc="the smallest number of players collectively holding 50% of the supply."
      abilities={[
        { name: "Concentrate Capital", desc: "accumulate wealth to push the economy toward perfect inequality." },
        { name: "BAILOUT", desc: "Split the entire prize pool. Proletarians get nothing." }
      ]}
      footerLeftText="Class 01"
      footerMiddleText='001 / 002'
      footerTextColor="rgba(7, 7, 9, 0.65)"
      backInfoLink={`${DOCS_URL}/intro#the-two-classes`}
      backgroundSlot={
        <svg viewBox="0 0 800 450" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="skyGrad-reg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-bg)" />
              <stop offset="100%" stopColor="var(--color-card)" />
            </linearGradient>
            <linearGradient id="glassGrad-reg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#skyGrad-reg)" />
          <g opacity="0.35">
            <rect x="40" y="180" width="85" height="270" fill="var(--color-bg)" />
            <rect x="200" y="120" width="60" height="330" fill="var(--color-bg)" />
            <rect x="440" y="100" width="100" height="350" fill="var(--color-bg)" />
          </g>
          <g opacity="0.65">
            <line x1="145" y1="120" x2="145" y2="180" stroke="var(--color-border2)" strokeWidth="2" />
            <rect x="110" y="180" width="70" height="270" fill="var(--color-card)" />
            <polygon points="260,200 310,240 310,450 260,450" fill="var(--color-card)" />
          </g>
          <g>
            <rect x="0" y="220" width="50" height="230" fill="var(--color-card2)" />
            <rect x="60" y="170" width="40" height="280" fill="var(--color-card2)" />
            <line x1="195" y1="50" x2="195" y2="100" stroke="var(--color-gold)" strokeWidth="3" />
            <rect x="140" y="100" width="105" height="350" fill="var(--color-card3)" />
            <rect x="195" y="130" width="38" height="180" fill="url(#glassGrad-reg)" />
            <polygon points="275,250 330,220 330,450 275,450" fill="var(--color-card2)" />
            <line x1="460" y1="120" x2="460" y2="180" stroke="var(--color-gold)" strokeWidth="2.5" />
            <polygon points="435,180 460,170 485,180 485,450 435,450" fill="var(--color-card3)" />
            <line x1="448" y1="200" x2="448" y2="430" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
            <line x1="472" y1="200" x2="472" y2="430" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
            <rect x="560" y="220" width="55" height="230" fill="var(--color-card3)" />
            <rect x="695" y="80" width="105" height="370" fill="var(--color-card2)" />
            <rect x="710" y="110" width="90" height="340" fill="var(--color-card3)" stroke="var(--color-border)" strokeWidth="0.5" />
          </g>
        </svg>
      }
      /* In-card icon — only mounted while this is the characters' active home,
         so framer-motion can fly the single layoutId instance here and away.
         Height-driven + bottom-anchored to foot-align with Carlo's card. */
      illustrationSlot={
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-2 pointer-events-none drop-shadow-[0_25px_35px_rgba(0,0,0,0.95)]">
          {/* Always-mounted sizer: marks the icon's box for overlay flights,
              as landing target (header → cards) and launch point (cards → gini). */}
          <div ref={cardRegardoSlotRef} style={{ height: CARD_ICON_H, width: CARD_ICON_H * REGARDO_ASPECT }}>
            {characterHome === 'cards' && !charOverlay && (
              <TravelIcon id="char-regardo" fromOpacity={cardIconFromOpacity} duration={charFlightDuration}>
                <Regardo className="w-auto" style={{ height: CARD_ICON_H }} viewBox="0 0 491.52783 788.49512" />
              </TravelIcon>
            )}
          </div>
        </div>
      }
    />
  );

  const carloCard = (
    <HeroCard
      isFlipped={carloFlipped}
      onFlip={() => setCarloFlipped(!carloFlipped)}
      maxWidth="425px"
      height="675px"
      themeColor="var(--color-purple)"
      /* Ability names in the class box run on highlightColor against the box's
         dark ground, where the base token lands at 4.25:1 — under the 4.5:1
         bar. The brighter hover token gets them to 6.4:1; themeColor still
         supplies the borders and the chassis tint. */
      themeColorHover="var(--color-purple-hover)"
      themeColorRgba="171, 71, 188"
      chassisGradient="linear-gradient(135deg, #2e0854 0%, #7b1fa2 25%, #3f0c70 50%, #ba68c8 75%, #220341 100%)"
      headerTag="Hero"
      title="Carlo"
      symbol={<span className="font-sans">⚒</span>}
      classTitle="Class: Proletariat"
      classSymbol={<span className="font-sans text-xs">⚒</span>}
      classDesc="the largest number of players collectively holding 50% of the supply."
      abilities={[
        { name: "Distribute Capital", desc: "coordinate with your class to push the economy toward perfect equality." },
        { name: "Wealth Tax", desc: "Capitalist payouts are capped and the surplus flows to the Proletariat." }
      ]}
      footerLeftText="Class 02"
      footerMiddleText='002 / 002'
      footerTextColor="rgba(255, 255, 255, 0.65)"
      backInfoLink={`${DOCS_URL}/intro#the-two-classes`}
      backgroundSlot={
        /* Heavy industry — the Proletarian counterpart to Regardo's financial
           district, built on the same three-plane recipe: bg-filled far haze,
           a 0.65 mid band in --color-card, then the full-opacity works in
           card2/card3. Purple stands in for the skyline's gold: it lights the
           sawtooth north-light glazing, the stack bands, the conveyor run and
           the tap-hole bloom at the furnace foot. */
        <svg viewBox="0 0 800 450" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="skyGrad-car" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-bg)" />
              <stop offset="100%" stopColor="var(--color-card)" />
            </linearGradient>
            {/* Sawtooth glazing — Carlo's answer to Regardo's curtain wall. */}
            <linearGradient id="glazeGrad-car" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-purple)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-purple)" stopOpacity="0" />
            </linearGradient>
            {/* Exhaust. card3 is the darkest surface in light mode and the
                lightest in dark, so the plumes read against the sky either way. */}
            <radialGradient id="smokeGrad-car" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="var(--color-card3)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--color-card3)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="furnaceGlow-car" cx="50%" cy="85%" r="65%">
              <stop offset="0%" stopColor="var(--color-purple)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--color-purple)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="450" fill="url(#skyGrad-car)" />

          {/* Far plane — sheds and thin stacks dissolving into the haze. */}
          <g opacity="0.35">
            <rect x="0" y="252" width="150" height="198" fill="var(--color-bg)" />
            <rect x="96" y="150" width="16" height="110" fill="var(--color-bg)" />
            <rect x="296" y="214" width="176" height="236" fill="var(--color-bg)" />
            <rect x="348" y="128" width="18" height="96" fill="var(--color-bg)" />
            <rect x="410" y="152" width="16" height="72" fill="var(--color-bg)" />
            <rect x="596" y="234" width="204" height="216" fill="var(--color-bg)" />
            <rect x="668" y="142" width="20" height="102" fill="var(--color-bg)" />
          </g>

          {/* Drifting exhaust — in front of the haze, behind the works. */}
          <g>
            <ellipse cx="148" cy="48" rx="88" ry="34" fill="url(#smokeGrad-car)" />
            <ellipse cx="248" cy="26" rx="72" ry="26" fill="url(#smokeGrad-car)" />
            <ellipse cx="380" cy="100" rx="58" ry="22" fill="url(#smokeGrad-car)" />
            <ellipse cx="678" cy="192" rx="88" ry="36" fill="url(#smokeGrad-car)" />
          </g>

          {/* Mid plane — a second sawtooth shed and a gas holder. */}
          <g opacity="0.65">
            <polygon points="296,450 296,332 332,308 332,332 368,308 368,332 404,308 404,332 440,308 440,450" fill="var(--color-card)" />
            <line x1="358" y1="240" x2="358" y2="308" stroke="var(--color-border2)" strokeWidth="2" />
            <rect x="350" y="232" width="16" height="80" fill="var(--color-card)" />
            <path d="M600,450 L600,296 A44,44 0 0 1 688,296 L688,450 Z" fill="var(--color-card)" />
          </g>

          {/* Near plane — the works. */}
          <g>
            {/* Sawtooth assembly hall, glazing lit on every north face. */}
            <polygon points="0,450 0,318 28,294 28,318 56,294 56,318 84,294 84,318 112,294 112,450" fill="var(--color-card2)" />
            <rect x="0" y="294" width="112" height="26" fill="url(#glazeGrad-car)" />
            <line x1="28" y1="294" x2="28" y2="318" stroke="var(--color-purple)" strokeWidth="2.5" />
            <line x1="56" y1="294" x2="56" y2="318" stroke="var(--color-purple)" strokeWidth="2.5" />
            <line x1="84" y1="294" x2="84" y2="318" stroke="var(--color-purple)" strokeWidth="2.5" />
            <line x1="112" y1="294" x2="112" y2="318" stroke="var(--color-purple)" strokeWidth="2.5" />

            {/* Chimney with its warning bands. */}
            <polygon points="126,450 133,58 157,58 164,450" fill="var(--color-card3)" />
            <rect x="128" y="48" width="34" height="12" fill="var(--color-card2)" />
            <line x1="133" y1="78" x2="157" y2="78" stroke="var(--color-purple)" strokeWidth="3" />
            <line x1="134" y1="96" x2="156" y2="96" stroke="var(--color-purple)" strokeWidth="3" />

            {/* Machine hall + travelling gantry crane. */}
            <rect x="180" y="352" width="250" height="98" fill="var(--color-card2)" />
            <rect x="200" y="336" width="96" height="16" fill="var(--color-card3)" />
            <rect x="180" y="316" width="250" height="10" fill="var(--color-card3)" />
            <rect x="198" y="326" width="8" height="26" fill="var(--color-card3)" />
            <rect x="406" y="326" width="8" height="26" fill="var(--color-card3)" />
            <line x1="330" y1="326" x2="330" y2="362" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
            <rect x="322" y="362" width="16" height="10" fill="var(--color-card3)" />
            <rect x="246" y="404" width="26" height="46" fill="var(--color-purple)" opacity="0.35" />
            <ellipse cx="259" cy="450" rx="56" ry="46" fill="url(#furnaceGlow-car)" />

            {/* Conveyor run climbing to the transfer tower. */}
            <polygon points="430,318 556,240 556,258 430,336" fill="var(--color-card2)" />
            <line x1="434" y1="328" x2="552" y2="255" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.75" />
            <rect x="490" y="288" width="7" height="162" fill="var(--color-card3)" />
            <rect x="552" y="196" width="48" height="254" fill="var(--color-card3)" stroke="var(--color-border)" strokeWidth="0.5" />
            <rect x="552" y="186" width="48" height="12" fill="var(--color-card2)" />

            {/* Cooling tower. */}
            <path d="M610,450 C632,360 648,330 648,300 C648,276 642,262 640,250 L714,250 C712,262 706,276 706,300 C706,330 722,360 744,450 Z" fill="var(--color-card3)" />
            <rect x="636" y="242" width="82" height="10" fill="var(--color-card2)" />
            <line x1="662" y1="262" x2="656" y2="430" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.6" />
            <line x1="692" y1="262" x2="698" y2="430" stroke="var(--color-purple)" strokeWidth="1.5" strokeDasharray="2,10" opacity="0.6" />

            {/* Blast furnace, flare mast, and the tap-hole bloom at its foot. */}
            <line x1="776" y1="86" x2="776" y2="122" stroke="var(--color-purple)" strokeWidth="3" />
            <rect x="758" y="122" width="36" height="30" fill="var(--color-card2)" />
            <rect x="748" y="152" width="52" height="298" fill="var(--color-card3)" stroke="var(--color-border)" strokeWidth="0.5" />
            <rect x="748" y="196" width="52" height="8" fill="var(--color-purple)" opacity="0.55" />
            <ellipse cx="774" cy="450" rx="66" ry="52" fill="url(#furnaceGlow-car)" />
          </g>
        </svg>
      }
      illustrationSlot={
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-2 pointer-events-none drop-shadow-[0_25px_35px_rgba(0,0,0,0.95)]">
          {/* Always-mounted sizer: marks the icon's box for overlay flights,
              as landing target (header → cards) and launch point (cards → gini). */}
          <div ref={cardCarloSlotRef} style={{ height: CARD_ICON_H, width: CARD_ICON_H * CARLO_ASPECT }}>
            {characterHome === 'cards' && !charOverlay && (
              <TravelIcon id="char-carlo" fromOpacity={cardIconFromOpacity} duration={charFlightDuration}>
                <Carlo className="w-auto" style={{ height: CARD_ICON_H, aspectRatio: CARLO_ASPECT }} viewBox={CARLO_VIEWBOX} />
              </TravelIcon>
            )}
          </div>
        </div>
      }
    />
  );

  const playCard1 = (
    <HeroCard
      isFlipped={action1Flipped}
      onFlip={() => setAction1Flipped(!action1Flipped)}
      onMouseEnter={() => setaction1Hovered(true)}
      onMouseLeave={() => setaction1Hovered(false)}
      themeColor="var(--color-magenta)"
      themeColorHover="var(--color-magenta-hover)"
      themeColorRgba="184, 0, 111"
      chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Phase"
      title="ENTER THE ARENA"
      symbol="01"
      classTitle="Phase: Auction"
      classSymbol="✦"
      abilities={[
        { name: "Seed the Prize Pool", desc: "Buy the in-game currency, Fake Internet Money ($FIM), with $USDC." }
      ]}
      footerLeftText="Phase 01"
      footerMiddleText='001 / 003'
      {...headerLink(appTarget('stage', '/play/auction'), 'Open Auction', SOON.game)}
      backInfoLink={`${DOCS_URL}/intro#phase-1--the-auction`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-3">
          <AnimatedAuctionChart isHovered={action1Hovered || playCardsLive} />
        </div>
      }
    />
  );

  const playCard2 = (
    <HeroCard
      isFlipped={action2Flipped}
      onFlip={() => setAction2Flipped(!action2Flipped)}
      onMouseEnter={() => setaction2Hovered(true)}
      onMouseLeave={() => setaction2Hovered(false)}
      themeColor="var(--color-magenta)"
      themeColorHover="var(--color-magenta-hover)"
      themeColorRgba="184, 0, 111"
      chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Phase"
      title="OUTPLAY THE MARKET"
      symbol="02"
      classTitle="Phase: Trading"
      classSymbol="✦"
      abilities={[
        { name: "Trade", desc: "Exchange $FIM and $USDC with other players." },
        { name: "Outplay", desc: "Use your capital and coordinate with your class to influence wealth distribution. Choose who you trade with wisely." }
      ]}
      footerLeftText="Phase 02"
      footerMiddleText='002 / 003'
      {...headerLink(appTarget('stage', '/play/trading'), 'Open Market', SOON.game)}
      backInfoLink={`${DOCS_URL}/intro#phase-2--trading`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-3">
          <AnimatedTradeFlows isHovered={action2Hovered || playCardsLive} />
        </div>
      }
    />
  );

  const playCard3 = (
    <HeroCard
      isFlipped={action3Flipped}
      onFlip={() => setAction3Flipped(!action3Flipped)}
      onMouseEnter={() => setaction3Hovered(true)}
      onMouseLeave={() => setaction3Hovered(false)}
      themeColor="var(--color-magenta)"
      themeColorHover="var(--color-magenta-hover)"
      themeColorRgba="184, 0, 111"
      chassisGradient="linear-gradient(135deg, #4a002d 0%, #8b0054 25%, #4a002d 50%, #b8006f 75%, #2d001b 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Phase"
      title="ENFORCE YOUR IDEOLOGY"
      symbol="03"
      classTitle="Phase: Payout"
      classSymbol="✦"
      abilities={[
        { name: "TAKEOVER", desc: "Shift the game economies' wealth distribution in favor of your class." },
        { name: "Dictate", desc: "Set the payout rules: Bailout or Wealth Tax" }
      ]}
      footerLeftText="Phase 03"
      footerMiddleText='003 / 003'
      {...headerLink(appTarget('stage', '/play/payout'), 'Open Payouts', SOON.game)}
      backInfoLink={`${DOCS_URL}/intro#phase-3--settlement--payout`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-magenta) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        /* pointer-events-auto enables the Gini gauge's hover interactions */
        <div className="w-full h-full flex justify-center items-center pointer-events-auto drop-shadow-[0_8px_8px_rgba(22,18,36,0.35)] absolute z-20">
          <AnimatedGiniCard
            isHovered={action3Hovered || playCardsLive}
            /* Always-mounted sizers mark the dock boxes so the cards → gini
               overlay flight can aim at them while the card is mid-throw. */
            leftIcon={
              <div ref={giniCarloSlotRef} style={{ height: GINI_ICON_H, width: GINI_ICON_H * CARLO_ASPECT }}>
                {characterHome === 'gini' && !charOverlay && (
                  <TravelIcon id="char-carlo" fromOpacity={giniIconFromOpacity} duration={giniFlightDuration}>
                    <Carlo className="w-auto h-20 text-purple" style={{ aspectRatio: CARLO_ASPECT }} viewBox={CARLO_VIEWBOX} />
                  </TravelIcon>
                )}
              </div>
            }
            rightIcon={
              <div ref={giniRegardoSlotRef} style={{ height: GINI_ICON_H, width: GINI_ICON_H * REGARDO_ASPECT }}>
                {characterHome === 'gini' && !charOverlay && (
                  <TravelIcon id="char-regardo" fromOpacity={giniIconFromOpacity} duration={giniFlightDuration}>
                    <Regardo className="w-auto h-20 text-gold" viewBox="0 0 491.52783 788.49512" />
                  </TravelIcon>
                )}
              </div>
            }
          />
        </div>
      }
    />
  );

  const ownCard1 = (
    <HeroCard
      isFlipped={own1Flipped}
      onFlip={() => setOwn1Flipped(!own1Flipped)}
      themeColor="var(--color-orange)"
      themeColorRgba="249, 115, 22"
      chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Governance"
      title="JOIN THE DAO"
      symbol={<span className="font-sans">⚖</span>}
      classTitle="Type: DAO"
      classSymbol={<span className="font-sans text-xs">✦</span>}
      classDesc="Player Ownership. No company. No rigged outcomes."
      abilities={[
        { name: "Join", desc: " Buy and stake the governance token: Regarded Token ($RGD)" },
        { name: "Control", desc: "Define the game rules and govern the DAO treasury." }
      ]}
      footerLeftText="Ownership"
      footerMiddleText='001 / 003'
      {...headerLink(resolveDiscourseTarget(launch, '/c/governance'), 'Open Governance', SOON.governance)}
      footerTextColor="rgba(255, 255, 255, 0.6)"
      backInfoLink={`${DOCS_URL}/intro#governance`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-5 pointer-events-auto">
          <DaoVote onVoteCast={() => setOwn1Flipped(true)} />
        </div>
      }
    />
  );

  const ownCard2 = (
    <HeroCard
      isFlipped={own2Flipped}
      onFlip={() => setOwn2Flipped(!own2Flipped)}
      onMouseEnter={() => setOwn2Hovered(true)}
      onMouseLeave={() => setOwn2Hovered(false)}
      themeColor="var(--color-orange)"
      themeColorRgba="249, 115, 22"
      chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Governance"
      title="CAPTURE VALUE"
      symbol={<span className="font-sans">$</span>}
      classTitle="Type: Yield"
      classSymbol="✦"
      classDesc="Prize Pool is deployed to blue-chip defi during the game."
      abilities={[
        { name: "Payback", desc: "Yield funds deflationary buybacks, liquidity injections, prize pool bonuses and the treasury" }
      ]}
      footerLeftText="Economics"
      footerMiddleText='002 / 003'
      {...headerLink(resolveMainTarget(launch, MAIN_DOMAIN, 'mainnet', '/treasury'), 'Open Treasury', SOON.treasury)}
      backInfoLink={`${DOCS_URL}/intro#how-value-flows-back`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-5 pointer-events-auto">
          <YieldDistribution isHovered={own2Hovered || ownCardsLive || belowLg} />
        </div>
      }
    />
  );

  const ownCard3 = (
    <HeroCard
      isFlipped={own3Flipped}
      onFlip={() => setOwn3Flipped(!own3Flipped)}
      onMouseEnter={() => setOwn3Hovered(true)}
      onMouseLeave={() => setOwn3Hovered(false)}
      themeColor="var(--color-orange)"
      themeColorRgba="249, 115, 22"
      chassisGradient="linear-gradient(135deg, #5c2400 0%, #b34a00 25%, #5c2400 50%, #e65c00 75%, #2e1200 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Governance"
      title="REDEFINE MARKETS"
      symbol={<span className="font-sans">∞</span>}
      classTitle="Type: Experiment"
      classSymbol="✦"
      classDesc="Shape the future of human coordination and economic cooperation."
      abilities={[
        { name: "Dismantle", desc: "Challenge the status quo of web3, finance and markets in general." },
        { name: "Build the Future", desc: "Define a new paradigm for people-owned, people-governed economies." }
      ]}
      footerLeftText="Vision"
      footerMiddleText='003 / 003'
      {...headerLink(resolveDiscourseTarget(launch), 'Open Forum', SOON.forum)}
      backInfoLink={`${DOCS_URL}/mission`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-orange) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-5 pointer-events-none">
          <RoundTable isHovered={own3Hovered || ownCardsLive || belowLg} />
        </div>
      }
    />
  );

  const stakeCard1 = (
    <HeroCard
      isFlipped={stake1Flipped}
      onFlip={() => setStake1Flipped(!stake1Flipped)}
      onMouseEnter={() => setStake1Hovered(true)}
      onMouseLeave={() => setStake1Hovered(false)}
      themeColor="var(--color-sunset, #ff5e62)"
      themeColorRgba="255, 94, 98"
      chassisGradient="linear-gradient(135deg, #4a1525 0%, #b83b5e 25%, #6a1b37 50%, #f08a5d 75%, #2a0815 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="Launch"
      title="CAPITAL AUCTION"
      symbol="$"
      classTitle="Launch: TGE"
      classSymbol="✦"
      classDesc="Regarded Tokens are minted and distributed"
      abilities={[
        { name: "Acquire", desc: "Buy Regarded Tokens at a single market-clearing price set by collective demand. Everyone buys in on equal terms." },
      ]}
      footerLeftText="Auction Phase"
      footerMiddleText='001 / 002'
      {...headerLink(appTarget('mainnet', '/ico'), 'Open ICO', SOON.ico)}
      backInfoLink={`${DOCS_URL}/intro#capital-auction`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-sunset, #ff5e62) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-6 pointer-events-none">
          <AnimatedCapitalAuction isHovered={stake1Hovered || stakeCardsLive || belowLg} />
        </div>
      }
      actionButtonSlot={
        /* Same rule as the card header: always a live control, and a gated
           destination pops the modal instead of opening a tab that only says
           "Coming Soon". The URL used to be a hardcoded app.localhost:3000
           literal, which was broken in production. */
        <button
          onClick={() => openTarget(appTarget('mainnet', '/ico'), SOON.ico)}
          className="w-full py-2.5 px-4 rounded font-black text-[11px] uppercase tracking-widest text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 text-black hover:opacity-90 shadow-md"
          style={{ backgroundColor: 'var(--color-sunset, #ff5e62)' }}
        >
          Capital Auction
        </button>
      }
    />
  );

  const stakeCard2 = (
    <HeroCard
      isFlipped={stake2Flipped}
      onFlip={() => setStake2Flipped(!stake2Flipped)}
      themeColor="var(--color-sunset, #ff5e62)"
      themeColorRgba="255, 94, 98"
      chassisGradient="linear-gradient(135deg, #4a1525 0%, #b83b5e 25%, #6a1b37 50%, #f08a5d 75%, #2a0815 100%)"
      maxWidth="425px"
      height="675px"
      titleSize="text-xl"
      headerTag="LAUNCH"
      title="TESTNET QUESTS"
      symbol="⚒"
      classTitle="Campaign: Quests"
      classSymbol="✦"
      classDesc="Ecosystem deployment trial and game testing."
      abilities={[
        { name: "Test", desc: "Complete quests and play on the testnet to earn campaign points that translate to $RGD Governance Token at the Token Generation Event." },
      ]}
      footerLeftText="Testnet Phase"
      footerMiddleText='002 / 002'
      {...headerLink(appTarget('testnet', '/quests'), 'Open Quest Board', SOON.quests)}
      backInfoLink={`${DOCS_URL}/intro#testnet-quests`}
      backgroundSlot={
        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-sunset, #ff5e62) 0%, transparent 70%)' }} />
      }
      illustrationSlot={
        /* pointer-events-auto: the board's EXECUTE buttons are real controls.
           They stop their own clicks, so the rest of the illustration still
           flips the card. */
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl z-20 p-5 pointer-events-auto">
          {/* Clearing the board is the card's own reveal: it holds on the full
              1,000 points, then turns itself over to the back. */}
          <AirdropQuestBoard onCleared={() => setStake2Flipped(true)} />
        </div>
      }
      actionButtonSlot={
        <button
          onClick={() => openTarget(appTarget('testnet', '/quests'), SOON.quests)}
          className="w-full py-2.5 px-4 rounded font-black text-[11px] uppercase tracking-widest text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 text-black hover:opacity-90 shadow-md"
          style={{ backgroundColor: 'var(--color-sunset, #ff5e62)' }}
        >
          Quest Board
        </button>
      }
    />
  );

  /* Section headings, hoisted so the belowLg branch can wrap them together
     with their card deck in FitToViewport (see the sections below) while the
     desktop branch renders them exactly as before. */
  const heroCardsHeading = (
    <motion.h2
      initial={false}
      animate={{ opacity: heroCardsActive ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: heroCardsActive ? 0.9 : 0 }}
      className="h2-app mb-6 lg:mb-8 text-center text-2xl lg:text-[2.5rem] font-bold"
      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', position: 'relative', zIndex: 0 }}
    >
      Choose Your Hero
    </motion.h2>
  );

  const playHeading = (
    <motion.h2
      initial={false}
      animate={{ opacity: playActive ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: playActive ? 0.9 : 0 }}
      className="h2-app mb-6 lg:mb-8 text-center text-2xl lg:text-[2.5rem] font-bold"
      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', position: 'relative', zIndex: 0 }}
    >
      Play the Game
    </motion.h2>
  );

  const ownHeading = (
    <motion.h2
      initial={false}
      animate={{ opacity: ownActive ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: ownActive ? 0.9 : 0 }}
      className="h2-app mb-6 lg:mb-8 text-center text-2xl lg:text-[2.5rem] font-bold"
      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', position: 'relative', zIndex: 0 }}
    >
      Own the Project
    </motion.h2>
  );

  const stakeHeading = (
    <motion.h2
      initial={false}
      animate={{ opacity: stakeActive ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut', delay: stakeActive ? 0.9 : 0 }}
      className="h2-app text-center mb-6 lg:mb-8 text-2xl lg:text-[2.5rem] font-bold"
      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', position: 'relative', zIndex: 0 }}
    >
      Secure Your Stake
    </motion.h2>
  );

  /* Which rulebook chapter the current book page belongs to. Below lg the
     Campaign Sequence runs across TWO book pages (stops 1 and 2) so its heading
     holds across both and Links moves to stop 3; the lg+ spread keeps the 1:1
     stop→chapter mapping. The final stop is the back cover, which prints its
     own title — it maps to no chapter, so the heading slot fades out. */
  const distributionPage = cardIndices['sectionDistribution'] ?? 0;
  const distributionBackPage = (belowLg ? RULEBOOK_PAGES_BELOW_LG : RULEBOOK_PAGES) - 1;
  const distributionChapter =
    distributionPage >= distributionBackPage
      ? 'back'
      : distributionPage === 0
        ? 'distribution'
        : distributionPage <= (belowLg ? 2 : 1)
          ? 'campaign'
          : 'links';

  /* Three headers stacked in the same slot — cross-fade on page flip. Identical
     classes to all other section h2s so position matches. */
  const distributionHeading = (
    <div className="relative mb-6 lg:mb-8">
      {([
        ['distribution', 'Distribution of Power'],
        ['campaign', 'Campaign Sequence'],
        ['links', 'Links'],
      ] as const).map(([key, label], i) => {
        const on = distributionActive && distributionChapter === key;
        return (
          <motion.h2
            key={key}
            initial={false}
            animate={{ opacity: on ? 1 : 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut', delay: on ? 0.9 : 0 }}
            className={`h2-app text-center text-2xl lg:text-[2.5rem] font-bold${i > 0 ? ' absolute inset-0' : ''}`}
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {label}
          </motion.h2>
        );
      })}
    </div>
  );

  /* Deck rail + chevrons. The rail renders at lg+ only, where card decks don't
     deal, so a section's stop count there is its `pages` alone. The chevrons
     hide at the ends of the deck rather than sitting inert: `step()` would
     no-op, and a dead control is worse than no control. */
  const lastSection = SECTIONS[SECTIONS.length - 1];
  const lastSectionStops = sectionStops(lastSection, belowLg);
  const atLastStop =
    activeIdx === SECTIONS.length - 1 &&
    (lastSectionStops <= 1 || (cardIndices[lastSection.id] ?? 0) >= lastSectionStops - 1);
  const railStops = SECTIONS.map(({ id, label, pages }) => ({ id, label, pages: pages ?? 0 }));

  const distributionBook = (
    <motion.div
      initial={false}
      animate={{ opacity: distributionActive ? 1 : 0 }}
      transition={{ duration: 0.5, delay: distributionActive ? 0.2 : 0 }}
      /* `dark`: the rulebook renders with dark-mode tokens in both
         themes, so it looks identical in light and dark. */
      className="dark w-full max-w-7xl mx-auto"
      style={{ height: '675px' }}
    >
      <Rulebook
        active={distributionActive}
        page={cardIndices['sectionDistribution'] ?? 0}
        dir={throwDir}
      />
    </motion.div>
  );

  return (
    <div className={`flex font-display overflow-x-clip ${darkMode ? 'dark bg-bg' : 'bg-bg'}`}>
      {/* Titles/icons/viewport come from the App Router metadata exports in
          src/app/layout.tsx + src/app/main/layout.tsx (the old next/head block
          here was a silent no-op in the App Router). */}

      <style jsx global>{`
        html, body {
          height: 100%;
          overflow: hidden;
        }
        .mini-chart-view .terminal-pane > div:first-child {
          display: none !important;
        }
      `}</style>

      <LayoutGroup>
        <main className="relative mx-auto min-w-0 w-full">
          {/* Theme toggle overlays the hero slide and fades away with it: a
              round banknote button, printed like Secure Your Stake. */}
          <motion.div
            initial={false}
            animate={{ opacity: heroActive ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-4 right-4 z-40 flex"
            style={{ pointerEvents: heroActive ? 'auto' : 'none' }}
          >
            <BanknoteButton variant="primary" round onClick={toggleTheme} aria-label="Toggle dark mode">
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </BanknoteButton>
          </motion.div>

          {/* Deck navigation, overlaid on the stage rather than built into each
              section: the sections are vertically centred and fitted to the
              viewport, so in-flow controls would fight FitToViewport and have to
              be kept in sync six times over.

              Up sits at the head of the stage and down at its foot, so each
              control points the way it travels. Both call `step()` — the same
              single-tick transition a wheel/touch/key scroll plays.

              Down also shows below lg on the hero, which is where it used to
              live in-flow: on a phone it is the opening invitation to swipe.
              Everywhere else these are pointer affordances for a deck that has
              no scrollbar, and the rest of the deck is swiped. */}
          {activeIdx > 0 && (
            <div className="absolute top-5 left-1/2 z-40 hidden -translate-x-1/2 lg:block">
              <DeckChevron dir="up" onClick={() => step(-1)} settled={hasStepped} />
            </div>
          )}
          {!atLastStop && (
            <div
              className={`absolute bottom-8 left-1/2 z-40 -translate-x-1/2 ${
                heroActive ? 'block' : 'hidden lg:block'
              }`}
            >
              <DeckChevron dir="down" onClick={() => step(1)} settled={hasStepped} />
            </div>
          )}
          {/* Not on the hero: the opening slide has no progress to report, and
              the rail would only crowd it. It fades in on the first step. */}
          {activeIdx > 0 && (
            <DeckRail
              stops={railStops}
              activeIndex={activeIdx}
              activePage={cardIndices[SECTIONS[activeIdx].id] ?? 0}
              onSelect={goToSection}
            />
          )}

          {/* Slide stage: every section is absolutely stacked inside this fixed
              viewport; transitions animate in place instead of scrolling. The
              active slide sits on top and owns pointer events. */}
          <div className="relative w-full h-screen overflow-hidden text-text" style={{ height: '100dvh' }}>
            {/* Security-printed ground behind every slide. First in the stage
                and unstacked, so each section paints over it. */}
            <BanknoteGround />
            {/* Fills whatever it's applied to with the page colour, inside its
                own silhouette — see GhostKnockout. Zero-size rather than
                display:none, which would break the url(#…) reference. */}
            <svg aria-hidden="true" width="0" height="0" className="absolute">
              <filter id={GHOST_KNOCKOUT_FILTER} colorInterpolationFilters="sRGB">
                <feFlood style={{ floodColor: 'var(--color-bg)' }} />
                <feComposite in2="SourceAlpha" operator="in" />
              </filter>
            </svg>

            {/* Hero Section */}
            <section
              id="hero"
              className="hero-section absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{ zIndex: heroActive ? 10 : 0, pointerEvents: heroActive ? 'auto' : 'none' }}
            >
              {/* Character home 1: giant near-transparent ghosts behind the headline.
                  Oversized and pushed past each edge, top-anchored so the heads stay
                  visible and the feet are clipped by the section's overflow-hidden.
                  Sits below the gradient glow (z-0) so the sunset effect reads on top.

                  Height is clamped against viewport WIDTH as well as height. Sized on
                  vh alone, a narrow/tall viewport (small phones, tablets in portrait)
                  makes the pair wider than the row: justify-between then degrades to
                  flex-start and dumps the whole overflow on Carlo, who gets sliced off
                  the right edge while Regardo stays whole. The vw caps keep each body
                  inside half the row plus its own negative-margin bleed, so both clip
                  symmetrically. The vh values still win on normal aspect ratios, so
                  desktop is unchanged. */}
              <div className="absolute inset-0 pointer-events-none z-0 flex items-start justify-between">
                <div ref={ghostRegardoRef} className="relative flex items-start -ml-[8vw] lg:-ml-[12vw]">
                  {characterHome === 'headline' && !charOverlay && (
                    <GhostKnockout arriving={charFromOpacity !== HOME_OPACITY.headline}>
                      <Regardo
                        className="h-[min(70vh,88vw)] lg:h-[min(140vh,99vw)] w-auto"
                        viewBox="0 0 491.52783 788.49512"
                      />
                    </GhostKnockout>
                  )}
                  <AnimatePresence>
                    {characterHome === 'headline' && !charOverlay && (
                      <TravelIcon id="char-regardo" opacity={0.07} fromOpacity={charFromOpacity}>
                        <Regardo
                          className="h-[min(70vh,88vw)] lg:h-[min(140vh,99vw)] w-auto text-gold"
                          viewBox="0 0 491.52783 788.49512"
                        />
                      </TravelIcon>
                    )}
                  </AnimatePresence>
                </div>
                <div ref={ghostCarloRef} className="relative flex items-start -mr-[8vw] lg:-mr-[12vw]">
                  {characterHome === 'headline' && !charOverlay && (
                    <GhostKnockout arriving={charFromOpacity !== HOME_OPACITY.headline}>
                      <Carlo
                        className="h-[min(70vh,88vw)] lg:h-[min(140vh,99vw)] w-auto"
                        style={{ aspectRatio: CARLO_ASPECT }}
                        viewBox={CARLO_VIEWBOX}
                      />
                    </GhostKnockout>
                  )}
                  <AnimatePresence>
                    {characterHome === 'headline' && !charOverlay && (
                      <TravelIcon id="char-carlo" opacity={0.07} fromOpacity={charFromOpacity}>
                        <Carlo
                          className="h-[min(70vh,88vw)] lg:h-[min(140vh,99vw)] w-auto text-purple"
                          style={{ aspectRatio: CARLO_ASPECT }}
                          viewBox={CARLO_VIEWBOX}
                        />
                      </TravelIcon>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                initial={false}
                animate={{ opacity: heroActive ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="relative flex flex-col items-center justify-center text-center pt-32 px-6 pb-24 max-w-5xl mx-auto z-20"
              >
                {/* Stage marker above the headline. This is the ONE place the
                    coarse stage is surfaced — nine card footers each carrying a
                    "testnet" tag would crowd them for the same information.
                    Cosmetic; the real gate is middleware's APP_LIVE check. */}
                {launch.stage !== 'live' && (
                  <span className="font-mono text-base md:text-lg font-black uppercase tracking-[0.35em] mb-4 text-text2">
                    {launch.stage === 'testnet' ? 'Now Live on Testnet' : 'Coming Soon'}
                  </span>
                )}
                <h1 className="hero-title">
                  {/* Entity name for crawlers/screen readers only — the visual
                      hero stays the slogan. See CONTEXT.md "Entity". */}
                  <span className="sr-only">Regarded Games — </span>
                  Class War<br />
                  <span className="hero-gradient-text">The Game</span>
                </h1>
                <div className="hero-subtitle relative z-20">
                  <CyclingSubheading />
                </div>

                

                {/* Banknote buttons, in the page theme. gap-5 leaves room for
                    the glows. */}
                <div className="flex flex-wrap items-center justify-center gap-5 z-30 relative">
                  <BanknoteButton variant="secondary" onClick={() => navigateToDocs('')}>
                    Docs
                  </BanknoteButton>
                  <BanknoteButton variant="primary" onClick={() => goToSection('sectionSecureYourStake')}>
                    Secure Your Stake
                  </BanknoteButton>
                </div>

                {/* The scroll chevron that used to sit here now lives in the
                    stage's deck-navigation overlay, which carries it on every
                    slide instead of just this one — see DeckChevron there. */}
              </motion.div>
            </section>

            {/* Choose your Hero (Cards Section) */}
            <section
              id="sectionHero"
              className="absolute inset-0 pt-0 pb-8 lg:pb-10 px-6 flex flex-col justify-center w-full"
              style={{ zIndex: heroCardsActive ? 10 : 0, pointerEvents: heroCardsActive ? 'auto' : 'none' }}
            >
              {/* Entered from the header, which has no outgoing cards to clear —
                  so the throw fires immediately (enterDelay 0) and the header
                  ghost icons fly down to land with it. */}
              <FitToViewport>
                {/* Matches the heading's own mb-6 lg:mb-8 so the heading sits
                    centered between the screen top and the card, not hugging
                    the card, on every breakpoint. */}
                <div className="h-6 lg:h-8" aria-hidden="true" />
                {heroCardsHeading}
                {belowLg ? (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <CardThrow active={heroCardsActive} dir={throwDir} cardMaxWidth="425px" enterDelay={0}>
                      <CardDeck activeIndex={cardIndices['sectionHero'] ?? 0} height="675px" maxWidth="425px">
                        {regardoCard}
                        {carloCard}
                      </CardDeck>
                    </CardThrow>
                  </div>
                ) : (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="grid md:grid-cols-2 gap-8 justify-items-center relative w-full max-w-5xl mx-auto">
                      {/* Three explicit stacking levels in one context so Carlo's
                          descent flight can sit between the cards: Regardo card on
                          top (z-20), Carlo's flying copy in the middle (z-10), Carlo
                          card beneath (z-0). The cards don't overlap, so demoting
                          Carlo's card is invisible — it only opens the gap the flight
                          slots into (behind the Regardo card, in front of his own). */}
                      <div className="relative w-full max-w-106.25 z-20">
                        <CardThrow active={heroCardsActive} dir={throwDir} index={0} total={2} spacing={562} cardMaxWidth="425px" enterDelay={0}>{regardoCard}</CardThrow>
                      </div>
                      {charOverlay?.carloBehindCards && (
                        <div className="fixed inset-0 z-10 pointer-events-none">
                          {renderCharFlight(
                            'carlo',
                            charOverlay.carlo,
                            () => headlineFlightComplete(headlineFlightTokenRef.current),
                            charOverlay.carloOverlayZoom,
                          )}
                        </div>
                      )}
                      <div className="relative w-full max-w-106.25 z-0">
                        <CardThrow active={heroCardsActive} dir={throwDir} index={1} total={2} spacing={562} cardMaxWidth="425px" enterDelay={0}>{carloCard}</CardThrow>
                      </div>
                    </div>
                  </div>
                )}
              </FitToViewport>
            </section>

            {/* Play the Game (Action Cards Section) */}
            <section
              id="sectionPlay"
              className="absolute inset-0 pt-0 pb-8 px-4 flex flex-col justify-center w-full"
              style={{ zIndex: playActive ? 10 : 0, pointerEvents: playActive ? 'auto' : 'none' }}
            >
              <FitToViewport>
                {/* Matches the heading's own mb-6 lg:mb-8 so the heading sits
                    centered between the screen top and the card, not hugging
                    the card, on every breakpoint. */}
                <div className="h-6 lg:h-8" aria-hidden="true" />
                {playHeading}
                {belowLg ? (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <CardThrow active={playActive} dir={throwDir} cardMaxWidth="425px">
                      <CardDeck activeIndex={cardIndices['sectionPlay'] ?? 0} height="675px" maxWidth="425px">
                        {playCard1}
                        {playCard2}
                        {playCard3}
                      </CardDeck>
                    </CardThrow>
                  </div>
                ) : (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="grid md:grid-cols-3 gap-8 justify-items-center relative w-full max-w-337.5 mx-auto">
                      <CardThrow active={playActive} dir={throwDir} index={0} total={3} spacing={494} cardMaxWidth="425px" className="w-full">{playCard1}</CardThrow>
                      <CardThrow active={playActive} dir={throwDir} index={1} total={3} spacing={494} cardMaxWidth="425px" className="w-full">{playCard2}</CardThrow>
                      <div className="relative w-full max-w-106.25">
                        <CardThrow active={playActive} dir={throwDir} index={2} total={3} spacing={494} cardMaxWidth="425px">{playCard3}</CardThrow>
                      </div>
                    </div>
                  </div>
                )}
              </FitToViewport>
            </section>

            {/* Own the Project */}
            <section
              id="sectionOwnMarket"
              className="absolute inset-0 pt-0 pb-8 px-4 flex flex-col justify-center w-full"
              style={{ zIndex: ownActive ? 10 : 0, pointerEvents: ownActive ? 'auto' : 'none' }}
            >
              <FitToViewport>
                {/* Matches the heading's own mb-6 lg:mb-8 so the heading sits
                    centered between the screen top and the card, not hugging
                    the card, on every breakpoint. */}
                <div className="h-6 lg:h-8" aria-hidden="true" />
                {ownHeading}
                {belowLg ? (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <CardThrow active={ownActive} dir={throwDir} cardMaxWidth="425px">
                      <CardDeck activeIndex={cardIndices['sectionOwnMarket'] ?? 0} height="675px" maxWidth="425px">
                        {ownCard1}
                        {ownCard2}
                        {ownCard3}
                      </CardDeck>
                    </CardThrow>
                  </div>
                ) : (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="grid md:grid-cols-3 gap-8 justify-items-center relative w-full max-w-337.5 mx-auto">
                      <CardThrow active={ownActive} dir={throwDir} index={0} total={3} spacing={494} cardMaxWidth="425px" className="w-full">{ownCard1}</CardThrow>
                      <CardThrow active={ownActive} dir={throwDir} index={1} total={3} spacing={494} cardMaxWidth="425px" className="w-full">{ownCard2}</CardThrow>
                      <CardThrow active={ownActive} dir={throwDir} index={2} total={3} spacing={494} cardMaxWidth="425px" className="w-full">{ownCard3}</CardThrow>
                    </div>
                  </div>
                )}
              </FitToViewport>
            </section>

            {/* Secure Your Stake */}
            <section
              id="sectionSecureYourStake"
              className="absolute inset-0 pt-0 pb-8 px-4 flex flex-col justify-center w-full"
              style={{ zIndex: stakeActive ? 10 : 0, pointerEvents: stakeActive ? 'auto' : 'none' }}
            >
              <FitToViewport>
                {/* Matches the heading's own mb-6 lg:mb-8 so the heading sits
                    centered between the screen top and the card, not hugging
                    the card, on every breakpoint. */}
                <div className="h-6 lg:h-8" aria-hidden="true" />
                {stakeHeading}
                {belowLg ? (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <CardThrow active={stakeActive} dir={throwDir} cardMaxWidth="425px">
                      <CardDeck activeIndex={cardIndices['sectionSecureYourStake'] ?? 0} height="675px" maxWidth="425px">
                        {stakeCard1}
                        {stakeCard2}
                      </CardDeck>
                    </CardThrow>
                  </div>
                ) : (
                  <div className="dark w-full" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="grid md:grid-cols-2 gap-12 justify-items-center max-w-5xl mx-auto w-full">
                      <CardThrow active={stakeActive} dir={throwDir} index={0} total={2} spacing={588} cardMaxWidth="425px" className="w-full">{stakeCard1}</CardThrow>
                      <CardThrow active={stakeActive} dir={throwDir} index={1} total={2} spacing={588} cardMaxWidth="425px" className="w-full">{stakeCard2}</CardThrow>
                    </div>
                  </div>
                )}
              </FitToViewport>
            </section>

            {/* Distribution of Power + Campaign Sequence + Links —
                one scroll stop; a tick inside it flips the rulebook page
                instead of leaving. Placed last so the Rulebook closes the deck. */}
            <section
              id="sectionDistribution"
              className="absolute inset-0 pt-0 pb-8 px-4 flex flex-col justify-center w-full"
              style={{ zIndex: distributionActive ? 10 : 0, pointerEvents: distributionActive ? 'auto' : 'none' }}
            >
              <FitToViewport>
                {/* Matches the heading's own mb-6 lg:mb-8 so the heading sits
                    centered between the screen top and the book, not hugging
                    the book, on every breakpoint. */}
                <div className="h-6 lg:h-8" aria-hidden="true" />
                {distributionHeading}
                {distributionBook}
              </FitToViewport>
            </section>

          </div>

          {/* Overlay flights: free copies of the characters fly from their
              previous home onto the receiving card's settled icon slots while
              that card is still being thrown, landing together. This detached
              z-50 layer sits above the whole card grid. On the Choose Your Hero
              descent Carlo is omitted here and rendered inside the grid instead
              (carloBehindCards), interleaved between the two card wrappers so he
              reads behind the Regardo card yet in front of his own. */}
          {charOverlay && (
            <div className="fixed inset-0 z-50 pointer-events-none">
              {renderCharFlight(
                'regardo',
                charOverlay.regardo,
                charOverlay.carloBehindCards
                  ? () => headlineFlightComplete(headlineFlightTokenRef.current)
                  : undefined,
              )}
              {/* On the Choose Your Hero descent Carlo flies inside the card grid
                  instead (between the two card wrappers) so he reads behind the
                  Regardo card and in front of his own; here he only flies on the
                  other flights, where there is no such card to tuck behind. */}
              {!charOverlay.carloBehindCards && renderCharFlight('carlo', charOverlay.carlo)}
            </div>
          )}
        </main>
      </LayoutGroup>

      {/* Shared notice for any footer or CTA whose destination is not open yet. */}
      <ComingSoonModal
        open={comingSoon !== null}
        title={comingSoon?.title ?? ''}
        body={comingSoon?.body ?? ''}
        onClose={() => setComingSoon(null)}
      />
    </div>
  );
}
