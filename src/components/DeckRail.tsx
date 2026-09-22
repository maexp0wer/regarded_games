// src/components/DeckRail.tsx

/* ---- Landing deck rail ----
   The landing is a fixed-viewport slide deck with no document scrolling, so
   there is no scrollbar to say how far the deck runs or where in it you are.
   This is that readout, and nothing more than that: a column of dots in the
   muted ink, the one in hand filled.

   Deliberately uncoloured. The slides carry the banknote printing — the
   guilloche ground, the foil, the sunset — and a rail that joined in would
   compete with them on every view. It reads as a margin mark instead, and the
   faction palette keeps its meaning.

   A section holding pages of its own (the rulebook) prints them as a short run
   of smaller pips beneath its dot, which is the one place in the deck where a
   reader can otherwise lose track of how much is left. Each pip jumps to its
   page: the deck swallows the wheel, so without them the only way back to a
   rulebook page is to tick through the whole book again.

   Desktop only, and never on the hero: below lg the deck is swiped, where the
   gesture needs no advertising and the viewport has no margin to give up, and
   on the opening slide there is no progress to report yet. */

export type RailStop = {
  id: string;
  /** Section name, shown on hover and read out to assistive tech. */
  label: string;
  /** Inner stops this section holds at this breakpoint; 0 or 1 = none. */
  pages: number;
  /** Name of each inner stop, shown on hover over its pip. Falls back to a
      page number where missing. */
  pageLabels?: string[];
};

export default function DeckRail({
  stops,
  activeIndex,
  activePage,
  onSelect,
}: {
  stops: RailStop[];
  activeIndex: number;
  /** Position within the active section's inner stops. */
  activePage: number;
  /** Jump to a section, optionally to a given stop inside it. */
  onSelect: (id: string, page?: number) => void;
}) {
  return (
    <nav
      aria-label="Deck sections"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 animate-in fade-in duration-500 lg:block"
    >
      <ul className="flex list-none flex-col items-end gap-4">
        {stops.map((stop, i) => {
          const active = i === activeIndex;

          return (
            <li key={stop.id} className="flex flex-col items-end gap-1.5">
              {/* The hover group is the dot's row, not the whole item, so a
                  pointer on one of the section's pips names the page alone
                  instead of stacking the section name over it. */}
              <div className="group relative flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(stop.id)}
                  aria-label={stop.label}
                  aria-current={active ? 'true' : undefined}
                  className="-m-2 flex cursor-pointer p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text2"
                >
                  <span
                    className={`rounded-full bg-text2 transition-all duration-300 motion-reduce:transition-none ${
                      active
                        ? 'size-2 bg-text opacity-100'
                        : 'size-1.5 opacity-30 group-hover:opacity-60'
                    }`}
                  />
                </button>

                {/* Section name, out in the margin so it costs the rail no
                    width and nothing reflows when it comes up. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-full mr-3 whitespace-nowrap font-mono text-[9px] font-black uppercase leading-none tracking-[0.12em] text-text2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                >
                  {stop.label}
                </span>
              </div>

              {/* Pages inside the section, each one a jump of its own. Always
                  printed, so the rail's height never jumps: dim while the
                  section is elsewhere, filled on the page in hand.

                  The pips are 3px, so the hit area is padded well past the ink
                  — outward horizontally, where it costs nothing, and only as
                  far vertically as the gap allows, so neighbouring pips never
                  overlap and swallow each other's clicks. */}
              {stop.pages > 1 && (
                /* `w-2` matches the active dot's footprint, so centring the
                   pips in it puts them on the dot's centre line rather than its
                   right edge — both columns right-align to the same margin. */
                <ul className="flex w-2 list-none flex-col items-center gap-2">
                  {Array.from({ length: stop.pages }, (_, page) => {
                    const onPage = active && page === activePage;
                    const pageName = stop.pageLabels?.[page] ?? `Page ${page + 1}`;
                    return (
                      /* `w-2`, the dot row's width, so this item's `right-full`
                         lands the page name on the same margin as the section
                         name above it. */
                      <li key={page} className="group/pip relative flex w-2 justify-center">
                        <button
                          type="button"
                          onClick={() => onSelect(stop.id, page)}
                          aria-label={`${stop.label}: ${pageName}`}
                          aria-current={onPage ? 'true' : undefined}
                          className="-mx-2 -my-1 flex cursor-pointer px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text2"
                        >
                          <span
                            className={`size-0.75 rounded-full transition-opacity duration-300 motion-reduce:transition-none ${
                              onPage
                                ? 'bg-text opacity-100'
                                : `bg-text2 ${active ? 'opacity-40' : 'opacity-20'} group-hover/pip:opacity-70`
                            }`}
                          />
                        </button>

                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 whitespace-nowrap font-mono text-[9px] font-black uppercase leading-none tracking-[0.12em] text-text2 opacity-0 transition-opacity duration-300 group-hover/pip:opacity-100 motion-reduce:transition-none"
                        >
                          {pageName}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
