import Link from 'next/link';
import { canPostSocial, isAdmin, requireMember } from '@/lib/auth';
import { saveFollowersToPlan, syncSocialNow } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { addDays, label, monthStart, todayLagos } from '@/lib/dates';
import { PLATFORM_NAME, PLATFORMS, type AccountStat, type MediaStat, type Platform } from '@/lib/social/types';
import type { PlanMonth } from '@/lib/types';
import { PostDialog, type PostDetail } from './PostDialog';

export const metadata = { title: 'Insights' };
export const maxDuration = 60;

const n = (v: number | null | undefined) => (v == null ? '–' : v >= 10_000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}K` : v.toLocaleString('en-US'));
const engagement = (m: MediaStat) => (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
const SORTS = { recent: 'Newest', views: 'Views', engagement: 'Engagement' } as const;
const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];
const postKey = (m: Pick<MediaStat, 'platform' | 'remote_id'>) => `${m.platform}-${m.remote_id}`;
const kind = (t: string | null) => (t ? t.toLowerCase().replace('_', ' ') : null);

export default async function InsightsPage({ searchParams }: { searchParams: { notice?: string; p?: string; sort?: string; range?: string; post?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const platform = PLATFORMS.includes(searchParams.p as Platform) ? (searchParams.p as Platform) : null;
  const sort = (Object.keys(SORTS).includes(searchParams.sort ?? '') ? searchParams.sort : 'recent') as keyof typeof SORTS;
  const range: Range = (RANGES as readonly number[]).includes(Number(searchParams.range)) ? (Number(searchParams.range) as Range) : 30;

  const [{ data: daily }, { data: media }, { data: month }] = await Promise.all([
    supabase.from('social_account_stats').select('*').gte('day', addDays(today, -100)).order('day').returns<AccountStat[]>(),
    supabase.from('social_media_stats').select('*').order('posted_at', { ascending: false }).limit(300).returns<MediaStat[]>(),
    supabase.from('plan_months').select('*').eq('month', monthStart(today)).maybeSingle<PlanMonth>(),
  ]);

  const accounts = PLATFORMS.map((p) => {
    const rows = (daily ?? []).filter((d) => d.platform === p);
    const latest = rows.at(-1);
    const before = [...rows].reverse().find((r) => r.day <= addDays(latest?.day ?? today, -range));
    const change = latest?.followers != null && before?.followers != null ? latest.followers - before.followers : null;
    return { platform: p, latest, change };
  }).filter((a) => a.latest);

  const totalFollowers = accounts.reduce((s, a) => s + (a.latest?.followers ?? 0), 0);
  const since = new Date(Date.now() - range * 86_400_000).toISOString();
  const inRange = (media ?? []).filter((m) => (m.posted_at ?? '') >= since && (!platform || m.platform === platform));
  const sum = (k: 'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves') => inRange.reduce((s, m) => s + (m[k] ?? 0), 0);
  const lastSync = (media ?? []).reduce((a, m) => (m.updated_at > a ? m.updated_at : a), '');

  const list = [...inRange].sort((a, b) =>
    sort === 'views' ? (b.views ?? 0) - (a.views ?? 0) : sort === 'engagement' ? engagement(b) - engagement(a) : (b.posted_at ?? '').localeCompare(a.posted_at ?? ''),
  );

  // Every view of this page is a URL: platform, sort, range and the open post.
  const href = (q: { p?: string | null; sort?: string; range?: number; post?: string | null }) => {
    const s = new URLSearchParams();
    const pp = q.p === undefined ? platform : q.p;
    if (pp) s.set('p', pp);
    const ss = q.sort ?? sort;
    if (ss !== 'recent') s.set('sort', ss);
    const rr = q.range ?? range;
    if (rr !== 30) s.set('range', String(rr));
    if (q.post) s.set('post', q.post);
    const qs = s.toString();
    return `/insights${qs ? `?${qs}` : ''}`;
  };

  const open = searchParams.post ? (media ?? []).find((m) => postKey(m) === searchParams.post) : undefined;
  const detail: PostDetail | null = open
    ? {
        platformName: PLATFORM_NAME[open.platform],
        caption: open.caption,
        mediaType: kind(open.media_type),
        postedLabel: open.posted_at ? label(open.posted_at.slice(0, 10), 'long') : null,
        permalink: open.permalink,
        thumbnail: open.thumbnail_url,
        stats: [
          { label: 'Views', value: n(open.views) },
          { label: 'Reach', value: n(open.reach) },
          { label: 'Likes', value: n(open.likes) },
          { label: 'Comments', value: n(open.comments) },
          { label: 'Shares', value: n(open.shares) },
          { label: 'Saves', value: n(open.saves) },
        ],
        engagedRate: open.views ? `${((engagement(open) / open.views) * 100).toFixed(1)}%` : null,
      }
    : null;

  const chip = (on: boolean) => `chip min-h-9 px-3 ${on ? 'bg-magenta text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Social"
        title="Insights"
        actions={
          <div className="flex gap-2">
            <Link href="/social" className="btn-ghost"><Icon name="upload" className="h-4 w-4" /> Post</Link>
            {canPostSocial(member) && (
              <form action={syncSocialNow}>
                <SubmitButton className="btn-primary" pendingText="Refreshing…"><Icon name="shuffle" className="h-4 w-4" /> Refresh</SubmitButton>
              </form>
            )}
          </div>
        }
      >
        Followers, views and interactions from Instagram and TikTok. Updates every morning{lastSync ? `, last at ${new Date(lastSync).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}.
      </PageHeader>

      {searchParams.notice && <p role="status" className="alert-good">{searchParams.notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Platform" className="flex flex-wrap gap-2">
          {[null, ...PLATFORMS].map((p) => (
            <Link key={p ?? 'all'} href={href({ p })} scroll={false} aria-current={platform === p ? 'true' : undefined} className={chip(platform === p)}>
              {p ? PLATFORM_NAME[p] : 'All platforms'}
            </Link>
          ))}
        </nav>
        <nav aria-label="Time range" className="flex rounded-full border border-line bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={href({ range: r })}
              scroll={false}
              aria-current={range === r ? 'true' : undefined}
              className={`flex min-h-9 min-w-12 items-center justify-center rounded-full px-3 text-sm font-bold tabular-nums transition-colors duration-150 ${range === r ? 'bg-plum-900 text-white' : 'text-muted hover:text-ink'}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      {accounts.length === 0 ? (
        <div className="card">
          <EmptyState icon="chart" title="No numbers yet">
            Connect Instagram or TikTok on the <Link href="/social" className="link">Post</Link> page, then tap Refresh.
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts
            .filter((a) => !platform || a.platform === platform)
            .map((a) => (
              <div key={a.platform} className="card p-5">
                <p className="kicker">{PLATFORM_NAME[a.platform]} followers</p>
                <p className="stat mt-1.5 text-5xl">{n(a.latest?.followers)}</p>
                <p className="mt-2 text-sm">
                  <span className={`font-bold ${a.change == null ? 'text-muted' : a.change >= 0 ? 'text-good-ink' : 'text-danger'}`}>
                    {a.change == null ? '–' : `${a.change >= 0 ? '+' : ''}${a.change.toLocaleString('en-US')}`}
                  </span>{' '}
                  <span className="text-muted">in {range} days</span>
                </p>
                <p className="mt-1 text-xs text-muted">{n(a.latest?.posts)} posts{a.latest?.total_likes != null ? ` · ${n(a.latest.total_likes)} total likes` : ''}</p>
              </div>
            ))}
          {month && (
            <div className="on-dark card border-transparent bg-plum-900 p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{label(monthStart(today), 'month')} target</p>
              <p className="stat mt-1.5 text-5xl text-white">{n(totalFollowers)}<span className="text-2xl text-white/60"> / {n(month.follower_target)}</span></p>
              <p className="mt-2 text-sm text-white/75">All platforms combined. {totalFollowers >= month.follower_target ? 'Target reached 🎉' : `${(month.follower_target - totalFollowers).toLocaleString('en-US')} to go.`}</p>
              {isAdmin(member) && (
                <form action={saveFollowersToPlan} className="mt-3">
                  <input type="hidden" name="total" value={totalFollowers} />
                  <SubmitButton className="btn-gold px-4 py-2 text-xs" pendingText="Saving…">Save to 9-month plan</SubmitButton>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      <section aria-labelledby="range-title" className="space-y-3">
        <div>
          <h2 id="range-title" className="section-title">Posted in the last {range} days</h2>
          <p className="text-sm text-muted">
            {inRange.length} {inRange.length === 1 ? 'post' : 'posts'}{platform ? ` on ${PLATFORM_NAME[platform]}` : ''}. Each figure adds up those posts’ totals since they went up.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([['Views', sum('views')], ['Reach', sum('reach')], ['Likes', sum('likes')], ['Comments', sum('comments')], ['Shares', sum('shares')], ['Saves', sum('saves')]] as const).map(([l, v]) => (
            <div key={l} className="card p-4">
              <dt className="kicker">{l}</dt>
              <dd className="stat mt-1.5 text-3xl">{n(v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-6" aria-labelledby="posts-title">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="posts-title" className="card-title mr-auto">Posts</h2>
          <span className="text-xs font-semibold text-muted">Sort</span>
          {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((s) => (
            <Link key={s} href={href({ sort: s })} scroll={false} aria-current={sort === s ? 'true' : undefined} className={chip(sort === s)}>
              {SORTS[s]}
            </Link>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState compact icon="chart" title={(media ?? []).length ? `No posts in the last ${range} days` : 'No posts synced yet'}>
            {(media ?? []).length ? 'Pick a longer range, or All platforms.' : 'Tap Refresh to pull in your latest posts.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((m) => {
              const rate = m.views ? (engagement(m) / m.views) * 100 : null;
              return (
                <li key={postKey(m)}>
                  <Link href={href({ post: postKey(m) })} scroll={false} className="-mx-3 flex gap-3 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-plum-100/50">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-plum-100 outline outline-1 -outline-offset-1 outline-black/10">
                      {m.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbnail_url} alt="" width={64} height={64} className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{m.caption || <span className="text-muted">No caption</span>}</p>
                      <p className="text-xs text-muted">
                        {PLATFORM_NAME[m.platform]}{kind(m.media_type) ? ` · ${kind(m.media_type)}` : ''}{m.posted_at ? ` · ${label(m.posted_at.slice(0, 10))}` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums">
                        <span><b>{n(m.views)}</b> views</span>
                        <span><b>{n(m.reach)}</b> reach</span>
                        <span><b>{n(m.likes)}</b> likes</span>
                        <span><b>{n(m.comments)}</b> comments</span>
                        {rate != null && <span className="text-muted">{rate.toFixed(1)}% engaged</span>}
                      </p>
                    </div>
                    <Icon name="arrow" className="h-4 w-4 shrink-0 self-center text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {detail && <PostDialog key={searchParams.post} post={detail} closeHref={href({ post: null })} />}
    </div>
  );
}
