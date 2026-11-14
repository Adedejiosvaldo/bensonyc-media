import Link from 'next/link';
import { canPostSocial, isAdmin, requireMember } from '@/lib/auth';
import { saveFollowersToPlan, syncSocialNow } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { addDays, label, monthStart, todayLagos } from '@/lib/dates';
import { PLATFORM_NAME, PLATFORMS, type AccountStat, type MediaStat, type Platform } from '@/lib/social/types';
import type { PlanMonth } from '@/lib/types';

export const metadata = { title: 'Insights' };
export const maxDuration = 60;

const n = (v: number | null | undefined) => (v == null ? '–' : v >= 10_000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}K` : v.toLocaleString('en-US'));
const engagement = (m: MediaStat) => (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
const SORTS = { engagement: 'Engagement', views: 'Views', recent: 'Newest' } as const;

export default async function InsightsPage({ searchParams }: { searchParams: { notice?: string; p?: string; sort?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const platform = PLATFORMS.includes(searchParams.p as Platform) ? (searchParams.p as Platform) : null;
  const sort = (Object.keys(SORTS).includes(searchParams.sort ?? '') ? searchParams.sort : 'engagement') as keyof typeof SORTS;

  const [{ data: daily }, { data: media }, { data: month }] = await Promise.all([
    supabase.from('social_account_stats').select('*').gte('day', addDays(today, -40)).order('day').returns<AccountStat[]>(),
    supabase.from('social_media_stats').select('*').order('posted_at', { ascending: false }).limit(100).returns<MediaStat[]>(),
    supabase.from('plan_months').select('*').eq('month', monthStart(today)).maybeSingle<PlanMonth>(),
  ]);

  const accounts = PLATFORMS.map((p) => {
    const rows = (daily ?? []).filter((d) => d.platform === p);
    const latest = rows.at(-1);
    const before = (days: number) => [...rows].reverse().find((r) => r.day <= addDays(latest?.day ?? today, -days));
    const diff = (days: number) => (latest?.followers != null && before(days)?.followers != null ? latest.followers - before(days)!.followers! : null);
    return { platform: p, latest, week: diff(7), month: diff(30) };
  }).filter((a) => a.latest);

  const totalFollowers = accounts.reduce((s, a) => s + (a.latest?.followers ?? 0), 0);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const recent = (media ?? []).filter((m) => (m.posted_at ?? '') >= since);
  const sum = (k: 'views' | 'likes' | 'comments' | 'shares') => recent.reduce((s, m) => s + (m[k] ?? 0), 0);
  const lastSync = (media ?? []).reduce((a, m) => (m.updated_at > a ? m.updated_at : a), '');

  const list = (media ?? [])
    .filter((m) => !platform || m.platform === platform)
    .sort((a, b) => (sort === 'views' ? (b.views ?? 0) - (a.views ?? 0) : sort === 'recent' ? (b.posted_at ?? '').localeCompare(a.posted_at ?? '') : engagement(b) - engagement(a)))
    .slice(0, 30);

  const href = (q: { p?: string | null; sort?: string }) => {
    const s = new URLSearchParams();
    const pp = q.p === undefined ? platform : q.p;
    if (pp) s.set('p', pp);
    const ss = q.sort ?? sort;
    if (ss !== 'engagement') s.set('sort', ss);
    const qs = s.toString();
    return `/insights${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
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

      {searchParams.notice && <p role="status" className="rounded-2xl bg-plum-100 p-4 text-sm font-semibold">{searchParams.notice}</p>}

      {accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="card-title text-xl">No numbers yet</p>
          <p className="mt-2 text-muted">Connect Instagram or TikTok on the <Link href="/social" className="link">Post</Link> page, then tap Refresh.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <div key={a.platform} className="card p-5">
                <p className="overline">{PLATFORM_NAME[a.platform]} followers</p>
                <p className="mt-1 font-display text-5xl tabular-nums">{n(a.latest?.followers)}</p>
                <p className="mt-2 text-sm">
                  {[['7 days', a.week], ['30 days', a.month]].map(([l, v]) => (
                    <span key={l as string} className="mr-4">
                      <span className={`font-bold ${v == null ? 'text-muted' : (v as number) >= 0 ? 'text-good-ink' : 'text-danger'}`}>{v == null ? '–' : `${(v as number) >= 0 ? '+' : ''}${(v as number).toLocaleString('en-US')}`}</span>{' '}
                      <span className="text-muted">{l}</span>
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-xs text-muted">{n(a.latest?.posts)} posts{a.latest?.total_likes != null ? ` · ${n(a.latest.total_likes)} total likes` : ''}</p>
              </div>
            ))}
            {month && (
              <div className="card bg-plum-700 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{label(monthStart(today), 'month')} target</p>
                <p className="mt-1 font-display text-5xl tabular-nums">{n(totalFollowers)}<span className="text-2xl text-white/60"> / {n(month.follower_target)}</span></p>
                <p className="mt-2 text-sm text-white/70">All platforms combined. {totalFollowers >= month.follower_target ? 'Target reached 🎉' : `${(month.follower_target - totalFollowers).toLocaleString('en-US')} to go.`}</p>
                {isAdmin(member) && (
                  <form action={saveFollowersToPlan} className="mt-3">
                    <input type="hidden" name="total" value={totalFollowers} />
                    <SubmitButton className="btn-gold px-4 py-2 text-xs" pendingText="Saving…">Save to 9-month plan</SubmitButton>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['Views', sum('views')], ['Likes', sum('likes')], ['Comments', sum('comments')], ['Shares', sum('shares')]] as const).map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-plum-100/70 p-4">
                <p className="font-display text-3xl tabular-nums">{n(v)}</p>
                <p className="text-xs uppercase tracking-wider text-muted">{l} · last 30 days</p>
              </div>
            ))}
          </div>
        </>
      )}

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto section-title">Posts</h2>
          {[null, ...PLATFORMS].map((p) => (
            <Link key={p ?? 'all'} href={href({ p })} aria-current={platform === p ? 'true' : undefined} className={`chip min-h-9 px-3 ${platform === p ? 'bg-plum-700 text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`}>{p ? PLATFORM_NAME[p] : 'All'}</Link>
          ))}
          <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
          <span className="text-xs font-semibold text-muted">Sort</span>
          {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((s) => (
            <Link key={s} href={href({ sort: s })} aria-current={sort === s ? 'true' : undefined} className={`chip min-h-9 px-3 ${sort === s ? 'bg-plum-700 text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`}>{SORTS[s]}</Link>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="text-muted">No posts synced yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((m) => {
              const rate = m.views ? (engagement(m) / m.views) * 100 : null;
              return (
                <li key={m.platform + m.remote_id} className="flex gap-3 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-plum-100">
                    {m.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{m.caption || <span className="text-muted">No caption</span>}</p>
                    <p className="text-xs text-muted">
                      {PLATFORM_NAME[m.platform]}{m.media_type ? ` · ${m.media_type.toLowerCase().replace('_', ' ')}` : ''}{m.posted_at ? ` · ${label(m.posted_at.slice(0, 10))}` : ''}
                      {m.permalink && <> · <a href={m.permalink} target="_blank" rel="noreferrer" className="font-bold text-accent">Open</a></>}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums">
                      <span><b>{n(m.views)}</b> views</span>
                      <span><b>{n(m.likes)}</b> likes</span>
                      <span><b>{n(m.comments)}</b> comments</span>
                      <span><b>{n(m.shares)}</b> shares</span>
                      {m.saves != null && <span><b>{n(m.saves)}</b> saves</span>}
                      {rate != null && <span className="text-muted">{rate.toFixed(1)}% engaged</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
