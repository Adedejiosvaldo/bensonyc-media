import Link from 'next/link';
import { canPlan, canPostSocial, isAdmin, requireMember } from '@/lib/auth';
import { saveFollowersToPlan, syncSocialNow } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { addDays, label, monthStart, rangeLabel, todayLagos } from '@/lib/dates';
import { PLATFORM_NAME, PLATFORMS, type AccountStat, type MediaStat, type Platform } from '@/lib/social/types';
import type { PlanMonth } from '@/lib/types';
import { latestAiRun } from '@/lib/ai/manager';
import { tidy, unquote } from '@/lib/ai/text';
import { PostDialog, type PostDetail } from './PostDialog';

export const metadata = { title: 'Insights' };
export const maxDuration = 60;

const n = (v: number | null | undefined) => (v == null ? '–' : v >= 10_000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}K` : v.toLocaleString('en-US'));
const interactions = (m: MediaStat) => (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
const SORTS = { recent: 'Newest', views: 'Most viewed', interactions: 'Most interactions' } as const;
const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];
const postKey = (m: Pick<MediaStat, 'platform' | 'remote_id'>) => `${m.platform}-${m.remote_id}`;
const KIND: Record<string, string> = { CAROUSEL_ALBUM: 'Carousel', IMAGE: 'Photo', VIDEO: 'Video', REEL: 'Reel', REELS: 'Reel' };
const kind = (t: string | null) => (t ? (KIND[t.toUpperCase()] ?? t.charAt(0) + t.slice(1).toLowerCase()) : 'Post');

/** "+12%" / "−8%" against the previous period, or null when there is nothing to compare with. */
function change(now: number, before: number) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { pct, text: `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct)}%` };
}

export default async function InsightsPage({ searchParams }: { searchParams: { notice?: string; p?: string; sort?: string; range?: string; post?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const platform = PLATFORMS.includes(searchParams.p as Platform) ? (searchParams.p as Platform) : null;
  const sort = (Object.keys(SORTS).includes(searchParams.sort ?? '') ? searchParams.sort : 'recent') as keyof typeof SORTS;
  const range: Range = (RANGES as readonly number[]).includes(Number(searchParams.range)) ? (Number(searchParams.range) as Range) : 30;

  const aiRun = canPlan(member) ? await latestAiRun() : null;
  const [{ data: daily }, { data: media }, { data: month }] = await Promise.all([
    supabase.from('social_account_stats').select('*').gte('day', addDays(today, -100)).order('day').returns<AccountStat[]>(),
    supabase.from('social_media_stats').select('*').order('posted_at', { ascending: false }).limit(300).returns<MediaStat[]>(),
    supabase.from('plan_months').select('*').eq('month', monthStart(today)).maybeSingle<PlanMonth>(),
  ]);

  const accounts = PLATFORMS.map((p) => {
    const rows = (daily ?? []).filter((d) => d.platform === p);
    const latest = rows.at(-1);
    const before = [...rows].reverse().find((r) => r.day <= addDays(latest?.day ?? today, -range));
    const growth = latest?.followers != null && before?.followers != null ? latest.followers - before.followers : null;
    return { platform: p, latest, growth };
  }).filter((a) => a.latest && (!platform || a.platform === platform));
  const totalFollowers = accounts.reduce((s, a) => s + (a.latest?.followers ?? 0), 0);

  // This period and the one before it, so every number can say whether it's up or down.
  const ms = 86_400_000;
  const since = new Date(Date.now() - range * ms).toISOString();
  const prevSince = new Date(Date.now() - 2 * range * ms).toISOString();
  const all = (media ?? []).filter((m) => !platform || m.platform === platform);
  const inRange = all.filter((m) => (m.posted_at ?? '') >= since);
  const prevRange = all.filter((m) => (m.posted_at ?? '') >= prevSince && (m.posted_at ?? '') < since);
  const total = (rows: MediaStat[], f: (m: MediaStat) => number) => rows.reduce((s, m) => s + f(m), 0);
  const kpis = [
    { label: 'Views', now: total(inRange, (m) => m.views ?? 0), before: total(prevRange, (m) => m.views ?? 0) },
    { label: 'Reach', now: total(inRange, (m) => m.reach ?? 0), before: total(prevRange, (m) => m.reach ?? 0) },
    { label: 'Interactions', now: total(inRange, interactions), before: total(prevRange, interactions) },
  ];
  const breakdown = `${n(total(inRange, (m) => m.likes ?? 0))} likes · ${n(total(inRange, (m) => m.comments ?? 0))} comments · ${n(total(inRange, (m) => m.shares ?? 0))} shares · ${n(total(inRange, (m) => m.saves ?? 0))} saves`;

  // "Usual" = average views per post across everything synced for these platforms.
  const withViews = all.filter((m) => m.views != null);
  const usualViews = withViews.length ? total(withViews, (m) => m.views ?? 0) / withViews.length : 0;
  const vsUsual = (m: MediaStat) => (usualViews && m.views != null ? m.views / usualViews : null);

  const lastSync = (media ?? []).reduce((a, m) => (m.updated_at > a ? m.updated_at : a), '');
  const list = [...inRange].sort((a, b) =>
    sort === 'views' ? (b.views ?? 0) - (a.views ?? 0) : sort === 'interactions' ? interactions(b) - interactions(a) : (b.posted_at ?? '').localeCompare(a.posted_at ?? ''),
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
  const openVs = open ? vsUsual(open) : null;
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
        engagedRate: open.views ? `${((interactions(open) / open.views) * 100).toFixed(1)}%` : null,
        versusUsual: openVs != null ? `${openVs.toFixed(1)}× your usual views (about ${Math.round(usualViews)} per post)` : null,
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
        How your posts are doing on Instagram and TikTok. Updated every morning{lastSync ? `, last at ${new Date(lastSync).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}.
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

      {accounts.length === 0 && all.length === 0 ? (
        <div className="card">
          <EmptyState icon="chart" title="No numbers yet">
            Connect Instagram or TikTok on the <Link href="/social" className="link">Post</Link> page, then tap Refresh.
          </EmptyState>
        </div>
      ) : (
        <>
          {/* The few numbers that matter, each compared with the period before. */}
          <section aria-label={`Last ${range} days`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-5">
              <p className="kicker">{accounts.length === 1 ? `${PLATFORM_NAME[accounts[0].platform]} followers` : 'Followers'}</p>
              <p className="stat mt-1.5 text-4xl">{n(totalFollowers)}</p>
              <p className="mt-2 text-sm text-muted">
                {accounts.some((a) => a.growth != null) ? (
                  <>
                    <b className={accounts.reduce((s, a) => s + (a.growth ?? 0), 0) >= 0 ? 'text-good-ink' : 'text-danger'}>
                      {(() => {
                        const g = accounts.reduce((s, a) => s + (a.growth ?? 0), 0);
                        return `${g >= 0 ? '+' : '−'}${Math.abs(g).toLocaleString('en-US')}`;
                      })()}
                    </b>{' '}
                    in {range} days
                  </>
                ) : (
                  'Growth shows after a few days of syncing'
                )}
              </p>
              {month && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-plum-100" role="progressbar" aria-label="Progress to the month's follower target" aria-valuenow={totalFollowers} aria-valuemin={0} aria-valuemax={month.follower_target}>
                    <div className="h-full rounded-full bg-magenta" style={{ width: `${Math.min(100, (totalFollowers / Math.max(1, month.follower_target)) * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {totalFollowers >= month.follower_target ? `${label(monthStart(today), 'month')} target reached 🎉` : `${(month.follower_target - totalFollowers).toLocaleString('en-US')} to the ${label(monthStart(today), 'month')} target of ${n(month.follower_target)}`}
                  </p>
                  {isAdmin(member) && (
                    <form action={saveFollowersToPlan} className="mt-2">
                      <input type="hidden" name="total" value={totalFollowers} />
                      <SubmitButton className="link min-h-8 text-xs" pendingText="Saving…">Save to 9-month plan</SubmitButton>
                    </form>
                  )}
                </div>
              )}
            </div>
            {kpis.map((k) => {
              const c = change(k.now, k.before);
              return (
                <div key={k.label} className="card p-5">
                  <p className="kicker">{k.label}</p>
                  <p className="stat mt-1.5 text-4xl">{n(k.now)}</p>
                  <p className="mt-2 text-sm text-muted">
                    {c ? (
                      <>
                        <b className={c.pct > 0 ? 'text-good-ink' : c.pct < 0 ? 'text-danger' : ''}>{c.text}</b> vs the {range} days before
                      </>
                    ) : (
                      `From ${inRange.length} ${inRange.length === 1 ? 'post' : 'posts'}`
                    )}
                  </p>
                  {k.label === 'Interactions' && <p className="mt-1 text-xs text-muted">{breakdown}</p>}
                </div>
              );
            })}
          </section>

          <section aria-labelledby="posts-title" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="posts-title" className="section-title">Posts from the last {range} days</h2>
                <p className="text-sm text-muted">
                  {inRange.length} {inRange.length === 1 ? 'post' : 'posts'}. The badge compares each post’s views with your usual {usualViews ? `(about ${Math.round(usualViews)} per post)` : ''}. Tap one for details.
                </p>
              </div>
              <nav aria-label="Sort posts" className="flex flex-wrap gap-2">
                {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((s) => (
                  <Link key={s} href={href({ sort: s })} scroll={false} aria-current={sort === s ? 'true' : undefined} className={chip(sort === s)}>
                    {SORTS[s]}
                  </Link>
                ))}
              </nav>
            </div>

            {list.length === 0 ? (
              <div className="card">
                <EmptyState compact icon="chart" title={all.length ? `No posts in the last ${range} days` : 'No posts synced yet'}>
                  {all.length ? 'Pick a longer range, or All platforms.' : 'Tap Refresh to pull in your latest posts.'}
                </EmptyState>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((m) => {
                  const v = vsUsual(m);
                  const tone = v == null ? null : v >= 1.2 ? 'up' : v <= 0.8 ? 'down' : 'even';
                  return (
                    <li key={postKey(m)}>
                      <Link
                        href={href({ post: postKey(m) })}
                        scroll={false}
                        className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-lift transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-raise"
                      >
                        <div className="relative aspect-[4/5] bg-plum-100">
                          {m.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.thumbnail_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-muted"><Icon name="content" className="h-8 w-8" /></span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent" aria-hidden="true" />
                          {tone && (
                            <span
                              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow ${
                                tone === 'up' ? 'bg-good text-white' : tone === 'down' ? 'bg-white/90 text-ink' : 'bg-white/90 text-muted'
                              }`}
                            >
                              {tone === 'up' ? `${v!.toFixed(1)}× usual` : tone === 'down' ? `${v!.toFixed(1)}× usual` : 'About usual'}
                            </span>
                          )}
                          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">{kind(m.media_type)}</span>
                          <span className="absolute bottom-2 left-3 text-white">
                            <span className="block font-display text-2xl leading-none tabular-nums">{n(m.views)}</span>
                            <span className="text-[11px] font-semibold text-white/80">views</span>
                          </span>
                          <span className="absolute bottom-2 right-3 flex gap-2 text-[11px] font-semibold text-white/90 tabular-nums">
                            <span><Icon name="heart" className="mr-0.5 inline h-3 w-3" />{n(m.likes)}</span>
                            <span><Icon name="comment" className="mr-0.5 inline h-3 w-3" />{n(m.comments)}</span>
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-muted">
                            {m.posted_at ? label(m.posted_at.slice(0, 10)) : ''}
                            {!platform ? ` · ${PLATFORM_NAME[m.platform]}` : ''}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{m.caption || <span className="text-muted">No caption</span>}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {aiRun && (aiRun.insights?.length > 0 || aiRun.trends?.length > 0) && (
        <details className="card group p-0">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 [&::-webkit-details-marker]:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-accent"><Icon name="spark" className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">What the AI noticed</span>
              <span className="block text-xs text-muted">From the ideas for {rangeLabel(aiRun.week_start)}{aiRun.theme ? ` · theme “${unquote(aiRun.theme.title)}”` : ''}</span>
            </span>
            <span aria-hidden="true" className="text-accent group-open:hidden">+</span>
            <span aria-hidden="true" className="hidden text-accent group-open:inline">–</span>
          </summary>
          <div className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
            {aiRun.insights?.length > 0 && (
              <ul className="space-y-2">
                {aiRun.insights.slice(0, 3).map((i) => (
                  <li key={i.finding} className="card-row text-sm">
                    <p className="font-semibold">{tidy(i.finding)}</p>
                    <p className="mt-0.5 text-muted">{tidy(i.evidence)}</p>
                  </li>
                ))}
              </ul>
            )}
            {aiRun.trends?.length > 0 && (
              <ul className="space-y-2">
                {aiRun.trends.slice(0, 3).map((t) => (
                  <li key={t.what} className="card-row text-sm">
                    <p className="font-semibold"><span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-accent">{t.platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>{tidy(t.what)}</p>
                    <p className="mt-0.5 text-muted">{tidy(t.how_we_use_it)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/content?week=${aiRun.week_start}`} className="link min-h-9 text-sm lg:col-span-2">See that week’s ideas →</Link>
          </div>
        </details>
      )}

      {detail && <PostDialog key={searchParams.post} post={detail} closeHref={href({ post: null })} />}
    </div>
  );
}
