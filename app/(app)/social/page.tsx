import Link from 'next/link';
import { canPostSocial, isAdmin, requireMember } from '@/lib/auth';
import { disconnectAccount, retryTarget } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { listConnections } from '@/lib/social/accounts';
import { igConfigured } from '@/lib/social/instagram';
import { ttConfigured, ttMode } from '@/lib/social/tiktok';
import { label, todayLagos, weekStart } from '@/lib/dates';
import { PLATFORM_NAME, type Platform, type SocialPost, type SocialTarget, type TargetStatus } from '@/lib/social/types';
import type { ContentItem, Member } from '@/lib/types';
import { Composer } from './Composer';
import { Poller } from './Poller';

export const metadata = { title: 'Post' };
export const maxDuration = 60;

const STATUS: Record<TargetStatus, { text: string; cls: string }> = {
  pending: { text: 'Queued', cls: 'bg-plum-100 text-plum-700 dark:text-ink' },
  processing: { text: 'Uploading', cls: 'bg-gold/20 text-warn' },
  published: { text: 'Live', cls: 'bg-good/15 text-good' },
  sent_to_drafts: { text: 'In TikTok drafts', cls: 'bg-magenta/10 text-magenta' },
  failed: { text: 'Failed', cls: 'bg-magenta text-white' },
};

export default async function SocialPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  const { supabase, member } = await requireMember();
  const poster = canPostSocial(member);
  const admin = isAdmin(member);
  const today = todayLagos();

  const [connections, { data: posts }, { data: items }, { data: members }] = await Promise.all([
    listConnections(),
    supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(20).returns<SocialPost[]>(),
    supabase.from('content_items').select('id, day, series, title, status').eq('week_start', weekStart(today)).neq('status', 'posted').order('day').returns<Pick<ContentItem, 'id' | 'day' | 'series' | 'title' | 'status'>[]>(),
    supabase.from('members').select('id, full_name').returns<Pick<Member, 'id' | 'full_name'>[]>(),
  ]);
  const ids = (posts ?? []).map((p) => p.id);
  const { data: targets } = ids.length
    ? await supabase.from('social_post_targets').select('*').in('post_id', ids).returns<SocialTarget[]>()
    : { data: [] as SocialTarget[] };

  const connected = connections.map((c) => c.platform);
  const active = (targets ?? []).some((t) => t.status === 'pending' || t.status === 'processing');
  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const configured: Record<Platform, boolean> = { instagram: igConfigured(), tiktok: ttConfigured() };

  return (
    <div className="space-y-6">
      {poster && <Poller active={active} />}
      <PageHeader eyebrow="Social" title="Post everywhere" actions={<Link href="/insights" className="btn-ghost"><Icon name="chart" className="h-4 w-4" /> Insights</Link>}>
        Upload once and it goes to Instagram and TikTok. Track how it’s doing on Insights.
      </PageHeader>

      {searchParams.notice && <p role="status" className="rounded-2xl bg-good/15 p-4 text-sm font-semibold text-good">{searchParams.notice}</p>}
      {searchParams.error && <p role="alert" className="rounded-2xl bg-magenta/10 p-4 text-sm font-semibold text-magenta">{searchParams.error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          {!poster ? (
            <p className="text-muted">Posting is for heads, admins and the Social Media team. You can still see what’s gone out and how it’s doing.</p>
          ) : connected.length === 0 ? (
            <div className="text-center">
              <p className="font-display text-2xl uppercase">No accounts connected</p>
              <p className="mt-2 text-muted">{admin ? 'Connect Instagram or TikTok on the right to start posting.' : 'Ask an admin to connect the unit’s Instagram and TikTok.'}</p>
            </div>
          ) : (
            <Composer
              connected={connected}
              tiktokMode={ttMode()}
              items={(items ?? []).map((i) => ({ id: i.id, label: `${label(i.day, 'day')} · ${i.series}: ${i.title}` }))}
            />
          )}
        </section>

        <section className="card p-6">
          <p className="eyebrow mb-1">Accounts</p>
          <p className="mb-4 font-display text-2xl uppercase">Connected</p>
          <ul className="space-y-3">
            {(['instagram', 'tiktok'] as Platform[]).map((p) => {
              const c = connections.find((x) => x.platform === p);
              const expires = c?.platform === 'tiktok' ? c.refresh_expires_at : c?.token_expires_at;
              const soon = expires && new Date(expires).getTime() - Date.now() < 7 * 86_400_000;
              return (
                <li key={p} className="rounded-2xl bg-plum-100/70 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${p === 'instagram' ? 'bg-magenta' : 'bg-plum-900'}`}><Icon name="share" className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{PLATFORM_NAME[p]}</p>
                      <p className="truncate text-sm text-muted">{c ? (c.username ? `@${c.username}` : 'Connected') : 'Not connected'}</p>
                    </div>
                    {admin && (c ? (
                      <form action={disconnectAccount}>
                        <input type="hidden" name="platform" value={p} />
                        <SubmitButton className="btn-ghost px-3 py-1.5 text-xs" pendingText="…">Disconnect</SubmitButton>
                      </form>
                    ) : (
                      <a href={`/api/social/connect/${p}`} className="btn-primary px-4 py-2 text-xs">Connect</a>
                    ))}
                  </div>
                  {admin && soon && <p className="mt-2 text-xs font-bold text-warn">Login expires soon. <a href={`/api/social/connect/${p}`} className="underline">Reconnect</a></p>}
                  {admin && !c && !configured[p] && <p className="mt-2 text-xs text-muted">Needs setup first: see “Social posting” in the README.</p>}
                </li>
              );
            })}
          </ul>
          {connected.includes('tiktok') && ttMode() === 'inbox' && (
            <p className="mt-4 text-xs text-muted">TikTok posts go to drafts until the TikTok app passes its audit. Then set <code>TIKTOK_POST_MODE=direct</code> to post straight to the feed.</p>
          )}
        </section>
      </div>

      <section className="card p-6">
        <p className="mb-4 font-display text-2xl uppercase">Recent posts</p>
        {(posts ?? []).length === 0 ? (
          <p className="text-muted">Nothing posted from the app yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(posts ?? []).map((p) => {
              const first = p.media[0];
              const ts = (targets ?? []).filter((t) => t.post_id === p.id);
              return (
                <li key={p.id} className="flex gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-plum-100">
                    {first?.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.url} alt="" className="h-full w-full object-cover" />
                    ) : first ? (
                      <video src={first.url} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{p.caption || <span className="text-muted">No caption</span>}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {nameOf.get(p.created_by ?? '') ?? 'Someone'} · {label(p.created_at.slice(0, 10))} · {p.media.length} {p.media.length === 1 ? 'file' : 'files'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ts.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center gap-2">
                          <span className={`chip ${STATUS[t.status].cls}`}>{PLATFORM_NAME[t.platform]} · {STATUS[t.status].text}</span>
                          {t.permalink && <a href={t.permalink} target="_blank" rel="noreferrer" className="text-xs font-bold text-magenta">View →</a>}
                          {t.status === 'failed' && poster && (
                            <form action={retryTarget}>
                              <input type="hidden" name="id" value={t.id} />
                              <SubmitButton className="text-xs font-bold text-magenta hover:underline" pendingText="…">Retry</SubmitButton>
                            </form>
                          )}
                          {t.error && <p className="w-full text-xs text-magenta">{t.error}</p>}
                        </div>
                      ))}
                    </div>
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
