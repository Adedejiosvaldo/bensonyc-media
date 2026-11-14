import Link from 'next/link';
import { canPostSocial, isAdmin, requireMember } from '@/lib/auth';
import { retryTarget } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { listConnections } from '@/lib/social/accounts';
import { igConfigured } from '@/lib/social/instagram';
import { ttConfigured, ttMode } from '@/lib/social/tiktok';
import { storageMode } from '@/lib/storage';
import { label, todayLagos, weekStart } from '@/lib/dates';
import { PLATFORM_NAME, type Platform, type SocialPost, type SocialTarget, type TargetStatus } from '@/lib/social/types';
import type { ContentItem, Member } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { Composer } from './Composer';
import { Poller } from './Poller';

export const metadata = { title: 'Post' };
export const maxDuration = 60;

const STATUS: Record<TargetStatus, { text: string; cls: string }> = {
  pending: { text: 'Queued', cls: 'bg-plum-100 text-ink' },
  processing: { text: 'Uploading', cls: 'bg-gold/25 text-warn-ink' },
  published: { text: 'Live', cls: 'bg-good/15 text-good-ink' },
  sent_to_drafts: { text: 'In TikTok drafts', cls: 'bg-magenta/10 text-accent' },
  failed: { text: 'Failed', cls: 'bg-danger text-white' },
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

      {searchParams.notice && <p role="status" className="alert-good">{searchParams.notice}</p>}
      {searchParams.error && <p role="alert" className="alert-danger">{searchParams.error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className={`card p-6 ${!poster || connected.length === 0 ? 'flex items-center justify-center' : ''}`}>
          {!poster ? (
            <EmptyState icon="eye" title="Posting needs permission">
              Ask an admin to turn on <b>Post to socials</b> for you. You can still see what’s gone out below, and how it’s doing on Insights.
            </EmptyState>
          ) : connected.length === 0 ? (
            <EmptyState icon="share" title="Connect an account to start posting">
              {admin
                ? configured.instagram || configured.tiktok
                  ? 'Connect Instagram or TikTok in Admin → Connected accounts. Once one is linked, the post composer appears here.'
                  : 'Instagram and TikTok need their app keys set first (see “Social posting” in the README). Then connect them in Admin → Connected accounts.'
                : 'Ask an admin to connect the unit’s Instagram and TikTok. The post composer appears here once they do.'}
            </EmptyState>
          ) : (
            <>
              <h2 className="card-title mb-5">New post</h2>
            <Composer
              connected={connected}
              tiktokMode={ttMode()}
              storage={storageMode()}
              admin={admin}
              items={(items ?? []).map((i) => ({ id: i.id, label: `${label(i.day, 'day')} · ${i.series}: ${i.title}` }))}
            />
            </>
          )}
        </section>

        <section className="card p-6" aria-labelledby="accounts-title">
          <h2 id="accounts-title" className="card-title">Accounts</h2>
          <ul className="mt-3 space-y-2">
            {(['instagram', 'tiktok'] as Platform[]).map((p) => {
              const c = connections.find((x) => x.platform === p);
              return (
                <li key={p} className="card-row flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${p === 'instagram' ? 'bg-magenta' : 'bg-plum-700'}`}>
                    <Icon name={p === 'instagram' ? 'instagram' : 'share'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{PLATFORM_NAME[p]}</p>
                    <p className="truncate text-sm text-muted">{c ? (c.username ? `@${c.username}` : 'Connected') : 'Not connected'}</p>
                  </div>
                  {c ? <span className="chip bg-good/15 text-good-ink"><Icon name="check" className="h-3 w-3" /> On</span> : <span className="chip bg-line text-muted">Off</span>}
                </li>
              );
            })}
          </ul>
          {connected.includes('tiktok') && ttMode() === 'inbox' && <p className="mt-3 text-xs text-muted">TikTok posts land in the account’s drafts for now.</p>}
          {admin && <Link href="/admin/accounts" className="link mt-3 inline-flex min-h-9 items-center text-sm">Manage in Admin →</Link>}
        </section>
      </div>

      <section id="recent" className="card scroll-mt-24 p-6">
        <h2 className="mb-4 section-title">Recent posts</h2>
        {(posts ?? []).length === 0 ? (
          <EmptyState compact icon="upload" title="Nothing posted from the app yet">
            Posts sent from here show up with their live status and a link to each platform.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {(posts ?? []).map((p) => {
              const first = p.media[0];
              const ts = (targets ?? []).filter((t) => t.post_id === p.id);
              return (
                <li key={p.id} className="flex gap-4 py-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-plum-100 text-muted">
                    {p.media_deleted_at ? (
                      <Icon name={first?.type === 'video' ? 'content' : 'brand'} className="h-6 w-6" />
                    ) : first?.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.url} alt="" className="h-full w-full object-cover" />
                    ) : first ? (
                      <video src={first.url} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{p.caption || <span className="text-muted">No caption</span>}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {nameOf.get(p.created_by ?? '') ?? 'Someone'} · {label(p.created_at.slice(0, 10))} · {p.media.length} {p.media.length === 1 ? 'file' : 'files'}{p.media_deleted_at ? ' · cleared from storage' : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ts.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center gap-2">
                          <span className={`chip ${STATUS[t.status].cls}`}>{PLATFORM_NAME[t.platform]} · {STATUS[t.status].text}</span>
                          {t.permalink && <a href={t.permalink} target="_blank" rel="noreferrer" className="link text-xs">View on {PLATFORM_NAME[t.platform]}<span className="sr-only"> (opens in a new tab)</span> →</a>}
                          {t.status === 'failed' && poster && !p.media_deleted_at && (
                            <form action={retryTarget}>
                              <input type="hidden" name="id" value={t.id} />
                              <SubmitButton className="link min-h-9 text-xs" pendingText="Retrying…">Retry</SubmitButton>
                            </form>
                          )}
                          {t.error && <p className="w-full text-xs text-danger">{admin ? t.error : 'Didn’t go through. Tap Retry, or ask an admin if it fails again.'}</p>}
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
