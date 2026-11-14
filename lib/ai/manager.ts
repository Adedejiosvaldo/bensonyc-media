// AI social media manager.
// Once a week (Friday's cron, ready by Saturday) or when a lead asks, it sends Claude the unit's own post numbers,
// the 9-month plan, the weekly rhythm and recent posts from peer accounts, lets it search the web for reference
// posts, and stores 5–8 suggested posts for the coming week. Nothing is ever posted automatically: a lead adds a
// suggestion to the board, where it becomes an ordinary content item.
//
// The request runs as a Message Batch (half price, no request timeout). A run stays "queued" until a later check
// (the daily cron, or opening This week) collects the result.
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS } from '@/content/departments';
import { DO, DONT, SERIES } from '@/content/brand';
import { RHYTHM, buildWeek, monthForWeek } from '@/lib/plan';
import { addDays, label, todayLagos, weekStart } from '@/lib/dates';
import { getAccount } from '@/lib/social/accounts';
import { igPeerPosts, igUnified, type PeerPost } from '@/lib/social/instagram';
import type { MediaStat } from '@/lib/social/types';
import type { ContentItem, PlanMonth } from '@/lib/types';

const MODEL = 'claude-opus-5-5';
const PLAN_TOOL = 'submit_week_plan';
const MAX_CONTINUATIONS = 3;

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

const PILLARS = ['People', 'Word', 'Events', 'Community'] as const;
const FORMATS = ['Reel', 'Carousel', 'Photo', 'Stories', 'Reel + flyer', 'TikTok'] as const;
const DEPT_IDS = DEPARTMENTS.map((d) => d.id);

export type AiRef = { url: string; platform: 'instagram' | 'tiktok' | 'other'; note: string };
export type AiInsight = { finding: string; evidence: string };
type PlanInput = {
  summary: string;
  insights: AiInsight[];
  suggestions: {
    day: string;
    series: string;
    pillar: (typeof PILLARS)[number];
    format: (typeof FORMATS)[number];
    department_id: string;
    title: string;
    hook: string;
    caption: string;
    shot_notes: string;
    why: string;
    references: AiRef[];
  }[];
  peer_accounts: { username: string; why: string }[];
};

const str = { type: 'string' } as const;

/** The model answers by calling this tool once; strict mode guarantees the arguments match the schema. */
const planTool: Anthropic.Tool = {
  name: PLAN_TOOL,
  description:
    'Submit the finished plan for the coming week. Call this exactly once, at the end, after any web searches. ' +
    'Every reference URL must be one that appeared in your web search results or in the peer posts you were given.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'insights', 'suggestions', 'peer_accounts'],
    properties: {
      summary: { type: 'string', description: 'Two or three plain sentences for the unit lead: what worked lately and the idea behind this week.' },
      insights: {
        type: 'array',
        description: 'Up to 5 findings from the numbers, each with the evidence.',
        items: { type: 'object', additionalProperties: false, required: ['finding', 'evidence'], properties: { finding: str, evidence: str } },
      },
      suggestions: {
        type: 'array',
        description: '5 to 8 posts for the week.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['day', 'series', 'pillar', 'format', 'department_id', 'title', 'hook', 'caption', 'shot_notes', 'why', 'references'],
          properties: {
            day: { type: 'string', description: 'YYYY-MM-DD, a date inside the target week.' },
            series: { type: 'string', description: 'One of the recurring series, or "Monthly hero", or "One-off".' },
            pillar: { type: 'string', enum: [...PILLARS] },
            format: { type: 'string', enum: [...FORMATS] },
            department_id: { type: 'string', enum: DEPT_IDS },
            title: { type: 'string', description: 'Short working title for the board.' },
            hook: { type: 'string', description: 'The first line or first 2 seconds: what is said or shown.' },
            caption: { type: 'string', description: 'Ready-to-edit caption draft with a single call to action and up to 4 hashtags.' },
            shot_notes: { type: 'string', description: 'What to film or design, in one or two sentences.' },
            why: { type: 'string', description: 'One sentence linking this idea to the unit’s own numbers or a reference post.' },
            references: {
              type: 'array',
              description: '0 to 3 reference posts. Only URLs from your search results or the peer posts.',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['url', 'platform', 'note'],
                properties: { url: str, platform: { type: 'string', enum: ['instagram', 'tiktok', 'other'] }, note: { type: 'string', description: 'What to borrow from it.' } },
              },
            },
          },
        },
      },
      peer_accounts: {
        type: 'array',
        description: 'Up to 8 public Instagram business or creator accounts (church, youth ministry, Christian creators) worth studying next week. Usernames only, no @.',
        items: { type: 'object', additionalProperties: false, required: ['username', 'why'], properties: { username: str, why: str } },
      },
    },
  },
};

const SYSTEM = `You are the social media manager for MFM Benson Youth Church's media unit in Ikorodu, Lagos (Instagram @mfmbensonyc, plus TikTok). A small volunteer team of young people films on phones and posts through the week. Your job each week is to suggest the posts most likely to grow reach and real engagement while staying true to the church.

How the unit works:
- Weekly rhythm (day: series, pillar, usual format, department): ${RHYTHM.map((r) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.dow]}: ${r.series}, ${r.pillar}, ${r.format}, ${r.dept}`).join('; ')}. Friday alternates with "Kingdom Business Minute" on even weeks. A "Monthly hero" post goes out on Thursday.
- Recurring series: ${SERIES.join(', ')}.
- Content pillars: People, Word, Events, Community.
- Departments: ${DEPARTMENTS.map((d) => `${d.id} (${d.name})`).join(', ')}.
- Brand rules to follow: ${DO.join('; ')}. Avoid: ${DONT.join('; ')}.
- Formats: Instagram photos must be between 4:5 portrait and 1.91:1 landscape; reels and TikToks are vertical 9:16.

How to work:
1. Read the unit's own posts and numbers. Find what earns views, shares and saves relative to the account's usual level, and what doesn't. Be specific and cite numbers.
2. Use web search to find a few recent, strong public posts from church, youth ministry and Christian creators on Instagram and TikTok, especially from Nigeria and Africa, that the team could learn from. Prefer direct post or profile links. Never invent a URL: only use URLs that appear in your search results or in the peer posts provided.
3. Suggest 5 to 8 posts for the target week that keep the weekly rhythm and the month's theme, lean into what is working, and borrow specific ideas from the references. Each must be realistic for volunteers with phones.
4. Name up to 8 public Instagram business or creator accounts worth studying next week.
5. Finish by calling ${PLAN_TOOL} once with the whole plan. Write in plain, warm, everyday English. No church jargon the team wouldn't use.`;

const num = (v: number | null | undefined) => (v == null ? null : v);

/** Everything the model needs, as compact JSON. */
async function gatherContext(sunday: string) {
  const db = createAdminClient();
  const since = addDays(todayLagos(), -90);

  const [{ data: media }, { data: posted }, { data: months }, { data: peers }, { data: pastRuns }] = await Promise.all([
    db.from('social_media_stats').select('*').gte('posted_at', since).order('posted_at', { ascending: false }).limit(120).returns<MediaStat[]>(),
    db.from('content_items').select('day, series, title, format, link, status').gte('day', since).eq('status', 'posted').returns<Pick<ContentItem, 'day' | 'series' | 'title' | 'format' | 'link' | 'status'>[]>(),
    db.from('plan_months').select('*').order('month').returns<PlanMonth[]>(),
    db.from('ai_peer_accounts').select('username, why').order('added_at', { ascending: false }).limit(8),
    db.from('ai_runs').select('id').eq('status', 'done').order('created_at', { ascending: false }).limit(2),
  ]);

  // Board items carry the series; match them to synced posts by their link.
  const seriesByLink = new Map((posted ?? []).filter((p) => p.link).map((p) => [p.link!.split('?')[0], p.series]));
  const ownPosts = (media ?? []).map((m) => ({
    date: m.posted_at?.slice(0, 10) ?? null,
    platform: m.platform,
    type: m.media_type,
    series: (m.permalink && seriesByLink.get(m.permalink.split('?')[0])) || null,
    caption: m.caption ? m.caption.slice(0, 160) : null,
    views: num(m.views),
    reach: num(m.reach),
    likes: num(m.likes),
    comments: num(m.comments),
    shares: num(m.shares),
    saves: num(m.saves),
    url: m.permalink,
  }));

  // Peer accounts the model picked last time: their recent posts with real counts.
  const peerPosts: { username: string; followers: number | null; posts: PeerPost[] }[] = [];
  const ig = igUnified() ? await getAccount('instagram') : null;
  if (ig) {
    for (const p of peers ?? []) {
      try {
        peerPosts.push(await igPeerPosts(ig, p.username, 10));
        await db.from('ai_peer_accounts').update({ last_checked: new Date().toISOString(), ok: true }).eq('username', p.username);
      } catch {
        await db.from('ai_peer_accounts').update({ last_checked: new Date().toISOString(), ok: false }).eq('username', p.username);
      }
    }
  }

  // How the team treated recent suggestions, so the model learns what gets used.
  const runIds = (pastRuns ?? []).map((r) => r.id);
  const { data: lastSuggestions } = runIds.length
    ? await db.from('ai_suggestions').select('title, series, format, status').in('run_id', runIds)
    : { data: [] as { title: string; series: string; format: string; status: string }[] };

  const month = monthForWeek(sunday, months ?? []);
  return {
    target_week: { starts: sunday, ends: addDays(sunday, 6), days: Array.from({ length: 7 }, (_, i) => `${addDays(sunday, i)} (${label(addDays(sunday, i), 'day')})`) },
    plan_month: month ? { theme: month.theme, big_moment: month.big_moment, hero_content: month.hero_content, follower_target: month.follower_target } : null,
    default_board_for_the_week: buildWeek(sunday, month).map((d) => ({ day: d.day, series: d.series, format: d.format, title: d.title })),
    own_posts_last_90_days: ownPosts,
    peer_accounts_recent_posts: peerPosts,
    recent_suggestions_and_what_the_team_did: lastSuggestions ?? [],
  };
}

function client() {
  return new Anthropic();
}

/** Ask for suggestions for the week starting `sunday`. Returns the run id. */
export async function startRun(sunday: string, requestedBy: string | null) {
  if (!aiConfigured()) throw new Error('Add ANTHROPIC_API_KEY on Vercel to turn on AI suggestions.');
  const db = createAdminClient();
  const context = await gatherContext(sunday);
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: SYSTEM,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }, planTool],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: `Plan the posts for the week of ${label(sunday, 'long')}. Here is the data, as JSON:\n\n<data>\n${JSON.stringify(context)}\n</data>\n\nSearch for references, then call ${PLAN_TOOL} with the plan.`,
      },
    ],
  };

  const { data: run, error } = await db.from('ai_runs').insert({ week_start: sunday, requested_by: requestedBy, request: params }).select('id').single();
  if (error || !run) throw new Error(error?.message ?? 'Could not start the run.');
  try {
    const batch = await client().messages.batches.create({ requests: [{ custom_id: run.id, params }] });
    await db.from('ai_runs').update({ batch_id: batch.id }).eq('id', run.id);
  } catch (e) {
    await db.from('ai_runs').update({ status: 'failed', error: (e as Error).message, finished_at: new Date().toISOString() }).eq('id', run.id);
    throw e;
  }
  return run.id as string;
}

/** URLs the model actually saw: web search results plus the peer posts it was given. */
function seenUrls(content: Anthropic.ContentBlock[], request: Anthropic.MessageCreateParamsNonStreaming) {
  const urls = new Set<string>();
  const add = (u: string) => urls.add(u.replace(/\/+$/, '').split('?')[0]);
  const walk = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;
    for (const b of blocks as { type?: string; content?: unknown }[]) {
      if (b?.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content as { url?: string }[]) if (r.url) add(r.url);
    }
  };
  walk(content);
  for (const m of request.messages) if (m.role === 'assistant') walk(m.content);
  const data = typeof request.messages[0]?.content === 'string' ? request.messages[0].content : '';
  for (const u of data.match(/https?:\/\/[^\s"<>]+/g) ?? []) add(u);
  return urls;
}

const sumUsage = (a: Record<string, number> | null, u: Anthropic.Usage) => ({
  input_tokens: (a?.input_tokens ?? 0) + (u.input_tokens ?? 0),
  output_tokens: (a?.output_tokens ?? 0) + (u.output_tokens ?? 0),
  web_searches: (a?.web_searches ?? 0) + (u.server_tool_use?.web_search_requests ?? 0),
});

type RunRow = { id: string; week_start: string; batch_id: string | null; request: Anthropic.MessageCreateParamsNonStreaming | null; attempts: number; usage: Record<string, number> | null; created_at: string };

/** Collect one queued run if its batch has finished. */
async function collect(run: RunRow) {
  const db = createAdminClient();
  const fail = (error: string) => db.from('ai_runs').update({ status: 'failed', error, finished_at: new Date().toISOString() }).eq('id', run.id);
  if (!run.batch_id || !run.request) return fail('The run was never sent.');

  const c = client();
  const batch = await c.messages.batches.retrieve(run.batch_id);
  if (batch.processing_status !== 'ended') {
    if (Date.now() - new Date(run.created_at).getTime() > 26 * 3600_000) await fail('The model took longer than a day. Try again.');
    return;
  }

  let result: Anthropic.Messages.MessageBatchIndividualResponse | null = null;
  for await (const r of await c.messages.batches.results(run.batch_id)) if (r.custom_id === run.id) result = r;
  if (!result) return fail('No result came back. Try again.');
  if (result.result.type !== 'succeeded') return fail(result.result.type === 'errored' ? 'The model request failed. Try again.' : `The request ${result.result.type}. Try again.`);

  const message = result.result.message;
  const usage = sumUsage(run.usage, message.usage);

  // Long searches can pause the turn; send it back to continue where it stopped.
  if (message.stop_reason === 'pause_turn' && run.attempts < MAX_CONTINUATIONS) {
    const request: Anthropic.MessageCreateParamsNonStreaming = {
      ...run.request,
      messages: [...run.request.messages, { role: 'assistant', content: message.content as unknown as Anthropic.ContentBlockParam[] }],
    };
    const next = await c.messages.batches.create({ requests: [{ custom_id: run.id, params: request }] });
    await db.from('ai_runs').update({ batch_id: next.id, request, attempts: run.attempts + 1, usage }).eq('id', run.id);
    return;
  }
  if (message.stop_reason === 'refusal') return fail('The model declined this request. Try again, or adjust the plan month.');

  const call = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === PLAN_TOOL);
  if (!call) return fail(message.stop_reason === 'max_tokens' ? 'The plan was cut off before it finished. Try again.' : 'The model didn’t return a plan. Try again.');

  const plan = call.input as PlanInput;
  const urls = seenUrls(message.content, run.request);
  const days = new Set(Array.from({ length: 7 }, (_, i) => addDays(run.week_start, i)));
  const clean = (u: string) => u.replace(/\/+$/, '').split('?')[0];

  const rows = (plan.suggestions ?? [])
    .filter((s) => days.has(s.day))
    .slice(0, 10)
    .map((s) => ({
      run_id: run.id,
      week_start: run.week_start,
      day: s.day,
      series: s.series,
      pillar: PILLARS.includes(s.pillar) ? s.pillar : 'Community',
      format: s.format,
      department_id: DEPT_IDS.includes(s.department_id as (typeof DEPT_IDS)[number]) ? s.department_id : 'content',
      title: s.title,
      hook: s.hook,
      caption: s.caption,
      shot_notes: s.shot_notes,
      why: s.why,
      // Drop any link the model did not actually see, so nobody is sent to a made-up URL.
      refs: (s.references ?? []).filter((r) => /^https?:\/\//.test(r.url) && urls.has(clean(r.url))).slice(0, 3),
    }));
  if (!rows.length) return fail('The plan had no usable posts for this week. Try again.');

  await db.from('ai_suggestions').insert(rows);
  for (const p of (plan.peer_accounts ?? []).slice(0, 8)) {
    const username = p.username.replace(/^@/, '').trim().toLowerCase();
    if (/^[a-z0-9._]{1,30}$/.test(username)) await db.from('ai_peer_accounts').upsert({ username, why: p.why }, { onConflict: 'username' });
  }
  await db
    .from('ai_runs')
    .update({ status: 'done', summary: plan.summary, insights: (plan.insights ?? []).slice(0, 5), usage, finished_at: new Date().toISOString() })
    .eq('id', run.id);
}

/** Collect every queued run whose batch has finished. Cheap when nothing is waiting. */
export async function collectRuns(weekStartFilter?: string) {
  if (!aiConfigured()) return;
  const db = createAdminClient();
  let q = db.from('ai_runs').select('id, week_start, batch_id, request, attempts, usage, created_at').eq('status', 'queued');
  if (weekStartFilter) q = q.eq('week_start', weekStartFilter);
  const { data } = await q.returns<RunRow[]>();
  for (const run of data ?? []) {
    try {
      await collect(run);
    } catch {
      // Leave it queued; the next check tries again.
    }
  }
}

/** Daily cron: on Friday, start next week's run (ready by Saturday); every day, collect finished runs. */
export async function aiTick() {
  if (!aiConfigured()) return { skipped: 'ANTHROPIC_API_KEY not set' };
  await collectRuns();
  const today = todayLagos();
  const isFriday = new Date(`${today}T12:00:00Z`).getUTCDay() === 5;
  if (!isFriday) return { started: false };
  const next = addDays(weekStart(today), 7);
  const db = createAdminClient();
  const { count } = await db.from('ai_runs').select('id', { count: 'exact', head: true }).eq('week_start', next).in('status', ['queued', 'done']);
  if (count) return { started: false };
  const id = await startRun(next, null);
  return { started: true, run: id };
}
