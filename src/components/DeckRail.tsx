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
   reader can otherwise lose track of how much is left.

   Desktop only, and never on the hero: below lg the deck is swiped, where the
   gesture needs no advertising and the viewport has no margin to give up, and
   on the opening slide there is no progress to report yet. */

export type RailStop = {
  id: string;
  /** Section name, shown on hover and read out to assistive tech. */
  label: string;
  /** Inner stops this section holds at this breakpoint; 0 or 1 = none. */
  pages: number;
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
  onSelect: (id: string) => void;
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
            <li key={stop.id} className="group flex flex-col items-end gap-1.5">
              <div className="relative flex items-center">
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

              {/* Pages inside the section. Always printed, so the rail's height
                  never jumps: dim while the section is elsewhere, filled on the
                  page in hand. */}
              {stop.pages > 1 && (
                <div aria-hidden="true" className="flex w-4 flex-col items-center gap-1">
                  {Array.from({ length: stop.pages }, (_, page) => (
                    <span
                      key={page}
                      className={`size-0.75 rounded-full transition-opacity duration-300 motion-reduce:transition-none ${
                        active && page === activePage
                          ? 'bg-text opacity-100'
                          : `bg-text2 ${active ? 'opacity-40' : 'opacity-20'}`
                      }`}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
