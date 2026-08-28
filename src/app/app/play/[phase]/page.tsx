'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useSeasonRegistry, seasonSlug } from '@/hooks/useSeasonRegistry';
import { isPhaseBucket, phaseBucketOf, PHASE_BUCKET_LABEL } from '@/utils/seasonPhase';
import LedgerLoader from '@/components/LedgerLoader';

/* Phase resolver — /play/auction | /play/trading | /play/payout.
 *
 * The landing links here rather than at a season number, because which season
 * is in which phase is only knowable from chain state and the landing has no
 * tenant context. This route does have one (it lives under /app), so it walks
 * the season registry, redirects to the newest season in the requested phase,
 * and falls back to the season list when there isn't one.
 *
 * Nested under a static /play segment on purpose: a bare /auction would collide
 * with the [seasonSlug] dynamic route at the app root.
 *
 * Gating is handled upstream — middleware rewrites app.* to /coming-soon before
 * this ever mounts — so there is no launch check here. */

/** Give up on the registry walk and send them somewhere useful. */
const RESOLVE_TIMEOUT_MS = 8000;

export default function PhaseResolverPage() {
  const { phase } = useParams() as { phase: string };
  const router = useRouter();
  const { data: seasons, isError } = useSeasonRegistry();

  const bucket = isPhaseBucket(phase) ? phase : null;

  /* Redirect exactly once. Without this the effect can fire again on a refetch
     that lands between the replace() call and the unmount. */
  const redirected = useRef(false);
  const go = (path: string) => {
    if (redirected.current) return;
    redirected.current = true;
    router.replace(path);
  };

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!bucket) {
      go('/seasons');
      return;
    }

    /* An RPC failure is not the same as "no season is in this phase", but the
       useful destination is the same either way. */
    if (isError || timedOut) {
      go('/seasons');
      return;
    }

    if (!seasons) return;

    // Most recent = highest registry index. Seasons can overlap, so this matters.
    const match = [...seasons]
      .reverse()
      .find((s) => phaseBucketOf(s.phase) === bucket);

    go(match ? `/${seasonSlug(match.id)}` : '/seasons');
    // `go` is a stable closure over a ref; re-running on its identity is noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, seasons, isError, timedOut]);

  return (
    <main className="w-full py-8">
      <LedgerLoader fullPage />
      {bucket && (
        <p className="section-label text-center opacity-50 mt-4">
          Locating {PHASE_BUCKET_LABEL[bucket]} Season
        </p>
      )}
    </main>
  );
}
