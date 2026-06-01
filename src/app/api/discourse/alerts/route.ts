import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

export type PendingPoll = {
  topicId: number;
  topicSlug: string;
  title: string;
  pollCloseAt: number | null; // Unix seconds
  postId: number;
  pollName: string;
};

export type ReplyGroup = {
  originalPostId: number;
  topicId: number;
  topicSlug: string;
  topicTitle: string;
  originalExcerpt: string;
  replyCount: number;
  latestReplyAt: string;
  latestReplierUsername: string;
  latestReplyExcerpt: string;
  notificationIds: number[];
};

const GOVERNANCE_CATEGORY_SLUG = 'governance';
const TRUNCATE_LEN = 120;

function truncate(text: string, len = TRUNCATE_LEN): string {
  if (!text) return '';
  const stripped = text.replace(/\[.*?\]|#+ |[*_`>]/g, '').trim();
  return stripped.length <= len ? stripped : stripped.slice(0, len).trimEnd() + '…';
}


async function checkUserVotedOnPoll(
  url: string,
  headers: Record<string, string>,
  postId: number,
  pollName: string,
  discourseUserId: number,
): Promise<boolean> {
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${url}/polls/voters.json?post_id=${postId}&poll_name=${encodeURIComponent(pollName)}&page=${page}`,
      { headers },
    );
    if (!res.ok) return false;
    const data = await res.json();
    const voters = data?.voters ?? {};
    let totalOnPage = 0;
    for (const arr of Object.values(voters)) {
      if (!Array.isArray(arr)) continue;
      totalOnPage += arr.length;
      if (arr.some((u: any) => u?.id === discourseUserId)) return true;
    }
    if (totalOnPage === 0) break;
  }
  return false;
}

async function fetchGovernancePolls(
  url: string,
  adminHeaders: Record<string, string>,
  discourseUserId: number,
): Promise<PendingPoll[]> {
  const catRes = await fetch(`${url}/c/${GOVERNANCE_CATEGORY_SLUG}/l/latest.json`, { headers: adminHeaders });
  if (!catRes.ok) return [];

  const catData = await catRes.json();
  const topics: any[] = catData?.topic_list?.topics ?? [];
  const now = Date.now();

  const results = await Promise.all(
    topics.slice(0, 10).map(async (topic: any): Promise<PendingPoll[]> => {
      try {
        const topicRes = await fetch(`${url}/t/${topic.id}.json`, { headers: adminHeaders });
        if (!topicRes.ok) return [];
        const topicData = await topicRes.json();
        const firstPost = topicData?.post_stream?.posts?.[0];
        if (!firstPost?.polls?.length) return [];

        const pending: PendingPoll[] = [];
        for (const poll of firstPost.polls) {
          const isOpen = poll.status === 'open';
          const closeAt = poll.close ? new Date(poll.close).getTime() : null;
          const isNotExpired = closeAt === null || closeAt > now;
          if (!isOpen || !isNotExpired) continue;

          const voted = await checkUserVotedOnPoll(url, adminHeaders, firstPost.id, poll.name, discourseUserId);
          if (!voted) {
            pending.push({
              topicId: topic.id,
              topicSlug: topic.slug,
              title: topic.fancy_title ?? topic.title,
              pollCloseAt: closeAt !== null ? Math.floor(closeAt / 1000) : null,
              postId: firstPost.id,
              pollName: poll.name,
            });
          }
        }
        return pending;
      } catch {
        return [];
      }
    }),
  );

  return results.flat();
}

async function fetchReplyGroups(
  url: string,
  adminHeaders: Record<string, string>,
  walletAddress: string,
): Promise<ReplyGroup[]> {
  const userHeaders = { ...adminHeaders, 'Api-Username': walletAddress };

  const notifRes = await fetch(`${url}/notifications.json`, { headers: userHeaders });
  if (!notifRes.ok) return [];

  const notifData = await notifRes.json();
  const notifications: any[] = notifData?.notifications ?? [];

  // type 2 = replied, type 3 = quoted — only unread
  const replyNotifs = notifications.filter(
    (n: any) => (n.notification_type === 2 || n.notification_type === 3) && !n.read,
  );

  // Group by original_post_id
  const groups = new Map<number, any[]>();
  for (const n of replyNotifs) {
    const origId = n.data?.original_post_id;
    if (!origId) continue;
    if (!groups.has(origId)) groups.set(origId, []);
    groups.get(origId)!.push(n);
  }

  const topGroups = [...groups.entries()]
    .sort(([, a], [, b]) => {
      const ta = new Date(a[0].created_at).getTime();
      const tb = new Date(b[0].created_at).getTime();
      return tb - ta;
    })
    .slice(0, 5);

  const results = await Promise.all(
    topGroups.map(async ([originalPostId, notifs]): Promise<ReplyGroup | null> => {
      try {
        const postRes = await fetch(`${url}/posts/${originalPostId}.json`, { headers: adminHeaders });
        const originalExcerpt = postRes.ok
          ? truncate((await postRes.json())?.raw ?? '')
          : '';

        const sorted = [...notifs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const latest = sorted[0];

        return {
          originalPostId,
          topicId: latest.topic_id,
          topicSlug: latest.slug,
          topicTitle: latest.fancy_title ?? latest.data?.topic_title ?? '',
          originalExcerpt,
          replyCount: notifs.length,
          latestReplyAt: latest.created_at,
          latestReplierUsername: latest.data?.display_username ?? '',
          latestReplyExcerpt: truncate(latest.data?.excerpt ?? '', 100),
          notificationIds: notifs.map((n: any) => n.id as number),
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is ReplyGroup => r !== null);
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address, { strict: false })) {
    return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const wallet = address.toLowerCase();
  const adminHeaders: Record<string, string> = {
    'Api-Key': apiKey,
    'Api-Username': 'system',
    'Content-Type': 'application/json',
  };

  // Resolve Discourse user ID for this wallet
  const userRes = await fetch(`${url}/u/by-external/${wallet}.json`, { headers: adminHeaders });
  if (!userRes.ok) {
    // User not yet registered — no alerts
    return NextResponse.json({ success: true, data: { pendingPolls: [], replies: [] } });
  }
  const userData = await userRes.json();
  const discourseUserId: number | undefined = userData?.user?.id;
  if (typeof discourseUserId !== 'number') {
    return NextResponse.json({ success: true, data: { pendingPolls: [], replies: [] } });
  }

  const [pendingPolls, replies] = await Promise.all([
    fetchGovernancePolls(url, adminHeaders, discourseUserId).catch(() => [] as PendingPoll[]),
    fetchReplyGroups(url, adminHeaders, wallet).catch(() => [] as ReplyGroup[]),
  ]);

  return NextResponse.json({ success: true, data: { pendingPolls, replies } });
}
