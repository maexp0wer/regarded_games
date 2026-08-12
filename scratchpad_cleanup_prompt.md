# Codebase Cleanup Prompt

> **Role:** You are a senior engineer performing a disciplined, no-stone-unturned cleanup pass on a
> **Next.js 15 (App Router) + TypeScript + React (React Query) + Tailwind CSS** web application,
> with a **Ponder indexer** (GraphQL) and an **on-chain / web3 layer (viem + wagmi)**.
> This is a *hygiene and consistency* pass, **not** a feature or behavior change. **Preserve all
> observable behavior.** Every change must be justifiable as "same behavior, cleaner code."

---

## Prime Directives

1. **No behavior change.** No new features, no bug "fixes" that alter output, no dependency
   upgrades, no config/infra changes unless they are pure dead-weight removal. If you find a real
   bug, **log it in the report — do not fix it in this pass.**
2. **Every deletion must be proven dead.** Never delete on suspicion. Prove a symbol/file/asset is
   unreferenced (search the whole repo, including dynamic references, string keys, config, and
   build tooling) before removing it. When in doubt, list it as "candidate" and leave it.
3. **Small, reviewable, reversible commits.** One concern per commit. Each commit must build,
   typecheck, and lint clean on its own. Never mix a rename with a logic change in the same commit.
4. **Verify continuously.** After each logical group of changes, run the project's typecheck, lint,
   build, and tests. Report the exact commands and their results. Never claim "done" without a
   green verification you actually ran.
5. **Establish the convention before enforcing it.** When you find inconsistency, first determine
   the *dominant* / most-correct pattern in the codebase (by count and by quality), write it down
   as the target, then migrate the minority to it — not the other way around.
6. **Ask before ambiguous or destructive calls.** If two conventions are ~evenly split, if a
   "dead" export is part of a public API, or if a rename crosses a persistence/serialization
   boundary (DB columns, GraphQL schema, on-chain event names, URL slugs, cache keys, localStorage
   keys), **stop and ask** rather than guess.

---

## Phase 0 — Discover & Baseline (read-only; do this first)

Do not change anything yet. Produce a written inventory.

- [ ] **Map the stack & tooling.** Read `package.json` (scripts, deps, devDeps, engines),
  `tsconfig.json`(s), `next.config.*`, `eslint`/`biome` config, `prettier` config, Tailwind config,
  `.editorconfig`, CI config, and any `README`/`CONTRIBUTING`/architecture docs. Note the exact
  commands for: typecheck, lint, format, test, build.
- [ ] **Capture a clean baseline.** Run typecheck, lint, build, and tests **before touching
  anything** and record the output. Distinguish *pre-existing* failures/warnings from anything you
  might introduce. If the baseline is already red, note it — you must not make it *more* red, and
  ideally you leave it greener.
- [ ] **Confirm a clean git working tree** (or record what's already dirty) so your changes are
  isolatable. Work on a dedicated branch.
- [ ] **Inventory the layout & the stated conventions.** Identify the intended folder taxonomy
  (e.g. shared vs route-scoped components, `lib/` side-effectful vs `utils/` pure, hooks, config,
  types) and whatever naming rules already exist (in docs or by convention). Write down the target
  conventions you will enforce, derived from what's already dominant.
- [ ] **Produce a findings ledger.** For every candidate change, record: file:line, category,
  the evidence it's safe, and the proposed action. This ledger drives the rest of the work and
  becomes the final report.

---

## Phase 1 — Dead Code & Dead Weight (delete only what's provably unused)

For each item: **prove it's unreferenced across the entire repo** (source, tests, configs, build
scripts, dynamic/string-based imports, JSX usage, GraphQL docs, ABI/event names) before removing.

- [ ] **Unused files & modules** — components, hooks, utils, routes, assets never imported/rendered.
- [ ] **Unused exports** — exported symbols with zero external importers (consider a knip / ts-prune
  / `tsc`-based unused-exports pass, then hand-verify each hit; watch for barrel-file re-exports and
  dynamic imports).
- [ ] **Unused locals, params, imports, and types** — including unused React `import`s, unused
  destructured props, dead generics/interfaces/enums.
- [ ] **Dead branches & unreachable code** — `if (false)`, code after `return`, impossible
  conditions, permanently-off feature flags and the code they gate.
- [ ] **Commented-out code** — delete it; git history is the archive. Keep only genuinely
  explanatory comments.
- [ ] **Deprecated code paths** — anything marked `@deprecated`, "old", "legacy", "v1", "TODO
  remove", or shadowed by a newer implementation. Remove the deprecated path *and* its call sites,
  or (if still referenced) migrate callers to the replacement first, then remove.
- [ ] **Debug residue** — stray `console.log`/`debugger`, leftover test scaffolding, `.only`/`.skip`
  in tests, temp/scratch files, `*.bak`, editor cruft, empty files/folders.
- [ ] **Unused dependencies & scripts** — packages in `package.json` not imported anywhere;
  dead npm scripts; duplicate/overlapping libs doing the same job (flag, don't force-consolidate).
- [ ] **Unused assets** — images, fonts, icons, SVGs, static files with no references (check dynamic
  `src`/URL construction before deleting).
- [ ] **Stale config** — dead env vars (present in code but never set, or set but never read —
  reconcile against `.env.example`), obsolete tsconfig paths, unused eslint overrides, dead CI steps.

**Rule:** if you cannot *prove* it's dead, downgrade it from "delete" to "candidate for review" in
the report and leave the code in place.

---

## Phase 2 — Naming Alignment

Establish the target vocabulary first (from Phase 0), then converge to it. Naming changes are
mechanical but high-blast-radius — do them as isolated, rename-only commits.

- [ ] **Casing conventions by kind** — enforce the project's dominant scheme consistently, e.g.:
  components PascalCase, hooks `useX`, boolean props/vars `is/has/should`, constants
  `UPPER_SNAKE`, pure utils camelCase, types/interfaces PascalCase, files matching their default
  export. Fix the outliers to match the majority.
- [ ] **File & folder names** match their contents and their layer (route-scoped vs shared vs
  lib vs utils vs config vs types). Rename misfiled or mis-cased files.
- [ ] **Domain vocabulary is one term per concept.** Build a small glossary. If the same concept
  has two+ names in the code (synonyms, old-label vs new-label, abbreviation vs full word), pick the
  canonical one and migrate the rest. Kill deprecated labels in identifiers, comments, and strings.
- [ ] **Consistent terminology for symmetrical concepts** — e.g. pairs like open/close,
  create/delete, buy/sell, add/remove use the *same* verbs everywhere; no `fetchX` here and
  `getX` there for identical operations.
- [ ] **⚠️ Serialization boundaries are NOT free renames.** Identifiers that cross a persistence or
  wire boundary — DB columns/tables, GraphQL fields, on-chain event/arg names, API route shapes,
  URL slugs, query-param names, cache keys, `localStorage`/cookie keys, analytics event names — are
  **contracts**. Do not rename these to satisfy style. If one genuinely must change, flag it as a
  migration (needs a data/redirect/back-compat plan) and **ask first**.
- [ ] **Fix typos** in identifiers, comments, and user-facing strings — but treat user-facing string
  changes as behavior-adjacent (they affect copy/UX and possibly i18n keys); list them separately
  and get sign-off.

---

## Phase 3 — Harmonize How Things Are Done (pattern consistency)

The goal: someone reading two comparable files should see the *same* approach. Pick the best
existing pattern as canonical and migrate the rest to it. For each area below, first document the
dominant pattern, then converge.

### App / framework layer (Next.js 15 App Router)
- [ ] **Server vs client components** used consistently; `"use client"` only where actually needed
  (interactivity/hooks/browser APIs) and pushed to the leaves, not sprinkled at the top.
- [ ] **Data fetching** follows one model per layer — server components/route handlers fetch
  server-side; client state goes through the single client-cache convention (see React Query below).
  No ad-hoc `fetch` in a component where the established hook/util exists.
- [ ] **Route handlers / API routes** share one response shape for success and one for errors,
  one validation approach, and consistent status codes. No handler returns a bare value where the
  rest return the standard envelope.
- [ ] **`metadata`, `loading.tsx`, `error.tsx`, `not-found.tsx`** conventions applied uniformly
  where the pattern is already used.

### React / component layer
- [ ] **One state model.** Server/remote state via the query cache; local UI state via `useState`/
  `useReducer`. No parallel bespoke caches or global stores that duplicate the sanctioned approach.
  New global context only if it clears the project's stated bar; otherwise lift & prop-drill.
- [ ] **Component shape is consistent** — props typing style, default vs named exports per the
  folder rule, event-handler naming (`onX`/`handleX`), conditional-render idiom, list `key`s.
- [ ] **Shared loading / error / empty states** go through the canonical components — don't
  hand-roll a spinner or an error banner where a shared one exists.
- [ ] **Hooks** all follow the same skeleton (stable query keys, `enabled` guards, refetch policy,
  return shape). Deduplicate near-identical hooks.

### React Query (client cache)
- [ ] **Query-key strategy is consistent and collision-free** (same tuple shape, same
  parametrization). No stringly-typed keys competing with tuple keys for the same data.
- [ ] **`enabled`, `staleTime`/`refetchInterval`, and error handling** follow one policy per data
  class (fast/slow/static). Fix outliers with arbitrary intervals.
- [ ] **Fetch/transport helper is used everywhere** for a given source (e.g. one shared GraphQL
  fetcher / pagination helper) — never a hand-rolled single-page fetch where the shared paginated
  helper is the rule.

### Web3 layer (viem + wagmi)
- [ ] **Client-side reads/writes via wagmi hooks; server-side via a viem client** — consistently,
  per the established split. No mixing.
- [ ] **Addresses normalized consistently** (e.g. always lowercase, or always checksummed) at one
  well-defined boundary; comparisons never mix casings.
- [ ] **Contract addresses, ABIs, and chain config come from the single source of truth** (deploy
  artifacts / config module) — no hardcoded addresses or inline ABIs scattered around.
- [ ] **Transaction lifecycle** (idle → approving → executing → success/failed or the project's
  equivalent) is modeled the same way across every write path.
- [ ] **BigInt / units / decimals** handled with one set of helpers; no ad-hoc `Number()` on wei,
  no duplicated formatters.

### Indexer layer (Ponder)
- [ ] **Event handlers follow one structure**; shared derivation logic (roles, normalization,
  formatting) is factored into helpers, not copy-pasted per handler.
- [ ] **Address casing / normalization matches the frontend's convention** so cross-layer
  comparisons line up.
- [ ] **Schema field names and types are consistent** and match what the frontend queries; remove
  fields nothing reads (mindful this is a wire contract — see Phase 2 warning).
- [ ] **GraphQL query documents** are consistent (naming, variables, pagination) and use the shared
  client/pagination helper.

### Styling (Tailwind)
- [ ] **Design tokens over magic values.** Replace hardcoded colors/spacing/font strings with the
  project's CSS variables / theme tokens and shared utility classes. No stray hex codes where a
  token exists; no re-declared font-family strings where a variable exists.
- [ ] **Dark-mode / theming mechanism applied one way** (the project's chosen variant/class strategy)
  — not a mix of competing approaches.
- [ ] **Reusable class patterns** (buttons, cards, panes, rows, labels) go through the shared global
  classes/components instead of re-implementing the same cluster of utilities inline.
- [ ] **Class ordering / duplication / conflicting utilities** cleaned up; dedupe `clsx`/`cn`
  conditionals; remove redundant or overridden classes.

### Cross-cutting
- [ ] **TypeScript rigor** — replace `any`/unjustified `as` casts with real types where trivially
  safe; remove redundant non-null assertions; centralize shared types instead of re-declaring shapes.
  (Don't chase deep type refactors — flag large ones for a separate pass.)
- [ ] **Imports** — consistent ordering/grouping (per lint rule), path aliases used instead of deep
  relative `../../..`, no unused or duplicate imports, barrels used consistently (or consistently
  not).
- [ ] **Error handling & logging** — one convention for thrown vs returned errors, one logging
  approach; no `console.*` where a logger convention exists.
- [ ] **Async style** — consistent `async/await` (not mixed with `.then` chains for the same kind of
  work); no floating promises; consistent error propagation.
- [ ] **Formatting** — run the project's formatter across touched files so nothing in the diff is
  just whitespace churn; do a repo-wide format only if the team already commits formatted code.
- [ ] **Comments & docs** — remove stale/misleading comments; keep the "why", drop the "what";
  update any doc/README lines your cleanup makes inaccurate.

---

## Phase 4 — Verify

- [ ] Run **typecheck**, **lint**, **format-check**, **build**, and **the full test suite**. Paste
  the commands and results. All must be green (or no worse than the recorded baseline, with any
  remaining reds explained and pre-existing).
- [ ] **Behavioral spot-check** the areas you touched most (the critical flows) to confirm nothing
  observable changed. Note what you exercised.
- [ ] Re-run the dead-code / unused-export scan to confirm you didn't strand new dead code, and that
  your deletions didn't break a dynamic reference.
- [ ] Skim the **full diff** end to end: confirm every hunk is behavior-preserving and belongs to a
  named category. Anything that isn't → revert it out of this pass.

---

## Deliverables

1. **A branch of small, single-concern commits**, each green, ordered roughly:
   dead-weight removal → renames → pattern harmonization → styling/formatting. Never bundle a rename
   or a logic-touching change with unrelated edits.
2. **A cleanup report** containing:
   - The baseline vs. final verification output (typecheck/lint/build/test).
   - What was removed and the evidence it was dead.
   - The conventions you canonicalized (naming + patterns), with before/after examples.
   - **Deferred items:** real bugs found, risky renames across serialization boundaries, large type
     refactors, dependency consolidations, and anything you judged out-of-scope — each with a short
     rationale, so they can become follow-up tickets.
   - **Open questions** needing a human decision (evenly-split conventions, ambiguous "dead" code).

## Hard "Do Nots"

- Do **not** change runtime behavior, output, or UX copy without explicit sign-off.
- Do **not** upgrade/add/remove dependencies for reasons other than proven-dead removal.
- Do **not** rename anything crossing a DB/GraphQL/on-chain/URL/cache/storage boundary without a
  migration plan and approval.
- Do **not** delete anything you cannot prove is unreferenced.
- Do **not** do sweeping automated rewrites (codemods) without reviewing every hunk.
- Do **not** mix concerns in a commit, and do **not** report "done" without verification you ran.
