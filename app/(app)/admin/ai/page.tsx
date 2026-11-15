import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { removePeerAccount } from '@/app/ai-actions';
import { PageHeader } from '@/components/PageHeader';
import { AdminTabs } from '@/components/AdminTabs';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { aiConfigured, latestAiRun } from '@/lib/ai/manager';
import { createAdminClient } from '@/lib/supabase/admin';
import { rangeLabel } from '@/lib/dates';
import { unquote } from '@/lib/ai/text';

export const metadata = { title: 'AI ideas' };

const PLAYBOOK_URL = 'https://github.com/Adedejiosvaldo/bensonyc-media/blob/main/content/ai-playbook.ts';

/** How the AI social media manager is set up: whether it's on, its latest run, cost so far and the accounts it studies. */
export default async function AiSettingsPage() {
  await requireAdmin();
  const on = aiConfigured();
  const db = createAdminClient();
  const [run, { data: peers }, { data: runs }] = await Promise.all([
    latestAiRun(),
    db.from('ai_peer_accounts').select('username, why, last_checked, ok').order('added_at', { ascending: false }),
    db.from('ai_runs').select('status, usage, created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  const done = (runs ?? []).filter((r) => r.status === 'done').length;
  const failed = (runs ?? []).filter((r) => r.status === 'failed').length;
  const searches = (runs ?? []).reduce((s, r) => s + ((r.usage as { web_searches?: number } | null)?.web_searches ?? 0), 0);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="AI ideas">
        The weekly AI social media manager: whether it’s on, how it’s been running and which accounts it learns from. Who can use it is set per person with the <b>Plan content</b> permission.
      </PageHeader>
      <AdminTabs current="/admin/ai" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="card-title">Status</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-32 shrink-0 text-muted">Switched on</dt><dd className={on ? 'font-semibold text-good-ink' : 'font-semibold text-danger'}>{on ? 'Yes' : 'No: add ANTHROPIC_API_KEY on Vercel'}</dd></div>
            <div className="flex gap-2"><dt className="w-32 shrink-0 text-muted">Runs</dt><dd>Fridays for the next week, plus whenever someone taps Get ideas</dd></div>
            <div className="flex gap-2"><dt className="w-32 shrink-0 text-muted">Last 20 runs</dt><dd>{done} finished · {failed} failed · {searches} web searches</dd></div>
            {run && (
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-muted">Latest</dt>
                <dd>
                  {rangeLabel(run.week_start)}{run.theme ? `: “${unquote(run.theme.title)}”` : ''} · <Link href={`/content?week=${run.week_start}`} className="link">Open</Link>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-sm text-muted">Spend is on your Anthropic console. Each run is roughly $0.20–0.35, one per week.</p>
        </section>

        <section className="card p-6">
          <h2 className="card-title">Voice and know-how</h2>
          <p className="mt-2 text-sm text-muted">
            The AI writes hooks and captions by the playbook: who you’re talking to, your voice, words to avoid, hook patterns, calls to action and what’s working. Edit it on GitHub to change how it writes.
          </p>
          <a href={PLAYBOOK_URL} target="_blank" rel="noreferrer" className="btn-ghost mt-4">
            <Icon name="brand" className="h-4 w-4" /> Open the playbook<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </section>
      </div>

      <section className="card mt-4 p-6" aria-labelledby="peers-title">
        <h2 id="peers-title" className="card-title">Accounts it learns from</h2>
        <p className="mt-1 text-sm text-muted">Public Instagram accounts the AI chose. Each run reads their recent posts and real like counts. Remove any that don’t fit YC.</p>
        {(peers ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-5 text-sm text-muted">None yet. The AI picks some on its first run.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {(peers ?? []).map((p) => (
              <li key={p.username} className="flex flex-wrap items-center gap-3 py-3">
                <a href={`https://www.instagram.com/${p.username}/`} target="_blank" rel="noreferrer" className="link">@{p.username}<span className="sr-only"> (opens in a new tab)</span></a>
                <span className="min-w-0 flex-1 text-sm text-muted">{p.why}</span>
                {p.ok === false && <span className="chip bg-line text-muted">Not readable</span>}
                <form action={removePeerAccount}>
                  <input type="hidden" name="username" value={p.username} />
                  <SubmitButton className="btn-ghost min-h-9 px-3 py-1.5 text-xs" pendingText="Removing…">Remove<span className="sr-only"> @{p.username}</span></SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
