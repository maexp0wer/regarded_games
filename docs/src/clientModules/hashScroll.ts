import type { ClientModule } from '@docusaurus/types';

/* Fix for Docusaurus's initial-load anchor race: when a page is opened directly
   at a URL with a hash (e.g. the landing-page HeroCard "i" buttons opening
   docs.<domain>/intro#phase-2-trading in a new tab), the router's scroll
   restoration can run before the target heading is mounted, so the jump
   silently no-ops — the page lands at the top, and only re-entering the URL in
   the address bar (a native fragment jump on an already-hydrated document)
   scrolls to the section.

   onRouteDidUpdate fires after the new route's content has rendered. We re-run
   the fragment scroll there, on the next animation frame, so the heading is in
   the DOM by the time we look for it. Mirrors the browser's native behaviour
   (decode the id, scrollIntoView) and is a no-op when there is no hash. */
function scrollToHash() {
  const { hash } = window.location;
  if (!hash || hash === '#') return;

  const id = decodeURIComponent(hash.slice(1));

  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView();
  });
}

const module: ClientModule = {
  onRouteDidUpdate() {
    scrollToHash();
  },
};

export default module;
