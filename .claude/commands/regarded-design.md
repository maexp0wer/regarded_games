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

**Before writing any markup, read Section 0.** It is the set of non-negotiable rules that the
generated output keeps violating. If a choice in a later section ever seems to conflict with
Section 0, Section 0 wins.

---

## 0. Non-Negotiable Rules (read this first)

These are hard constraints, not preferences. Most "off-brand" output comes from breaking one of
them. Apply all of them on every component.

### 0.1 Surface layering — pick the level by depth, never by taste

Surfaces nest in a strict ladder. The level is determined by *how deeply nested* the element is,
not by how much you want it to stand out:

| Element | Surface token |
| --- | --- |
| Page canvas (the route background) | `bg-bg` |
| A plain card / pane sitting on the page | `bg-card` |
| A card **on** a card (raised module, active panel, a tile inside a card) | `bg-card2` |
| A card **on** a card-on-a-card (inner well, dropdown, the deepest nested block) | `bg-card3` |
| **Input fields** (text/number inputs, the AmountInput rail, any field that takes typing) | `bg-card3` |

Rules:
- Go **exactly one level deeper** per nesting step. A card inside a `card` is `card2`; do not jump
  straight to `card3` to "make it pop," and do not put a `card` on a `card`.
- **Input fields are always `card3`**, regardless of how deep they sit. A search/number/text field
  reads as the deepest well on the surface.
- Do not invent intermediate shades, opacities, or tints to fake a new level. The four tokens
  (`bg` → `card` → `card2` → `card3`) are the entire vocabulary.

### 0.2 Flat surfaces — NO box-shadow, NO gradients on content

Content surfaces are completely flat. Separation comes from the surface ladder (0.1) and borders
(0.3) — never from shadow or gradient.

- **Never** add `box-shadow` to a card, pane, stat cell, data row, tile, list item, or input.
  No `shadow-*` Tailwind utilities, no `box-shadow:` inline, no glow halos (`0 0 …`), no drop
  shadows for "depth." `.terminal-pane` is flat by definition — keep everything that way.
- **Never** put a gradient on a content surface as decoration (no `bg-gradient-*`, no
  `linear-gradient(...)` fills on cards/panes/rows/headers).
- **The only sanctioned exceptions** — already baked into existing global classes, so you get them
  for free and should not re-create them by hand:
  - The **primary CTA** (`.btn-game-primary`) and the **execute buttons**
    (`.btn-terminal-action.action-buy|.action-sell`) deliberately use the `--sunset` gradient fill
    and a colored glow. Use the class; never hand-roll the gradient/shadow elsewhere.
  - The **Band** header strip uses the `--sunset-15` viewport-pinned gradient (Section 1 → Band).
  - The live-rail **`dial-knob`**, the **live status ping** (pulsing green dot), and hero-number
    **text-shadow** carry meaning, not decoration.
  - **Modals / dropdowns** (`.modal-overlay-blur` and elevated `card3` popovers) may carry an
    elevation shadow — that is the one place "floating above the page" is real.
- For hover feedback on a flat surface, change the **surface** (`hover:bg-card2`) or the **border**
  (`hover:border-border2`) or grow a solid accent strip — **not** a shadow.

### 0.3 Fonts — numbers are `font-mono`, everything else is `font-display`

- **`font-mono` (JetBrains Mono):** every numeric value — balances, prices, ranks, percentages,
  countdowns, timestamps, addresses — **plus** small mono labels/units. Always pair changing
  numbers with the `tabular-nums` class so digits don't jitter.
- **`font-display` (Exo 2):** everything that is not a number — titles, headings, button labels,
  tab labels, section labels, big game actions. Usually `font-black uppercase tracking-tight`.
- `font-sans` (Space Grotesk) is reserved for genuine prose/body copy (descriptions, help text).
- If you are unsure: a value you'd read as a *figure* → `font-mono`; a *word* the UI presents →
  `font-display`.

### 0.4 Selectors / segmented toggles — use the established selector treatment

Any "pick one of N views/options" control (tabs, view switchers, timeframe pickers, filter
segments) uses one of the two existing patterns — never a bespoke styled `<button>` group:

- **Panel/view tabs:** `terminal-view-selector-bar` › `terminal-view-btn`, open tab gets
  ` active` (lights the bottom indicator). See `AuctionPanelMenu.tsx`.
- **Compact segmented selector** (the timeframe-pill pattern): a `flex items-center gap-0.5` row of
  buttons styled exactly like the `TimeframeSelector` in `TradingChart.tsx`:
  ```
  className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wide rounded
    transition-colors duration-150 ${
      active ? 'bg-card3 text-text' : 'text-text2 hover:bg-card2 hover:text-text'
    }`}
  ```
  Active segment = `bg-card3 text-text`; inactive = `text-text2 hover:bg-card2 hover:text-text`.
- Filter rails inside inputs use `btn-input-switch` (`.filter-buy|sell|all|gold`). See `OrderBook`.

### 0.5 Regular buttons — use `btn-game-secondary`

A standard (non-CTA, non-selector) button is the **`btn-game-secondary`** class, used verbatim —
the same button as the "All Seasons / Active Seasons" toggle in `SeasonListDashboard.tsx`
(`className="btn-game-secondary px-4 py-2 text-[11px]"`). It resolves to a `font-display`
uppercase label, a flat `card2` background (no shadow, per 0.2), and a `border` → `border2`
border on hover. Do not hand-roll button colors; reach for this class (or `btn-game-primary` for
the one primary CTA per view, and `btn-terminal-action` for buy/sell execute).

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
- **`.pill-solid`** — solid status tag (mono, uppercase) for phase/status badges: the
  accent fills the background, text drops to the page canvas (`--color-bg`) to read against
  it. Set the fill per-use via a `bg-*` utility or inline `background`.

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
- **Match the font to the content.** This is **Rule 0.3**. `font-mono` (JetBrains Mono) for every
  number (and addresses, timestamps, mono labels/units); `font-display` (Exo 2, usually
  `font-black uppercase tracking-tight`) for everything that is not a number — titles, headings,
  button/tab labels, big game actions; `font-sans` (Space Grotesk) for genuine body copy and
  descriptions only.
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
- **Keep surfaces flat — no decorative glow.** This is **Rule 0.2** — restated here because it is
  the most-violated one. The terminal aesthetic is flat: `.terminal-pane` carries no `box-shadow`,
  and accent strips / dividers are solid color bars, not glowing ones. Don't add `box-shadow` /
  `shadow-*` / `0 0 …` halos to highlight strips, stat cells, card edges, rows, or inputs, and
  don't put gradients on content surfaces. Reserve glow/gradient for the sanctioned exceptions in
  0.2 (gradient CTAs, the Band, the live-rail `dial-knob`, the live status ping, hero-number
  text-shadow, elevated modals). Prefer a `hover:bg-card2` / `hover:border-border2` / width-grow
  strip for hover feedback over a shadow.
- **Layer surfaces by nesting depth.** This is **Rule 0.1**. Page → `card` → `card2` → `card3`,
  one step deeper per level of nesting; inputs are always `card3`. Don't skip levels or invent
  tints to fake a new surface.
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
  `.pill-solid`. Loading → `animate-pulse` + the text `Reading Ledger…`.

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
