import { requireAdmin } from '@/lib/auth';
import { disconnectAccount } from '@/app/social-actions';
import { PageHeader } from '@/components/PageHeader';
import { AdminTabs } from '@/components/AdminTabs';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { Icon } from '@/components/Icon';
import { listConnections } from '@/lib/social/accounts';
import { igConfigured, igUnified } from '@/lib/social/instagram';
import { ttConfigured, ttMode } from '@/lib/social/tiktok';
import { PLATFORM_NAME, type Platform } from '@/lib/social/types';

export const metadata = { title: 'Connected accounts' };

/** Connecting and disconnecting the unit's Instagram and TikTok is an admin job, so it lives here, not on Post. */
export default async function AccountsPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  await requireAdmin();
  const connections = await listConnections();
  const configured: Record<Platform, boolean> = { instagram: igConfigured(), tiktok: ttConfigured() };

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Connected accounts">
        The unit’s Instagram and TikTok. People with the <b>Post to socials</b> permission post through these; nobody else can.
      </PageHeader>
      <AdminTabs current="/admin/accounts" />

      {searchParams.notice && <p role="status" className="alert-good mb-6">{searchParams.notice}</p>}
      {searchParams.error && <p role="alert" className="alert-danger mb-6">{searchParams.error}</p>}

      <ul className="grid gap-4 md:grid-cols-2">
        {(['instagram', 'tiktok'] as Platform[]).map((p) => {
          const c = connections.find((x) => x.platform === p);
          const expires = c?.platform === 'tiktok' ? c.refresh_expires_at : c?.token_expires_at;
          const soon = expires && new Date(expires).getTime() - Date.now() < 7 * 86_400_000;
          return (
            <li key={p} className="card p-6">
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${p === 'instagram' ? 'bg-magenta' : 'bg-plum-700'}`}>
                  <Icon name={p === 'instagram' ? 'instagram' : 'share'} className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="card-title">{PLATFORM_NAME[p]}</h2>
                  <p className="truncate text-sm text-muted">{c ? (c.username ? `@${c.username}` : 'Connected') : configured[p] ? 'Not connected' : 'Needs setup'}</p>
                </div>
                {c ? (
                  <form action={disconnectAccount}>
                    <input type="hidden" name="platform" value={p} />
                    <ConfirmSubmit
                      className="btn-ghost min-h-9 px-3 py-1.5 text-xs"
                      pendingText="Disconnecting…"
                      title={`Disconnect ${PLATFORM_NAME[p]}?`}
                      body={<>Nobody can post to {PLATFORM_NAME[p]} from the app until an admin connects it again. Posts already live stay up.</>}
                      confirmLabel={`Disconnect ${PLATFORM_NAME[p]}`}
                    >
                      Disconnect
                    </ConfirmSubmit>
                  </form>
                ) : configured[p] ? (
                  <a href={`/api/social/connect/${p}`} className="btn-primary min-h-9 px-4 py-2 text-xs">Connect</a>
                ) : null}
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                {c && (
                  <div className="flex gap-2">
                    <dt className="text-muted">Login</dt>
                    <dd className={soon ? 'font-semibold text-warn-ink' : ''}>
                      {expires ? `${soon ? 'Expires soon: ' : 'Valid until '}${new Date(expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Doesn’t expire'}
                      {soon && <> · <a href={`/api/social/connect/${p}`} className="link">Reconnect</a></>}
                    </dd>
                  </div>
                )}
                {p === 'instagram' && configured.instagram && (
                  <div className="flex gap-2"><dt className="text-muted">Sign-in</dt><dd>{igUnified() ? 'Facebook Login for Business (Unified login)' : 'Instagram login'}</dd></div>
                )}
                {p === 'tiktok' && c && (
                  <div className="flex gap-2"><dt className="text-muted">Posting</dt><dd>{ttMode() === 'inbox' ? 'Goes to the TikTok app’s inbox to finish (set TIKTOK_POST_MODE=direct after TikTok’s audit)' : 'Posts straight to the feed'}</dd></div>
                )}
                {!configured[p] && <p className="text-muted">Add the app keys on Vercel first; see “Social posting” in the README.</p>}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
