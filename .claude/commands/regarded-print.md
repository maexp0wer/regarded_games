---
name: regarded-print
description: Injects the Regarded Games print design paradigm — the banknote/plate language of the hero cards, landing deck and note buttons. Use before building or reviewing any surface outside the /app terminal, or any object that should read as printed matter.
---
You now have the Regarded Games **print paradigm**. It is derived from the two faces of
`src/components/HeroCard.tsx` and the art that draws them (`src/lib/cardBackArt.ts`,
`src/lib/cardFrontArt.ts`, `src/lib/holoFoil.ts`, `src/lib/noteButtonArt.ts`), plus the
surfaces that already quote them (`BanknoteButton`, `BanknoteGround`, `DeckRail`,
`DeckChevron`).

**Which paradigm applies.** The project runs two, and they do not mix:

| | `/regarded-design` — **Terminal** | `/regarded-print` — **Print** (this doc) |
| --- | --- | --- |
| Where | `/app` routes: season pages, masks, panels | landing deck, hero cards, rulebook, marketing surfaces — any object that is *a thing*, not a readout |
| Ground | theme tokens, light/dark | printed stock, mostly literal |
| Surfaces | flat, no shadow, no gradient | layered, gradient chassis, glow, foil |
| Ornament | none | licensed by tier (Section 0) |
| Mono means | a number | a legend |

If a surface reports live state, it is Terminal. If it *is* an object a reader picks up, it is
Print. A printed object may contain a terminal readout; it does not become one.

---

## 0. The one law (read this first)

**Ornament is licensed by tier. A surface earns ornament by having nothing to lose.**

This is the whole paradigm, and it is why the card back is dense and the card front is quiet.
The back is identical on every card in the deck, changes with nothing, and carries two pieces of
content (a wordmark and one link). It has no legibility to spend, so it spends none and takes the
entire vocabulary. The front carries a title, a tag, an illustration, a class, two abilities and a
footer, all of which differ per card. Every stroke of ornament there is taken out of that.

Do not decide ornament by taste, by how important the thing feels, or by how much space is free.
Decide it by asking: **how much of this surface varies, and how much of it is content?**

### 0.1 The four tiers

| Tier | What qualifies | Ornament budget | Examples |
| --- | --- | --- | --- |
| **A — Plate** | Invariant across the whole set; house-owned; content is a mark and at most one link | The full vocabulary, all five families at once | Card back; a cover; a colophon |
| **B — Note** | House-level, small, repeated, sits *on* the page rather than in it; content is one label or icon | **One** family, at reduced scale, plus foil if it is the page's primary action | `BanknoteButton`, `BanknoteGround` |
| **C — Face** | Content-bearing; varies per instance; the reader is here to read it | **One** family, damped, confined to a header or an edge; everything else flat stock and hairlines | Card front |
| **D — Chrome** | Navigation, progress, affordances | **Zero.** Muted ink only | `DeckRail`, `DeckChevron` |

A surface sits in exactly one tier. When unsure between two, take the lower.

### 0.2 One ornament per view

Already law in the codebase (`DeckChevron.tsx`): *"one ornamental element per view is the budget,
the rail spends it."* Per rendered view, one element may carry ornament; everything else in that
view drops a tier. On a card front, the header band is it — which is exactly why the illustration
frame gets four 12px corner brackets and nothing else, and the footer gets no box at all.

### 0.3 Quotation, not repetition

A lower tier does not *reuse* the tier above's ornament; it **quotes** it, restated smaller,
quieter, and in its own colour. The front takes exactly three things from the back:

1. **The guilloché** — as a band across the header, not a field across the panel, and faded out
   under the title (`HEADER_GUILLOCHE_FADE`) so the type sits on clean stock.
2. **The coin** — at 40px instead of 184px, with the reeding cut from 144 to 48 (the back's count
   aliases at that size), and **with the glow removed** (*"at this size the halo competed with
   the symbol"*).
3. **The stock** — `FRONT_WELL === BACK_STOCK`, so both faces are printed on the same paper.

That is the pattern to follow for anything new: pick one or two motifs, cut their scale, cut their
count, cut their alpha, and drop whatever stops working at the new size. Never carry a motif down
a tier at full strength.

### 0.4 Colour is struck by tier

| Tier | How colour is specified | Behaviour in light mode |
| --- | --- | --- |
| **A — Plate** | **Literal hex, hardcoded.** The plate is a printed object, not a themed surface | Unchanged — stays dark |
| **B — Note** | **Theme tokens** (`var(--color-purple)`, `bg-card2`, `text-text2`) | Follows the theme |
| **C — Face** | **The instance's own accent** (`themeColorRgba`) over literal stock | Stock stays dark; accent follows the token |
| **D — Chrome** | `text`/`text2` only | Follows the theme |

On a Plate, do not reach for a token, not even the dark-mode value of one — strike the hex
(`BACK_STOCK #0D0B14`, `BACK_INK #9E97BD`, `BACK_EDGE #251F3D`, `BACK_WORDMARK #D6CFEA`).
`BanknoteButton` shows the Note-tier counterpart: it rebuilds the sunset out of tokens rather than
using `--sunset`, *"that token resolves its colours where it's declared, so it would ignore a
`.dark` set below `<html>`."*

### 0.5 Content wells are always the stock

Every inset ground on a printed object — the illustration frame, the class box, a coin face, a
callout — is `#0D0B14`, literal. **Never tint a well with the accent colour.** The accent appears
only as a hairline border, a rule, a glyph or a glow around the well, never as its fill. This is
the single rule that keeps ten differently-coloured cards reading as one deck.

---

## 1. The ornament vocabulary

Five families. Everything printed in this system is one of them. Do not invent a sixth; extend one.

### Guilloché — interfering harmonic curves
Three forms, all `lineWidth 0.6`:
- **Vortex** (`drawCardBackArt`) — two counter-turning families of log spirals, `θ = 2πk/n +
  twist·ln(r/40) + 0.018·sin(r/10)`. 72 strands at twist `2.4`, alpha `0.3`, braided over 36 at
  `-0.9`, alpha `0.14`. Field-scale. Tier A only.
- **Band** (`drawCardHeaderGuilloche`, `BanknoteGround`) — phase-shifted sines under a shared
  pinch envelope. 12 tight strands (λ = 44) at alpha `0.5` over 6 loose (λ = 132) at `0.24`,
  envelope period 264, `0.72 + 0.28·sin`. Edge- and header-scale. Tier B/C.
- **Rosette** (coin engraving, the back's coin band) — a closed polar curve, `r = 116 + 7·sin(24θ)`
  in three strands at 2π/3 phases, or a ring of N circles placed by `rotate()`. Badge-scale.

### Rope braid — the border
Two strands swinging ±`amplitude` about a rounded-rect path, crossing every `pitch`, sampled at
12 points per cycle so small braids stay smooth. Parameterised by the exported `Braid` type, so a
new object gets the house border by supplying five numbers:

| | inset | radius | amplitude | pitch | lineWidth |
| --- | --- | --- | --- | --- | --- |
| `CARD_BACK_ROPE` | 12 | 9 | 4.5 | 12 | 0.6 |
| `NOTE_ROPE` | 3.5 | 4 | 2 | 7 | 0.8 (foil 1.1) |

Keep `inset - amplitude > 0` so the strands print on the stock, not off the edge. On a Note the
braid **is** the border — `BanknoteButton` draws no `border` of its own.

### Microprint — the legend rule
`REGARDED GAMES · CLASS WAR: THE GAME · ` set at `600 5.5px` mono, alpha `0.55`, clipped to an 8px
band and run clockwise around the frame so every edge reads outward-up. Tier A only; it is
illegible by design and disappears entirely below ~300px of edge.

### Coin — the mark
The house object. Milled edge (a dashed ring normalised with `pathLength` so the reeds close
evenly), a dark rim between two rules, an optional rim legend on two arcs (top clockwise, bottom
counter-clockwise, so both read upright), an engraved rosette, and an obverse/reverse.

| | viewBox | size | reeds | rules at | rosette |
| --- | --- | --- | --- | --- | --- |
| Back (docs link) | 200 | 184px | 144 | r 93.5 / 71.5 | 24 circles, alpha 0.13 |
| Front (header symbol) | 48 | 40px | 48 | r 20.2 / 16.6 | 12 circles, alpha 0.16 |

Halve the reed count roughly with each halving of diameter, or the dashes alias. Below ~32px, drop
the rosette and the inner rule and keep the milled edge alone.

### Holographic foil — the hover reward
One layer, masked twice: to a **shape** (a braid bitmap, a rim ring, an icon's own markup) and to a
**pool** around the cursor. Spectrum bands slide as the pointer moves — the "viewing angle" —
with a white glare walking underneath. At rest it is plain print; foil only exists under a pointer.

Scale it to the object: the card back cycles the spectrum over 24% of a 300%-sized background with
a 50/190px pool; a 56px button cycles every 70px with a 36/120px pool. On light stock push the
spectrum deeper (`saturate-[1.6] brightness-[0.85]`) so the pastels still read.

Foil is a **reward, not a state**: never use it to indicate selection, validity or status.

---

## 2. The printed-object recipe

Both card faces are the same six-layer build. Use it verbatim for any new Tier A/C object
(a cover, a pass, a certificate, a ticket, a season plate).

1. **Halo** — carrier at `#070709`, `rounded-md p-3`, `boxShadow: 0 0 40px rgba(accent, 0.15)`
   rising to `0.5` while the object is hovered, `transition-all duration-500`.
2. **Chassis** — the metal frame: a 5-stop `135deg` gradient in one hue (dark → light → mid →
   light → dark), `border: 1px rgba(accent, 0.55)`, and
   `inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)` for the struck edge.
   `rounded-md p-2.5`. The Plate's chassis is the full sunset instead of one hue.
3. **Tooth** — `repeating-linear-gradient(45deg, …0 2px, rgba(0,0,0,0.03) 2px 4px)` at
   `opacity-25 mix-blend-overlay`. Paper grain. Invisible individually, absent if you skip it.
4. **Bevel** — `absolute inset-1 border border-black/15 rounded`.
5. **Stock** — the inset well: `#0D0B14`, `border` in the accent at 0.25–0.30, `shadow-inner`.
6. **Print** — the ornament drawn onto the stock, then type above it.

A Tier B Note collapses this to layers 1, 5 and 6: glow, stock, braid.

---

## 3. Tier A — the Plate

**When:** the surface is the same on every instance, owned by the house rather than the content,
and carries no variable information.

**Anatomy** (card back, `HeroCard.tsx` → BACK SIDE):
- Full sunset chassis; the whole panel is one stock well, edge `BACK_EDGE`.
- Full-field vortex, clipped 38px in from the panel edge.
- A concentric rule ladder in from the edge: **rope 12 · hairline 20.5 · microprint 28.5 ·
  field 38**. Four rings is the house cadence; keep the ~8px steps if you build another.
- Rosette band around the coin's well, then a plain `INK` circle at the well's lip.
- The vortex is drawn on **its own layer** and the coin's well and both wordmark halos are erased
  out of it with `destination-out`, so type and mark sit on clean stock rather than over line-art.
  Do this rather than drawing a panel behind the type.
- **The wordmark prints twice, upright above the mark and inverted below it**, so the plate
  survives being turned around. Anything Tier A should read from both ends.
- Foil on the braid and the microprint only — the frame, never the field.

**Never** put a per-instance value on a Plate. The moment it varies, it is a Face.

---

## 4. Tier B — the Note

**When:** a small, repeated, house-level object sitting on the page: buttons, grounds, badges,
seals, dividers.

**Anatomy** (`BanknoteButton.tsx`):
- **Stock, then braid, then label.** No border property; the braid is the outline. The stock's
  `border-radius` is `inset + radius` so its corner is concentric with the braid's.
- Glow is a blurred copy of the footprint *behind* the stock (`absolute inset-1 blur-lg`),
  never a `box-shadow` on the stock itself.
- **Primary** = `card2` stock, sunset braid, glow at rest (`opacity-40` → `90` on hover), foil
  under the cursor. **Secondary** = `card` stock, `text2` braid, no rest glow; hover prints the
  braid in `text` and raises a neutral glow. One primary per view.
- A `round` Note (48px coin of stock for an icon) swaps the braid for a plain 2px rim mask and
  keeps the label colour on the icon.
- Ground (`BanknoteGround.tsx`) is the same idea at page scale: the wave field iris-printed in
  the sunset through a mask, at `opacity-10`, radially faded clear through the middle of the
  viewport where the content sits. **Ground is ground** — if you can see it as a pattern rather
  than as texture, it is too strong.

---

## 5. Tier C — the Face

**When:** the surface carries the content. This is where most new work lands, and where the
temptation to over-print is strongest. Resist it.

**Anatomy** (card front, `HeroCard.tsx` → FRONT SIDE): recipe layers 1–5, then four regions
stacked `flex flex-col justify-between space-y-2`:

1. **Header** — the one ornamented element. `rgba(12,12,15,0.6)` ground, `border` accent at 0.25,
   `px-4 py-2 rounded`. Carries the guilloché band (faded left→right so it gathers around the
   coin), a mono tag over a display title, and the coin at the right. If the object leads
   somewhere, the whole header is the control (Section 9).
2. **Frame** — the illustration well: stock ground, `border` accent at 0.30, an `inset-1
   border-white/5` bevel, and **four 12px corner brackets** at accent `0.35`. That is the entire
   ornament budget for this region; do not add a band, a braid, or a rule.
3. **Box** — the content well: stock ground, `border` accent at 0.25, `rounded-md p-3`. A mono
   title row with a glyph at the right, an italic sans quote under a `#251F3D` rule, then
   name/description pairs. **Flat. No ornament at all.**
4. **Footer** — an inert strip on the chassis itself: `text-[11px] font-mono opacity-80`, three
   cells, **no box and no background**. It sits directly on the coloured border, which is what
   makes it read as printed identity rather than as a UI bar.

**The Face's whole border system is one alpha ladder of the instance accent.** Use it; do not
invent values:

| Role | Accent alpha |
| --- | --- |
| Milled edge, lit reeds | 0.85 |
| Rim rules, dots, small marks | 0.55 – 0.70 |
| Milled edge, dark reeds · corner brackets | 0.35 |
| Content frame border | 0.30 |
| Header / box border | 0.25 |
| Halo, rest → hovered | 0.15 → 0.50 |

---

## 6. Tier D — Chrome

**When:** navigation, progress, and affordances that exist because the object's own shape does not
advertise them.

- **Uncoloured on purpose.** `DeckRail`: *"The slides carry the banknote printing… a rail that
  joined in would compete with them on every view. It reads as a margin mark instead, and the
  faction palette keeps its meaning."* Chrome uses `text2` / `text` and nothing else — no accent,
  no faction colour, no gradient, no foil.
- Size and opacity carry state, not colour: `DeckRail` marks the active stop by going
  `size-1.5 opacity-30` → `size-2 opacity-100 bg-text`.
- Labels live **out in the margin** (`absolute right-full`) so revealing them costs no width and
  reflows nothing.
- A hint that has landed dims itself: `DeckChevron` bobs until the reader's first step, then
  settles to `opacity-45` permanently.
- Chrome is where the **keyboard path** lives. On the deck the rail and the chevrons are the only
  focusable, labelled controls — a gesture-driven surface must always have a Chrome equivalent.

---

## 7. Type on printed surfaces

The Terminal rule (*mono = numbers*) does **not** apply here. On printed matter:

- **`font-mono` = the legend voice.** Anything that would be struck small into a plate: rim
  legends (`9.2px/700/ls 1.9` in a 200 viewBox), microprint (`5.5px/600`), the header tag
  (`10px font-black tracking-widest` in the accent), the class title (`15px semibold uppercase`),
  the footer strip (`11px`), margin labels (`9px font-black tracking-[0.12em]`). Numbers too —
  but the voice is *legend*, not *figure*.
- **`font-display` = house marks and names.** The wordmark (`17px font-black uppercase
  tracking-[0.3em]`), object titles, button labels (`text-sm font-black uppercase
  tracking-[0.12em]`), ability names. Tracking widens as the mark gets more ceremonial: `0.12em`
  on a button, `0.3em` on the wordmark.
- **`font-sans` = prose only.** Quotes, descriptions, body copy. Never a label.

**Contrast on the stock is measured, not eyeballed.** Body copy on `#0D0B14` is `#BDB6D6`
(10.07:1) — deliberately a shade lighter than `--color-text2`, which lands at 7.08:1 there. Any
accent used as *text* must be the brighter `-hover` token: base purple is 4.25:1 on the stock,
under the bar; `--color-purple-hover` reaches 6.4:1. Borders and chassis keep the base token.

---

## 8. Motion

**At rest, a printed surface is print.** Nothing moves until a pointer or focus asks it to. There
is no idle animation anywhere in this system except the docs coin's slow pulse, which is dropped
the instant it is hovered.

- **One thing moves per hover, and coupled things move off one state.** The header's band waves
  and its coin turns from the single `headerActive` flag, *"so they always start and stop
  together."*
- Durations: card flip `600ms easeInOut` · coin turn `500ms ease-out` · foil fade `450ms` ·
  glow / colour / scale `300ms` · card lift `300ms` (`y: -6`) · button lift `250ms`
  (`-translate-y-0.5`, `active:translate-y-px`).
- **A frozen animation resumes where it stopped.** `HeaderGuilloche` accumulates into a `clockRef`
  and only advances while playing, *"so it never jumps."* Do the same for anything hover-driven
  and continuous.
- **Travel speeds differ on purpose.** The band's envelope runs at 110px/s through strands
  drifting at 45 and 20, *"so waves visibly pass along the braid instead of the whole band
  sliding."* Equal speeds read as a sliding texture, which looks cheap.
- **Reduced motion:** foil holds `FOIL_REST` but still appears on hover; the band does not
  animate; lifts and bobs are dropped (`motion-reduce:`). Never remove the *state*, only the
  movement.
- **Hydration:** any transform that depends on `prefers-reduced-motion` must mount at rest with
  `initial={false}`. Any trig result rendered into an attribute must be rounded
  (`Number(n.toFixed(3))`) — Node and the browser disagree in the last digit.

---

## 9. Interaction and accessibility

- **Print the affordance.** Touch never hovers, so nothing may depend on it. The docs coin's rim
  literally reads `DOCUMENTATION`, the footer says `Docs ↩`, and the reverse of the header coin
  carries a **manicule** — the printer's pointing hand, meaning "see there", and the same hand the
  browser shows over a link. Hover adds delight; print carries the instruction.
- **Stretch the control, don't wrap the content.** A region that leads somewhere gets an empty
  `<a>`/`<button>` at `absolute inset-0 z-20`, laid over the band, title and mark. An `<h3>` may
  not live inside a `<button>`, and this way both control kinds share one shape. Supply **at most
  one** of `href` / `onClick`: the href is a real anchor (middle-click, cmd-click, open-in-new-tab,
  focusable), the handler is for a gated destination that pops a modal.
- **`stopPropagation` on every nested control**, so it does not also trigger the object's own
  click (the flip, the page turn).
- **`inert` on a turned-away face.** `backface-visibility` hides it visually but leaves its links
  tabbable; without `inert` a keyboard user tabs to an invisible control.
- **`backface-visibility` is per element, not inherited.** Every layer inside a 3D face that must
  turn with it needs its own flag, or the front's border and glow bleed through the back's edges.
- **Focus is visible everywhere**, in the local accent: `focus-visible:outline-2
  focus-visible:outline-offset-2` (offset 4 on a round mark), `outlineColor` = the object's accent.
- A control that is a `<button>` needs explicit `cursor-pointer` — it otherwise takes the
  browser's arrow and overrides the object's own cursor.

---

## 10. How ornament is built

These are engineering rules, and breaking them produces ornament that looks wrong at some size,
theme or moment.

- **Draw it, never ship it.** Ornament is generated to the element's *measured* size, because it
  hugs the real edge and its gradient must run corner to corner across the real panel. A 9-sliced
  image can do neither. Redraw from a `ResizeObserver` (which fires once on observe, covering
  first paint).
- **Print at 2×, hairline at 0.6px.** `prepareCanvas` sets `PIXEL_RATIO = 2` and a transform so
  you keep drawing in panel px. At 1× the hairlines smear.
- **Anything that must recolour is a mask, not a fill.** Render the ornament once as opaque-on-
  transparent (`#fff`), encode it via `toBlob` (off the main thread), and paint colour through it.
  A theme switch then recolours without a redraw; only a resize redraws. This is how the same
  braid serves print, foil and lit states on one button.
- **Draw lazily.** The back's art draws only once a card is actually flipped — the deck mounts ten
  cards and most backs are never turned. The header band animates only on the one hovered header.
- **Pointer tracking writes CSS variables, never state.** `trackFoil` rAF-throttles and sets
  `--foil-x/y` and `--foil-glare-x/y` directly on the element; React never sets them, so a
  re-render cannot reset them. No component re-renders on pointer move.
- **Re-draw once the webfont lands.** Anything that measures or sets type on canvas must redraw
  after `document.fonts.load(...)`, or it is left set in the fallback face.
- **Drop stale encodes.** Async mask renders carry a pass counter; a slow encode overtaken by a
  newer resize is discarded.
- **Scope SVG `defs` with `useId`**, stripped to `[A-Za-z0-9_-]` — `url(#…)` chokes on the rest,
  and the deck renders many copies on one page.

---

## 11. Checklist for a new printed object

1. **Tier?** How much varies, and how much is content? (0.1) Between two, take the lower.
2. **Budget spent where?** Name the single ornamented element in the view. (0.2)
3. **Quote, cut, drop.** Which one or two families? At what reduced scale and count? What stops
   working at that size and gets dropped? (0.3)
4. **Colour struck how?** Literal / token / instance accent, per tier. (0.4)
5. **Wells are stock.** No accent fills. (0.5)
6. **Build the six layers** — halo, chassis, tooth, bevel, stock, print. (Section 2)
7. **Borders off the alpha ladder.** (Section 5)
8. **Type by voice** — legend / mark / prose — and check contrast on `#0D0B14`. (Section 7)
9. **Rest is print.** One thing moves per hover; reduced-motion drops movement, not state.
   (Section 8)
10. **Print the affordance**, stretch the control, `inert` what is turned away, focus everywhere.
    (Section 9)
11. **Draw to measured size at 2×, recolour through masks, draw lazily.** (Section 10)
