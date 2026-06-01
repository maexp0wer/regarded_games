---
name: regarded-design
description: Injects the Regarded Games front-end design blueprint into the conversation. Use before building or reviewing any UI component to ensure alignment with the established design language — colors, typography, spacing, motion, and structural patterns.
---
You now have full access to the Regarded Games Front-End Design Blueprint. Apply every rule below when building or reviewing components for this project.

**No emojis.** Never use emojis in any UI text, labels, button copy, tooltips, status indicators, or comments in code.

---

# Front-End Design Blueprint: Gamified Trading Terminal

---

## 1. Theme Configuration & Typography

### Typography Hierarchy
- **`font-display` (Exo 2):** Use strictly for high-impact titles, main header actions, global ranks, and primary game actions. Apply `font-black`, `uppercase`, `tracking-tight`, and tight line heights.
- **`font-sans` (Space Grotesk):** Use for standard body paragraphs, descriptions, comment feeds, and UI subtitles.
- **`font-mono` (JetBrains Mono):** Use for numerical values, blockchain/wallet addresses, dates, timestamps, countdown ticks, labels, and metadata.
  - *Constraint:* Every numerical value must carry the `tabular-nums` utility class.

### Mode-Aware Color System
All CSS color variables must map exactly to these definitions:

| Token Name | Light Mode Value | Dark Mode Value |
| :--- | :--- | :--- |
| `--color-bg` | `#F8F9FC` | `#0D0B14` |
| `--color-card` | `#FFFFFF` | `#161322` |
| `--color-card2` | `#F1F3F9` | `#1F1A30` |
| `--color-card3` | `#E4E8F2` | `#2B2544` |
| `--color-border` | `#E2E8F0` | `#251F3D` |
| `--color-border2` | `#CBD5E1` | `#4C3F7A` |
| `--color-purple` | `#6A1B9A` | `#9D4EDD` |
| `--color-purple-hover` | `#4A148C` | `#B577F2` |
| `--color-gold` | `#D4AF37` | `#FFC300` |
| `--color-gold-hover` | `#AA820A` | `#FFD447` |
| `--color-green` | `#00875A` | `#00F5A0` |
| `--color-green-hover` | `#006644` | `#33FFBC` |
| `--color-red` | `#D32F2F` | `#FF3B69` |
| `--color-red-hover` | `#B71C1C` | `#FF6687` |
| `--color-magenta` | `#B8004F` | `#D81B60` |
| `--color-orange` | `#D35400` | `#FF8C00` |

### Semantic & Faction Color Mapping
- **Purple (Proletariat / Socialist):** Socialist Syndicate branding, community-driven proposals/governance polls, proletariat-specific assets/visual markers.
- **Gold (Bourgeoisie / Capitalist):** Capitalist branding, high-roller vaults, payouts, claims, capitalist-specific assets/visual markers.
- **Green (Bullish / Positive Market):** Upward price movements, positive PNL, buy/bid operations, successful active status indicators.
- **Red (Bearish / Market Halt):** Downward price movements, negative PNL, sell/ask operations, warnings, system locked/halted indicators.

### Gradients & Transparency Layering
- `--cyber-sunset`: `linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 45%, var(--color-orange) 75%, var(--color-gold) 100%)`
- `--subtle-glow`: `linear-gradient(90deg, var(--color-purple-15) 0%, var(--color-magenta-15) 45%, var(--color-orange-15) 75%, var(--color-gold-15) 100%)`
- *Transparencies:* Declare low-contrast overlays at 15%, 35%, and 70% using: `color-mix(in srgb, var(--color-[token]) [opacity]%, transparent)`.

---

## 2. Layout, Spacing, & Depth Constraints

### Base Grid System
All layouts must follow a 5px spacing step system.

### Density Levels
- **High-Density (Data Components):** Padding `p-3` to `p-4`, sibling gaps `gap-1.5` to `gap-2.5`.
- **Standard-Density (Widget Panes):** Padding `p-5` to `p-6`, structural gaps `gap-4` to `gap-6`.

### Spacing Flow Directions (The Margin Rule)
- **No individual vertical margins:** Child elements must not carry `my-*`, `mt-*`, or `mb-*` classes.
- **Parent-flex gaps:** Vertical flow must be handled entirely by the parent container using `flex flex-col gap-*`.

### Depth (Z-Index) Hierarchy Map
- `z-1000` : Modal Overlays and Blur Backdrops (`.modal-overlay-blur`)
- `z-200`  : Tooltips, Popovers, and Dropdowns (`.tooltip-box` / `.locked-info-box`)
- `z-100`  : Translucent Fixed Navigation Bar (`.nav-container`)
- `z-10`   : Interactive Items (Buttons, Inputs, Toggles)
- `z-0`    : Default Container Surfaces (`.terminal-pane` / `.landing-card`)
- `-z-10`  : Backdrop Blurs (`.hero-blur-backdrop`)
- *Isolation Constraint:* Containers containing backdrop glows must declare `isolate` on their outer parent.

---

## 3. Structural Component Blueprints

### Stat Separation Grids
- **Structure:** Grid with `bg-border`, `gap-px`, `border border-border rounded-xl overflow-hidden`.
- **Cell Design:** Background `bg-card`, hover `hover:bg-card2`.
- **Highlight Strip:** `absolute left-0 top-0 bottom-0 w-1 bg-[color-accent] group-hover:w-1.5 transition-all` inside each cell.

### Button Hierarchy
- **Primary Action (`btn-game-primary`):** Background `var(--cyber-sunset)`, no border, text `var(--color-bg)`. Shadow: `0 4px 14px color-mix(in srgb, var(--color-purple) 35%, transparent)`.
- **Secondary Action (`btn-game-secondary`):** Background `var(--color-card2)`, border `1px solid var(--color-border2)`, text `var(--color-text)`. Hover: border transitions to `border-purple` with shadow `0 0 12px var(--color-purple-15)`.

### Inline Countdowns
- **Label:** `font-mono text-xs font-bold text-text2 uppercase tracking-widest`
- **Numerical Blocks:** `flex items-center gap-1 bg-card2 border border-border px-1.5 py-0.5 rounded` — value uses `font-mono font-bold text-text tabular-nums`, micro-label uses `text-[9px] text-[accent] font-bold`.
- **Separators:** Colons in `font-mono font-bold text-border2` with `animation: terminal-blink 2s steps(1) infinite`.

### Active Notification Radar & Banners
- **Invisible Empty States:** Wrap alert components in a parent with `empty:hidden`.
- **Indicators:** Color-coded left-margin absolute bars inside list items — gold for payouts, purple for polls, border2 for chat replies.

---

## 4. State Interactions, Motion, & Truncation

### Interactive Physics Transitions
- **Micro-Interactions (hovers, clicks):** `transition-all duration-150 ease-in-out`. Clicks trigger `active:scale-[0.98]` or `active:translate-y-[1px]`.
- **Macro-Interactions (modal pops, card hovers):** `transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]`.
- **Card Hover Translate:** `hover:-translate-y-1.5` with `hover:shadow-[0_12px_30px_rgba(0,0,0,0.15),_0_0_20px_var(--color-purple-15)]`.

### Live / Offline Indicators
- **Live/Active:** `rounded-full bg-green shadow-[0_0_8px_var(--color-green-35)] animate-pulse`
- **Closed/Halted:** Static square `bg-red shadow-[0_0_8px_var(--color-red-35)]` (no `rounded-full`, no animation).

### Disabled Buttons & Hover Info Tooltips
- **Disabled State:** `cursor-not-allowed opacity-40 hover:scale-100 shadow-none`
- **Tooltip Triggers:** Wrap trigger in `relative inline-flex`.
- **Tooltip Box:** Absolute, `bg-card3`, `border border-border2`, `rounded-md`, shadow: `0 10px 24px rgba(0,0,0,0.2), inset 0 -2px 0 0 var(--color-red)`. Text: `font-sans text-xs text-text text-left leading-normal`. Arrow caret pointing to hover source via `::after` pseudo-element using `border-color: var(--color-border2) transparent transparent transparent`.

### High-Density Scrollbars
- Track width: `6px`. Track background: transparent. Thumb: `text-text2`.
- Use `.scrollbar-on-hover` to hide thumb until hover: `scrollbar-color: transparent transparent` → `:hover { scrollbar-color: var(--color-text2) transparent }`.

### Truncation & String Management
- **Addresses:** Format as `0xXXXX...XXXX` inside `font-mono text-[11px] tracking-widest text-text2 uppercase`.
- **Text Blocks:** Containers with truncated headings must carry `min-w-0` so children can safely apply `truncate`.
