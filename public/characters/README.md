# Landing card art

Served as static files so the deck back in `src/components/HeroCard.tsx` can paint
them as CSS `background-image`s. Every card in the landing deck carries that back
and all of them are mounted at once, so inlining the svgr components instead would
put megabytes of purely decorative DOM on the page.

## Two things are required, and both fail silently

**1. A `viewBox`.** The Inkscape sources have `width`/`height` but no `viewBox`,
which is why every `<Regardo />` / `<Carlo />` render in `LandingClient.tsx` passes
one as a prop. An SVG without a `viewBox` does not scale its contents when painted
as a CSS background — the artwork stays at its intrinsic user units and the box just
clips it. The copies here carry one baked in.

**2. Exclusion from the middleware matcher.** `src/middleware.ts` tenant-rewrites
every path its matcher does not exclude, so a public file left in comes back as an
HTML app route rather than the asset — and a `background-image` resolving to
`text/html` renders as nothing, with no console error. `characters/` is excluded as
a folder for this reason. Worth checking directly if art ever stops appearing:

```
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://app.localhost:3000/characters/RegardoHead.svg
# expect: 200 image/svg+xml
```

## RegardoHead.svg — the portrait on the card back's coin

`Regardo.svg` cropped to the head, `viewBox="20 -12 480 536"`, measured off 1:1
Inkscape renders. Two details worth knowing before regenerating it:

- **The walking cane is clipped out, not deleted.** The master outline path draws
  every black outline in the figure — the cane's included — as a *single continuous
  subpath*, so the cane cannot be removed element-wise. A `clipPath` cuts it instead,
  along a boundary following the measured gap between the cane and the jaw (13 user
  units at its narrowest, around y=454).
- **The bottom lands at y=524, below the jaw — not on it.** A pixel scan of that band
  shows the silhouette narrowing to its minimum at y≈510 and then *widening again*:
  the head never closes, it merges straight into the collar. So cropping at the jaw's
  narrowest still leaves a flat black cut across the chin. y=524 clears the jaw's
  curve and takes a sliver of collar with it, which reads as shoulders inside the
  medallion. Much lower and the tie appears.

`HeroCard.tsx` sizes the portrait inside the coin face from `PORTRAIT_HEIGHT` /
`PORTRAIT_TOP`, fitted so the hat clears the face's circular clip. Re-crop the head
and those two constants must move with it.

The rest of the card back — the guilloché field, rope border and microprint — is not
a file here: it is drawn to a canvas by `src/lib/cardBackArt.ts`, because it has to
track the panel's real size.

## Regardo.svg / Carlo.svg — full figures

Full-body copies from an earlier version of the card back. **Nothing references
these now** — the back carries the head alone. Kept only in case the paired-figure
composition comes back; safe to delete otherwise. Carlo's is the *padded* viewBox
`LandingClient` uses (empty headroom standing in for Regardo's hat) with his root
`height` raised to `919.01` to match, so `preserveAspectRatio` does not letterbox it.
