---
name: regarded-design
description: Injects the Regarded Games front-end design blueprint into the conversation. Use before building or reviewing any UI component to ensure alignment with the established design language — colors, typography, spacing, motion, and structural patterns.
---
You now have the Regarded Games design paradigm. It is derived from the season detail page
(`src/app/app/[seasonSlug]/page.tsx`) and the component tree it composes. Use it whenever you
build or review UI for this project.

# Regarded Games Design Paradigm — Gamified Trading Terminal

## How to use this

The page itself is a thin router: it dispatches to three phase layouts
(`AuctionPhaseLayout`, `TradingPhaseLayout`, `PayoutPhaseLayout`), each of which composes the
same small set of **component archetypes**. To build a new component, find the archetype it
belongs to below, follow its anatomy, and lift the verbatim class structure from the named
reference file. The token, class, and color catalog is authoritative in **CLAUDE.md → Styling**
— this doc points at it rather than restating it.

---

## 1. Component Archetypes

Six shapes cover nearly everything on the page. Each entry gives **what it is → when to reach
for it → anatomy → reference file** (paths relative to repo root).

### Detail Card — read-only fact panel

**When:** you need to display a cluster of static labelled facts (addresses, schedule, policy
parameters, distribution figures). No interaction beyond copy-to-clipboard.

**Anatomy:**
```
<div className="terminal-pane h-full">
  <div className="terminal-pane-header">
    <span className="terminal-pane-title">Protocol</span>
  </div>
  <div className="flex flex-col gap-3">
    <div className="kv-row">
      <span className="font-mono text-[11px] text-text2">Season</span>
      <code className="font-mono text-[11px] bg-surface px-2 py-0.5 rounded text-text2 border border-border select-all">
        0x1234…abcd
      </code>
    </div>
    …
  </div>
</div>
```
- Header is always `terminal-pane-header` › `terminal-pane-title`.
- Body is a single `flex flex-col gap-3` column of `kv-row`s — never margins between rows.
- Addresses truncate to `0x1234…abcd`, rendered in a `<code>` with `select-all` so the full
  value (kept in `title`) can be copied.

**Ref:** `src/app/app/_components/ProtocolCard.tsx` (also `PolicyCard`, `ScheduleCard`,
`LendingDistributionCard`).

### Mask — interactive trade / action widget

**When:** the component takes wallet input and submits an on-chain transaction (buy, sell,
stake, claim).

**Anatomy:**
- Outer wrapper: `flex flex-col gap-5 h-full relative`.
- One or more stacked `terminal-pane`s — typically a small status pane on top (balance / rank)
  and the main action pane below as `terminal-pane bg-card! flex flex-col gap-0 flex-1 min-h-0`.
- **Disconnected branch:** when the wallet is not connected, render a `terminal-pane connect-gate`
  with a `connect-gate-body` and a `<WalletButton />` instead of the form.
- Sizing input uses the `AmountInput` primitive (see below).
- **CTA footer pinned to the bottom:** `mt-auto pt-3 flex flex-col gap-3 border-t border-border`.
  Primary CTA is `btn-game-primary` (or a `Link` styled as one); the execute button is
  `btn-terminal-action action-buy` / `action-sell`.
- **Transaction workflow** is a state machine `idle → approving → mining_approval → buying →
  mining_buy → success | canceled | failed | no_gas`, surfaced through a `<TxModal>` with a
  per-step `activeStatuses` / `completeStatuses` map. Refetch reads and invalidate queries on
  success, then reset to `idle` after a short delay.

**Ref:** `src/app/app/_components/AuctionMask.tsx` (also `TradingMask`, `PayoutMask`).

### Panel Menu — tabbed multi-panel container

**When:** several related views (chart, activity feed, distribution, chat, gini) share one
region and the user toggles which are visible, with the set adapting to viewport width.

**Anatomy:**
- A horizontal `terminal-view-selector-bar` of `terminal-view-btn` toggles; the open ones carry
  ` active` (lights the bottom indicator). The bar is `shrink-0` and horizontally scrollable.
- The container is `flex flex-col overflow-hidden rounded-lg border border-border bg-card`,
  height-locked on desktop (`xl:h-full`, otherwise `h-[calc(100vh-…)]`).
- Open panels pack into a responsive flex/grid; dividers between sub-panels are
  `border-t` / `border-l border-border` applied to all but the first child — never gaps.
- The menu may **bundle a Mask beside it** in the same grid (`maskMode="bundled"`, panel spans
  most columns, mask takes one) or render **solo** (`maskMode="detached"`) when the parent owns
  the mask in its own fold rung at narrow breakpoints.

**Ref:** `src/app/app/_components/AuctionPanelMenu.tsx` (also `TradingPanelMenu`).

### Band — full-width season header

**When:** the page-level header strip that frames a season (identity, prize pool, countdown,
faction gauge). One per phase layout.

**Anatomy:**
- A grid of **two `overflow-hidden rounded-md` panels** (info + gauge) sharing one continuous
  gradient: both paint `backgroundImage: 'var(--sunset-15)'` with
  `backgroundAttachment: 'fixed'`, `backgroundSize: '100vw 100vh'`, `backgroundPosition: 'left
  center'`. Because the gradient is pinned to the viewport, the right panel continues the exact
  slice the left ends on; the `bg-bg` gap between them reads as a clean seam in one image.
- Column spans track the season card grid: `lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`,
  info panel one column, gauge the rest; stacks to a single column below `lg`.
- The gauge is a `live-rail-container` with tick marks plus **absolutely positioned faction
  markers** (`track-absolute-pin`): purple/gold target pins and a live `dial-knob current` that
  eases to position with `transition-all duration-700 ease-out`. These markers are one of the
  few sanctioned uses of glow (`boxShadow: 0 0 6px var(--color-…)`) — the glow signals the live
  reading on the rail, not decoration (see the flat-surfaces convention).

**Ref:** `src/app/app/_components/SeasonBand.tsx` (wrapped by `SeasonBandReveal`).

### Reveal Row — scroll-fold ladder member

**When:** content should stage into view (and fold away) as the user scrolls a phase layout,
rather than scrolling as one long page. Phase layouts assign each section a "rung."

**Anatomy:**
- The collapse wrapper is a CSS-grid height trick:
  `overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid` toggling
  `grid-rows-[1fr]` (open) ↔ `grid-rows-[0fr]` (folded). Inner content gets `min-h-0` and a
  `pt-5` that folds away with it.
- Visibility comes from comparing the row's positional `index` (navbar = 0, band = 1, first row
  = 2…) against the current fold level (`useChromeFoldLevel()`).
- The parent layout budgets rungs per breakpoint with `useChromeRowCount(…)` and `firstRowRung()`;
  use `ChromeRevealAtRow` to reveal a row at a specific fold depth (e.g. cards at the deepest fold
  in the viewport-locked xl/2xl layout).

**Ref:** `src/app/app/_components/ChromeRevealRow.tsx`,
`src/app/app/_components/phases/AuctionPhaseLayout.tsx` (rung budgeting).

### Primitives — small reusable parts

Reach for these before inventing a new small piece:

- **`PercentileCircle`** — an SVG progress ring (`viewBox 0 0 40 40`, `-rotate-90` so it starts
  at the top), background ring `stroke-(--color-{gold|purple}-35)`, progress ring
  `stroke-{gold|purple}` with `transition-all duration-1000 ease-out`. Sizes `xxs…xl`; `lg`/`xl`
  add a faction subtitle. Faction color comes from an `isCapitalist` prop, not internal logic.
  Ref: `src/app/app/_components/PercentileCircle.tsx`.
- **`AmountInput`** — sizing rail: `mask-label`s top-left/right, a
  `group flex items-center gap-2 bg-card3 border border-border2 rounded p-2` row with a mono
  unit label, a `tabular-nums` numeric input, hover-revealed `btn-stepper` ▲/▼ buttons
  (`opacity-0 group-hover:opacity-100`), and a `PercentSlider` below.
  Ref: `src/components/AmountInput.tsx`.
- **Inline countdown** — `flex items-baseline gap-2` of value blocks, each a mono
  `tabular-nums` value plus a `text-[11px]` uppercase unit micro-label (D/H/M/S).
  Ref: the `SeasonCountdown` helper in `src/app/app/_components/SeasonBand.tsx`.
- **`.pill`** — rounded status tag (mono, uppercase) for phase/status badges.

---

## 2. Conventions

Strong defaults derived from the page. Follow them unless you have a concrete reason; each has a
rationale, so deviate knowingly rather than by accident.

- **Avoid emojis in UI text and code.** The page expresses iconography through mono glyphs
  (▲/▼) and imported SVG components, which keeps the terminal aesthetic consistent and avoids
  cross-platform emoji rendering. Reach for those instead.
- **Prefer parent-driven vertical rhythm.** Lay sections out with `flex flex-col gap-*` on the
  parent rather than `my-*` / `mt-*` / `mb-*` on children. It keeps spacing in one place and
  makes rows reorderable without re-tuning margins — every card and pane on the page does this.
- **Carry `tabular-nums` on numeric values — as the utility class.** Mono digits otherwise
  jitter as they change; `tabular-nums` keeps balances, prices, ranks, and countdowns
  column-aligned and stable while they tick. Use the `tabular-nums` class, not inline
  `style={{ fontVariantNumeric: 'tabular-nums' }}` — keep it in the className alongside the other
  utilities.
- **Match the font to the content.** `font-mono` (JetBrains Mono) for numbers, addresses,
  timestamps, and labels; `font-display` (Exo 2, usually `font-black uppercase tracking-tight`)
  for titles and big game actions; `font-sans` (Space Grotesk) for body copy and descriptions.
- **Decide faction color at the data layer and thread it down.** Where a value *does* carry
  faction identity, resolve `isCapitalist` once (from the percentile/faction data) and pass it as
  a prop; let components map it to gold (Capitalist/Bourgeoisie) or purple
  (Proletariat/Socialist). Don't re-derive faction per component — `PercentileCircle` and the
  balance display both take the flag rather than computing it.
- **Use the faction palette sparingly.** Purple and gold *may* be used as accents without a
  literal faction meaning — they're part of the house palette — but don't overuse them; they
  carry the most weight when reserved for a few highlights per view. On faction-neutral surfaces,
  default to the neutral `text`/`text2` tokens with `green`/`red` for genuine positive/negative
  signals, and let purple/gold be the occasional accent rather than the baseline.
- **Keep surfaces flat — no decorative glow.** The terminal aesthetic is flat: `.terminal-pane`
  carries no `box-shadow`, and accent strips / dividers are solid color bars, not glowing ones.
  Don't add `box-shadow: 0 0 …` halos to highlight strips, stat cells, or card edges. Reserve
  glow for the few places it carries meaning — the live-rail `dial-knob`, the live status ping,
  and value text-shadow on hero numbers (`textShadow: 0 0 … var(--color-…-15)`) — not as ambient
  decoration. Prefer a `hover:bg-card2` / width-grow strip for hover feedback over a shadow.
- **Prefer tokens and utilities over inline `style`.** Where a CSS variable maps to a Tailwind
  token (`text-text2`, `bg-card3`, `border-border`, `text-green`), use the class — including for
  conditional colors via a className expression — rather than `style={{ color: 'var(--color-…)' }}`.
  Inline `style` is fine for things utilities can't express (computed `left:` positions, dynamic
  gradients, viewport-pinned backgrounds).

---

## 3. Visual-Language Reference

Pointers, not the full catalog. **For authoritative values and the complete class list, see
CLAUDE.md → Styling.**

- **Surfaces (light → dark):** `bg` (canvas) · `card` (primary container) · `card2` (raised /
  active panel) · `card3` (inner well / dropdown). Detail Cards and panes sit on `card`; input
  rails use `card3`.
- **Borders:** `border` (Tier 1, soft separation — pane dividers, card outlines) · `border2`
  (Tier 2, high-contrast / interactive — input rails, the `AmountInput` frame).
- **Faction accents:** `purple` (Proletariat/Socialist) · `gold` (Bourgeoisie/Capitalist), each
  with `-hover` and transparency tokens `-15` / `-35` / `-70` (used for glow shadows and tinted
  backgrounds, e.g. `bg-(--color-red-15) border border-(--color-red-35)`).
- **Trading signals:** `green` (buy / bull / live) · `red` (sell / bear / halt / warning).
- **Gradients:** `--sunset` (purple→magenta→orange→gold) and its `--sunset-15` / `--sunset-35`
  opacity variants. The Band uses `--sunset-15`; primary buttons fill with `--sunset`.
- **Fonts:** `--font-display` (Exo 2) · `--font-sans` (Space Grotesk) · `--font-mono`
  (JetBrains Mono).
- **Key global classes by archetype:** Detail Card → `terminal-pane`, `terminal-pane-header`,
  `terminal-pane-title`, `kv-row`. Mask → `connect-gate` / `connect-gate-body`,
  `btn-game-primary`, `btn-terminal-action action-buy|action-sell`, `btn-stepper`, `mask-label`.
  Panel Menu → `terminal-view-selector-bar`, `terminal-view-btn` (`.active`). Band →
  `live-rail-container`, `track-absolute-pin`, `dial-knob current`, `gini-label`. Status →
  `.pill`. Loading → `animate-pulse` + the text `Reading Ledger…`.

---

## 4. Motion

- **Page entry:** `animate-in fade-in duration-700` on the layout root.
- **Fold transitions (Reveal Row):** `transition-[grid-template-rows] duration-300 ease-out`.
- **Gauge knob (Band):** `transition-all duration-700 ease-out` as it eases to its BPS position.
- **Progress ring (PercentileCircle):** `transition-all duration-1000 ease-out`.
- **Loading state:** `animate-pulse` skeleton/text with the copy `Reading Ledger…`.
- **Live vs. halted indicators:** live = a pulsing green dot (`rounded-full bg-green …
  animate-pulse`); halted/closed = a static red square (no rounding, no animation).
- **Hover-revealed controls:** stepper buttons fade in with `opacity-0 group-hover:opacity-100
  transition-opacity` rather than appearing/disappearing instantly.
